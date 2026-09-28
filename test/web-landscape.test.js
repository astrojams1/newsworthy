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

async function openReading(browser, viewport, notch = 0) {
  const context = await browser.newContext({ viewport, colorScheme: 'dark', isMobile: true, hasTouch: true });
  await context.addInitScript(() => localStorage.setItem('newsworthy.preferences.v1', JSON.stringify({ timeline: true, theme: 'system' })));
  await context.route('**/api/current', route => route.fulfill({ json: current }));
  await context.route('**/api/timeline', route => route.fulfill({ json: { developments } }));
  const page = await context.newPage();
  // iOS 26 Safari reports the notch as an inset while keeping the page clear
  // of it. Chromium can report one too; the page cannot tell the difference.
  if (notch) await (await context.newCDPSession(page)).send('Emulation.setSafeAreaInsetsOverride', { insets: { left: notch, right: 0, top: 0, bottom: 21 } });
  return page;
}

// Header margins from the page's own edges: the wordmark's left and the
// Settings gear's right.
async function headerEdges(page, gearLabel) {
  return page.evaluate(label => {
    const visible = node => node && node.getBoundingClientRect().width > 0;
    const brand = [...document.querySelectorAll('[aria-label="Newsworthy, back to the reading"], [aria-label="Newsworthy"]')].find(visible)
      ?? [...document.querySelectorAll('div')].find(node => node.textContent === 'NEWSWORTHY' && !node.children.length);
    const gear = [...document.querySelectorAll(`[aria-label="${label}"]`)].find(visible);
    return { left: Math.round(brand.getBoundingClientRect().left), right: Math.round(window.innerWidth - gear.getBoundingClientRect().right) };
  }, gearLabel);
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

// Timeline entries are the accessible groups carrying an entry's label; the
// grid's columns are the distinct left edges among them.
async function timelineColumns(page) {
  return page.evaluate(() => {
    const entries = [...document.querySelectorAll('[data-testid="timeline"] [aria-label]')].map(node => node.getBoundingClientRect());
    return { columns: new Set(entries.map(box => Math.round(box.left))).size, widths: entries.map(box => box.width) };
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
      const turned = await openReading(browser, { width: 390, height: 780 }, 62);
      await turned.goto(`${base}/`);
      await turned.getByTestId('timeline').waitFor();
      await turned.waitForTimeout(1200);
      await turned.setViewportSize(landscape);
      await turned.waitForTimeout(1000);
      await scrollIntoTimeline(turned, landscape);
      assert.ok(await turned.evaluate(() => document.querySelector('[data-testid="timeline"]').getBoundingClientRect().top < 0),
        'the scroll reached past the timeline\'s first entry');
      assert.deepEqual(await linesUnderHeader(turned), [], 'no timeline line at strength under the header after turning');
      // Reported 2026-09-28 with a third screenshot: the wordmark sat a second
      // notch's width in from Safari's black strip, the gear near the far edge.
      const edges = await headerEdges(turned, 'Settings');
      assert.ok(edges.left < 40, `the wordmark keeps the header's own margin, not the notch inset (${edges.left}pt from the edge)`);
      assert.ok(Math.abs(edges.left - edges.right) <= 16, `header margins match left and right (${edges.left}pt and ${edges.right}pt)`);
      assert.equal(await turned.evaluate(() => document.documentElement.style.backgroundColor), '',
        'no document background: Safari keeps the notch side black');

      // Opened already in landscape: the first render after the static HTML
      // must take the landscape layout, not keep the portrait one.
      const opened = await openReading(browser, landscape);
      await opened.goto(`${base}/`);
      await opened.getByTestId('timeline').waitFor();
      await opened.waitForTimeout(1200);
      const sentence = await opened.getByTestId('rating-explanation').boundingBox();
      // Reported 2026-09-28: the landscape sentence ran twice as wide as the
      // desktop one, then a two-column landscape timeline was tried and the
      // owner called it a bad idea. Landscape is one column, a little wider
      // than portrait's 320pt, for the sentence and the timeline alike.
      assert.ok(sentence.width > 360 && sentence.width <= 400, `landscape sentence column (${Math.round(sentence.width)}pt)`);
      const grid = await timelineColumns(opened);
      assert.equal(grid.columns, 1, 'landscape timeline is one column');
      assert.ok(grid.widths.every(w => w <= 400 && w > 360), `timeline entries share the sentence's column (${grid.widths.map(Math.round)})`);
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

      // iPhone Safari's landscape page is about 743pt wide.
      const safariSize = { width: 743, height: 340 };
      const safari = await openReading(browser, safariSize);
      await safari.goto(`${base}/`);
      await safari.getByTestId('timeline').waitFor();
      await safari.waitForTimeout(1200);
      // Reported 2026-09-28 from Chrome on iPhone: text-wrap: pretty, which is
      // WebKit's there as in every iOS browser, read as balance and took four
      // lines. The browser's own wrapping is used.
      assert.notEqual(await safari.getByTestId('rating-explanation').evaluate(n => (getComputedStyle(n).textWrapStyle || getComputedStyle(n).textWrap)), 'pretty');
      const safariCue = await safari.getByLabel('Earlier developments').first().boundingBox();
      assert.ok(safariCue.y + safariCue.height <= safariSize.height, 'the cue is on the first screen at Safari\'s size');
      assert.equal((await timelineColumns(safari)).columns, 1, 'Safari landscape timeline is one column');
      const wraps = await safari.evaluate(texts => [...document.querySelectorAll('[data-testid="timeline"] div')]
        .filter(node => texts.includes(node.textContent) && !node.children.length)
        .map(node => getComputedStyle(node).textWrapStyle || getComputedStyle(node).textWrap), developments.map(d => d.explanation));
      assert.equal(wraps.length, developments.length, 'every entry sentence found');
      assert.ok(!wraps.includes('pretty'), 'timeline entries use the browser\'s own wrapping too');

      // The desktop gets the same sentence and a wider grid.
      const desktopSize = { width: 1440, height: 900 };
      const desktop = await openReading(browser, desktopSize);
      await desktop.goto(`${base}/`);
      await desktop.getByTestId('timeline').waitFor();
      await desktop.waitForTimeout(1200);
      const desktopSentence = await desktop.getByTestId('rating-explanation').boundingBox();
      assert.ok(desktopSentence.width > 380 && desktopSentence.width <= 415, `desktop sentence: 320pt per 17pt of its 22pt (${Math.round(desktopSentence.width)}pt)`);
      const desktopGrid = await timelineColumns(desktop);
      assert.equal(desktopGrid.columns, 3, 'desktop timeline is three columns');
      await scrollIntoTimeline(desktop, desktopSize);
      assert.deepEqual(await linesUnderHeader(desktop), [], 'no desktop timeline line at strength under the header');
    } finally {
      await browser.close();
    }
  });
});
