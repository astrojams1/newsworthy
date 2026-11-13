/**
 * "How big is the news today?": the public, citable page built on the front
 * page's own number, with a page per day, a badge and iframe anyone can embed,
 * and the daily figure as JSON and RSS.
 *
 * Everything here is pure: the server loads the replay (`displayedSeries()`,
 * the same one the admin chart and `/api/current` use) and hands it in, so a
 * day's figure cannot disagree with what the front page showed that day.
 *
 * A day's figure is its high: the largest number the front page showed between
 * midnight and midnight in `TIME_ZONE`. The high rather than a closing number,
 * because the question a day page answers is "how big did the news get", and
 * a development that broke at noon and faded by midnight still made the day.
 *
 * What is public, and why (docs/product-messaging.md, "The public today page"):
 * the web reader already gives today's number, its sentence, the update time
 * and the past week's developments away free. This adds only what follows from
 * those: each day's high and the sentence of the development behind it. The
 * Home Screen widgets and the app itself stay the paid product.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE = 'https://newsworthy-indol.vercel.app';
export const APP_STORE_URL = 'https://apps.apple.com/app/id6812519450';
export const SEARCH_PHRASE = 'Newsworthy Calm News';
export const TIME_ZONE = 'America/New_York';
export const HISTORY_DAYS = 90;
export const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';
export const LICENSE_LINE = 'Newsworthy daily ratings are free to quote, chart and embed under CC BY 4.0. Please credit Newsworthy and link to ' + `${SITE}/today.`;

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The level colours, from the generated tokens, for the badge: an `<img>`
 *  cannot see the page's CSS custom properties. */
const LEVEL_RGB = (() => {
  const map = new Map();
  try {
    const css = readFileSync(join(ROOT_DIR, 'public/tokens.css'), 'utf8');
    for (const m of css.matchAll(/\[data-level="(\d+)"\] \{ --level-color: (\d+), (\d+), (\d+)/g)) {
      map.set(Number(m[1]), `rgb(${m[2]}, ${m[3]}, ${m[4]})`);
    }
  } catch { /* the badge falls back to ink */ }
  return map;
})();

export function isDay(text) {
  if (!DAY.test(text ?? '')) return false;
  const d = new Date(`${text}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text;
}

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
/** 'YYYY-MM-DD' of instant `t` in the page's time zone. */
export function dayOf(t, timeZone = TIME_ZONE) {
  const format = timeZone === TIME_ZONE ? dayFormat
    : new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  return format.format(new Date(t));
}

/** A time zone the badge may be asked for, or the default. */
export function safeTimeZone(name) {
  if (!name || !/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(name)) return TIME_ZONE;
  try { new Intl.DateTimeFormat('en-US', { timeZone: name }); return name; } catch { return TIME_ZONE; }
}

export function clock(t, timeZone = TIME_ZONE) {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(t));
}
function longDate(day) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${day}T12:00:00Z`));
}
function shortDate(day) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }).format(new Date(`${day}T12:00:00Z`));
}
function mediumDate(day) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${day}T12:00:00Z`));
}

/**
 * One record per day, oldest first, from replayed points.
 *
 * @param {Array<{t: number, displayed: number, root: number|null, id: number, explanation?: string}>} points
 *   `displayedSeries()` output, ascending
 * @param {(point: object) => string} sentence the sentence for the development
 *   the number is about at that point
 */
export function dailyHighs(points, { sentence, from = -Infinity, timeZone = TIME_ZONE } = {}) {
  const days = new Map();
  for (const point of points) {
    if (point.t < from) continue;
    const date = dayOf(point.t, timeZone);
    const day = days.get(date);
    if (!day) {
      days.set(date, { date, score: point.displayed, low: point.displayed, checks: 1, peak: point });
      continue;
    }
    day.checks += 1;
    day.low = Math.min(day.low, point.displayed);
    // Ties keep the first time the day reached its high.
    if (point.displayed > day.score) { day.score = point.displayed; day.peak = point; }
  }
  return [...days.values()].map(({ peak, ...day }) => ({
    ...day,
    at: new Date(peak.t).toISOString(),
    headline: sentence(peak),
    development: peak.root ?? peak.id,
  }));
}

/** The biggest days, one per development, highest first and newest first among ties. */
export function biggestDays(days, count = 5) {
  const seen = new Set();
  return [...days]
    .sort((a, b) => b.score - a.score || (a.date < b.date ? 1 : -1))
    .filter((day) => (seen.has(day.development) ? false : seen.add(day.development)))
    .slice(0, count);
}

// ---- HTML ------------------------------------------------------------------

export function escape(text) {
  return String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
const jsonLd = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

function head({ title, description, url, cardVersion, data, extra = '' }) {
  const t = escape(title);
  const d = escape(description);
  const card = `${SITE}/social-card.png?v=${cardVersion}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t}</title>
  <meta name="description" content="${d}">
  <link rel="canonical" href="${url}">
  <link rel="stylesheet" href="/info.css">
  <link rel="stylesheet" href="/today.css">
  <link rel="alternate" type="application/rss+xml" title="Newsworthy daily rating" href="${SITE}/today.rss">
  <link rel="alternate" type="application/json" title="Newsworthy daily rating (JSON)" href="${SITE}/today.json">
  <meta name="apple-itunes-app" content="app-id=6812519450">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Newsworthy">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${card}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Newsworthy wordmark and dash.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${card}">
