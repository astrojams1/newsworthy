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
