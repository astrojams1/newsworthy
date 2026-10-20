// Android store bundles are built on the owner's Mac with Gradle, not by EAS
// Build, and uploaded to Play testing tracks through the Play Developer API by
// the shared app-release skill's script (vendor/skills), tested there. This file
// checks Newsworthy's side: the configuration the script reads and the version
// code reaching the app. docs/mobile-release.md describes the route.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const config = JSON.parse(read('app-release.config.json'));

test('the version code reaches the app through prebuild', () => {
  const previous = process.env[config.android.versionCodeEnv];
  const configPath = require.resolve('../apps/client/app.config.js');
  try {
    process.env[config.android.versionCodeEnv] = '13';
    delete require.cache[configPath];
    assert.equal(require(configPath).android.versionCode, 13);
    delete process.env[config.android.versionCodeEnv];
    delete require.cache[configPath];
    assert.equal(require(configPath).android.versionCode, 1);
  } finally {
    if (previous === undefined) delete process.env[config.android.versionCodeEnv];
    else process.env[config.android.versionCodeEnv] = previous;
    delete require.cache[configPath];
  }
});

test('unused Android permissions are blocked in the app and checked in the bundle', () => {
  const configPath = require.resolve('../apps/client/app.config.js');
  delete require.cache[configPath];
  assert.deepEqual(require(configPath).android.blockedPermissions, config.android.blockedPermissions);
  assert.equal(require(configPath).android.package, config.android.package);
});

test('push is checked in every bundle and the vault item is Newsworthy\'s', () => {
  assert.equal(config.android.googleServices, true, 'prebuild gets google-services.json from the vault');
  assert.deepEqual(config.android.requiredResources, ['string/google_app_id']);
  assert.equal(config.android.vault, 'op://API Tokens/Newsworthy Android');
  assert.equal(config.android.minTargetSdk, 36);
  assert.ok(!existsSync(new URL('../apps/client/script/android-release.mjs', import.meta.url)), 'the script is the shared skill\'s');
});

// The owner sends changes for review in Play Console; an API commit must not.
// On 19 October version 16 stood rejected, and versions 17 and later were to
// reach testing tracks without a new submission.
test('every Play commit holds its changes back from review', () => {
  assert.equal(config.android.holdForReview, true);
});
