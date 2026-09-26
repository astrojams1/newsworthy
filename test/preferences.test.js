import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PREFERENCES, STORAGE_KEY, THEME_CHOICES, THRESHOLD_CHOICES, clampThreshold, parsePreferences, resolveDark } from '../apps/client/lib/preferences.js';
import { nodes, renderSettings, renderToggle } from './helpers/render-settings.js';
import { createSubscriptionController } from '../apps/client/lib/subscription.js';

test('system appearance, no notifications and no timeline are the defaults, and a damaged store falls back field by field', () => {
  assert.deepEqual(THEME_CHOICES.map(c => [c.value, c.label]), [['system', 'Follow device'], ['light', 'Light'], ['dark', 'Dark']]);
  assert.deepEqual(DEFAULT_PREFERENCES, { theme: 'system', widgetTheme: 'system', notifications: { enabled: false, threshold: 8, token: null }, timeline: false });
  assert.deepEqual(parsePreferences(null), DEFAULT_PREFERENCES);
  assert.deepEqual(parsePreferences('{not json'), DEFAULT_PREFERENCES);
  assert.deepEqual(parsePreferences({ theme: 'sepia', widgetTheme: 'sepia', notifications: { enabled: 'yes', threshold: 12 }, timeline: 'yes' }), DEFAULT_PREFERENCES);
  const kept = { theme: 'dark', widgetTheme: 'light', notifications: { enabled: true, threshold: 6, token: 'ExponentPushToken[abc]' }, timeline: true };
  assert.deepEqual(parsePreferences(JSON.stringify(kept)), kept);
  // An "on" with no device registered is not on: the server has nothing to send to.
  assert.deepEqual(parsePreferences({ notifications: { enabled: true, threshold: 6 } }).notifications, { enabled: false, threshold: 6, token: null });
  assert.equal(STORAGE_KEY, 'newsworthy.preferences.v1');
  // A store written before widgets had a choice keeps its app theme and
  // leaves widgets following the device, as they did.
  assert.deepEqual(parsePreferences({ theme: 'dark' }).widgetTheme, 'system');
  assert.equal(parsePreferences({ theme: 'light', widgetTheme: 'dark' }).theme, 'light', 'the two choices are independent');
});

test('the chosen appearance wins and System follows the device', () => {
  assert.equal(resolveDark('system', true), true);
  assert.equal(resolveDark('system', false), false);
  assert.equal(resolveDark('dark', false), true);
  assert.equal(resolveDark('light', true), false);
  assert.deepEqual([clampThreshold(0), clampThreshold(8.6), clampThreshold(11)], [1, 9, 10]);
});

const text = tree => tree.filter(n => n.type === 'Text').map(n => [n.props.children].flat(Infinity).filter(v => v != null && v !== false).join(''));

test('the website shows the appearance choice and no notification setting', () => {
  const overview = nodes(renderSettings({ platform: 'web' }).tree);
  assert.ok(overview.some(n => n.type === 'Head'), 'the page has its own title');
  assert.ok(!overview.some(n => n.props?.testID === 'notifications-link'), 'push notifications are a native feature');
  assert.deepEqual(text(overview), ['Preferences', 'Appearance', 'Follow device', 'Show timeline', 'About', 'Privacy', 'Support']);
  const all = nodes(renderSettings({ platform: 'web', screen: 'appearance' }).tree);
  assert.ok(all.some(n => n.type === 'Head'), 'the page has its own title');
  const radios = all.filter(n => n.props?.accessibilityRole === 'radio');
  assert.deepEqual(radios.map(n => [n.props.accessibilityLabel, n.props.accessibilityState.checked]),
    [['Follow device', true], ['Light', false], ['Dark', false]]);
  assert.deepEqual(text(all), ['Follow device', 'Light', 'Dark']);
  for (const screen of ['notifications', 'threshold']) {
    const alerts = renderSettings({ platform: 'web', screen }).tree;
    assert.equal(alerts.type, 'Redirect', 'a link to an alerts page lands on the overview');
    assert.equal(alerts.props.href, '/settings');
  }
  // Vertical: each option is its own full-width row, the checked one marked.
  assert.deepEqual(radios.map(n => n.props.style.flexDirection), ['row', 'row', 'row']);
  assert.deepEqual(radios.map(n => nodes(n).some(c => c.type === 'Glyph' && c.props.name === 'check')), [true, false, false], 'a drawn check marks the chosen row');
});

