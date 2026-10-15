#!/usr/bin/env node
// Local Android release, with no EAS Build: prebuild, build a release bundle
// with Gradle, sign it with the Play upload key from the vault, check what it
// carries and, for a phone, turn it into one installable APK. See
// docs/mobile-release.md.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const client = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(client, '../..');
const release = JSON.parse(readFileSync(join(repo, 'mobile.release.json'), 'utf8'));
export const APP = { packageName: release.appId, alias: 'upload', minTargetSdk: 35 };
export const VAULT = 'op://API Tokens/Newsworthy Android';

// Version codes only ever rise, and Play holds every one it has accepted, so
// its highest is the floor. EAS issued 1 to 12, none of which reached Play.
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

function opRead(field, outFile) {
  const env = { ...process.env };
  if (env.OP_KEY && !env.OP_SERVICE_ACCOUNT_TOKEN) env.OP_SERVICE_ACCOUNT_TOKEN = env.OP_KEY.replace(/^OP_KEY=/, '');
  const args = ['read', ...(outFile ? ['--out-file', outFile] : []), `${VAULT}/${field}`];
  const result = spawnSync('op', args, { env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`op read "${VAULT}/${field}" failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

// The keystore and Firebase file live in a private temporary directory for
// one run and are removed on exit. NEWSWORTHY_ANDROID_KEYSTORE,
// NEWSWORTHY_ANDROID_KEYSTORE_PASSWORD and GOOGLE_SERVICES_JSON (paths, and the
// password itself) take precedence over the vault.
let keyDir;
function credentials() {
  const { NEWSWORTHY_ANDROID_KEYSTORE: store, NEWSWORTHY_ANDROID_KEYSTORE_PASSWORD: password, GOOGLE_SERVICES_JSON: services } = process.env;
  if (store && password && services) return { store, password, services };
  keyDir = mkdtempSync(join(tmpdir(), 'newsworthy-android-'));
  process.on('exit', removeKey);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { removeKey(); process.exit(130); });
  const key = { store: join(keyDir, 'upload.jks'), password: opRead('keystore password'), services: join(keyDir, 'google-services.json') };
  opRead('upload.jks', key.store);
  opRead('google-services.json', key.services);
  return key;
}
function removeKey() { if (keyDir) rmSync(keyDir, { recursive: true, force: true }); keyDir = undefined; }

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

const usage = `Usage: node script/android-release.mjs <command> --version-code N
  bundle   prebuild, build and sign a release .aab, and verify it
  verify   check Gradle's last release .aab again without rebuilding
  apk      turn that bundle into one signed APK for adb install
  release  bundle, then apk`;

function main([command, ...rest]) {
  if (!command || command === '--help') return console.log(usage);
  if (!['bundle', 'verify', 'apk', 'release'].includes(command)) throw new Error(usage);
  const flag = rest.indexOf('--version-code');
  if (flag < 0) throw new Error(`${usage}\nThe next version code is Play Console's highest plus one.`);
  const code = parseVersionCode(rest[flag + 1]);
  const key = credentials();
  if (command === 'verify') return bundle(key, code, { build: false });
  if (command !== 'apk') bundle(key, code);
  if (command !== 'bundle') apk(key, code);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
