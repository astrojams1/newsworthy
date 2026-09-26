const { withAndroidManifest, withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');
const release = require('../../../mobile.release.json');
module.exports = (config) => {
  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application[0];
    app.receiver ??= [];
    app.receiver = app.receiver.filter(receiver => receiver.$['android:name'] !== '.RatingWidget');
    // The widget's own settings screen. The launcher starts it, so it is
    // exported, and it runs in the launcher's task rather than the app's.
    app.activity ??= [];
    app.activity = app.activity.filter(activity => activity.$['android:name'] !== '.RatingWidgetConfigure');
    app.activity.push({ $: { 'android:name': '.RatingWidgetConfigure', 'android:exported': 'true', 'android:theme': '@style/WidgetSettingsTheme',
      'android:label': '@string/widget_settings_title', 'android:excludeFromRecents': 'true', 'android:taskAffinity': '' },
      'intent-filter': [{ action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_CONFIGURE' } }] }] });
    app.receiver.push({ $: { 'android:name': '.RatingWidget', 'android:exported': 'false', 'android:label': 'Newsworthy' },
      'intent-filter': [{ action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] }],
      'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/rating_widget_info' } }] });
    return mod;
  });
  config = withAppBuildGradle(config, (mod) => {
    const marker = '// Newsworthy widget';
    // Replace only our generated block; preserve any plugins that append after it.
    mod.modResults.contents = mod.modResults.contents.replace(/\n\/\/ Newsworthy widget\nandroid \{[\s\S]*?\ndependencies \{\s*implementation 'androidx\.work:work-runtime:[^']+'[\s\S]*?\}\n/, '');
    // Worker exposes ListenableFuture in its API. Keep Guava on the app's compile
    // classpath even when another dependency selects the empty future artifact.
    mod.modResults.contents += `\n${marker}\nandroid {\n  buildFeatures { buildConfig true }\n  defaultConfig { buildConfigField 'String', 'NEWSWORTHY_API_URL', '${JSON.stringify(release.apiBaseUrl)}' }\n}\ndependencies {\n  implementation 'androidx.work:work-runtime:2.11.2'\n  implementation 'com.google.guava:guava:33.5.0-android'\n}\n`;
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    const source = path.join(__dirname, 'widget-android');
    const main = path.join(mod.modRequest.platformProjectRoot, 'app/src/main');
    const java = path.join(main, 'java', ...mod.android.package.split('.'));
    await fs.mkdir(java, { recursive: true });
    for (const file of ['RatingWidget.java', 'RatingWidgetWorker.java', 'RatingWidgetConfigure.java', 'LevelPalette.java']) {
      const text = (await fs.readFile(path.join(source, file), 'utf8')).replace('package com.example.newsworthy;', `package ${mod.android.package};`);
      await fs.writeFile(path.join(java, file), text);
    }
    await fs.cp(path.join(source, 'res'), path.join(main, 'res'), { recursive: true });
    // The provider names its settings screen by fully qualified class.
    const info = path.join(main, 'res/xml/rating_widget_info.xml');
    await fs.writeFile(info, (await fs.readFile(info, 'utf8')).replace('com.example.newsworthy.RatingWidgetConfigure', `${mod.android.package}.RatingWidgetConfigure`));
    return mod;
  }]);
};
