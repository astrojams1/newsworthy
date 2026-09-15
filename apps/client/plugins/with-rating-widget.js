const { withAndroidManifest, withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');
const release = require('../../../mobile.release.json');
module.exports = (config) => {
  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application[0];
    app.receiver ??= [];
    app.receiver = app.receiver.filter(receiver => receiver.$['android:name'] !== '.RatingWidget');
    app.receiver.push({ $: { 'android:name': '.RatingWidget', 'android:exported': 'false', 'android:label': 'Newsworthy' },
      'intent-filter': [{ action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] }],
      'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/rating_widget_info' } }] });
    return mod;
  });
  config = withAppBuildGradle(config, (mod) => {
    const marker = '// Newsworthy widget';
    // Replace only our generated block; preserve any plugins that append after it.
    mod.modResults.contents = mod.modResults.contents.replace(/\n\/\/ Newsworthy widget\nandroid \{[\s\S]*?\ndependencies \{ implementation 'androidx\.work:work-runtime:[^']+' \}\n/, '');
    mod.modResults.contents += `\n${marker}\nandroid {\n  buildFeatures { buildConfig true }\n  defaultConfig { buildConfigField 'String', 'NEWSWORTHY_API_URL', '${JSON.stringify(release.apiBaseUrl)}' }\n}\ndependencies { implementation 'androidx.work:work-runtime:2.11.2' }\n`;
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    const source = path.join(__dirname, 'widget-android');
    const main = path.join(mod.modRequest.platformProjectRoot, 'app/src/main');
    const java = path.join(main, 'java', ...mod.android.package.split('.'));
    await fs.mkdir(java, { recursive: true });
    for (const file of ['RatingWidget.java', 'RatingWidgetWorker.java', 'LevelPalette.java']) {
      const text = (await fs.readFile(path.join(source, file), 'utf8')).replace('package com.example.newsworthy;', `package ${mod.android.package};`);
      await fs.writeFile(path.join(java, file), text);
    }
    await fs.cp(path.join(source, 'res'), path.join(main, 'res'), { recursive: true });
    return mod;
  }]);
};
