import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MORE_APPS } from '../apps/client/lib/moreAppsCatalog.ts';
import { nodes, renderSettings } from './helpers/render-settings.js';
import { FIRST_LAUNCH_ENDPOINT, firstLaunchEvent, reportFirstLaunch } from '../apps/client/lib/firstLaunch.ts';

// The shared More apps row and first-launch count (app-release standards; the owner, 2026-11-19: "Yes, every app").
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('More apps lists other live apps with App Store ids and bundled icons, never Newsworthy', () => {
  assert.ok(MORE_APPS.length >= 5);
  assert.ok(!MORE_APPS.some(app => app.bundleId === 'com.astrojams.newsworthy'));
  for (const app of MORE_APPS) {
    assert.match(app.appStoreId, /^\d+$/);
    assert.ok(Buffer.from(app.iconJPEGBase64, 'base64').subarray(0, 2).equals(Buffer.from([0xff, 0xd8])), `${app.id} icon is a JPEG`);
  }
});

test('Settings shows More apps only where moreAppsFor allows (the iPhone and iPad app), opening the App Store page', () => {
  const settings = read('apps/client/app/settings/index.tsx');
  assert.match(settings, /moreAppsFor\(process\.env\.EXPO_OS \|\| '', 'com\.astrojams\.newsworthy'\)\.length > 0 &&/);
  assert.match(read('apps/client/lib/moreApps.ts'), /if \(platform !== 'ios'\) return \[\];/);
  assert.match(read('apps/client/app/settings/more-apps.tsx'), /Linking\.openURL\(moreAppsStoreUrl\(app\)\)/);
  assert.match(read('apps/client/app/settings/_layout.tsx'), /name="more-apps" options=\{\{ title: 'More apps' \}\}/);
});

test('the first open sends four fields once, only from the iOS app, and the manifest declares it', async () => {
  const sent = []; let stored = null;
  const platform = { version: '1.0.4', platform: 'ios', channel: 'unknown', read: async () => stored, write: async t => { stored = t; },
    post: async (url, body) => { sent.push({ url, body: JSON.parse(body) }); return 204; } };
  assert.equal(await reportFirstLaunch('newsworthy', platform), true);
  assert.equal(await reportFirstLaunch('newsworthy', platform), false);
  assert.deepEqual(sent, [{ url: FIRST_LAUNCH_ENDPOINT, body: firstLaunchEvent('newsworthy', platform) }]);
  assert.deepEqual(Object.keys(sent[0].body).sort(), ['app', 'channel', 'platform', 'version']);
  assert.match(read('apps/client/app/_layout.tsx'), /startFirstLaunch\(\)/);
  assert.match(read('apps/client/lib/first-launch-start.web.ts'), /export function startFirstLaunch\(\): void \{\}/);
  assert.match(read('apps/client/app.config.js'), /NSPrivacyCollectedDataTypeProductInteraction[\s\S]*NSPrivacyCollectedDataTypeLinked: false[\s\S]*PurposeAnalytics/);
  assert.match(read('public/privacy.html'), /First-open count/);
});

test('the rendered Settings show More apps after Send Feedback on iOS only, and the introduction stays last', () => {
  for (const platform of ['ios', 'android', 'web']) {
    const all = nodes(renderSettings({ platform }).tree);
    const about = all.find(n => n.props?.testID === 'about-links');
    const ids = nodes(about).filter(n => n.type === 'Pressable').map(n => n.props.testID);
    if (platform === 'ios') {
      assert.deepEqual(ids.slice(-3), ['feedback-row', 'more-apps', 'introduction-row']);
      const row = nodes(about).find(n => n.props?.testID === 'more-apps');
      assert.equal(row.props.accessibilityLabel, 'More apps');
      assert.equal(nodes(row).filter(n => n.type === 'Glyph').at(-1).props.name, 'chevron');
    } else assert.ok(!ids.includes('more-apps'), `${platform} shows no More apps row`);
  }
});
