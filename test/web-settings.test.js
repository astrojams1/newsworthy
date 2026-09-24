import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { PORTS, withServer } from './with-server.js';

// Settings' navigation in a real browser, against the real server serving the
// exported web app (`npm test` builds it first). Rendered-prop tests mock the
// router's history, so they could not see this: a link to an alerts page on
// the web redirects to the Settings overview and left a second overview
// behind it, and the first Close only popped that one. Reported 2026-09-24.

// A browser already on the machine; CI's Ubuntu runner has Chrome.
const BROWSERS = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const executablePath = BROWSERS.find(path => existsSync(path));

test('Close leaves Settings in one step, however Settings was reached on the web', { timeout: 120_000 }, async (t) => {
  if (!executablePath) {
    // Never silently in CI, where the regression would otherwise go unchecked.
    assert.ok(!process.env.CI, `no Chrome or Chromium found; set CHROME_PATH (looked in ${BROWSERS.join(', ')})`);
    t.skip('no Chrome or Chromium on this machine; set CHROME_PATH to run it');
    return;
  }
  await withServer({ port: PORTS.webSettings, env: { NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    const browser = await chromium.launch({ executablePath });
    try {
      const page = await browser.newPage();
      const path = () => new URL(page.url()).pathname;
      const closeButton = () => page.getByLabel('Close settings').filter({ visible: true }).first();
      const arrive = async (pathname) => { await page.waitForURL(url => url.pathname === pathname, { timeout: 10_000 }); };

      // From the reading: the gear opens Settings and Close returns.
      await page.goto(`${base}/`);
      await page.getByLabel('Settings', { exact: true }).first().click();
      await arrive('/settings');
      await closeButton().click();
      await arrive('/');

      // Through a page and back again, then Close.
      await page.getByLabel('Settings', { exact: true }).first().click();
      await arrive('/settings');
      await page.getByLabel(/^Appearance,/).click();
      await arrive('/settings/appearance');
      await page.goBack();
      await arrive('/settings');
      await closeButton().click();
      await arrive('/');

      // A link straight into Settings, and links to the native-only alerts
      // pages, which redirect to the overview: one Close reaches the reading.
      for (const start of ['/settings', '/settings/notifications', '/settings/threshold']) {
        await page.goto(`${base}${start}`);
        await arrive('/settings');
        await closeButton().click();
        await arrive('/');
        assert.equal(path(), '/', `one Close from ${start}`);
      }
    } finally {
      await browser.close();
    }
  });
});

// Reported 2026-09-24: choosing a theme on Appearance recoloured the page and
// its check mark but not the back arrow. The navigator tints its arrow with an
// SVG filter under one fixed id, and a browser may keep painting the old
// colour, which a screenshot here cannot see because it repaints. So the check
// is structural: the arrow carries the theme's colour in its own image, under
// no filter a new theme leaves in place.
test('the Settings back arrow follows the theme chosen on Appearance on the web', { timeout: 120_000 }, async (t) => {
  if (!executablePath) {
    assert.ok(!process.env.CI, `no Chrome or Chromium found; set CHROME_PATH (looked in ${BROWSERS.join(', ')})`);
    t.skip('no Chrome or Chromium on this machine; set CHROME_PATH to run it');
    return;
  }
  await withServer({ port: PORTS.webSettingsTheme, env: { NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    const browser = await chromium.launch({ executablePath });
    try {
      const page = await browser.newPage({ colorScheme: 'light' });
      await page.goto(`${base}/`);
      await page.getByLabel('Settings', { exact: true }).first().click();
      await page.getByLabel(/^Appearance,/).click();
      await page.waitForURL(url => url.pathname === '/settings/appearance', { timeout: 10_000 });
      const back = page.getByLabel('Go back').filter({ visible: true }).first();
      const arrow = () => back.evaluate(element => {
        const image = element.querySelector('img');
        const stroke = decodeURIComponent(image?.getAttribute('src') ?? '').match(/stroke="([^"]+)"/)?.[1];
        const filters = [...element.querySelectorAll('[style*="filter"]')].map(node => node.style.filter);
        return { stroke, filters };
      });
      const seen = [];
      for (const choice of ['dark', 'light', 'dark']) {
        await page.getByTestId(`theme-${choice}`).click();
        await page.waitForFunction(value => document.documentElement.dataset.appearance === value, choice);
        const { stroke, filters } = await arrow();
        assert.ok(stroke, `the ${choice} back arrow draws its own stroke`);
        assert.ok(!filters.some(filter => /#tint-\d/.test(filter)), `no fixed-id tint filter on the ${choice} back arrow: ${filters}`);
        seen.push(stroke);
      }
      assert.notEqual(seen[0], seen[1], 'Dark and Light draw the arrow in different colours');
      assert.equal(seen[0], seen[2], 'returning to Dark returns the arrow to its dark colour');
    } finally {
      await browser.close();
    }
  });
});
