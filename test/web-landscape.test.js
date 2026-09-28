import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { PORTS, withServer } from './with-server.js';

// The reading and its timeline in landscape on the phone web, against the
// exported app. Reported 2026-09-28 from iOS Safari with two screenshots:
// after turning the phone, the timeline scrolled under the wordmark at full
// strength. Then: the column was too wide in landscape, and the number,
// sentence, Checked time and cue sat too close together. The black notch
// side is Safari's and stays: it balances the browser's own right edge.
const BROWSERS = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const executablePath = BROWSERS.find(path => existsSync(path));

const hoursAgo = hours => new Date(Date.now() - hours * 3_600_000).toISOString();
const current = { score: 1, explanation: 'Trump rejected Iran\'s plan to reopen the Strait of Hormuz, a key oil route, within a week.',
  explanation_new: false, explanation_at: hoursAgo(30), created_at: hoursAgo(0.5), source: 'external', basis: 'aged', level: 4, story: 'iran-war', since: hoursAgo(25) };
const developments = [
  ['iran-war', 50, 'Iran said the Strait of Hormuz oil route could reopen in 7 days if the US lifts its naval blockade. Oil prices fell.'],
  ['us-china-trade', 70, 'The United States and China extended their tariff truce to January 10, so prices on Chinese goods hold steady.'],
  ['fuel-prices', 80, 'Trump backed a 90-day ban on US diesel exports to cut record fuel prices, and his own officials say it would raise them.'],
  ['bond-selloff', 96, 'The 10-year Treasury yield hit 5.07%, its highest since 2007, as oil neared $100 and Fed hike odds rose to 70%.'],
  ['eu-energy', 110, 'European gas prices rose after a Norwegian outage, and governments said storage is full enough for winter.'],
].map(([story, hours, explanation], index) => ({ root: index + 1, story, since: hoursAgo(hours), score: 4, displayed: 1, leading: false, explanation }));

async function openReading(browser, viewport) {
  const context = await browser.newContext({ viewport, colorScheme: 'dark', isMobile: true, hasTouch: true });
  await context.addInitScript(() => localStorage.setItem('newsworthy.preferences.v1', JSON.stringify({ timeline: true, theme: 'system' })));
  await context.route('**/api/current', route => route.fulfill({ json: current }));
  await context.route('**/api/timeline', route => route.fulfill({ json: { developments } }));
  return context.newPage();
}

// Every timeline line whose top has scrolled above the header's lower edge
// must have faded out; the header is transparent, so one that has not is
// drawn over the wordmark.
async function linesUnderHeader(page) {
  return page.evaluate(() => {
    const brand = document.querySelector('[aria-label="Newsworthy, back to the reading"]').getBoundingClientRect();
    return [...document.querySelectorAll('[data-testid="timeline"] div')]
      .filter(node => node.style.opacity !== '' && node.textContent.trim())
      .map(node => ({ text: node.textContent.slice(0, 30), top: node.getBoundingClientRect().top, opacity: Number(getComputedStyle(node).opacity) }))
      .filter(line => line.top < brand.bottom && line.opacity > 0.1);
  });
}

async function scrollIntoTimeline(page, viewport) {
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  for (const step of [200, 200, 200]) { await page.mouse.wheel(0, step); await page.waitForTimeout(400); }
  await page.waitForTimeout(600);
}

test('turned to landscape, the timeline fades out under the header rather than running over it', { timeout: 120_000 }, async (t) => {
  if (!executablePath) {
    assert.ok(!process.env.CI, `no Chrome or Chromium found; set CHROME_PATH (looked in ${BROWSERS.join(', ')})`);
    t.skip('no Chrome or Chromium on this machine; set CHROME_PATH to run it');
    return;
  }
  await withServer({ port: PORTS.webLandscape, env: { NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    const browser = await chromium.launch({ executablePath });
    try {
      const landscape = { width: 874, height: 360 };
      // Opened upright, then turned: the case in the report.
      const turned = await openReading(browser, { width: 390, height: 780 });
      await turned.goto(`${base}/`);
      await turned.getByTestId('timeline').waitFor();
      await turned.waitForTimeout(1200);
      await turned.setViewportSize(landscape);
      await turned.waitForTimeout(1000);
      await scrollIntoTimeline(turned, landscape);
      assert.ok(await turned.evaluate(() => document.querySelector('[data-testid="timeline"]').getBoundingClientRect().top < 0),
        'the scroll reached past the timeline\'s first entry');
      assert.deepEqual(await linesUnderHeader(turned), [], 'no timeline line at strength under the header after turning');
      assert.equal(await turned.evaluate(() => document.documentElement.style.backgroundColor), '',
        'no document background: Safari keeps the notch side black');

      // Opened already in landscape: the first render after the static HTML
      // must take the landscape layout, not keep the portrait one.
      const opened = await openReading(browser, landscape);
      await opened.goto(`${base}/`);
      await opened.getByTestId('timeline').waitFor();
      await opened.waitForTimeout(1200);
      const sentence = await opened.getByTestId('rating-explanation').boundingBox();
      assert.ok(sentence.width > 400 && sentence.width <= 480, `landscape sentence keeps a readable column (${Math.round(sentence.width)}pt)`);
      const timeline = await opened.getByTestId('timeline').boundingBox();
      assert.ok(timeline.width <= 480, `landscape timeline keeps the same column (${Math.round(timeline.width)}pt)`);
      const score = await opened.getByTestId('rating-score').boundingBox();
      const checked = await opened.getByText(/^Checked /).boundingBox();
      const cue = await opened.getByLabel('Earlier developments').first().boundingBox();
      assert.ok(cue.y + cue.height <= landscape.height, 'the timeline cue is on the first screen');
      // Room between the parts: the first cut had 12pt, 10pt and the cue's
      // chevron almost touching the Checked line.
      assert.ok(sentence.y - (score.y + score.height) >= 16, `space above the sentence (${Math.round(sentence.y - score.y - score.height)}pt)`);
      assert.ok(checked.y - (sentence.y + sentence.height) >= 14, `space above Checked (${Math.round(checked.y - sentence.y - sentence.height)}pt)`);
      assert.ok(cue.y + cue.height / 2 - (checked.y + checked.height) >= 28, `space above the cue's chevron (${Math.round(cue.y + cue.height / 2 - checked.y - checked.height)}pt)`);
      await scrollIntoTimeline(opened, landscape);
      assert.deepEqual(await linesUnderHeader(opened), [], 'no timeline line at strength under the header');
    } finally {
      await browser.close();
    }
  });
});
