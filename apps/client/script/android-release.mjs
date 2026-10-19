#!/usr/bin/env node
// Local Android release, with no EAS Build: prebuild, build a release bundle
// with Gradle, sign it with the Play upload key from the vault, check what it
// carries, turn it into one installable APK for a phone and upload it to a
// Play testing track through the Play Developer API. See
// docs/mobile-release.md.
import { spawnSync } from 'node:child_process';
import { createHash, sign } from 'node:crypto';
import { closeSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const client = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(client, '../..');
const release = JSON.parse(readFileSync(join(repo, 'mobile.release.json'), 'utf8'));
export const APP = { packageName: release.appId, alias: 'upload', minTargetSdk: 35 };
export const BLOCKED_PERMISSIONS = ['android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE'];
// A permission counts when the manifest requests it; a tools:node="remove"
// entry is how prebuild blocks one, and bundletool's dump drops those.
export const blockedPermissionsIn = manifest => BLOCKED_PERMISSIONS.filter(name =>
  new RegExp(`<uses-permission[^>]*android:name="${name.replace(/\./g, '\\.')}"`).test(manifest));
export const VAULT = 'op://API Tokens/Newsworthy Android';
const PLAY = 'https://androidpublisher.googleapis.com';
// The service account may release to testing tracks, not production, which
// stays in the console. "alpha" is closed testing and "beta" open testing.
export const TRACKS = ['internal', 'alpha', 'beta'];

// Version codes only ever rise, and Play holds every one it has accepted, so
// its highest is the floor. EAS issued 1 to 12, none of which reached Play.
// A bundle uploaded but never put on a track still holds its code, so the
// edit's bundles count as well as every track's releases.
export function nextVersionCode(tracks = [], bundles = []) {
  const codes = [
    ...tracks.flatMap(track => (track.releases ?? []).flatMap(release => release.versionCodes ?? [])),
    ...bundles.map(bundle => bundle.versionCode),
  ].map(Number).filter(Number.isInteger);
  return (codes.length ? Math.max(...codes) : 0) + 1;
}

export function parseVersionCode(value) {
  const code = Number(value);
  if (!Number.isInteger(code) || code < 1 || code > 2_100_000_000) throw new Error('--version-code takes a positive integer');
  return code;
}

// AGP signs with these in place of the debug config Expo's template sets for
// release. Passed as environment, so no password appears in a process list.
export function signingEnv(key) {
  const prefix = 'ORG_GRADLE_PROJECT_android.injected.signing.';
  return {
    [`${prefix}store.file`]: key.store, [`${prefix}store.password`]: key.password,
    [`${prefix}key.alias`]: APP.alias, [`${prefix}key.password`]: key.password,
  };
}

export function parseTrack(value) {
  if (!TRACKS.includes(value)) throw new Error(`--track takes ${TRACKS.join(', ')}; production is released in Play Console`);
  return value;
}

// One completed release replaces whatever the track was serving.
export function trackRelease(track, code, notes) {
  return { track, releases: [{ versionCodes: [String(code)], status: 'completed', releaseNotes: [{ language: 'en-US', text: notes }] }] };
}

// A service account trades a signed JWT for an hour's access token.
export function jwtClaims(account, now = Math.floor(Date.now() / 1000)) {
  return { iss: account.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: account.token_uri, iat: now, exp: now + 3600 };
}
export function assertion(account, now) {
  const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const payload = `${enc({ alg: 'RS256', typ: 'JWT', kid: account.private_key_id })}.${enc(jwtClaims(account, now))}`;
  return `${payload}.${sign('sha256', Buffer.from(payload), account.private_key).toString('base64url')}`;
}

function opRead(field, outFile) {
  const env = { ...process.env };
  if (env.OP_KEY && !env.OP_SERVICE_ACCOUNT_TOKEN) env.OP_SERVICE_ACCOUNT_TOKEN = env.OP_KEY.replace(/^OP_KEY=/, '');
  const args = ['read', ...(outFile ? ['--out-file', outFile] : []), `${VAULT}/${field}`];
  const result = spawnSync('op', args, { env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`op read "${VAULT}/${field}" failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

// The keystore, Firebase file and Play service-account key live in a private
// temporary directory for one run and are removed on exit.
// NEWSWORTHY_ANDROID_KEYSTORE, NEWSWORTHY_ANDROID_KEYSTORE_PASSWORD,
// GOOGLE_SERVICES_JSON and GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (paths, and the
// password itself) take precedence over the vault.
let keyDir;
function privateDir() {
  if (keyDir) return keyDir;
  keyDir = mkdtempSync(join(tmpdir(), 'newsworthy-android-'));
  process.on('exit', removeKey);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { removeKey(); process.exit(130); });
  return keyDir;
}
function credentials() {
  const { NEWSWORTHY_ANDROID_KEYSTORE: store, NEWSWORTHY_ANDROID_KEYSTORE_PASSWORD: password, GOOGLE_SERVICES_JSON: services } = process.env;
  if (store && password && services) return { store, password, services };
  const dir = privateDir();
  const key = { store: join(dir, 'upload.jks'), password: opRead('keystore password'), services: join(dir, 'google-services.json') };
  opRead('upload.jks', key.store);
  opRead('google-services.json', key.services);
  return key;
}
function playAccount() {
  let file = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!file) opRead('play-service-account.json', file = join(privateDir(), 'play-service-account.json'));
  const account = JSON.parse(readFileSync(file, 'utf8'));
  if (account.type !== 'service_account' || !account.private_key || !account.client_email) throw new Error('The Play key is not a service-account JSON key');
  return { ...account, token_uri: account.token_uri ?? 'https://oauth2.googleapis.com/token' };
}
function removeKey() { if (keyDir) rmSync(keyDir, { recursive: true, force: true }); keyDir = undefined; }

// The Play Developer API changes an app only through an edit: open one, make
// the changes, validate and commit. An edit not committed is deleted.
async function accessToken(account) {
  const response = await fetch(account.token_uri, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: assertion(account) }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`Google token exchange: ${response.status} ${json.error_description ?? json.error}`);
  return json.access_token;
}
function play(token) {
  return async (path, { method = 'GET', body, upload } = {}) => {
    const base = upload ? `${PLAY}/upload` : PLAY;
    const response = await fetch(`${base}/androidpublisher/v3/applications/${APP.packageName}${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': upload ? 'application/octet-stream' : 'application/json' },
      ...(upload ? { body: upload } : body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    const json = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(`${method} ${path.split('?')[0]}: ${response.status} ${json?.error?.message ?? text}`);
    return json;
  };
}
async function withEdit(account, work) {
  const api = play(await accessToken(account));
  const { id } = await api('/edits', { method: 'POST' });
  let committed = false;
  try {
    const result = await work(api, `/edits/${id}`);
    committed = result?.committed === true;
    return result;
  } finally {
    if (!committed) await api(`/edits/${id}`, { method: 'DELETE' }).catch(() => {});
  }
}

async function playNextVersionCode(account) {
  return withEdit(account, async (api, edit) => {
    const [{ tracks }, { bundles }] = await Promise.all([api(`${edit}/tracks`), api(`${edit}/bundles`)]);
    return nextVersionCode(tracks, bundles);
  });
}

// Uploads the verified bundle, puts it on the track as a completed release
// and commits; Play's own SHA-256 of what it received must match ours.
async function upload(account, code, track, notes) {
  const out = join(client, 'build/android-release', String(code));
  const aab = join(out, 'Newsworthy.aab');
  if (!existsSync(aab) || !existsSync(join(out, 'summary.json'))) throw new Error(`No verified bundle for versionCode ${code}; run bundle first`);
  const summary = JSON.parse(readFileSync(join(out, 'summary.json'), 'utf8'));
  const digest = sha256(aab);
  if (digest !== summary.sha256) throw new Error(`${aab} has changed since it was verified; run verify again`);
  notes ??= `Newsworthy ${summary.versionName} (${code}).`;
  // Awaited, not returned: the readback below is the run's proof of the
  // commit, and a returned edit skipped it (versions 15 and 16 logged nothing).
  await withEdit(account, async (api, edit) => {
    console.log(`Uploading ${aab} (sha256 ${digest}) to Play`);
    const uploaded = await api(`${edit}/bundles?uploadType=media`, { method: 'POST', upload: readFileSync(aab) });
    if (uploaded.versionCode !== code) throw new Error(`Play read versionCode ${uploaded.versionCode}, expected ${code}`);
    if (uploaded.sha256 !== digest) throw new Error(`Play received sha256 ${uploaded.sha256}, expected ${digest}`);
    await api(`${edit}/tracks/${track}`, { method: 'PUT', body: trackRelease(track, code, notes) });
    await commitHeld(api, edit);
    return { committed: true };
  });
  const { releases } = await withEdit(account, (api, edit) => api(`${edit}/tracks/${track}`));
  console.log(`versionCode ${code} committed to ${track}: ${JSON.stringify(releases)}`);
}

// Every commit holds its changes back from review: they wait in Publishing
// overview until the owner sends them. Without the flag a commit sends the
// app's pending changes for review, and Play refuses it outright while an
// earlier submission stands rejected (version 16, 19 October). There is no
// separate validate: it refuses the flag as unknown, then refuses the edit for
// lacking it. Commit validates the edit itself.
export const COMMIT_QUERY = 'changesNotSentForReview=true';
async function commitHeld(api, edit) {
  await api(`${edit}:commit?${COMMIT_QUERY}`, { method: 'POST' });
}

// Put a version Play already holds on another testing track, as Play Console's
// "Promote release" does: nothing is uploaded, and the track's countries and
// testers are left as they are.
async function promote(account, code, track, notes) {
  await withEdit(account, async (api, edit) => {
    const { versionCodes = [] } = await api(`${edit}/bundles`).then(r => ({ versionCodes: (r.bundles ?? []).map(b => b.versionCode) }));
    if (!versionCodes.includes(code)) throw new Error(`Play holds no bundle with versionCode ${code}; upload it first`);
    await api(`${edit}/tracks/${track}`, { method: 'PUT', body: trackRelease(track, code, notes ?? `Newsworthy (${code}).`) });
    await commitHeld(api, edit);
    return { committed: true };
  });
  const { releases } = await withEdit(account, (api, edit) => api(`${edit}/tracks/${track}`));
  console.log(`versionCode ${code} promoted to ${track}: ${JSON.stringify(releases)}`);
}

function run(command, args, { cwd = client, env = {}, log } = {}) {
  console.log(`$ ${[command, ...args].join(' ')}${log ? `  > ${log}` : ''}`);
  const fd = log ? openSync(log, 'w') : 'inherit';
  const result = spawnSync(command, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', fd, fd] });
  if (log) closeSync(fd);
  if (result.status !== 0) {
    if (log) console.error(readFileSync(log, 'utf8').split('\n').filter(line => /error|FAILED|What went wrong/i.test(line)).slice(-20).join('\n'));
    throw new Error(`${command} exited with ${result.status ?? result.signal}`);
  }
}
const output = (command, args, env = {}) => {
  const result = spawnSync(command, args, { cwd: client, encoding: 'utf8', env: { ...process.env, ...env } });
  if (result.status !== 0) throw new Error(`${command} ${args[0]} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
};
const manifest = (aab, xpath) => output('bundletool', ['dump', 'manifest', `--bundle=${aab}`, `--xpath=${xpath}`]);
const keytool = () => join(process.env.JAVA_HOME, 'bin/keytool');
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');
// keytool prints "SHA256: AB:CD:…" for a certificate.
export const certificateDigest = text => text.match(/SHA256:\s*([0-9A-F:]{95})/)?.[1];

// What the store bundle must carry, checked before anything leaves the Mac:
// the chosen version code on the right package, a target SDK Play accepts,
// the release JavaScript, the Firebase sender push needs, and the upload key's
// signature rather than the debug key Expo's template signs release with.
function verify(aab, code, key) {
  const found = {
    packageName: manifest(aab, '/manifest/@package'),
    versionCode: Number(manifest(aab, '/manifest/@android:versionCode')),
    versionName: manifest(aab, '/manifest/@android:versionName'),
    targetSdk: Number(manifest(aab, '/manifest/uses-sdk/@android:targetSdkVersion')),
  };
  if (found.packageName !== APP.packageName) throw new Error(`Bundle is ${found.packageName}, expected ${APP.packageName}`);
  if (found.versionCode !== code) throw new Error(`Bundle has versionCode ${found.versionCode}, expected ${code}`);
  if (!(found.targetSdk >= APP.minTargetSdk)) throw new Error(`Bundle targets SDK ${found.targetSdk}; Play needs ${APP.minTargetSdk} or later`);
  const entries = output('unzip', ['-Z1', aab]).split('\n');
  if (!entries.includes('base/assets/index.android.bundle')) throw new Error('Bundle carries no release JavaScript');
  // `--resource=` answers nothing for this bundle; the full table names it.
  const resources = output('bundletool', ['dump', 'resources', `--bundle=${aab}`]);
  if (!/ - string\/google_app_id$/m.test(resources)) throw new Error('Bundle has no google_app_id; push needs google-services.json');
  // Permissions app.config.js blocks must stay out of the merged manifest.
  const manifestText = output('bundletool', ['dump', 'manifest', `--bundle=${aab}`]);
  const requested = blockedPermissionsIn(manifestText);
  if (requested.length) throw new Error(`Bundle requests blocked permissions: ${requested.join(', ')}`);
  const signer = certificateDigest(output(keytool(), ['-printcert', '-jarfile', aab]));
  const upload = certificateDigest(output(keytool(), ['-list', '-v', '-keystore', key.store, '-alias', APP.alias, '-storepass:env', 'NEWSWORTHY_STOREPASS'],
    { NEWSWORTHY_STOREPASS: key.password }));
  if (!signer || signer !== upload) throw new Error(`Bundle is signed by ${signer ?? 'nothing'}, not the upload key ${upload}`);
  return {
    ...found, uploadCertificateSha256: upload,
    commit: output('git', ['rev-parse', 'HEAD']), dirty: output('git', ['status', '--porcelain']) !== '',
    java: spawnSync(join(process.env.JAVA_HOME, 'bin/java'), ['-version'], { encoding: 'utf8' }).stderr.split('\n')[0],
    aab, sha256: sha256(aab),
  };
}

function requireToolchain() {
  for (const name of ['JAVA_HOME', 'ANDROID_HOME']) {
    if (!process.env[name] || !existsSync(process.env[name])) throw new Error(`Set ${name}; see Local Android release in docs/mobile-release.md`);
  }
}

function bundle(key, code, { build = true } = {}) {
  requireToolchain();
  const out = join(client, 'build/android-release', String(code));
  mkdirSync(out, { recursive: true });
  if (build) {
    console.log(`Building ${APP.packageName} versionCode ${code}`);
    run('npx', ['expo', 'prebuild', '-p', 'android', '--clean', '--no-install'],
      { env: { CI: '1', NEWSWORTHY_ANDROID_VERSION_CODE: String(code), GOOGLE_SERVICES_JSON: key.services } });
    run('./gradlew', ['--no-daemon', 'bundleRelease'], {
      cwd: join(client, 'android'), env: { NODE_ENV: 'production', ...signingEnv(key) }, log: join(out, 'gradle-bundle.log'),
    });
  }
  const aab = join(out, 'Newsworthy.aab');
  copyFileSync(join(client, 'android/app/build/outputs/bundle/release/app-release.aab'), aab);
  const summary = verify(aab, code, key);
  writeFileSync(join(out, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

// One universal APK from the store bundle, signed with the same upload key,
// for `adb install` on a phone before Play has the app.
function apk(key, code) {
  const out = join(client, 'build/android-release', String(code));
  const aab = join(out, 'Newsworthy.aab');
  if (!existsSync(aab)) throw new Error(`No bundle for versionCode ${code}; run bundle first`);
  const apks = join(out, 'Newsworthy.apks');
  rmSync(apks, { force: true });
  // bundletool takes a password only as pass: (a process list shows it) or
  // file:, so it reads a private file that is removed straight after.
  const unzipped = mkdtempSync(join(tmpdir(), 'newsworthy-apks-'));
  const pass = join(unzipped, 'pass');
  writeFileSync(pass, key.password, { mode: 0o600 });
  try {
    run('bundletool', ['build-apks', `--bundle=${aab}`, `--output=${apks}`, '--mode=universal',
      `--ks=${key.store}`, `--ks-pass=file:${pass}`, `--ks-key-alias=${APP.alias}`, `--key-pass=file:${pass}`]);
  } finally { rmSync(pass, { force: true }); }
  run('unzip', ['-q', apks, 'universal.apk', '-d', unzipped]);
  const file = join(out, 'Newsworthy-universal.apk');
  copyFileSync(join(unzipped, 'universal.apk'), file);
  rmSync(unzipped, { recursive: true, force: true });
  console.log(`${file}\nsha256 ${sha256(file)}\nInstall with: adb install -r ${file}`);
}

const usage = `Usage: node script/android-release.mjs <command> [--version-code N] [--track T] [--notes TEXT]
  next-version-code  print Play's highest version code plus one
  bundle             prebuild, build and sign a release .aab, and verify it
  verify             check Gradle's last release .aab again without rebuilding
  apk                turn that bundle into one signed APK for adb install
  upload             upload bundle N to --track (default internal) and commit
  promote            put uploaded bundle N on --track (e.g. alpha), uploading nothing
  release            bundle and apk, then upload when --track is given
--version-code defaults to Play's highest plus one for bundle and release.
--track is one of ${TRACKS.join(', ')}; --notes are the en-US release notes.
Commits hold changes back from review; the owner sends them in Play Console.`;

const option = (args, name) => {
  const at = args.indexOf(name);
  if (at < 0) return undefined;
  if (args[at + 1] === undefined || args[at + 1].startsWith('--')) throw new Error(`${name} needs a value`);
  return args[at + 1];
};

async function main([command, ...rest]) {
  if (!command || command === '--help') return console.log(usage);
  if (!['next-version-code', 'bundle', 'verify', 'apk', 'upload', 'promote', 'release'].includes(command)) throw new Error(usage);
  const given = option(rest, '--version-code');
  const trackFlag = option(rest, '--track');
  const track = trackFlag === undefined ? (command === 'upload' ? 'internal' : undefined) : parseTrack(trackFlag);
  if (track && !['upload', 'promote', 'release'].includes(command)) throw new Error(`--track applies to upload, promote and release\n${usage}`);
  if (command === 'promote' && (!track || given === undefined)) throw new Error(`${usage}\npromote needs --version-code and --track`);
  if (given === undefined && ['verify', 'apk', 'upload'].includes(command)) throw new Error(`${usage}\n${command} needs --version-code`);
  const account = command === 'next-version-code' || track || given === undefined ? playAccount() : undefined;
  if (command === 'next-version-code') return console.log(await playNextVersionCode(account));
  const code = given === undefined ? await playNextVersionCode(account) : parseVersionCode(given);
  const notes = option(rest, '--notes');
  if (command === 'upload') return upload(account, code, track, notes);
  if (command === 'promote') return promote(account, code, track, notes);
  const key = credentials();
  if (command === 'verify') return bundle(key, code, { build: false });
  if (command !== 'apk') bundle(key, code);
  if (command !== 'bundle') apk(key, code);
  if (command === 'release' && track) await upload(account, code, track, notes);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
