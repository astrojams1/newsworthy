const release = require('../../mobile.release.json');
module.exports = {
  name: 'Newsworthy', slug: 'newsworthy', version: '1.0.0', scheme: 'newsworthy',
  orientation: 'default', userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  ios: { supportsTablet: true, bundleIdentifier: release.appId,
    ...(process.env.APPLE_TEAM_ID ? { appleTeamId: process.env.APPLE_TEAM_ID } : {}),
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
    privacyManifests: { NSPrivacyTracking: false, NSPrivacyCollectedDataTypes: [],
      NSPrivacyAccessedAPITypes: [{ NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] }] } },
  android: { package: release.appId, adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#101014' } },
  web: { output: 'static', favicon: './assets/favicon.png' },
  plugins: ['expo-router', 'expo-status-bar', 'expo-image', 'expo-system-ui', '@bacons/apple-targets', './plugins/with-rating-widget',
    ['expo-splash-screen', { backgroundColor: '#ffffff', image: './assets/splash-light.png', imageWidth: 80, dark: { backgroundColor: '#101014', image: './assets/splash.png' } }]],
  extra: { apiBaseUrl: release.apiBaseUrl, privacyUrl: release.privacyUrl, supportUrl: release.supportUrl,
    ...(process.env.EXPO_PROJECT_ID ? { eas: { projectId: process.env.EXPO_PROJECT_ID } } : {}) },
};