test('the overview is a list of pages, each with an icon, its current value and a chevron', () => {
  for (const platform of ['web', 'ios', 'android']) for (const [stored, value] of [[{}, 'Off'], [{ theme: 'dark', notifications: { enabled: true, threshold: 9, token: 'ExponentPushToken[x]' } }, '9 or higher']]) {
    const all = nodes(renderSettings({ platform, stored }).tree);
    const links = all.filter(n => n.type === 'Link' && n.props.href.startsWith('/settings/'));
    const expected = platform === 'web' ? ['/settings/appearance'] : ['/settings/appearance', '/settings/notifications'];
    assert.deepEqual(links.map(n => n.props.href), expected);
    const rows = links.map(n => nodes(n).find(c => c.type === 'Pressable'));
    const theme = stored.theme === 'dark' ? 'Dark' : 'Follow device';
    assert.deepEqual(rows.map(n => n.props.accessibilityLabel), [`Appearance, ${theme}`, `Notifications, ${value}`].slice(0, expected.length));
    for (const row of rows) {
      const glyphs = nodes(row).filter(n => n.type === 'Glyph').map(n => n.props.name);
      assert.equal(glyphs.at(-1), 'chevron', 'a row that opens a page ends in a chevron');
      assert.ok(['appearance', 'notifications'].includes(glyphs[0]), 'every row has a leading icon');
      assert.equal(row.props.style.minHeight, 56);
    }
    // Sentence-case section titles, not the old tracked capitals.
    const headers = all.filter(n => n.type === 'Text' && n.props.accessibilityRole === 'header');
    assert.deepEqual(headers.map(n => n.props.children), ['Preferences', 'About']);
    assert.ok(headers.every(n => n.props.style.textTransform === undefined && n.props.style.letterSpacing === undefined));
  }
});

