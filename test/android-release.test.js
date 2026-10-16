// Android store bundles are built on the owner's Mac with Gradle, not by EAS
// Build, signed with the Play upload key from the vault and uploaded to a Play
// testing track through the Play Developer API. The release script is checked
// here; docs/mobile-release.md describes the route.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  APP, VAULT, TRACKS, assertion, certificateDigest, jwtClaims, nextVersionCode, parseTrack, parseVersionCode, signingEnv, trackRelease,
} from '../apps/client/script/android-release.mjs';

const require = createRequire(import.meta.url);
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('the version code is a positive integer chosen by the caller', () => {
  assert.equal(parseVersionCode('13'), 13);
  for (const bad of ['0', '-1', '1.5', 'x', undefined]) assert.throws(() => parseVersionCode(bad), /positive integer/);
});

test('Gradle signs with the upload key through injected properties, passed as environment', () => {
  const env = signingEnv({ store: '/tmp/k.jks', password: 'secret' });
  const prefix = 'ORG_GRADLE_PROJECT_android.injected.signing.';
  assert.equal(env[`${prefix}store.file`], '/tmp/k.jks');
  assert.equal(env[`${prefix}store.password`], 'secret');
  assert.equal(env[`${prefix}key.alias`], 'upload');
  assert.equal(env[`${prefix}key.password`], 'secret');
  const script = read('apps/client/script/android-release.mjs');
  assert.doesNotMatch(script, /-Pandroid\.injected/, 'no password on a command line');
  assert.match(script, /--ks-pass=file:/);
  assert.match(script, /mode: 0o600/, 'the password file is private');
  assert.match(script, /'-storepass:env'/);
});

test('credentials come from the vault item and the bundle is checked before it leaves the Mac', () => {
  assert.equal(VAULT, 'op://API Tokens/Newsworthy Android');
  assert.equal(APP.packageName, 'com.astrojams.newsworthy');
  const script = read('apps/client/script/android-release.mjs');
  for (const field of ["'upload.jks'", "'google-services.json'", "'keystore password'"]) assert.ok(script.includes(field), `${field} is read`);
  for (const check of ['versionCode', 'targetSdkVersion', 'index.android.bundle', 'google_app_id', '-printcert']) {
    assert.ok(script.includes(check), `the bundle's ${check} is verified`);
  }
});

test('keytool certificate digests are read whole', () => {
  const digest = Array.from({ length: 32 }, (_, i) => i.toString(16).toUpperCase().padStart(2, '0')).join(':');
  assert.equal(certificateDigest(`Owner: CN=x\n\t SHA1: AA\n\t SHA256: ${digest}\nSignature`), digest);
  assert.equal(certificateDigest('no certificate'), undefined);
});

test('the version code reaches the app through prebuild', () => {
  const previous = process.env.NEWSWORTHY_ANDROID_VERSION_CODE;
  const configPath = require.resolve('../apps/client/app.config.js');
  try {
    process.env.NEWSWORTHY_ANDROID_VERSION_CODE = '13';
    delete require.cache[configPath];
    assert.equal(require(configPath).android.versionCode, 13);
    delete process.env.NEWSWORTHY_ANDROID_VERSION_CODE;
    delete require.cache[configPath];
    assert.equal(require(configPath).android.versionCode, 1);
  } finally {
    if (previous === undefined) delete process.env.NEWSWORTHY_ANDROID_VERSION_CODE;
    else process.env.NEWSWORTHY_ANDROID_VERSION_CODE = previous;
    delete require.cache[configPath];
  }
});

test('the next version code is one above the highest Play holds, on a track or not', () => {
  const tracks = [
    { track: 'internal', releases: [{ versionCodes: ['14'], status: 'completed' }] },
    { track: 'production', releases: [] },
    { track: 'alpha' },
    { track: 'beta', releases: [{ versionCodes: ['9', '11'] }] },
  ];
  assert.equal(nextVersionCode(tracks, []), 15, 'numeric, not lexical');
  assert.equal(nextVersionCode(tracks, [{ versionCode: 16 }]), 17, 'an uploaded bundle on no track still holds its code');
  assert.equal(nextVersionCode(undefined, undefined), 1, 'Play answers with no field when it holds nothing');
});

test('a release goes to a testing track as one completed release with en-US notes', () => {
  assert.deepEqual(trackRelease('internal', 15, 'Newsworthy 1.0.0 (15).'), {
    track: 'internal',
    releases: [{ versionCodes: ['15'], status: 'completed', releaseNotes: [{ language: 'en-US', text: 'Newsworthy 1.0.0 (15).' }] }],
  });
  assert.deepEqual(TRACKS, ['internal', 'alpha', 'beta']);
  assert.equal(parseTrack('internal'), 'internal');
  assert.throws(() => parseTrack('production'), /Play Console/, 'the service account releases to testing only');
});

test('the service account signs its own token request with RS256', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const account = {
    client_email: 'play-release@newsworthy.iam.gserviceaccount.com', private_key_id: 'abc123',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }), token_uri: 'https://oauth2.googleapis.com/token',
  };
  assert.deepEqual(jwtClaims(account, 1000), {
    iss: account.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token', iat: 1000, exp: 4600,
  });
  const [header, claims, signature] = assertion(account, 1000).split('.');
  const decode = part => JSON.parse(Buffer.from(part, 'base64url'));
  assert.deepEqual(decode(header), { alg: 'RS256', typ: 'JWT', kid: 'abc123' });
  assert.deepEqual(decode(claims), jwtClaims(account, 1000));
  assert.ok(verify('sha256', Buffer.from(`${header}.${claims}`), publicKey, Buffer.from(signature, 'base64url')));
});

test('the Play key comes from the vault item and the upload is checked end to end', () => {
  const script = read('apps/client/script/android-release.mjs');
  assert.ok(script.includes("'play-service-account.json'"), 'the key is a vault attachment');
  assert.match(script, /privateDir\(\), 'play-service-account\.json'/, 'it is written to the private temporary directory');
  assert.match(script, /uploaded\.sha256 !== digest/, "Play's digest of the upload is compared with ours");
  for (const step of ['/edits', 'bundles?uploadType=media', ':validate', ':commit']) assert.ok(script.includes(step), `${step} is called`);
  assert.doesNotMatch(script, /from '(?!node:)/, 'no dependencies');
});

// Expo's template requests SYSTEM_ALERT_WINDOW and external storage; the app
// uses neither, so the config blocks them and a release refuses a bundle that
// still requests them (found in versionCode 15's manifest, 2026-10-15).
test('unused Android permissions are blocked and checked in the bundle', async () => {
  const { BLOCKED_PERMISSIONS, blockedPermissionsIn } = await import('../apps/client/script/android-release.mjs');
  const configPath = require.resolve('../apps/client/app.config.js');
  delete require.cache[configPath];
  assert.deepEqual(require(configPath).android.blockedPermissions, BLOCKED_PERMISSIONS);
  assert.deepEqual(blockedPermissionsIn('<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>'), ['android.permission.SYSTEM_ALERT_WINDOW']);
  assert.deepEqual(blockedPermissionsIn('<uses-permission android:name="android.permission.INTERNET"/><uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>'), []);
  assert.deepEqual(blockedPermissionsIn('<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGEX"/>'), [], 'whole names only');
  assert.match(read('apps/client/script/android-release.mjs'), /Bundle requests blocked permissions/);
});