<meta name="twitter:image:alt" content="Newsworthy wordmark and dash.">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<script type="application/ld+json">${jsonLd(data)}</script>${extra}
</head>`;
}

const appLine = () => `<p class="app-line">Newsworthy for iPhone and iPad puts this number and its sentence on your Home Screen as a widget. <a href="${APP_STORE_URL}">Get it on the App Store</a> for a one-time $1, or search “${SEARCH_PHRASE}”.</p>`;

const method = () => `<section id="method" aria-labelledby="method-title">
    <h2 id="method-title">How the number is made</h2>
    <p>Newsworthy reads the top world news through the day and rates the most significant development from 1 to 10. Higher means more consequential. The number on the front page is a level rather than a single reading: it is steadied across the last few readings, fades as a development ages, and counts a story that has run for weeks for less unless something in it breaks through.</p>
    <p>Each day here shows the highest number the front page reached between midnight and midnight US Eastern time, with the sentence for the development behind it, exactly as Newsworthy showed it.</p>
    <h3>What it is not</h3>
    <p>It is a judgment of how consequential the news is, and it can be wrong. It is not a complete briefing, a measure of personal safety or an emergency alert. The scale was refined during its first weeks, so early days were rated under earlier versions of it.</p>
  </section>`;

const footer = () => `<footer><a href="/">Today’s reading</a><a href="/today">How big is the news today?</a><a href="/today.json">JSON</a><a href="/today.rss">RSS</a><a href="/support">Support</a><a href="/privacy">Privacy</a></footer>`;

/** Bars for the history chart: no text inside the SVG, so it can stretch to any width. */
function chart(days, { highlight = new Set() } = {}) {
  if (!days.length) return '';
  const w = 10;
  const h = 100;
  const bars = days.map((day, i) => {
    const height = Math.max(day.score, 0.4) * (h / 10);
    return `<rect class="bar${highlight.has(day.date) ? ' top' : ''}" data-level="${day.score}" x="${i * w + 1.5}" y="${h - height}" width="${w - 3}" height="${height}"></rect>`;
  }).join('');
  const guides = [5, 10].map((v) => `<line class="guide" x1="0" x2="${days.length * w}" y1="${h - v * 10}" y2="${h - v * 10}"></line>`).join('');
  const peak = biggestDays(days, 1)[0];
  const label = `Daily high of the Newsworthy rating, ${mediumDate(days[0].date)} to ${mediumDate(days.at(-1).date)}. `
    + `The highest was ${peak.score} out of 10 on ${mediumDate(peak.date)}. Every day is listed below.`;
  return `<figure class="chart">
      <div class="plot">
        <div class="axis" aria-hidden="true"><span>10</span><span>5</span><span>1</span></div>
        <svg viewBox="0 0 ${days.length * w} ${h}" preserveAspectRatio="none" role="img" aria-label="${escape(label)}">${guides}${bars}</svg>
      </div>
      <figcaption><span>${escape(shortDate(days[0].date))}</span><span>Daily high, US Eastern days</span><span>${escape(shortDate(days.at(-1).date))}</span></figcaption>
    </figure>`;
}

function dayRow(day) {
  return `<li data-level="${day.score}"><a class="score" href="/day/${day.date}" aria-label="${escape(`${longDate(day.date)}: ${day.score} out of 10`)}"><b>${day.score}</b></a><div><a href="/day/${day.date}">${escape(longDate(day.date))}</a><p>${escape(day.headline)}</p></div></li>`;
}

export function embedSnippets() {
  const img = `<a href="${SITE}/today"><img src="${SITE}/badge.svg" width="320" height="64" alt="How big is the news today? The Newsworthy rating, 1 to 10"></a>`;
  const iframe = `<iframe src="${SITE}/embed" title="How big is the news today? Newsworthy" width="100%" height="168" style="border:0;max-width:440px" loading="lazy"></iframe>`;
  return { img, iframe };
}

/**
 * @param {object} p
 * @param {{score: number, explanation: string, created_at: string}|null} p.current what /api/current shows
 * @param {Array} p.days dailyHighs(), oldest first
 */
export function renderTodayPage({ current, days, cardVersion, now = Date.now() }) {
  const url = `${SITE}/today`;
  const today = dayOf(now);
  const todayRecord = days.find((d) => d.date === today);
  const top = biggestDays(days, 5);
  const snippets = embedSnippets();
  const level = current?.score ?? todayRecord?.score;
  const description = current
    ? `Today’s news is a ${current.score} out of 10 on Newsworthy: ${current.explanation}`
    : 'How significant is today’s world news? Newsworthy’s rating from 1 to 10, with every day’s high.';
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Dataset',
        '@id': `${url}#dataset`,
        name: 'Newsworthy daily news rating',
        description: 'The significance of world news each day, rated from 1 to 10 by Newsworthy, with the sentence for the development behind each day’s high. Updated through the day.',
        url,
        license: LICENSE_URL,
        isAccessibleForFree: true,
        creator: { '@type': 'Organization', name: 'Newsworthy', url: `${SITE}/` },
        temporalCoverage: days.length ? `${days[0].date}/${days.at(-1).date}` : undefined,
        variableMeasured: 'Significance of world news, 1 to 10',
        dateModified: current?.created_at,
        distribution: [
          { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${SITE}/today.json` },
          { '@type': 'DataDownload', encodingFormat: 'application/rss+xml', contentUrl: `${SITE}/today.rss` },
        ],
      },
      { '@type': 'WebPage', '@id': url, url, name: 'How big is the news today?', isPartOf: { '@type': 'WebSite', url: `${SITE}/`, name: 'Newsworthy' } },
    ],
  };
  return `${head({ title: 'How big is the news today? · Newsworthy', description, url, cardVersion, data })}
<body${level ? ` data-level="${level}"` : ' data-brand'}><div class="level-gradient" aria-hidden="true"></div><div class="page today">
  <header><a class="wordmark" href="/">Newsworthy</a></header>
  <main>
    <h1>How big is the news today?</h1>
    ${current ? `<p class="big" aria-label="${current.score} out of 10"><b>${current.score}</b><span>/10</span></p>
    <p class="sentence">${escape(current.explanation)}</p>
    <p class="checked">Last checked ${escape(clock(current.created_at))}, ${escape(longDate(dayOf(Date.parse(current.created_at))))}${todayRecord && todayRecord.score !== current.score ? ` · Today’s high so far: ${todayRecord.score}` : ''}</p>`
    : '<p class="big"><b>–</b></p><p class="sentence">No reading has been saved yet.</p>'}
    ${appLine()}

    <h2>The last ${days.length ? Math.min(days.length, HISTORY_DAYS) : HISTORY_DAYS} days</h2>
    ${chart(days, { highlight: new Set(top.map((d) => d.date)) })}
    ${top.length ? `<h3>Biggest days</h3>
    <ol class="days">${top.map(dayRow).join('')}</ol>` : ''}

    <section id="embed" aria-labelledby="embed-title">
      <h2 id="embed-title">Embed this</h2>
      <p>Put today’s number on your own site. Both need no script, update on their own and link back here.</p>
      <h3>Badge</h3>
      <p><a href="/today"><img src="/badge.svg" width="320" height="64" alt="How big is the news today? The Newsworthy rating, 1 to 10"></a></p>
      <label for="snippet-img">Copy this HTML</label>
      <textarea id="snippet-img" readonly rows="3">${escape(snippets.img)}</textarea>
      <p class="note">Add <code>?theme=dark</code> for a dark badge, or <code>?tz=America/Los_Angeles</code> for another time zone.</p>
      <h3>Card with the sentence</h3>
      <label for="snippet-iframe">Copy this HTML</label>
      <textarea id="snippet-iframe" readonly rows="3">${escape(snippets.iframe)}</textarea>
      <h3>Data</h3>
      <p>Every day’s high, its time and its sentence: <a href="/today.json">today.json</a> and the <a href="/today.rss">RSS feed</a>. Use them in charts, articles and research. ${escape(LICENSE_LINE)}</p>
    </section>

    ${method()}

    <h2 id="all-days">Every day</h2>
    <ol class="days" reversed>${[...days].reverse().map(dayRow).join('')}</ol>
    ${appLine()}
  </main>
  ${footer()}
</div></body>
</html>
`;
}

export function renderDayPage({ day, previous, next, cardVersion, isToday = false }) {
  const url = `${SITE}/day/${day.date}`;
  const when = longDate(day.date);
  const title = `How big was the news on ${when}? · Newsworthy`;
  const description = `${mediumDate(day.date)}: ${day.score} out of 10 on Newsworthy. ${day.headline}`;
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': url,
        url,
        name: `How big was the news on ${when}?`,
        description,
        datePublished: day.at,
        isPartOf: { '@id': `${SITE}/today#dataset`, '@type': 'Dataset', name: 'Newsworthy daily news rating', url: `${SITE}/today` },
        license: LICENSE_URL,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'How big is the news today?', item: `${SITE}/today` },
          { '@type': 'ListItem', position: 2, name: mediumDate(day.date), item: url },
        ],
      },
    ],
  };
  const range = day.low === day.score ? `It held at ${day.score} all day.` : `The number ranged from ${day.low} to ${day.score}.`;
  return `${head({ title, description, url, cardVersion, data })}
<body data-level="${day.score}"><div class="level-gradient" aria-hidden="true"></div><div class="page today">
  <header><a class="wordmark" href="/">Newsworthy</a></header>
  <main>
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/today">How big is the news today?</a> › ${escape(mediumDate(day.date))}</nav>
    <h1>How big was the news on ${escape(when)}?</h1>
    <p class="big" aria-label="${day.score} out of 10"><b>${day.score}</b><span>/10</span></p>
    <p class="sentence">${escape(day.headline)}</p>
    <p class="checked">The day’s high${isToday ? ' so far' : ''}, first reached at ${escape(clock(day.at))}. Newsworthy checked ${day.checks} ${day.checks === 1 ? 'time' : 'times'} that day. ${range}</p>
    <nav class="pager" aria-label="Other days">${previous ? `<a rel="prev" href="/day/${previous.date}">← ${escape(mediumDate(previous.date))}: ${previous.score}</a>` : '<span></span>'}${next ? `<a rel="next" href="/day/${next.date}">${escape(mediumDate(next.date))}: ${next.score} →</a>` : '<a href="/today">Today →</a>'}</nav>
    ${appLine()}
    <p class="note">${escape(LICENSE_LINE)}</p>
    ${method()}
  </main>
  ${footer()}
</div></body>
</html>
`;
}