for (const platform of ['ios', 'android']) {
  test(`${platform}: alerts are off by default at a threshold of 8, shown before opting in`, () => {
    const { tree, calls } = renderSettings({ platform, screen: 'notifications' });
    const all = nodes(tree);
    const toggle = all.find(n => n.type === 'Toggle');
    assert.equal(toggle.props.value, false);
    assert.equal(toggle.props.accessibilityLabel, 'High-score alerts');
    // One group: the switch, then the threshold, which opens its own page.
    const group = all.find(n => n.props?.testID === 'alert-options');
    const rowControl = nodes(group).find(n => n.props?.testID === 'notifications-row');
    assert.equal(rowControl.props.accessibilityRole, 'switch');
    assert.equal(typeof rowControl.props.onPress, 'function', 'the whole row toggles, not only the switch');
    const thresholdLink = nodes(group).find(n => n.type === 'Link');
    assert.equal(thresholdLink.props.href, '/settings/threshold');
    const thresholdRow = nodes(thresholdLink).find(n => n.props?.testID === 'threshold-row');
    assert.equal(thresholdRow.props.accessibilityLabel, 'Threshold, 8 or higher');
    assert.equal(nodes(thresholdRow).filter(n => n.type === 'Glyph').at(-1).props.name, 'chevron');
    assert.deepEqual(all.filter(n => n.type === 'Text' && n.props.accessibilityRole === 'header'), [], 'no section titles on this page');
    assert.deepEqual(text(all), ['High-score alerts', 'Threshold', '8 or higher',
      'Get an alert when the displayed score reaches your threshold, once per development.', ''], 'no line restating the switch');
    // The threshold page: every choice a full-width row, the chosen one checked.
    const picker = renderSettings({ platform, screen: 'threshold' });
    const scores = nodes(picker.tree).filter(n => /^threshold-\d+$/.test(n.props?.testID ?? ''));
    assert.deepEqual(scores.map(n => [Number(n.props.testID.slice(10)), n.props.accessibilityState.checked]),
      THRESHOLD_CHOICES.map(v => [v, v === 8]));
    assert.deepEqual(THRESHOLD_CHOICES, [5, 6, 7, 8, 9, 10]);
    assert.deepEqual(scores.map(n => nodes(n).some(c => c.type === 'Glyph' && c.props.name === 'check')), THRESHOLD_CHOICES.map(v => v === 8));
    for (const score of scores) {
      assert.equal(score.props.accessibilityRole, 'radio');
      assert.match(score.props.accessibilityLabel, /^Alert at \d+ or higher$/);
    }
    const appearance = renderSettings({ platform, screen: 'appearance' });
    const radios = nodes(appearance.tree).filter(n => n.props?.accessibilityRole === 'radio' && /^theme-/.test(n.props.testID));
    assert.deepEqual(radios.map(n => [n.props.accessibilityLabel, n.props.accessibilityState.checked]),
      [['Follow device', true], ['Light', false], ['Dark', false]]);
    assert.deepEqual(radios.map(n => n.props.style.flexDirection), ['row', 'row', 'row']);
    assert.deepEqual(radios.map(n => nodes(n).some(c => c.type === 'Glyph' && c.props.name === 'check')), [true, false, false], 'a drawn check marks the chosen row');
    // Every setting is one row with the same minimum, growing with large text.
    const rows = [...radios, rowControl, thresholdRow, ...scores];
    assert.deepEqual(rows.map(n => n.props.style.minHeight), Array(rows.length).fill(56));
    assert.deepEqual(rows.map(n => n.props.style.height), Array(rows.length).fill(undefined), 'a minimum, not a fixed height that clips enlarged text');
    assert.equal(all.find(n => n.type === 'ActivityIndicator'), undefined);
    // Choosing Dark records the choice; nothing else is touched.
    nodes(appearance.tree).find(n => n.props?.testID === 'theme-dark').props.onPress();
    assert.deepEqual(appearance.calls.setTheme, ['dark']);
    assert.deepEqual(appearance.calls.setWidgetTheme, [], 'the app choice leaves widgets alone');
    assert.deepEqual([calls.enable, calls.disable, calls.choose, appearance.calls.enable], [0, 0, [], 0]);
  });
}

// Reported 2026-09-26: widgets could only follow the device. The apps choose
// the widgets' appearance on its own, beside the app's, and the website, which
// has no widgets, keeps its single untitled choice.
test('the apps choose the widget appearance separately from the app appearance', () => {
  for (const platform of ['ios', 'android']) {
    const appearance = renderSettings({ platform, screen: 'appearance', stored: { theme: 'dark', widgetTheme: 'light' } });
    const all = nodes(appearance.tree);
    assert.deepEqual(text(all), ['App', 'Follow device', 'Light', 'Dark', 'Widgets', 'Follow device', 'Light', 'Dark']);
    const groups = all.filter(n => n.props?.accessibilityRole === 'radiogroup');
    assert.deepEqual(groups.map(n => n.props.accessibilityLabel), ['App appearance', 'Widget appearance']);
    const checked = prefix => all.filter(n => n.props?.accessibilityRole === 'radio' && n.props.testID.startsWith(prefix))
      .map(n => [n.props.testID.slice(prefix.length), n.props.accessibilityState.checked]);
    assert.deepEqual(checked('theme-'), [['system', false], ['light', false], ['dark', true]]);
    assert.deepEqual(checked('widget-theme-'), [['system', false], ['light', true], ['dark', false]]);
    const widgetRows = all.filter(n => n.props?.accessibilityRole === 'radio' && n.props.testID.startsWith('widget-theme-'));
    assert.deepEqual(widgetRows.map(n => n.props.style.minHeight), [56, 56, 56], 'widget rows share the settings row minimum');
    all.find(n => n.props?.testID === 'widget-theme-dark').props.onPress();
    all.find(n => n.props?.testID === 'widget-theme-system').props.onPress();
    assert.deepEqual(appearance.calls.setWidgetTheme, ['dark', 'system']);
    assert.deepEqual(appearance.calls.setTheme, [], 'the widget choice leaves the app alone');
  }
  const web = nodes(renderSettings({ platform: 'web', screen: 'appearance' }).tree);
  assert.ok(!web.some(n => /^widget-theme-/.test(n.props?.testID ?? '')), 'the website has no widgets');
  assert.deepEqual(web.filter(n => n.props?.accessibilityRole === 'radiogroup').map(n => n.props.accessibilityLabel), ['Appearance']);
});

