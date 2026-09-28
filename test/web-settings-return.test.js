import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { PORTS, withServer } from './with-server.js';

// Closing Settings on the phone web, against the exported app. Reported
// 2026-09-28 from iOS with a screen recording: the reading came back without
// its gradient for a frame and then built it again. On the web Settings is a
// page, the reading under it is hidden and measures 0x0, and the gradient
// took that size, dropping its image. The scroll view's own measurements took
// the same 0 and reflowed the reading on the way back.
const BROWSERS = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const executablePath = BROWSERS.find(path => existsSync(path));

const hoursAgo = hours => new Date(Date.now() - hours * 3_600_000).toISOString();
const current = { score: 1, explanation: 'Trump rejected Iran\'s plan to reopen the Strait of Hormuz, a key oil route, within a week.',
  explanation_new: false, explanation_at: hoursAgo(30), created_at: hoursAgo(0.5), source: 'external', basis: 'aged', level: 4, story: 'iran-war', since: hoursAgo(25) };
const developments = [
  ['us-china-trade', 70, 'The United States and China extended their tariff truce to January 10, so prices on Chinese goods hold steady.'],
  ['bond-selloff', 96, 'The 10-year Treasury yield hit 5.07%, its highest since 2007, as oil neared $100 and Fed hike odds rose to 70%.'],
].map(([story, hours, explanation], index) => ({ root: index + 1, story, since: hoursAgo(hours), score: 4, displayed: 1, leading: false, explanation }));

// Where the reading's parts sit, and whether the gradient has its image.
const layout = page => page.evaluate(() => {
  const box = node => { const r = node?.getBoundingClientRect(); return r ? [r.x, r.y, r.width, r.height].map(Math.round).join(',') : null; };
  const gradient = document.querySelector('[data-testid="reading-gradient"]');
  return { gradient: box(gradient), image: Boolean(gradient?.querySelector('img')),
    score: box(document.querySelector('[data-testid="rating-score"]')),
    sentence: box(document.querySelector('[data-testid="rating-explanation"]')),
    cue: box([...document.querySelectorAll('[aria-label="Earlier developments"]')].find(node => node.getBoundingClientRect().height)) };
});

test('closing Settings on the web returns to the reading as it was, gradient included, from the first frame', { timeout: 120_000 }, async (t) => {
  if (!executablePath) {
    assert.ok(!process.env.CI, `no Chrome or Chromium found; set CHROME_PATH (looked in ${BROWSERS.join(', ')})`);
    t.skip('no Chrome or Chromium on this machine; set CHROME_PATH to run it');
    return;
  }
  await withServer({ port: PORTS.webSettingsReturn, env: { NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    const browser = await chromium.launch({ executablePath });
    try {
      const context = await browser.newContext({ viewport: { width: 390, height: 780 }, colorScheme: 'dark', isMobile: true, hasTouch: true });
      await context.addInitScript(() => localStorage.setItem('newsworthy.preferences.v1', JSON.stringify({ timeline: true, theme: 'system' })));
      await context.route('**/api/current', route => route.fulfill({ json: current }));
      await context.route('**/api/timeline', route => route.fulfill({ json: { developments } }));
      const page = await context.newPage();
      await page.goto(`${base}/`);
      await page.getByTestId('timeline').waitFor();
      await page.waitForTimeout(2000);
      const before = await layout(page);
      assert.ok(before.image && before.cue, 'the reading is drawn with its gradient and timeline cue');

      await page.getByLabel('Settings', { exact: true }).first().click();
      await page.waitForURL(url => url.pathname === '/settings');
      await page.waitForTimeout(800);
      // Every frame from the Close until the reading has settled.
      await page.evaluate(() => {
        window.frames_ = [];
        const tick = () => {
          const gradient = document.querySelector('[data-testid="reading-gradient"]');
          const r = gradient?.getBoundingClientRect();
          if (r?.width) window.frames_.push({ image: Boolean(gradient.querySelector('img')),
            score: document.querySelector('[data-testid="rating-score"]')?.getBoundingClientRect().y });
          if (window.frames_.length < 60) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await page.getByLabel('Close settings').filter({ visible: true }).first().click();
      await page.waitForURL(url => url.pathname === '/');
      await page.waitForFunction(() => window.frames_.length >= 60, null, { timeout: 10_000 });
      const frames = await page.evaluate(() => window.frames_);
      assert.deepEqual(frames.filter(frame => !frame.image), [], 'no frame of the returning reading lacks its gradient');
      assert.deepEqual([...new Set(frames.map(frame => Math.round(frame.score)))], [Number(before.score.split(',')[1])],
        'the number does not move while the reading comes back');
      assert.deepEqual(await layout(page), before, 'the reading returns exactly as it was left');
    } finally {
      await browser.close();
    }
  });
});
