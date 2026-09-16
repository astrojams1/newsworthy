import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer } from './with-server.js';

const site = 'https://newsworthy-indol.vercel.app';

test('public discovery links resolve, metadata parses, and operational routes opt out of indexing', async () => {
  await withServer({ port: 8841, env: { NEWSWORTHY_NO_SCHEDULER: '1', ADMIN_TOKEN: 'test-admin-token' } }, async (base) => {
    const sitemap = await fetch(`${base}/sitemap.xml`);
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.headers.get('content-type'), /application\/xml/);
    const locations = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    assert.deepEqual(locations, [site + '/', site + '/privacy', site + '/support']);

    for (const location of locations) {
      const response = await fetch(base + new URL(location).pathname);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('x-robots-tag'), null);
      const html = await response.text();
      assert.equal(html.match(/rel="canonical" href="([^"]+)"/)[1], location);
      assert.equal(html.match(/property="og:url" content="([^"]+)"/)[1], location);
      assert.equal(html.match(/property="og:title" content="([^"]+)"/)[1], html.match(/<title[^>]*>([^<]+)<\/title>/)[1]);
      assert.equal(html.match(/property="og:image" content="([^"]+)"/)[1], site + '/social-card.png');
      if (location === site + '/') {
        const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
        assert.equal(data['@type'], 'WebSite');
        assert.equal(data.url, location);
        assert.match(html, /href="https:\/\/newsworthy-indol\.vercel\.app\/privacy"/);
        assert.match(html, /href="https:\/\/newsworthy-indol\.vercel\.app\/support"/);
      }
    }

    const card = await fetch(`${base}/social-card.png`);
    assert.equal(card.status, 200);
    assert.equal(card.headers.get('content-type'), 'image/png');
    const bytes = Buffer.from(await card.arrayBuffer());
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(bytes.readUInt32BE(16), 1200);
    assert.equal(bytes.readUInt32BE(20), 630);

    const robots = await fetch(`${base}/robots.txt`);
    assert.match(robots.headers.get('content-type'), /text\/plain/);
    assert.match(await robots.text(), /Sitemap: https:\/\/newsworthy-indol\.vercel\.app\/sitemap\.xml/);
    const llms = await fetch(`${base}/llms.txt`);
    assert.equal(llms.status, 200);
    assert.match(llms.headers.get('content-type'), /text\/plain/);
    assert.match(await llms.text(), /https:\/\/newsworthy-indol\.vercel\.app\/api\/instructions/);

    for (const path of ['/admin', '/admin.html', '/api/prompt', '/healthz']) {
      const response = await fetch(base + path);
      assert.equal(response.headers.get('x-robots-tag'), 'noindex', path);
    }
    const admin = await fetch(`${base}/admin.html`);
    assert.match(await admin.text(), /<meta name="robots" content="noindex">/);
  });
});