test('Privacy and Support are rows in Settings on every platform, opening the policy pages', () => {
  for (const platform of ['web', 'ios', 'android']) {
    const all = nodes(renderSettings({ platform }).tree);
    const links = all.filter(n => n.type === 'Link' && !n.props.href.startsWith('/settings/'));
    assert.deepEqual(links.map(n => n.props.href), ['/privacy', '/support'], platform);
    const rows = links.map(n => nodes(n).find(c => c.props?.accessibilityRole === 'link'));
    assert.deepEqual(rows.map(n => n.props.accessibilityLabel), ['Privacy', 'Support']);
    // They leave the app: a leading icon, and a link arrow where a page row has its chevron.
    assert.deepEqual(rows.map(n => nodes(n).filter(c => c.type === 'Glyph').map(c => c.props.name)), [['privacy', 'external'], ['support', 'external']]);
    assert.deepEqual(rows.map(n => n.props.accessibilityHint), ['Opens in your browser', 'Opens in your browser']);
    // The same row as every other setting: one minimum, growing with large text.
    assert.deepEqual(rows.map(n => n.props.style.minHeight), [56, 56]);
    assert.deepEqual(rows.map(n => n.props.style.height), [undefined, undefined]);
    assert.ok(text(all).indexOf('About') > text(all).indexOf('Appearance'), 'the links come after the settings themselves');
  }
});

test('while saving, progress appears below the controls and both controls are held', () => {
  const all = nodes(renderSettings({ platform: 'ios', screen: 'notifications', busy: true }).tree);
  assert.ok(!all.some(n => n.type === 'ActivityIndicator'));
  assert.equal(all.find(n => n.props?.testID === 'notifications-status').props.children, 'Saving…');
  assert.equal(all.find(n => n.type === 'Toggle').props.disabled, true);
  assert.equal(all.find(n => n.props?.testID === 'notifications-row').props.disabled, true);
  const picker = nodes(renderSettings({ platform: 'ios', screen: 'threshold', busy: true }).tree);
  assert.equal(picker.find(n => n.props?.testID === 'notifications-status').props.children, 'Saving…');
  assert.ok(picker.filter(n => /^threshold-\d+$/.test(n.props?.testID ?? '')).every(n => n.props.disabled));
  // Idle, nothing restates the controls' state.
  const idle = nodes(renderSettings({ platform: 'ios', screen: 'notifications' }).tree);
  assert.equal(idle.find(n => n.props?.testID === 'notifications-status').props.children, '');
});

