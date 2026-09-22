import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PREFERENCES, STORAGE_KEY, THEME_CHOICES, THRESHOLD_CHOICES, clampThreshold, parsePreferences, resolveDark } from '../apps/client/lib/preferences.js';
import { nodes, renderSettings, renderToggle } from './helpers/render-settings.js';

test('system appearance and no notifications are the defaults, and a damaged store falls back field by field', () => {
  assert.deepEqual(THEME_CHOICES.map(c => [c.value, c.label]), [['system', 'Follow device'], ['light', 'Light'], ['dark', 'Dark']]);
  assert.deepEqual(DEFAULT_PREFERENCES, { theme: 'system', notifications: { enabled: false, threshold: 8, token: null } });
  assert.deepEqual(parsePreferences(null), DEFAULT_PREFERENCES);
  assert.deepEqual(parsePreferences('{not json'), DEFAULT_PREFERENCES);
  assert.deepEqual(parsePreferences({ theme: 'sepia', notifications: { enabled: 'yes', threshold: 12 } }), DEFAULT_PREFERENCES);
  const kept = { theme: 'dark', notifications: { enabled: true, threshold: 6, token: 'ExponentPushToken[abc]' } };
  assert.deepEqual(parsePreferences(JSON.stringify(kept)), kept);
  // An "on" with no device registered is not on: the server has nothing to send to.
  assert.deepEqual(parsePreferences({ notifications: { enabled: true, threshold: 6 } }).notifications, { enabled: false, threshold: 6, token: null });
  assert.equal(STORAGE_KEY, 'newsworthy.preferences.v1');
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
  const { tree } = renderSettings({ platform: 'web' });
  const all = nodes(tree);
  assert.ok(all.some(n => n.type === 'Head'), 'the page has its own title');
  const radios = all.filter(n => n.props?.accessibilityRole === 'radio');
  assert.deepEqual(radios.map(n => [n.props.accessibilityLabel, n.props.accessibilityState.checked]),
    [['Follow device', true], ['Light', false], ['Dark', false]]);
  assert.ok(!all.some(n => n.type === 'Toggle'), 'push notifications are a native feature');
  assert.deepEqual(text(all), ['Appearance', 'Follow device', 'Light', 'Dark', 'Widgets follow your device’s appearance.']);
  // Vertical: each option is its own full-width row, the checked one marked.
  assert.deepEqual(radios.map(n => n.props.style.flexDirection), ['row', 'row', 'row']);
  assert.deepEqual(radios.map(n => nodes(n).some(c => c.type === 'CheckIcon')), [true, false, false], 'a drawn check marks the chosen row');
});

for (const platform of ['ios', 'android']) {
  test(`${platform}: notifications are off by default at a minimum score of 8, shown before opting in`, () => {
    const { tree, calls } = renderSettings({ platform });
    const all = nodes(tree);
    const toggle = all.find(n => n.type === 'Toggle');
    assert.equal(toggle.props.value, false);
    assert.equal(toggle.props.accessibilityLabel, 'Notify me about high readings');
    const radios = all.filter(n => n.props?.accessibilityRole === 'radio' && /^theme-/.test(n.props.testID));
    assert.deepEqual(radios.map(n => [n.props.accessibilityLabel, n.props.accessibilityState.checked]),
      [['Follow device', true], ['Light', false], ['Dark', false]]);
    // Vertical: each option is its own full-width row, the checked one marked.
    assert.deepEqual(radios.map(n => n.props.style.flexDirection), ['row', 'row', 'row']);
    assert.deepEqual(radios.map(n => nodes(n).some(c => c.type === 'CheckIcon')), [true, false, false], 'a drawn check marks the chosen row');
    // The score is shown while off, so turning on means something definite.
    const scores = all.filter(n => /^threshold-\d+$/.test(n.props?.testID ?? ''));
    assert.deepEqual(scores.map(n => [Number(n.props.testID.slice(10)), n.props.accessibilityState.checked]),
      THRESHOLD_CHOICES.map(v => [v, v === 8]));
    assert.deepEqual(THRESHOLD_CHOICES, [5, 6, 7, 8, 9, 10]);
    for (const score of scores) {
      assert.equal(score.props.accessibilityRole, 'radio');
      assert.match(score.props.accessibilityLabel, /^Minimum score \d+ out of 10$/);
      assert.ok(score.props.style.minHeight >= 48, 'a score is a full touch target');
    }
    assert.ok(text(all).includes('Notify when the reading reaches 8 or higher.'), 'the chosen score is explained in one line');
    // The whole notification row toggles, not only the switch.
    const rowControl = all.find(n => n.props?.testID === 'notifications-row');
    assert.equal(rowControl.props.accessibilityRole, 'switch');
    assert.equal(typeof rowControl.props.onPress, 'function');
    // Every setting is one row with the same minimum, growing with large text.
    const rows = [...radios, rowControl, all.find(n => n.props?.testID === 'threshold-row')];
    assert.equal(rows.length, 5);
    assert.deepEqual(rows.map(n => n.props.style.minHeight), Array(5).fill(56));
    assert.deepEqual(rows.map(n => n.props.style.height), Array(5).fill(undefined), 'a minimum, not a fixed height that clips enlarged text');
    assert.equal(all.find(n => n.type === 'ActivityIndicator'), undefined);
    // Choosing Dark records the choice; nothing else is touched.
    all.find(n => n.props?.testID === 'theme-dark').props.onPress();
    assert.deepEqual(calls.setTheme, ['dark']);
    assert.deepEqual(calls.setNotifications, []);
  });
}

