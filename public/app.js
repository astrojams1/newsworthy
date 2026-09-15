import config from './runtime-config.js';
import { fetchReading, validReading } from './reading.js';
import { readSaved, writeSaved, onResume, onBack, canShare, share } from './platform.js';

const $score = document.getElementById('score');
const $explanation = document.getElementById('explanation');
const $meta = document.getElementById('meta');
const $retry = document.getElementById('retry');
const $about = document.getElementById('about');
const $share = document.getElementById('share');
const cacheKey = `newsworthy.current.v1:${config.apiBaseUrl}`;
let current = null;
let updatedAt = null;
let saved = false;
let loading = false;

/**
 * The favicon carries the current score, so a pinned tab reads at a glance
 * without opening it. Theme-aware: the digit is invisible against matching
 * browser chrome otherwise, and a favicon gets no CSS from the page.
 */
function setFavicon(score) {
  const text = score == null ? '\u2013' : String(score);
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    '<style>text{fill:#16161a}@media(prefers-color-scheme:dark){text{fill:#f2f2f5}}</style>' +
    '<text x="16" y="25" text-anchor="middle" font-size="27" font-weight="500" ' +
    'font-family="system-ui,-apple-system,sans-serif">' + text + '</text></svg>';
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

function ago(date) {
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.round(hours / 24), 'day');
}

function renderMeta() {
  $meta.textContent = updatedAt ? `${saved ? 'Saved reading · ' : ''}Updated ${ago(updatedAt)}` : '';
}

function render(data, isSaved) {
  current = data;
  saved = isSaved;
  updatedAt = new Date(data.created_at);
  $score.textContent = data.score;
  $explanation.textContent = data.explanation;
  document.title = `${data.score}/10 · Newsworthy`;
  setFavicon(data.score);
  document.body.dataset.state = 'ready';
  renderMeta();
}

async function load() {
  // Polls, reconnects and native resume events can arrive together.
  if (loading) return;
  loading = true;
  $retry.disabled = true;
  if (!current) document.body.dataset.state = 'loading';
  try {
    const data = await fetchReading(config.apiBaseUrl);
    render(data, false);
    $retry.hidden = true;
    // Storage being full or disabled must never discard a successful fetch.
    await writeSaved(cacheKey, JSON.stringify(data)).catch(() => {});
  } catch {
    $retry.hidden = false;
    if (current) {
      saved = true;
      renderMeta();
    } else {
      $score.textContent = '–';
      $explanation.textContent = 'The latest rating is unavailable. Try again when you’re connected.';
      document.body.dataset.state = 'error';
      setFavicon(null);
    }
  } finally {
    loading = false;
    $retry.disabled = false;
  }
}

$retry.addEventListener('click', load);
document.getElementById('about-open').addEventListener('click', () => $about.showModal());
for (const [id, url] of [['privacy', config.privacyUrl], ['support', config.supportUrl]]) {
  if (url) {
    document.getElementById(id).href = url;
    document.getElementById(id).hidden = false;
  }
}
canShare().then((available) => { $share.hidden = !available; }).catch(() => {});
$share.addEventListener('click', async () => {
  if (!current) return;
  try {
    await share({ title: 'Newsworthy', text: `${current.score}/10 · ${current.explanation}\nUpdated ${updatedAt.toLocaleString()}`,
      url: config.apiBaseUrl || location.origin });
  } catch { /* Dismissing the system share sheet is normal. */ }
});
onBack(() => {
  if (!$about.open) return false;
  $about.close();
  return true;
}).catch(() => {});

// Restore before requesting; a cold launch in airplane mode remains useful.
try {
  const cached = JSON.parse(await readSaved(cacheKey));
  if (validReading(cached)) render(cached, true);
} catch { /* A missing, corrupt or unavailable cache is a normal first launch. */ }
load();
setInterval(renderMeta, 30_000);
setInterval(() => { if (!document.hidden) load(); }, 60_000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
window.addEventListener('online', load);
onResume(load).catch(() => {});
