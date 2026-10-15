// iOS store builds are made on a Mac with Xcode, not by EAS Build: the Expo
// free plan's 15 monthly build credits are shared with another app. The
// release script and the UIScene adoption that lets an iOS 27 SDK build launch
// on iOS 27 are checked here; docs/mobile-release.md describes the route.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { nextBuildNumber, pem, exportOptions, betaGroupPath, APP } from '../apps/client/script/ios-release.mjs';

const require = createRequire(import.meta.url);
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const scene = require('../apps/client/plugins/with-scene-lifecycle.js');

test('the next build number is one above the highest App Store Connect holds', () => {
  assert.equal(nextBuildNumber(['5', '27', '9', '26']), 28, 'numeric, not lexical');
  assert.equal(nextBuildNumber([]), 1);
  assert.equal(nextBuildNumber(['1.0.3', '12']), 13, 'non-integer versions are ignored');
});

test('the vault key body becomes a PEM file', () => {
  const body = 'A'.repeat(100);
  const key = pem(`${body.slice(0, 50)}\n${body.slice(50)}`);
  assert.match(key, /^-----BEGIN PRIVATE KEY-----\nA{64}\nA{36}\n-----END PRIVATE KEY-----\n$/);
  assert.equal(pem(key), key, 'a key that already has its header is left as it is');
});

test('export uses the App Store method with Apple-managed signing and keeps the chosen number', () => {
  const options = exportOptions('CWQ9AWJF8T');
  assert.match(options, /<key>method<\/key><string>app-store-connect<\/string>/);
  assert.match(options, /<key>signingStyle<\/key><string>automatic<\/string>/);
  assert.match(options, /<key>teamID<\/key><string>CWQ9AWJF8T<\/string>/);
  assert.match(options, /<key>manageAppVersionAndBuildNumber<\/key><false\/>/);
  assert.equal(APP.team, 'CWQ9AWJF8T');
  assert.equal(APP.ascAppId, '6812519450');
});

test('the tester group is found through the top-level collection', () => {
  assert.equal(betaGroupPath(APP.ascAppId, APP.testers), '/v1/betaGroups?filter[app]=6812519450&filter[name]=Release%20QA');
  assert.doesNotMatch(read('apps/client/script/ios-release.mjs'), /\/v1\/apps\/[^`]*\/betaGroups\?filter\[name\]/,
    'the app relationship answers filter[name] with a 400');
});

test('archive and export let Xcode manage profiles with the App Store Connect key', () => {
  const script = read('apps/client/script/ios-release.mjs');
  for (const flag of ['-allowProvisioningUpdates', '-authenticationKeyPath', '-authenticationKeyID', '-authenticationKeyIssuerID', '-exportArchive', "'archive'"]) {
    assert.ok(script.includes(flag), `${flag} is passed to xcodebuild`);
  }
  assert.match(script, /'altool', verb, ipa, '--api-key'/);
  assert.match(script, /op:\/\/API Tokens\/App Store Connect/);
  assert.match(script, /mode: 0o600/, 'the key file is private');
});

test('the build number reaches the app and its widget through prebuild', () => {
  const previous = process.env.NEWSWORTHY_IOS_BUILD_NUMBER;
  const configPath = require.resolve('../apps/client/app.config.js');
  try {
    process.env.NEWSWORTHY_IOS_BUILD_NUMBER = '28';
    delete require.cache[configPath];
    assert.equal(require(configPath).ios.buildNumber, '28');
    delete process.env.NEWSWORTHY_IOS_BUILD_NUMBER;
    delete require.cache[configPath];
    assert.equal(require(configPath).ios.buildNumber, '1');
  } finally {
    if (previous === undefined) delete process.env.NEWSWORTHY_IOS_BUILD_NUMBER;
    else process.env.NEWSWORTHY_IOS_BUILD_NUMBER = previous;
    delete require.cache[configPath];
  }
});

test('nothing builds in EAS: no build profiles and no EAS build workflow', () => {
  const exists = file => existsSync(new URL(`../${file}`, import.meta.url));
  assert.ok(!exists('apps/client/eas.json'), 'iOS and Android store builds are local');
  assert.ok(!exists('.github/workflows/mobile.yml'));
});

const template = `@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}`;

test('the app adopts the UIScene life cycle through Expo\'s scene delegate', () => {
  const output = scene.updateAppDelegate(template);
  assert.match(output, /class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider \{/);
  assert.doesNotMatch(output, /UIWindow\(frame:/, 'the scene delegate creates the window');
  assert.doesNotMatch(output, /startReactNative/, 'and starts React Native into it');
  assert.equal(scene.updateAppDelegate(output), output, 'prebuild is idempotent');
  assert.throws(() => scene.updateAppDelegate('class AppDelegate: Other {}'), /structure changed/);
  const [configuration] = scene.sceneManifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication;
  const delegate = readFileSync(require.resolve('expo/ios/AppDelegates/ExpoAppSceneDelegate.swift'), 'utf8');
  assert.ok(delegate.includes(`@objc(${configuration.UISceneDelegateClassName})`), 'the manifest names the class Expo exports');
  assert.match(read('apps/client/app.config.js'), /'\.\/plugins\/with-scene-lifecycle'/);
});
