// iOS store builds are made on a Mac with Xcode, not by EAS Build: the Expo
// free plan's 15 monthly build credits are shared with another app. The build
// script is the shared app-release skill's (vendor/skills), tested there; this
// file checks Newsworthy's side: the configuration it reads, the build number
// reaching the app, and the UIScene adoption that lets an iOS 27 SDK build
// launch on iOS 27. docs/mobile-release.md describes the route.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const scene = require('../apps/client/plugins/with-scene-lifecycle.js');
const config = JSON.parse(read('app-release.config.json'));
const mobile = JSON.parse(read('mobile.release.json'));

test('the release configuration matches the app and keeps push and widget signing checked', () => {
  assert.equal(config.ios.bundleId, mobile.appId);
  assert.equal(config.ios.teamId, mobile.appleTeamId);
  assert.equal(config.ios.ascAppId, '6812519450');
  assert.equal(config.ios.buildNumberEnv, 'NEWSWORTHY_IOS_BUILD_NUMBER');
  assert.equal(config.ios.testflightGroup, 'Release QA');
  assert.deepEqual(config.ios.requiredEntitlements, { 'aps-environment': 'production' }, 'an archive without production push fails');
  assert.equal(config.ios.appGroup, `group.${mobile.appId}.widgets`, 'the app and its widget share the group');
  assert.equal(config.projectDir, 'apps/client');
  assert.doesNotMatch(read('app-release.config.json'), /BEGIN PRIVATE KEY|ops_|contactPhone/);
});

test('the build number reaches the app and its widget through prebuild', () => {
  const previous = process.env[config.ios.buildNumberEnv];
  const configPath = require.resolve('../apps/client/app.config.js');
  try {
    process.env[config.ios.buildNumberEnv] = '28';
    delete require.cache[configPath];
    assert.equal(require(configPath).ios.buildNumber, '28');
    delete process.env[config.ios.buildNumberEnv];
    delete require.cache[configPath];
    assert.equal(require(configPath).ios.buildNumber, '1');
  } finally {
    if (previous === undefined) delete process.env[config.ios.buildNumberEnv];
    else process.env[config.ios.buildNumberEnv] = previous;
    delete require.cache[configPath];
  }
});

test('nothing builds in EAS: no build profiles and no EAS build workflow', () => {
  const exists = file => existsSync(new URL(`../${file}`, import.meta.url));
  assert.ok(!exists('apps/client/eas.json'), 'iOS and Android store builds are local');
  assert.ok(!exists('apps/client/script/ios-release.mjs'), 'the build script is the shared skill\'s');
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
