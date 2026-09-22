import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PREFERENCES, STORAGE_KEY, THEME_CHOICES, clampThreshold, parsePreferences, resolveDark } from '../apps/client/lib/preferences.js';
import { nodes, renderSettings, renderToggle } from './helpers/render-settings.js';

test('system appearance and no notifications are the defaults, and a damaged store falls back field by field', () => {
  assert.deepEqual(THEME_CHOICES.map(c => c.value), ['system', 'light', 'dark']);
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
    [['System', true], ['Light', false], ['Dark', false]]);
  assert.ok(!all.some(n => n.type === 'Toggle'), 'push notifications are a native feature');
  assert.deepEqual(text(all), ['Appearance', 'System', '✓', 'Light', '✓', 'Dark', '✓']);
  // Vertical: each option is its own full-width row, the checked one marked.
  assert.deepEqual(radios.map(n => n.props.style.flexDirection), ['row', 'row', 'row']);
  assert.deepEqual(radios.map(n => nodes(n).find(c => c.type === 'Text' && c.props.children === '✓').props.style.opacity), [1, 0, 0]);
});

for (const platform of ['ios', 'android']) {
  test(`${platform}: notifications are off by default at a minimum score of 8, and every control has a name`, () => {
    const { tree, calls } = renderSettings({ platform });
    const all = nodes(tree);
    const toggle = all.find(n => n.type === 'Toggle');
    assert.equal(toggle.props.value, false);
    assert.equal(toggle.props.accessibilityLabel, 'Notify me about high readings');
    assert.equal(all.find(n => n.props?.testID === 'threshold-value'), undefined, 'the score is shown only once notifications are on');
    assert.deepEqual(text(all), ['Appearance', 'System', '✓', 'Light', '✓', 'Dark', '✓', 'Notifications', 'Notify me about high readings']);
    const on = nodes(renderSettings({ platform, stored: { notifications: { enabled: true, threshold: 8, token: 'ExponentPushToken[on-on-on-on]' } } }).tree);
    assert.equal(on.find(n => n.props?.testID === 'threshold-value').props.children, 8);
    const steps = on.filter(n => n.type?.name === 'StepButton');
    assert.deepEqual(steps.map(n => [n.props.name, n.props.disabled]),
      [['Lower minimum score', false], ['Raise minimum score', false]], 'both named steps are available at 8');
    // Choosing Dark records the choice; nothing else is touched.
    all.find(n => n.props?.testID === 'theme-dark').props.onPress();
    assert.deepEqual(calls.setTheme, ['dark']);
    assert.deepEqual(calls.setNotifications, []);
  });
}

test('the stepper stays inside the scale and only re-registers a device that is on', async () => {
  const token = 'ExponentPushToken[on-on-on-on]';
  const top = renderSettings({ platform: 'ios', stored: { notifications: { enabled: true, token, threshold: 10 } } });
  const up = nodes(top.tree).find(n => n.props?.testID === 'threshold-up');
  const down = nodes(top.tree).find(n => n.props?.testID === 'threshold-down');
  assert.equal(up.props.disabled, true);
  assert.equal(down.props.disabled, false);
  await down.props.onPress();
  assert.deepEqual(top.calls.setNotifications, [{ threshold: 9 }]);
  assert.deepEqual(top.calls.updatePushThreshold, [[token, 9]]);

  const bottom = renderSettings({ platform: 'ios', stored: { notifications: { enabled: true, token, threshold: 1 } } });
  assert.equal(nodes(bottom.tree).find(n => n.props?.testID === 'threshold-down').props.disabled, true);

  const on = renderSettings({ platform: 'android', stored: { notifications: { enabled: true, threshold: 8, token } } });
  assert.equal(nodes(on.tree).find(n => n.type === 'Toggle').props.value, true);
  await nodes(on.tree).find(n => n.props?.testID === 'threshold-up').props.onPress();
  assert.deepEqual(on.calls.setNotifications, [{ threshold: 9 }]);
  assert.deepEqual(on.calls.updatePushThreshold, [[token, 9]]);
  // Off: no score to step, and the server holds no row to update.
  const off = nodes(renderSettings({ platform: 'android' }).tree);
  assert.equal(off.find(n => n.props?.testID === 'threshold-up'), undefined);
});

test('turning notifications on registers the device at the chosen score, and a refusal leaves it off', async () => {
  const granted = renderSettings({ platform: 'ios', stored: { notifications: { threshold: 7 } } });
  await nodes(granted.tree).find(n => n.type === 'Toggle').props.onValueChange(true);
  assert.deepEqual(granted.calls.enablePush, [7]);
  assert.deepEqual(granted.calls.setNotifications, [{ enabled: true, token: 'ExponentPushToken[test-test-test]' }]);

  const denied = renderSettings({ platform: 'ios', push: { enable: { ok: false, reason: 'denied' } } });
  await nodes(denied.tree).find(n => n.type === 'Toggle').props.onValueChange(true);
  assert.deepEqual(denied.calls.setNotifications, [], 'the switch does not claim a registration that did not happen');

  const off = renderSettings({ platform: 'android', stored: { notifications: { enabled: true, threshold: 8, token: 'ExponentPushToken[on-on-on-on]' } } });
  await nodes(off.tree).find(n => n.type === 'Toggle').props.onValueChange(false);
  assert.deepEqual(off.calls.disablePush, ['ExponentPushToken[on-on-on-on]']);
  assert.deepEqual(off.calls.setNotifications, [{ enabled: false, token: null }]);

  const stuck = renderSettings({ platform: 'android', push: { disable: false }, stored: { notifications: { enabled: true, threshold: 8, token: 'ExponentPushToken[on-on-on-on]' } } });
  await nodes(stuck.tree).find(n => n.type === 'Toggle').props.onValueChange(false);
  assert.deepEqual(stuck.calls.setNotifications, [], 'a device the server still holds stays shown as on');
});

test('the notification switch is an iOS-style toggle on every platform', () => {
  for (const platform of ['web', 'ios', 'android']) for (const value of [false, true]) {
    const { tree, ON_COLOR } = renderToggle({ platform, value });
    assert.equal(tree.props.accessibilityRole, 'switch');
    assert.deepEqual(JSON.parse(JSON.stringify(tree.props.accessibilityState)), { checked: value, disabled: false });
    assert.equal(tree.props.accessibilityLabel, 'Notify me about high readings');
    const [track, thumb] = nodes(tree).filter(n => n.type === 'Animated.View');
    assert.deepEqual([track.props.style.width, track.props.style.height, track.props.style.borderRadius], [51, 31, 15.5]);
    assert.equal(track.props.style.backgroundColor === ON_COLOR, value, 'green only when on');
    assert.equal(ON_COLOR, '#34C759');
    assert.deepEqual([thumb.props.style.width, thumb.props.style.height, thumb.props.style.backgroundColor], [27, 27, '#FFFFFF']);
    assert.equal(thumb.props.style.transform[0].translateX, value ? 22 : 2, 'the thumb sits at the end it reports');
    // The pill is shorter than 48 points; the slop makes up the touch target.
    assert.ok(31 + tree.props.hitSlop.top + tree.props.hitSlop.bottom >= 48);
  }
});
