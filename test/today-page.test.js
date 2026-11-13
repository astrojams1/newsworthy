import { test } from 'node:test';
import assert from 'node:assert/strict';
import { biggestDays, dailyHighs, dayOf, feedJson, feedRss, isDay, renderBadge, renderDayPage, renderTodayPage, safeTimeZone } from '../src/today.js';
import { CALLER_TOKEN, PORTS, withServer } from './with-server.js';

const machinery = /\bAI\b|artificial intelligence|language models?|\bClaude\b|Anthropic|market risk|trading/;
const hour = 3600_000;
// 2026-11-05 14:00 UTC is 9:00 AM Eastern.
const base = Date.parse('2026-11-05T14:00:00Z');
const points = [
  { id: 1, t: base, displayed: 5, root: 1, explanation: 'First.' },
  { id: 2, t: base + hour, displayed: 8, root: 2, explanation: 'Big break.' },
  { id: 3, t: base + 2 * hour, displayed: 8, root: 2, explanation: 'Later rewording.' },
  { id: 4, t: base + 24 * hour, displayed: 6, root: 2, explanation: 'Next day.' },
];
const byId = new Map(points.map((p) => [p.id, p]));
const sentence = (p) => (byId.get(p.root) ?? p).explanation;

test('a day is its high, first reached, with the sentence of the development behind it', () => {
  const days = dailyHighs(points, { sentence });
  assert.deepEqual(days.map((d) => [d.date, d.score, d.low, d.checks, d.headline]), [
    ['2026-11-05', 8, 5, 3, 'Big break.'],
    ['2026-11-06', 6, 6, 1, 'Big break.'],
  ]);
  assert.equal(days[0].at, new Date(base + hour).toISOString(), 'ties keep the first time');
  assert.deepEqual(biggestDays(days).map((d) => d.date), ['2026-11-05'], 'one entry per development');
});

test('days run on US Eastern time and only real dates are accepted', () => {
  assert.equal(dayOf(Date.parse('2026-11-13T04:30:00Z')), '2026-11-12');
  assert.ok(isDay('2026-02-28'));
  assert.ok(!isDay('2026-02-30'));
  assert.ok(!isDay('../etc'));
  assert.equal(safeTimeZone('America/Los_Angeles'), 'America/Los_Angeles');
  assert.equal(safeTimeZone('Mars/Base"<'), 'America/New_York');
});

test('pages, badge and feeds say what the number is without naming how it is made', () => {
  const days = dailyHighs(points, { sentence });
  const current = { score: 6, explanation: 'Next day <b>.', created_at: new Date(base + 24 * hour).toISOString() };
  const page = renderTodayPage({ current, days, cardVersion: 'abc', now: base + 24 * hour });
  assert.match(page, /<h1>How big is the news today\?<\/h1>/);
  assert.match(page, /Next day &lt;b&gt;\./, 'sentences are escaped');
  assert.match(page, /apps\.apple\.com\/app\/id6812519450/);
  assert.match(page, /Newsworthy Calm News/);
  assert.match(page, /badge\.svg/);
  assert.match(page, /CC BY 4\.0/);
  const data = JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(data['@graph'][0]['@type'], 'Dataset');
  const day = renderDayPage({ day: days[0], next: days[1], cardVersion: 'abc' });
  assert.match(day, /How big was the news on Thursday, November 5, 2026\?/);
  assert.match(day, /rel="canonical" href="https:\/\/newsworthy-indol\.vercel\.app\/day\/2026-11-05"/);
  const badge = renderBadge({ current });
  assert.match(badge, /^<svg/);
  assert.match(badge, /Last checked 9:00 AM EST/);
  const rss = feedRss({ current, days });
  assert.match(rss, /<guid isPermaLink="true">https:\/\/newsworthy-indol\.vercel\.app\/day\/2026-11-06<\/guid>/);
  const json = feedJson({ current, days });
  assert.equal(json.days[0].date, '2026-11-06', 'newest first');
  for (const text of [page.replace(/<p class="sentence">.*?<\/p>/g, ''), day, badge]) {
    assert.doesNotMatch(text.replace(/Big break\.|Next day[^<]*/g, ''), machinery);
  }
});

test('the server serves the today page, a day page, the badge, embed and feeds', async () => {
  await withServer({ port: PORTS.todayPage, env: { NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    // Empty database: the page still answers, with a dash.
    const empty = await fetch(`${base}/today`);
    assert.equal(empty.status, 200);
    assert.match(await empty.text(), /No reading has been saved yet/);

    await fetch(`${base}/api/readings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-newsworthy-token': CALLER_TOKEN },
      body: JSON.stringify({ score: 7, explanation: 'hormuz tanker strike alpha' }),
    });
    const page = await fetch(`${base}/today`);
    assert.match(page.headers.get('cache-control'), /s-maxage/);
    const html = await page.text();
    assert.match(html, /<b>7<\/b>/);
    const today = html.match(/href="\/day\/(\d{4}-\d{2}-\d{2})"/)[1];
    const day = await fetch(`${base}/day/${today}`);
    assert.equal(day.status, 200);
    assert.match(await day.text(), /hormuz tanker strike alpha/);
    assert.equal((await fetch(`${base}/day/2001-01-01`)).status, 404);
    assert.equal((await fetch(`${base}/day/not-a-day`)).status, 404);

    const badge = await fetch(`${base}/badge.svg?theme=dark&tz=America/Chicago`);
    assert.match(badge.headers.get('content-type'), /image\/svg\+xml/);
    assert.match(await badge.text(), /7<tspan/);
    const embed = await fetch(`${base}/embed`);
    assert.match(await embed.text(), /target="_blank"/);
    const json = await (await fetch(`${base}/today.json`)).json();
    assert.equal(json.current.score, 7);
    assert.equal(json.days[0].high, 7);
    const rss = await fetch(`${base}/today.rss`);
    assert.match(rss.headers.get('content-type'), /application\/rss\+xml/);
    const sitemap = await (await fetch(`${base}/sitemap-days.xml`)).text();
    assert.match(sitemap, new RegExp(`/day/${today}</loc>`));
  });
});
