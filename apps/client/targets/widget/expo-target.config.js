const release = require('../../../../mobile.release.json');
const fs = require('node:fs');
const path = require('node:path');
module.exports = () => {
  fs.writeFileSync(path.join(__dirname, 'WidgetConfig.swift'), `// Generated from mobile.release.json.\nenum WidgetConfig { static let apiBaseURL = ${JSON.stringify(release.apiBaseUrl)}; static let appGroup = ${JSON.stringify(`group.${release.appId}.widgets`)} }\n`);
  return { type: 'widget', name: 'NewsworthyWidget', displayName: 'Newsworthy',
    bundleIdentifier: `${release.appId}.widget`, deploymentTarget: '16.4',
    frameworks: ['SwiftUI', 'WidgetKit', 'AppIntents'], entitlements: { 'com.apple.security.application-groups': [`group.${release.appId}.widgets`] } };
};