test('the screen hands every registration change to the provider and shows what came back', async () => {
  const token = 'ExponentPushToken[on-on-on-on]';
  const on = renderSettings({ platform: 'android', screen: 'notifications', stored: { notifications: { enabled: true, threshold: 8, token } } });
  assert.equal(nodes(on.tree).find(n => n.type === 'Toggle').props.value, true);
  const onPicker = renderSettings({ platform: 'android', screen: 'threshold', stored: { notifications: { enabled: true, threshold: 8, token } } });
  await nodes(onPicker.tree).find(n => n.props?.testID === 'threshold-9').props.onPress();
  assert.deepEqual(onPicker.calls.choose, [9]);
  await nodes(onPicker.tree).find(n => n.props?.testID === 'threshold-8').props.onPress();
  assert.deepEqual(onPicker.calls.choose, [9], 'the threshold already chosen changes nothing');
  await nodes(on.tree).find(n => n.type === 'Toggle').props.onValueChange(false);
  assert.deepEqual([on.calls.enable, on.calls.disable], [0, 1]);
  assert.deepEqual(on.calls.notices.filter(Boolean), []);

  const off = renderSettings({ platform: 'ios', screen: 'notifications' });
  await nodes(off.tree).find(n => n.type === 'Toggle').props.onValueChange(true);
  assert.deepEqual([off.calls.enable, off.calls.disable], [1, 0]);

  const failing = { disable: { ok: false, reason: 'offline' }, choose: { ok: false, reason: 'offline' } };
  const stored = { notifications: { enabled: true, threshold: 8, token } };
  const stuck = renderSettings({ platform: 'android', screen: 'notifications', push: failing, stored });
  await nodes(stuck.tree).find(n => n.type === 'Toggle').props.onValueChange(false);
  const stuckPicker = renderSettings({ platform: 'android', screen: 'threshold', push: failing, stored });
  await nodes(stuckPicker.tree).find(n => n.props?.testID === 'threshold-9').props.onPress();
  assert.deepEqual([...stuck.calls.notices, ...stuckPicker.calls.notices].filter(Boolean), ['offline', 'offline'], 'a failure is said, not hidden');
  assert.deepEqual([clampThreshold(0), clampThreshold(8.6), clampThreshold(11)], [1, 9, 10]);
});

// ---- the controller: one queue for the life of the app, whatever screen asks