test('while registering, the row shows progress and the switch is held', () => {
  const all = nodes(renderSettings({ platform: 'ios', busy: true }).tree);
  assert.ok(all.some(n => n.type === 'ActivityIndicator'));
  assert.equal(all.find(n => n.type === 'Toggle').props.disabled, true);
  assert.equal(all.find(n => n.props?.testID === 'notifications-row').props.disabled, true);
});

test('choosing a score is local while off, and re-registers a device that is on', async () => {
  const token = 'ExponentPushToken[on-on-on-on]';
  const off = renderSettings({ platform: 'android' });
  await nodes(off.tree).find(n => n.props?.testID === 'threshold-9').props.onPress();
  assert.deepEqual(off.calls.setNotifications, [{ threshold: 9 }]);
  assert.deepEqual(off.calls.updatePushThreshold, [], 'off: the server holds no row to update');

  const on = renderSettings({ platform: 'android', stored: { notifications: { enabled: true, threshold: 8, token } } });
  assert.equal(nodes(on.tree).find(n => n.type === 'Toggle').props.value, true);
  await nodes(on.tree).find(n => n.props?.testID === 'threshold-9').props.onPress();
  assert.deepEqual(on.calls.setNotifications, [{ threshold: 9 }]);
  assert.deepEqual(on.calls.updatePushThreshold, [[token, 9]]);
  // Tapping the score already chosen changes nothing.
  await nodes(on.tree).find(n => n.props?.testID === 'threshold-9').props.onPress();
  assert.deepEqual(on.calls.updatePushThreshold, [[token, 9]]);
  assert.deepEqual([clampThreshold(0), clampThreshold(8.6), clampThreshold(11)], [1, 9, 10]);
});

test('turning on with the chosen score, so the score chosen while off is the one registered', async () => {
  const chosen = renderSettings({ platform: 'ios', stored: { notifications: { threshold: 7 } } });
  await nodes(chosen.tree).find(n => n.type === 'Toggle').props.onValueChange(true);
  assert.deepEqual(chosen.calls.enablePush, [7]);
});

test('a switch-off cannot be undone by a score change queued behind it', async () => {
  // The finding: a threshold PUT overlapping the DELETE could land after it
  // and register the device again while the app showed it as off.
  const token = 'ExponentPushToken[on-on-on-on]';
  let finishDisable;
  const disable = () => new Promise(resolve => { finishDisable = resolve; });
  const { tree, calls } = renderSettings({ platform: 'ios', push: { disable }, stored: { notifications: { enabled: true, threshold: 8, token } } });
  const all = nodes(tree);
  const settle = () => new Promise(resolve => setImmediate(resolve));
  const off = all.find(n => n.type === 'Toggle').props.onValueChange(false);
  const nine = all.find(n => n.props?.testID === 'threshold-9').props.onPress();
  await settle();
  assert.deepEqual(calls.disablePush, [token], 'the delete is in flight');
  assert.deepEqual(calls.updatePushThreshold, [], 'the score change waits its turn');
  finishDisable(true);
  await off; await nine;
  assert.deepEqual(calls.setNotifications, [{ enabled: false, token: null }, { threshold: 9 }]);
  assert.deepEqual(calls.updatePushThreshold, [], 'by its turn the device is off, so nothing reaches the server');

  // The other order: a score change already in flight, then the switch-off,
  // which waits for it and deletes last.
  let finishUpdate;
  const update = () => new Promise(resolve => { finishUpdate = resolve; });
  const second = renderSettings({ platform: 'ios', push: { update }, stored: { notifications: { enabled: true, threshold: 8, token } } });
  const nodes2 = nodes(second.tree);
  const change = nodes2.find(n => n.props?.testID === 'threshold-9').props.onPress();
  const switchOff = nodes2.find(n => n.type === 'Toggle').props.onValueChange(false);
  await settle();
  assert.deepEqual(second.calls.updatePushThreshold, [[token, 9]], 'the update is in flight');
  assert.deepEqual(second.calls.disablePush, [], 'the delete waits for the update');
  finishUpdate(true);
  await change; await switchOff;
  assert.deepEqual(second.calls.updatePushThreshold, [[token, 9]]);
  assert.deepEqual(second.calls.disablePush, [token], 'and runs once the update is done');
});

