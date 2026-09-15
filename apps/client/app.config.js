const release = require('../../mobile.release.json');
const design = require('./assets/design.json');
module.exports = {
  name: 'Newsworthy', slug: 'newsworthy', owner: 'astrojams1', version: '1.0.0', scheme: 'newsworthy',
  orientation: 'default', userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  ios: { icon: { light: './assets/icon.png', dark: './assets/icon-dark.png' }, supportsTablet: true, bundleIdentifier: release.appId,
    appleTeamId: process.env.APPLE_TEAM_ID || release.appleTeamId,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
    privacyManifests: { NSPrivacyTracking: false, NSPrivacyCollectedDataTypes: [],
      NSPrivacyAccessedAPITypes: [{ NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] }] } },
  android: { package: release.appId, adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: design.identity.light.surface } },
  web: { output: 'static', favicon: './assets/favicon.png' },
  plugins: ['expo-router', 'expo-status-bar', 'expo-image', 'expo-system-ui', '@bacons/apple-targets', './plugins/with-rating-widget',
    ['expo-splash-screen', { backgroundColor: design.brand.light.tinted, image: './assets/splash-light.png', imageWidth: 80, dark: { backgroundColor: design.brand.dark.tinted, image: './assets/splash.png' } }]],
  extra: { apiBaseUrl: release.apiBaseUrl, privacyUrl: release.privacyUrl, supportUrl: release.supportUrl,
    eas: { projectId: process.env.EXPO_PROJECT_ID || release.easProjectId } },
};
