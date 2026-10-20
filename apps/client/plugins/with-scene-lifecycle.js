const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');

// iOS 27 stops an app built with the iOS 27 SDK at launch unless it adopts the
// UIScene life cycle (_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
// Expo ships the scene delegate; the template's app delegate does not use it
// yet. The scene delegate creates the window and starts React Native into it,
// so the app delegate only builds the factory and must not create a window.
const sceneManifest = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [{
      UISceneConfigurationName: 'Default Configuration',
      UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
    }],
  },
};

const windowStart = /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif\n/;

function updateAppDelegate(source) {
  if (source.includes('ExpoReactNativeFactoryProvider')) return source;
  const declaration = 'class AppDelegate: ExpoAppDelegate {';
  if (!source.includes(declaration) || !windowStart.test(source)) {
    throw new Error('AppDelegate.swift structure changed; UIScene adoption needs review.');
  }
  return source
    .replace(declaration, 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {')
    .replace(windowStart, '\n    // ExpoAppSceneDelegate creates the window and starts React Native (UIScene life cycle).\n');
}

module.exports = config => withInfoPlist(withAppDelegate(config, mod => {
  if (mod.modResults.language !== 'swift') throw new Error('UIScene adoption expects a Swift AppDelegate.');
  mod.modResults.contents = updateAppDelegate(mod.modResults.contents);
  return mod;
}), mod => {
  mod.modResults.UIApplicationSceneManifest = sceneManifest;
  return mod;
});
module.exports.updateAppDelegate = updateAppDelegate;
module.exports.sceneManifest = sceneManifest;
