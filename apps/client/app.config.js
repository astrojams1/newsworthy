const release = require('../../mobile.release.json');
const design = require('./assets/design.json');
module.exports = {
  name: 'Newsworthy', slug: 'newsworthy', owner: 'astrojams1', version: '1.0.0', scheme: 'newsworthy',
  orientation: 'default', userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  ios: { icon: { light: './assets/icon.png', dark: './assets/icon-dark.png' }, supportsTablet: true, bundleIdentifier: release.appId,
    // The shared app-release skill's ios-release.mjs sets the store build number, read from App Store
    // Connect; prebuild gives it to the app and the widget alike.
    buildNumber: process.env.NEWSWORTHY_IOS_BUILD_NUMBER || '1',
    entitlements: { 'com.apple.security.application-groups': [`group.${release.appId}.widgets`] },
    appleTeamId: process.env.APPLE_TEAM_ID || release.appleTeamId,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
    privacyManifests: { NSPrivacyTracking: false,
      // Keep the packaged declaration aligned with App Store Connect: requested
      // notification delivery plus operational hosting diagnostics, never tracking.
      NSPrivacyCollectedDataTypes: ['DeviceID', 'OtherDataTypes', 'PerformanceData', 'OtherDiagnosticData'].map(type => ({
        NSPrivacyCollectedDataType: `NSPrivacyCollectedDataType${type}`,
        NSPrivacyCollectedDataTypeLinked: true, NSPrivacyCollectedDataTypeTracking: false,
        NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
      })),
      NSPrivacyAccessedAPITypes: [{ NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1', '1C8F.1'] }] } },
  android: { package: release.appId,
    // The shared app-release skill's android-release.mjs sets the store version code, Play's highest
    // plus one, and reads google-services.json from the vault for one run.
    versionCode: Number(process.env.NEWSWORTHY_ANDROID_VERSION_CODE || 1),
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
    // Expo's template requests these; the app draws over nothing and writes no
    // shared files, so Play's listing and review should not see them.
    blockedPermissions: ['android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE'],
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: design.brand.light.center } },
  web: { output: 'static', favicon: './assets/favicon.png' },
  plugins: ['expo-router', 'expo-status-bar', 'expo-image', 'expo-system-ui', '@bacons/apple-targets', './plugins/with-rating-widget', './plugins/with-system-appearance', './plugins/with-scene-lifecycle',
    ['expo-notifications', { icon: './assets/notification-icon.png', color: design.brand.primary, defaultChannel: 'readings' }],
    ['expo-splash-screen', { backgroundColor: design.brand.light.tinted, image: './assets/splash-light.png', imageWidth: 80, dark: { backgroundColor: design.brand.dark.tinted, image: './assets/splash.png' } }]],
  extra: { apiBaseUrl: release.apiBaseUrl, privacyUrl: release.privacyUrl, supportUrl: release.supportUrl,
    eas: { projectId: process.env.EXPO_PROJECT_ID || release.easProjectId } },
};