/** The iframe card: no script, every link opens Newsworthy in a new tab. */
export function renderEmbed({ current, theme }) {
  const level = current?.score;
  const appearance = theme === 'dark' || theme === 'light' ? ` data-appearance="${theme}"` : '';
  return `<!doctype html>
<html lang="en"${appearance}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>How big is the news today? · Newsworthy</title>
<link rel="stylesheet" href="/tokens.css">
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{font:400 15px/1.45 var(--font-sans);color:var(--ink);background:var(--surface-tinted)}
a.card{display:flex;gap:14px;align-items:flex-start;height:100%;padding:14px 16px;color:inherit;text-decoration:none;border-radius:var(--radius-card);border:1px solid var(--rule);background:var(--surface-tinted)}
.n{flex:none;min-width:58px;font-size:40px;line-height:1;font-weight:500;letter-spacing:-.04em;color:var(--accent)}.n small{font-size:15px;color:var(--ink-muted);letter-spacing:0}
.card>div:last-child{min-width:0;flex:1}
.k{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-muted)}
.s{margin:4px 0 6px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.t{font-size:12px;color:var(--ink-muted)}a.card:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
</style>
</head>
<body${level ? ` data-level="${level}"` : ''}><a class="card" href="${SITE}/today" target="_blank" rel="noopener">
<div class="n">${level ?? '–'}<small>/10</small></div>
<div><div class="k">How big is the news today? · Newsworthy</div>
<p class="s">${escape(current?.explanation ?? 'No reading has been saved yet.')}</p>
<div class="t">${current ? `Last checked ${escape(clock(current.created_at))}` : ''}</div></div>
</a></body>
</html>
`;
}

