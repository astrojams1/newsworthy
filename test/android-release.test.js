// Android store bundles are built on the owner's Mac with Gradle, not by EAS
// Build, and signed with the Play upload key from the vault. The release
// script is checked here; docs/mobile-release.md describes the route.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { APP, VAULT, certificateDigest, parseVersionCode, signingEnv } from '../apps/client/script/android-release.mjs';

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
