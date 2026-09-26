// Widget settings are defined once, in design/widget-settings.json, and both
// platforms must offer exactly those settings with those labels, choices and
// defaults: iOS in the Edit Widget sheet (the configuration intent), Android on
// the widget's own settings screen (RatingWidgetConfigure). Adding a setting
// to one platform alone, or relabelling it on one, fails here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const spec = JSON.parse(read('design/widget-settings.json'));
const snake = key => key.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
const constant = key => snake(key).toUpperCase();
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sources = () => ({
  swift: read('apps/client/targets/widget/NewsworthyWidget.swift'),
  widget: read('apps/client/plugins/widget-android/RatingWidget.java'),
  configure: read('apps/client/plugins/widget-android/RatingWidgetConfigure.java'),
  layout: read('apps/client/plugins/widget-android/res/layout/rating_widget_configure.xml'),
  strings: read('apps/client/plugins/widget-android/res/values/widget_settings.xml'),
  provider: read('apps/client/plugins/widget-android/res/xml/rating_widget_info.xml'),
  plugin: read('apps/client/plugins/with-rating-widget.js'),
});

function checkWidgetSettings(s) {
  // iOS: one configuration parameter per setting, and nothing else.
  assert.match(s.swift, new RegExp(`static var title: LocalizedStringResource = "${escape(spec.title)}"`), 'iOS settings title');
  const parameters = [...s.swift.matchAll(/@Parameter\(title: "([^"]+)", default: ([^)]+)\)\s*var (\w+): (\w+)/g)]
    .map(([, label, value, key, type]) => ({ label, value, key, type }));
  assert.deepEqual(parameters.map(p => p.key), spec.settings.map(setting => setting.key), 'iOS offers exactly the shared settings, in order');
  for (const setting of spec.settings) {
    const parameter = parameters.find(p => p.key === setting.key);
    assert.equal(parameter.label, setting.label, `iOS label for ${setting.key}`);
    assert.equal(parameter.value, setting.type === 'toggle' ? String(setting.default) : `.${setting.default}`, `iOS default for ${setting.key}`);
    for (const indent of ['                ', '                    ']) {
      assert.ok(s.swift.includes(`${indent}entry.${setting.key} = configuration.${setting.key}\n`), `iOS applies ${setting.key} to snapshot and timeline`);
    }
    if (setting.type === 'choice') {
      const cases = s.swift.match(new RegExp(`enum ${parameter.type}: String, AppEnum[^{]*\\{\\s*case ([\\w, ]+)`))?.[1].split(/,\s*/);
      assert.deepEqual(cases, setting.choices.map(choice => choice.value), `iOS choices for ${setting.key}`);
      assert.ok(s.swift.includes(setting.choices.map(choice => `.${choice.value}: "${choice.label}"`).join(', ')), `iOS choice labels for ${setting.key}`);
    }
  }

  // Android: the provider opens the settings screen, optionally on add and again on reconfigure.
  assert.match(s.provider, /android:configure="com\.example\.newsworthy\.RatingWidgetConfigure"/, 'Android provider names its settings screen');
  assert.match(s.provider, /android:widgetFeatures="reconfigurable\|configuration_optional"/, 'Android settings reachable after adding');
  assert.match(s.plugin, /APPWIDGET_CONFIGURE/, 'Android settings screen registered');
  assert.match(s.plugin, /'RatingWidgetConfigure\.java'/, 'Android settings screen copied into the build');
  assert.match(s.plugin, /\$\{mod\.android\.package\}\.RatingWidgetConfigure/, 'Android provider names the real package');
  assert.match(s.strings, new RegExp(`name="widget_settings_title">${escape(spec.title)}<`), 'Android settings title');
  assert.match(s.layout, /@string\/widget_settings_title/, 'Android settings title shown');
  // Every row on the screen is a shared setting or one of its choices, and every shared one has a row.
  const rows = [...s.layout.matchAll(/android:id="@\+id\/(widget_setting_[a-z_]+)"/g)].map(m => m[1]).filter(id => !/_(switch|check)$/.test(id));
  const expected = spec.settings.flatMap(setting => setting.type === 'choice'
    ? setting.choices.map(choice => `widget_setting_${snake(setting.key)}_${choice.value}`) : [`widget_setting_${snake(setting.key)}`]);
  assert.deepEqual(rows, expected, 'Android offers exactly the shared settings, in order');
  for (const setting of spec.settings) {
    const name = snake(setting.key);
    assert.match(s.strings, new RegExp(`name="widget_setting_${name}">${escape(setting.label)}<`), `Android label for ${setting.key}`);
    assert.match(s.layout, new RegExp(`@string/widget_setting_${name}"`), `Android shows the label for ${setting.key}`);
    assert.match(s.widget, new RegExp(`static final String ${constant(setting.key)} = "${setting.key}";`), `Android stores ${setting.key}`);
    assert.match(s.widget, new RegExp(`\\.put\\w+\\(settingKey\\(id, ${constant(setting.key)}\\), ${setting.key}\\)`), `Android saves ${setting.key}`);
    assert.match(s.widget, new RegExp(`remove\\(settingKey\\(id, ${constant(setting.key)}\\)\\)`), `Android forgets ${setting.key} with its widget`);
    if (setting.type === 'toggle') {
      assert.match(s.widget, new RegExp(`getBoolean\\(settingKey\\(id, ${constant(setting.key)}\\), ${setting.default}\\)`), `Android default for ${setting.key}`);
      assert.match(s.layout, new RegExp(`@\\+id/widget_setting_${name}_switch"`), `Android switch for ${setting.key}`);
    } else {
      assert.match(s.widget, new RegExp(`getString\\(settingKey\\(id, ${constant(setting.key)}\\), "${setting.default}"\\)`), `Android default for ${setting.key}`);
      assert.ok(s.configure.includes(`{${setting.choices.map(choice => `"${choice.value}"`).join(', ')}}`), `Android choices for ${setting.key}`);
      for (const choice of setting.choices) {
        assert.match(s.strings, new RegExp(`name="widget_setting_${name}_${choice.value}">${escape(choice.label)}<`), `Android label for ${choice.value}`);
        assert.match(s.layout, new RegExp(`@\\+id/widget_setting_${name}_${choice.value}_check"`), `Android check for ${choice.value}`);
      }
    }
  }
  assert.match(s.widget, /views\.setViewVisibility\(R\.id\.widget_name, showAppName\(cache, id\) \? View\.VISIBLE : View\.GONE\)/, 'Android hides the app name per widget');
  assert.match(s.widget, /Boolean dark = chosenDark\(appearance\(cache, id\)\);/, 'Android appearance per widget');
}

test('iOS and Android widgets offer the same settings, labels, choices and defaults', () => {
  checkWidgetSettings(sources());
});

const regressions = [
  ['a setting added on iOS only', s => { s.swift = s.swift.replace('    @Parameter(title: "Appearance"', '    @Parameter(title: "Show date", default: true)\n    var showDate: Bool\n\n    @Parameter(title: "Appearance"'); }, /iOS offers exactly the shared settings/],
  ['a setting added on Android only', s => { s.layout = s.layout.replace('<LinearLayout android:id="@+id/widget_setting_appearance_system"', '<LinearLayout android:id="@+id/widget_setting_show_date"/><LinearLayout android:id="@+id/widget_setting_appearance_system"'); }, /Android offers exactly the shared settings/],
  ['an iOS label drifting', s => { s.swift = s.swift.replace('.system: "Follow device"', '.system: "Automatic"'); }, /iOS choice labels/],
  ['an iOS default drifting', s => { s.swift = s.swift.replace('@Parameter(title: "Show app name", default: true)', '@Parameter(title: "Show app name", default: false)'); }, /iOS default for showAppName/],
  ['an Android default drifting', s => { s.widget = s.widget.replace('getBoolean(settingKey(id, SHOW_APP_NAME), true)', 'getBoolean(settingKey(id, SHOW_APP_NAME), false)'); }, /Android default for showAppName/],
  ['an Android choice missing', s => { s.configure = s.configure.replace('{"system", "light", "dark"}', '{"system", "dark"}'); }, /Android choices for appearance/],
  ['an iOS setting not applied', s => { s.swift = s.swift.replace('                    entry.appearance = configuration.appearance\n', ''); }, /iOS applies appearance/],
  ['Android settings unreachable after adding', s => { s.provider = s.provider.replace('reconfigurable|', ''); }, /reachable after adding/],
  ['Android app name always shown', s => { s.widget = s.widget.replace('showAppName(cache, id) ? View.VISIBLE : View.GONE', 'View.VISIBLE'); }, /hides the app name/],
];
for (const [name, mutate, error] of regressions) test(`widget settings check rejects: ${name}`, () => {
  const s = sources();
  mutate(s);
  assert.throws(() => checkWidgetSettings(s), error);
});
