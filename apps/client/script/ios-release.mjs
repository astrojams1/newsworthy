#!/usr/bin/env node
// Local iOS release, with no EAS Build: read the next build number from App
// Store Connect, prebuild, install pods, archive and export with Apple-managed
// signing, check the archive, upload with altool and hand the processed build
// to TestFlight testers. See docs/mobile-release.md.
import { spawnSync } from 'node:child_process';
import { createHash, sign } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const client = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(client, '../..');
const release = JSON.parse(readFileSync(join(repo, 'mobile.release.json'), 'utf8'));
export const APP = { ascAppId: '6812519450', bundleId: release.appId, team: release.appleTeamId, scheme: 'Newsworthy', testers: 'Release QA' };
const VAULT = 'op://API Tokens/App Store Connect';

// Build numbers only ever rise. Apple holds every build it has accepted, so
// its highest is the floor; EAS's remote counter is no longer consulted.
export function nextBuildNumber(versions) {
  const numbers = versions.map(Number).filter(Number.isInteger);
  return (numbers.length ? Math.max(...numbers) : 0) + 1;
}

// The vault holds the .p8 body without its header and footer.
export function pem(body) {
  const key = body.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return `-----BEGIN PRIVATE KEY-----\n${key.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n`;
}

// "app-store-connect" is Xcode's current name for the app-store method.
// Xcode must not renumber the build: the number is chosen before prebuild.
export function exportOptions(team) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>export</string>
  <key>signingStyle</key><string>automatic</string>
  <key>teamID</key><string>${team}</string>
  <key>manageAppVersionAndBuildNumber</key><false/>
  <key>uploadSymbols</key><true/>
</dict>
</plist>
`;
}

function opRead(field) {
  const env = { ...process.env };
  if (env.OP_KEY && !env.OP_SERVICE_ACCOUNT_TOKEN) env.OP_SERVICE_ACCOUNT_TOKEN = env.OP_KEY.replace(/^OP_KEY=/, '');
  const result = spawnSync('op', ['read', `${VAULT}/${field}`], { env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`op read "${VAULT}/${field}" failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

// The key lives in a private temporary directory for one run and is removed
// on exit. ASC_KEY_ID, ASC_ISSUER_ID and ASC_PRIVATE_KEY_PATH, as used by
// store/scripts/apple.mjs, take precedence over the vault.
let keyDir;
function ascKey() {
  const key = vaultOrEnvKey();
  for (const value of Object.values(key)) hidden.add(value);
  return key;
}
function vaultOrEnvKey() {
  if (process.env.ASC_KEY_ID && process.env.ASC_ISSUER_ID && process.env.ASC_PRIVATE_KEY_PATH) {
    return { id: process.env.ASC_KEY_ID, issuer: process.env.ASC_ISSUER_ID, path: process.env.ASC_PRIVATE_KEY_PATH };
  }
  const id = opRead('key id');
  const issuer = opRead('issuer id');
  keyDir = mkdtempSync(join(tmpdir(), 'newsworthy-asc-'));
  process.on('exit', removeKey);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { removeKey(); process.exit(130); });
  const path = join(keyDir, `AuthKey_${id}.p8`);
  writeFileSync(path, pem(opRead('credential')), { mode: 0o600 });
  return { id, issuer, path };
}
function removeKey() { if (keyDir) rmSync(keyDir, { recursive: true, force: true }); keyDir = undefined; }