/** The badge: a self-contained SVG for an `<img>`, so the host page runs nothing. */
export function renderBadge({ current, theme = 'light', timeZone = TIME_ZONE }) {
  const dark = theme === 'dark';
  const bg = dark ? '#101014' : '#FFFFFF';
  const ink = dark ? '#F2F2F5' : '#16161A';
  const muted = dark ? '#C0C2CB' : '#52545D';
  const rule = dark ? '#343B39' : '#DCE3DF';
  const level = current?.score;
  const colour = LEVEL_RGB.get(level) ?? muted;
  const checked = current ? `Last checked ${clock(current.created_at, timeZone)}` : 'No reading yet';
  const label = current ? `Today’s news: ${level}/10, ${checked.toLowerCase()}. Newsworthy.` : 'Newsworthy: no reading yet.';
  const font = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="64" viewBox="0 0 320 64" role="img" aria-label="${escape(label)}">
<title>${escape(label)}</title>
<rect x="0.5" y="0.5" width="319" height="63" rx="12" fill="${bg}" stroke="${rule}"/>
<rect x="12" y="14" width="4" height="36" rx="2" fill="${colour}"/>
<g font-family="${font}" fill="${ink}">
<text x="28" y="28" font-size="10" letter-spacing="1.3" fill="${muted}">NEWSWORTHY · TODAY’S NEWS</text>
<text x="28" y="50" font-size="13" fill="${muted}">${escape(checked)}</text>
<text x="300" y="44" font-size="34" font-weight="600" text-anchor="end" letter-spacing="-1">${level ?? '–'}<tspan font-size="15" font-weight="400" fill="${muted}" letter-spacing="0">/10</tspan></text>
</g>
</svg>
`;
}

// ---- feeds -------------------------------------------------------------------

export function feedJson({ current, days, now = Date.now() }) {
  return {
    title: 'Newsworthy daily news rating',
    description: 'How significant world news is, rated from 1 to 10, with each day’s high and the sentence behind it.',
    home_page_url: `${SITE}/today`,
    feed_url: `${SITE}/today.json`,
    license: LICENSE_URL,
    attribution: LICENSE_LINE,
    time_zone: TIME_ZONE,
    generated_at: new Date(now).toISOString(),
    current: current ? {
      score: current.score,
      explanation: current.explanation,
      checked_at: current.created_at,
      url: `${SITE}/today`,
    } : null,
    days: [...days].reverse().map((day) => ({
      date: day.date,
      high: day.score,
      low: day.low,
      high_at: day.at,
      checks: day.checks,
      headline: day.headline,
      url: `${SITE}/day/${day.date}`,
    })),
  };
}

const xml = (text) => escape(text);

export function feedRss({ current, days, now = Date.now(), limit = 30 }) {
  const items = [...days].reverse().slice(0, limit).map((day) => `  <item>
    <title>${xml(`${mediumDate(day.date)}: ${day.score}/10`)}</title>
    <link>${SITE}/day/${day.date}</link>
    <guid isPermaLink="true">${SITE}/day/${day.date}</guid>
    <pubDate>${new Date(day.at).toUTCString()}</pubDate>
    <description>${xml(`${day.headline} (The day’s high on Newsworthy: ${day.score} out of 10.)`)}</description>
  </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>How big is the news today? · Newsworthy</title>
  <link>${SITE}/today</link>
  <atom:link href="${SITE}/today.rss" rel="self" type="application/rss+xml"/>
  <description>${xml(current ? `Now ${current.score}/10: ${current.explanation}` : 'The significance of world news each day, rated from 1 to 10.')}</description>
  <language>en</language>
  <copyright>${xml(LICENSE_LINE)}</copyright>
  <lastBuildDate>${new Date(now).toUTCString()}</lastBuildDate>
  <ttl>60</ttl>
${items}
</channel>
</rss>
`;
}

export function daysSitemap({ days }) {
  const urls = [...days].reverse().map((day) => `  <url><loc>${SITE}/day/${day.date}</loc><lastmod>${day.at.slice(0, 10)}</lastmod></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}