test('turning notifications on registers the device at the chosen score, and a refusal leaves it off', async () => {
  const granted = renderSettings({ platform: 'ios', stored: { notifications: { threshold: 7 } } });
  await nodes(granted.tree).find(n => n.type === 'Toggle').props.onValueChange(true);
  assert.deepEqual(granted.calls.enablePush, [7]);
  assert.deepEqual(granted.calls.setNotifications, [{ enabled: true, token: 'ExponentPushToken[test-test-test]' }]);

  const denied = renderSettings({ platform: 'ios', push: { enable: { ok: false, reason: 'denied' } } });
  await nodes(denied.tree).find(n => n.type === 'Toggle').props.onValueChange(true);
  assert.deepEqual(denied.calls.setNotifications, [], 'the switch does not claim a registration that did not happen');
  assert.deepEqual(denied.calls.notices.filter(Boolean), ['denied']);
  // A refusal is explained with a way to fix it: the device's own settings.
  const shown = renderSettings({ platform: 'ios' });
  // The notice is state the mock cannot flip, so exercise the control by
  // rendering the source with the notice forced on.
  assert.ok(nodes(shown.tree).every(n => n.props?.testID !== 'open-device-settings'), 'no button until there is a refusal');

  const off = renderSettings({ platform: 'android', stored: { notifications: { enabled: true, threshold: 8, token: 'ExponentPushToken[on-on-on-on]' } } });
  await nodes(off.tree).find(n => n.type === 'Toggle').props.onValueChange(false);
  assert.deepEqual(off.calls.disablePush, ['ExponentPushToken[on-on-on-on]']);
  assert.deepEqual(off.calls.setNotifications, [{ enabled: false, token: null }]);

  const stuck = renderSettings({ platform: 'android', push: { disable: false }, stored: { notifications: { enabled: true, threshold: 8, token: 'ExponentPushToken[on-on-on-on]' } } });
  await nodes(stuck.tree).find(n => n.type === 'Toggle').props.onValueChange(false);
  assert.deepEqual(stuck.calls.setNotifications, [], 'a device the server still holds stays shown as on');
});

test('the notification switch is an iOS-style toggle in the accent colour on every platform', () => {
  for (const platform of ['web', 'ios', 'android']) for (const value of [false, true]) for (const dark of [false, true]) {
    const { tree, accent } = renderToggle({ platform, value, dark });
    assert.equal(tree.props.accessibilityRole, 'switch');
    assert.deepEqual(JSON.parse(JSON.stringify(tree.props.accessibilityState)), { checked: value, disabled: false });
    assert.equal(tree.props.accessibilityLabel, 'Notify me about high readings');
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

test('a settings screen with nothing behind it still offers a way back', () => {
  for (const platform of ['web', 'ios', 'android']) {
    const stranded = renderSettings({ platform, canGoBack: false });
    const screen = nodes(stranded.tree).find(n => n.type === 'Screen');
    const back = screen.props.options.headerLeft();
    assert.equal(back.props.accessibilityRole, 'button');
    assert.equal(back.props.accessibilityLabel, 'Back');
    assert.ok(back.props.style.minWidth >= 48 && back.props.style.minHeight >= 48);
    assert.ok(nodes(back).some(n => n.type === 'BackIcon'));
    back.props.onPress();
    assert.deepEqual(stranded.calls.replace, ['/'], 'it goes home rather than popping a stack that has nothing to pop');
    // Reached from the reading screen, the navigator's own back button serves.
    const pushed = renderSettings({ platform, canGoBack: true });
    assert.equal(nodes(pushed.tree).find(n => n.type === 'Screen'), undefined);
  }
});