function jwt(key) {
  const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = `${enc({ alg: 'ES256', kid: key.id, typ: 'JWT' })}.${enc({ iss: key.issuer, iat: now, exp: now + 300, aud: 'appstoreconnect-v1' })}`;
  return `${payload}.${sign('sha256', Buffer.from(payload), { key: readFileSync(key.path), dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}
// A dropped connection (fetch throws) is retried; an HTTP error is not.
async function api(key, path, method = 'GET', body, attempt = 1) {
  let response;
  try {
    response = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
      method, headers: { Authorization: `Bearer ${jwt(key)}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (attempt >= 3) throw error;
    await new Promise(done => setTimeout(done, 5_000 * attempt));
    return api(key, path, method, body, attempt + 1);
  }
  const json = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(json?.errors)}`);
  return json;
}

async function latestBuildNumber(key) {
  const { data } = await api(key, `/v1/builds?filter[app]=${APP.ascAppId}&sort=-uploadedDate&limit=200&fields[builds]=version`);
  return nextBuildNumber(data.map(build => build.attributes.version)) - 1;
}

// Key ids and the key's path are left out of what is echoed.
const hidden = new Set();
function run(command, args, { cwd = client, env = {}, log } = {}) {
  console.log(`$ ${[command, ...args].map(arg => hidden.has(arg) ? '…' : arg).join(' ')}${log ? `  > ${log}` : ''}`);
  const fd = log ? openSync(log, 'w') : 'inherit';
  const result = spawnSync(command, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', fd, fd] });
  if (log) closeSync(fd);
  if (result.status !== 0) {
    if (log) console.error(readFileSync(log, 'utf8').split('\n').filter(line => /error:|\*\* .* FAILED \*\*/.test(line)).slice(-20).join('\n'));
    throw new Error(`${command} exited with ${result.status ?? result.signal}`);
  }
}
const output = (command, args) => spawnSync(command, args, { cwd: client, encoding: 'utf8' }).stdout.trim();
const plist = (file, key) => output('plutil', ['-extract', key, 'raw', '-o', '-', file]);

// What the store build must carry, checked before anything leaves the Mac:
// the chosen number on the app and its widget (Apple refuses a mismatch), and
// the signed entitlements a missing provisioning capability once dropped.
function verify(out, build, ipa) {
  const app = join(out, 'Newsworthy.xcarchive/Products/Applications/Newsworthy.app');
  const unzipped = join(out, 'ipa');
  rmSync(unzipped, { recursive: true, force: true });
  run('ditto', ['-x', '-k', ipa, unzipped]);
  const signed = join(unzipped, 'Payload/Newsworthy.app');
  const bundles = [app, ...readdirSync(join(app, 'PlugIns')).map(name => join(app, 'PlugIns', name))];
  for (const bundle of bundles) {
    const found = plist(join(bundle, 'Info.plist'), 'CFBundleVersion');
    if (found !== String(build)) throw new Error(`${bundle} has CFBundleVersion ${found}, expected ${build}`);
  }
  const group = `group.${APP.bundleId}.widgets`;
  for (const bundle of [signed, ...readdirSync(join(signed, 'PlugIns')).map(name => join(signed, 'PlugIns', name))]) {
    const entitlements = output('codesign', ['-d', '--entitlements', '-', '--xml', bundle]);
    if (!entitlements.includes(group)) throw new Error(`${bundle} is not signed with ${group}`);
    const team = spawnSync('codesign', ['-dv', bundle], { encoding: 'utf8' }).stderr.match(/TeamIdentifier=(\S+)/)?.[1];
    if (team !== APP.team) throw new Error(`${bundle} is signed by team ${team}, expected ${APP.team}`);
  }
  if (!/<key>aps-environment<\/key>\s*<string>production<\/string>/.test(output('codesign', ['-d', '--entitlements', '-', '--xml', signed]))) {
    throw new Error('The app is not signed for production push notifications');
  }
  return {
    build, version: plist(join(app, 'Info.plist'), 'CFBundleShortVersionString'),
    xcode: plist(join(app, 'Info.plist'), 'DTXcodeBuild'), sdk: plist(join(app, 'Info.plist'), 'DTSDKName'),
    commit: output('git', ['rev-parse', 'HEAD']), dirty: output('git', ['status', '--porcelain']) !== '',
    ipa, sha256: createHash('sha256').update(readFileSync(ipa)).digest('hex'),
  };
}

async function archive(key, requested) {
  const build = requested ?? await latestBuildNumber(key) + 1;
  const out = join(client, 'build/ios-release', String(build));
  mkdirSync(out, { recursive: true });
  console.log(`Building ${APP.bundleId} build ${build} with ${output('xcodebuild', ['-version']).split('\n').join(' ')}`);
  run('npx', ['expo', 'prebuild', '-p', 'ios', '--clean', '--no-install'], { env: { CI: '1', NEWSWORTHY_IOS_BUILD_NUMBER: String(build) } });
  // CocoaPods fails on Unicode normalization without a UTF-8 locale.
  run('pod', ['install'], { cwd: join(client, 'ios'), env: { LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' }, log: join(out, 'pod-install.log') });
  const auth = ['-allowProvisioningUpdates', '-authenticationKeyPath', key.path, '-authenticationKeyID', key.id, '-authenticationKeyIssuerID', key.issuer];
  const xcarchive = join(out, 'Newsworthy.xcarchive');
  rmSync(xcarchive, { recursive: true, force: true });
  run('xcodebuild', ['-workspace', 'ios/Newsworthy.xcworkspace', '-scheme', APP.scheme, '-configuration', 'Release',
    '-destination', 'generic/platform=iOS', '-archivePath', xcarchive, ...auth, 'archive'],
  { log: join(out, 'xcodebuild-archive.log') });
  writeFileSync(join(out, 'ExportOptions.plist'), exportOptions(APP.team));
  const exported = join(out, 'export');
  rmSync(exported, { recursive: true, force: true });
  run('xcodebuild', ['-exportArchive', '-archivePath', xcarchive, '-exportPath', exported,
    '-exportOptionsPlist', join(out, 'ExportOptions.plist'), ...auth], { log: join(out, 'xcodebuild-export.log') });
  const ipa = join(exported, 'Newsworthy.ipa');
  if (!existsSync(ipa)) throw new Error(`No ipa at ${ipa}`);
  const summary = verify(out, build, ipa);
  writeFileSync(join(out, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

function altool(key, verb, ipa) {
  run('xcrun', ['altool', verb, ipa, '--api-key', key.id, '--api-issuer', key.issuer, '--p8-file-path', key.path,
    ...(verb === '--upload-package' ? ['--wait'] : []), '--output-format', 'normal']);
}

// An uploaded build reaches no tester on its own: add it to the internal group.
async function testers(key, build) {
  let found;
  for (let attempt = 0; attempt < 60; attempt++) {
    const { data } = await api(key, `/v1/builds?filter[app]=${APP.ascAppId}&filter[version]=${build}&fields[builds]=version,processingState`);
    found = data[0];
    if (found?.attributes.processingState === 'VALID') break;
    if (['FAILED', 'INVALID'].includes(found?.attributes.processingState)) throw new Error(`Build ${build} is ${found.attributes.processingState}`);
    await new Promise(done => setTimeout(done, 30_000));
  }
  if (found?.attributes.processingState !== 'VALID') throw new Error(`Build ${build} is not VALID after 30 minutes`);
  // This endpoint takes no filter[name]; match the group by name here.
  const group = (await api(key, `/v1/apps/${APP.ascAppId}/betaGroups?limit=200`)).data.find(g => g.attributes.name === APP.testers);
  if (!group) throw new Error(`No beta group named ${APP.testers}`);
  await api(key, `/v1/betaGroups/${group.id}/relationships/builds`, 'POST', { data: [{ type: 'builds', id: found.id }] });
  const detail = (await api(key, `/v1/builds/${found.id}/buildBetaDetail`)).data.attributes;
  console.log(`Build ${build} (${found.id}) added to ${APP.testers}; internal state ${detail.internalBuildState}.`);
}

const usage = `Usage: node script/ios-release.mjs <command> [--build-number N]
  next-build-number   print App Store Connect's highest build number plus one
  archive             prebuild, pod install, archive, export and verify an ipa
  validate <N>        validate build N's ipa with App Store Connect (no upload)
  upload <N>          upload build N's ipa and wait for Apple's processing
  testers <N>         add processed build N to the ${APP.testers} group
  release             archive, upload and testers in one run`;

async function main([command, ...rest]) {
  const flag = rest.indexOf('--build-number');
  const requested = flag >= 0 ? Number(rest[flag + 1]) : undefined;
  const positional = rest.find((arg, i) => !arg.startsWith('--') && rest[i - 1] !== '--build-number');
  const ipaFor = build => {
    const ipa = join(client, 'build/ios-release', String(build), 'export/Newsworthy.ipa');
    if (!existsSync(ipa)) throw new Error(`No archive for build ${build}; run archive first`);
    return ipa;
  };
  if (!command || command === '--help') return console.log(usage);
  if (requested !== undefined && !Number.isInteger(requested)) throw new Error('--build-number takes an integer');
  if (!['next-build-number', 'archive', 'validate', 'upload', 'testers', 'release'].includes(command)) throw new Error(usage);
  if (['validate', 'upload', 'testers'].includes(command) && !Number.isInteger(Number(positional))) throw new Error(usage);
  const key = ascKey();
  if (command === 'next-build-number') console.log(await latestBuildNumber(key) + 1);
  if (command === 'archive') await archive(key, requested);
  if (command === 'validate') altool(key, '--validate-app', ipaFor(positional));
  if (command === 'upload') altool(key, '--upload-package', ipaFor(positional));
  if (command === 'testers') await testers(key, Number(positional));
  if (command === 'release') {
    const { build, ipa } = await archive(key, requested);
    altool(key, '--upload-package', ipa);
    await testers(key, build);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
