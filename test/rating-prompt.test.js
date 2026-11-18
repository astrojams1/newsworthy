import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RATING_STORAGE_KEY, parseRatingState, ratingGoodMoment } from '../apps/client/lib/rating.ts';

// The App Store's own rating prompt after a share that went through (app-standard: rating).
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const day = (d, h = 12) => new Date(2026, 10, d, h);
function store({ withReview = true } = {}) {
  const box = { text: null, asks: 0 };
  box.platform = { read: async () => box.text, write: async text => { box.text = text; } };
  if (withReview) box.platform.requestReview = async () => { box.asks += 1; };
  return box;
}

test('shares ask only after three on two days, once per version and not again within 90 days', async () => {
  const box = store();
  for (const h of [9, 10, 11]) assert.equal(await ratingGoodMoment('1.0.3', box.platform, day(1, h)), false);
  assert.equal(await ratingGoodMoment('1.0.3', box.platform, day(2)), true);
  assert.equal(box.asks, 1);
  assert.deepEqual(parseRatingState(box.text).moments, 0);
  assert.equal(parseRatingState(box.text).lastAskVersion, '1.0.3');
  for (const d of [3, 4, 5]) assert.equal(await ratingGoodMoment('1.0.3', box.platform, day(d)), false);
  for (const d of [6, 7, 8]) assert.equal(await ratingGoodMoment('1.0.4', box.platform, day(d)), false);
  assert.equal(box.asks, 1);
});

test('the -ratingDue seed asks on the next share, and a share right after does not', async () => {
  const box = store();
  box.text = JSON.stringify({ moments: 2, days: ['2026-11-17'], lastAsk: null, lastAskVersion: null });
  assert.equal(await ratingGoodMoment('1.0.3', box.platform, new Date(2026, 10, 18, 9)), true);
  assert.equal(await ratingGoodMoment('1.0.3', box.platform, new Date(2026, 10, 18, 9, 1)), false);
  assert.equal(box.asks, 1);
});

test('only a completed native share reaches the prompt; the website, Android and test launches never ask', () => {
  const home = read('apps/client/app/index.tsx');
  assert.match(home, /if \(result\.action === Share\.sharedAction\) void ratingAfterShare\(\);/);
  assert.equal(home.match(/ratingAfterShare\(/g).length, 1, 'called from one place only');
  const moment = read('apps/client/lib/rating-moment.ts');
  assert.match(moment, /if \(Platform\.OS !== 'ios'\) return false;/);
  assert.match(moment, /Settings\.get\('uiTest'\) \|\| Settings\.get\('uiTestReset'\)\) \{\n\s+await AsyncStorage\.removeItem\(RATING_STORAGE_KEY\);\n\s+return false;/);
  assert.match(moment, /__DEV__ && Settings\.get\('ratingDue'\)/);
  assert.match(moment, /StoreReview\.requestReview\(\)/);
  assert.match(read('apps/client/lib/rating-moment.web.ts'), /return false;/);
  assert.equal(RATING_STORAGE_KEY, 'app-standard.rating.state');
});

test('the reading screen asks after a completed share and not after a dismissed one', async () => {
  const { renderReading, nodes } = await import('./helpers/render-reading.js');
  for (const [action, expected] of [['sharedAction', 1], ['dismissedAction', 0]]) {
    let asked = 0;
    const share = { sharedAction: 'sharedAction', dismissedAction: 'dismissedAction', share: async () => ({ action }) };
    const tree = renderReading({ platform: 'android', width: 390, height: 844, share, ratingAfterShare: async () => { asked += 1; return false; } });
    const screen = nodes(tree).find(n => n.type === 'Screen');
    const button = nodes(screen.props.options.headerRight()).find(n => n.props?.accessibilityLabel === 'Share this reading' && n.props.onPress);
    assert.ok(button, 'the Share button is rendered');
    await button.props.onPress();
    assert.equal(asked, expected, action);
  }
});