function controllerWith(initial, api, onPendingChange) {
  let state = { enabled: false, threshold: 8, token: null, ...initial };
  const writes = [];
  const calls = { enable: [], disable: [], update: [] };
  const controller = createSubscriptionController({
    onPendingChange,
    read: () => state,
    write: update => { writes.push(update); state = { ...state, ...update }; },
    api: {
      enablePush: async threshold => { calls.enable.push(threshold); return api.enable ? api.enable() : { ok: true, token: 'ExponentPushToken[test-test-test]' }; },
      disablePush: async token => { calls.disable.push(token); return api.disable ? api.disable() : true; },
      updatePushThreshold: async (token, threshold) => { calls.update.push([token, threshold]); return api.update ? api.update() : true; },
    },
  });
  return { controller, calls, writes, state: () => state };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('turning on registers the score chosen beforehand; a refusal changes nothing', async () => {
  const granted = controllerWith({ threshold: 7 }, {});
  assert.deepEqual(await granted.controller.enable(), { ok: true });
  assert.deepEqual(granted.calls.enable, [7]);
  assert.deepEqual(granted.state(), { enabled: true, threshold: 7, token: 'ExponentPushToken[test-test-test]' });

  const denied = controllerWith({}, { enable: () => ({ ok: false, reason: 'denied' }) });
  assert.deepEqual(await denied.controller.enable(), { ok: false, reason: 'denied' });
  assert.deepEqual(denied.writes, [], 'no registration is claimed that did not happen');

  const stuck = controllerWith({ enabled: true, token: 'ExponentPushToken[on-on-on-on]' }, { disable: () => false });
  assert.deepEqual(await stuck.controller.disable(), { ok: false, reason: 'offline' });
  assert.equal(stuck.state().enabled, true, 'a device the server still holds stays shown as on');
});

test('choosing a score is local while off, and re-registers a device that is on', async () => {
  const off = controllerWith({}, {});
  assert.deepEqual(await off.controller.choose(9), { ok: true });
  assert.deepEqual(off.writes, [{ threshold: 9 }]);
  assert.deepEqual(off.calls.update, [], 'off: the server holds no row to update');
  const token = 'ExponentPushToken[on-on-on-on]';
  const on = controllerWith({ enabled: true, token }, {});
  await on.controller.choose(9);
  assert.deepEqual(on.calls.update, [[token, 9]]);
  await on.controller.choose(9);
  assert.deepEqual(on.calls.update, [[token, 9]], 'the score already chosen changes nothing');
  const failed = controllerWith({ enabled: true, token }, { update: () => false });
  assert.deepEqual(await failed.controller.choose(9), { ok: false, reason: 'offline' });
  assert.equal(failed.state().threshold, 8, 'a score the server did not take is not kept');
});

test('a switch-off cannot be undone by a score change in flight, from this screen or a reopened one', async () => {
  // The findings: a threshold PUT overlapping the DELETE could land after it
  // and register the device again; and a queue owned by the screen was reset
  // when the screen was reopened. The controller is the provider's, so a
  // second screen instance is just another caller of the same queue.
  const token = 'ExponentPushToken[on-on-on-on]';
  let finishUpdate;
  const first = controllerWith({ enabled: true, token }, { update: () => new Promise(resolve => { finishUpdate = resolve; }) });
  const screenA = first.controller;
  const change = screenA.choose(9);
  await settle();
  assert.deepEqual(first.calls.update, [[token, 9]], 'the update is in flight');
  // The screen closes and reopens: the new instance asks the same controller.
  const screenB = first.controller;
  const off = screenB.disable();
  await settle();
  assert.deepEqual(first.calls.disable, [], 'the delete waits for the update');
  finishUpdate(true);
  assert.deepEqual(await change, { ok: true });
  assert.deepEqual(await off, { ok: true });
  assert.deepEqual(first.calls.disable, [token], 'and runs once the update is done');
  assert.deepEqual(first.state(), { enabled: false, threshold: 9, token: null });

  // The other order: the delete in flight, then a score change, which by its
  // turn finds the device off and never reaches the server.
  let finishDisable;
  const second = controllerWith({ enabled: true, token }, { disable: () => new Promise(resolve => { finishDisable = resolve; }) });
  const off2 = second.controller.disable();
  const nine = second.controller.choose(9);
  await settle();
  assert.deepEqual(second.calls.disable, [token]);
  assert.deepEqual(second.calls.update, [], 'the score change waits its turn');
  finishDisable(true);
  await off2; await nine;
  assert.deepEqual(second.calls.update, [], 'by its turn the device is off, so nothing reaches the server');
  assert.deepEqual(second.state(), { enabled: false, threshold: 9, token: null });
});

test('the notification switch is an iOS-style toggle in the accent colour on every platform', () => {
  for (const platform of ['web', 'ios', 'android']) for (const value of [false, true]) for (const dark of [false, true]) {
    const { tree, accent } = renderToggle({ platform, value, dark });
    assert.equal(tree.props.accessibilityRole, 'switch');
    assert.deepEqual(JSON.parse(JSON.stringify(tree.props.accessibilityState)), { checked: value, disabled: false });
    assert.equal(tree.props.accessibilityLabel, 'High-score alerts');
    const [track, thumb] = nodes(tree).filter(n => n.type === 'Animated.View');
    assert.deepEqual([track.props.style.width, track.props.style.height, track.props.style.borderRadius], [51, 31, 15.5]);
    assert.equal(track.props.style.backgroundColor === accent, value, 'the accent only when on — the colour of the chosen rows beside it');
    assert.notEqual(accent, '#34C759');
    assert.deepEqual([thumb.props.style.width, thumb.props.style.height, thumb.props.style.backgroundColor], [27, 27, '#FFFFFF']);
    assert.equal(thumb.props.style.transform[0].translateX, value ? 22 : 2, 'the thumb sits at the end it reports');
    // The pill is shorter than 48 points; the slop makes up the touch target.
    assert.ok(31 + tree.props.hitSlop.top + tree.props.hitSlop.bottom >= 48);
  }
});

test('Settings closes with an X and no title, back to the reading from wherever it was opened', () => {
  for (const platform of ['web', 'ios', 'android']) {
    for (const canGoBack of [true, false]) {
      const opened = renderSettings({ platform, canGoBack });
      const options = nodes(opened.tree).find(n => n.type === 'Screen').props.options;
      const close = options.headerRight();
      assert.equal(close.props.accessibilityRole, 'button');
      assert.equal(close.props.accessibilityLabel, 'Close settings');
      assert.ok(close.props.style.minWidth >= 48 && close.props.style.minHeight >= 48);
      assert.deepEqual(nodes(close).filter(n => n.type === 'Glyph').map(n => n.props.name), ['close']);
      assert.equal(options.headerLeft, undefined, 'the sheet has no back button of its own');
      close.props.onPress();
      // Straight back to the reading, whatever is stacked behind the overview:
      // a back action left a redirected web link's second overview in place.
      // test/web-settings.test.js checks the real navigation in a browser.
      assert.deepEqual([opened.calls.dismissTo, opened.calls.back, opened.calls.replace], [['/'], 0, []]);
      if (platform === 'ios') {
        const items = options.unstable_headerRightItems();
        assert.equal(items.length, 1);
        assert.equal(items[0].hidesSharedBackground, false, 'the close button sits in iOS glass');
      } else assert.equal(options.unstable_headerRightItems, undefined);
    }
  }
});

test('save feedback spans queued work, navigation, failure and retry', async () => {
  const pending = [];
  let finishUpdate, finishDisable;
  const instance = controllerWith({ enabled: true, token: 'ExponentPushToken[test]' }, {
    update: () => new Promise(resolve => { finishUpdate = resolve; }),
    disable: () => new Promise(resolve => { finishDisable = resolve; }),
  }, value => pending.push(value));
  const change = instance.controller.choose(9);
  assert.deepEqual(pending, [true], 'feedback starts before the request is dispatched');
  await settle();
  const off = instance.controller.disable(); // a reopened screen uses this same controller
  finishUpdate(false);
  assert.deepEqual(await change, { ok: false, reason: 'offline' });
  await settle();
  assert.equal(instance.state().threshold, 8, 'failed threshold rolls back');
  assert.deepEqual(pending, [true], 'no false saved state while another request remains');
  finishDisable(true);
  await off;
  assert.deepEqual(pending, [true, false]);
  await instance.controller.enable();
  assert.deepEqual(pending, [true, false, true, false], 'retry shows progress too');
});

test('a rejected notification operation releases progress and the queue', async () => {
  const pending = [];
  const instance = controllerWith({}, { enable: () => { throw new Error('unavailable'); } }, value => pending.push(value));
  await assert.rejects(instance.controller.enable(), /unavailable/);
  assert.deepEqual(pending, [true, false]);
  await instance.controller.choose(7);
  assert.deepEqual(pending, [true, false, true, false]);
});

test('the story timeline is a switch on the overview, off by default, on every platform', () => {
  for (const platform of ['web', 'ios', 'android']) for (const on of [false, true]) {
    const { tree, calls } = renderSettings({ platform, stored: on ? { timeline: true } : {} });
    const all = nodes(tree);
    const row = all.find(n => n.props?.testID === 'timeline-row');
    assert.ok(row, `${platform}: the row is there`);
    assert.equal(row.props.accessibilityRole, 'switch');
    assert.equal(row.props.accessibilityState.checked, on);
    const toggle = all.find(n => n.props?.testID === 'timeline-switch');
    assert.equal(toggle.type, 'Toggle');
    assert.equal(toggle.props.value, on);
    assert.ok(row.props.style.minHeight >= 48, 'the whole row is the touch target');
    assert.deepEqual(nodes(row).filter(n => n.type === 'Glyph').map(n => n.props.name), ['timeline']);
    // Pressing the row or the switch flips it; nothing else is written.
    row.props.onPress();
    toggle.props.onValueChange(!on);
    assert.deepEqual(calls.setTimeline, [!on, !on]);
    assert.deepEqual(calls.setTheme, []);
  }
});
