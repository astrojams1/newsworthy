import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { CUES, DURATION, FPS } from '../store/video/today/timeline.js';
import { COPY, FILM, POSTER_SECONDS, REQUIREMENTS, SCENES, TARGET, reading } from '../store/video/today/film.js';

// The "today" Short (store/video/today) draws the day's real reading. These
// are the facts it rests on, checked before a render rather than after an
// upload: that the reading is one the app could show, that every line still
// says what its source says, and that it frames for a phone.

test('the Short is short, loops in whole frames and renders 1080 × 1920', () => {
  const [min, max] = REQUIREMENTS.seconds;
  assert.ok(DURATION >= min && DURATION <= max, `${DURATION} s is outside ${min}–${max} s`);
  assert.ok(DURATION <= 20, 'a Short a stranger finishes is under twenty seconds; the trailer ran 32 and was left at about 15');
  assert.equal(Math.round(DURATION * FPS), DURATION * FPS);
  assert.equal(`${Math.round(TARGET.width * TARGET.scale)}x${Math.round(TARGET.height * TARGET.scale)}`, '1080x1920');
  assert.ok(POSTER_SECONDS > CUES.sentence[1] && POSTER_SECONDS < CUES.home[0], 'the cover shows the reading with its sentence');
});

// The first frame is the hook: the question and the day's number, before
// anything moves. The trailer's first five seconds were blank feed cards.
test('the question and the number are on screen from the first frame', () => {
  assert.equal(COPY.question.on[0], 0);
  assert.equal(COPY.score.on[0], 0);
  assert.ok(CUES.sentence[1] <= 2, 'the sentence is set down within two seconds');
});

test('the snapshot is a reading the app would show', () => {
  assert.ok(Number.isInteger(reading.score) && reading.score >= 1 && reading.score <= 10);
  assert.ok(reading.explanation_text.trim().length > 0 && reading.explanation_text.length <= 400);
  for (const key of ['fetched_at', 'created_at']) assert.ok(Number.isFinite(Date.parse(reading[key])), key);
  assert.ok(Date.parse(reading.created_at) <= Date.parse(reading.fetched_at), 'a reading saved after it was fetched');
  assert.match(reading.source, /^https:\/\/.+\/api\/current$/);
});

test('every file the Short is made from, depicts or quotes exists', () => {
  for (const file of FILM) assert.ok(existsSync(file), `the film is made from missing ${file}`);
  for (const scene of SCENES) for (const file of scene.depicts) assert.ok(existsSync(file), `${scene.id} depicts missing ${file}`);
});

test('every line on screen is still in its source, word for word', () => {
  for (const [key, line] of Object.entries(COPY)) {
    assert.ok(readFileSync(line.source, 'utf8').includes(line.quote),
      `store/video/today/film.js line ${key} quotes ${line.quote} from ${line.source}, which no longer contains it.`);
  }
});

// The film's own words: the reading's sentence is the app's, and may report
// what it reports; nothing the film adds says how ratings are made, ranks or hurries.
test('no line the film writes mentions how ratings are made, or ranks or hurries', () => {
  const words = Object.entries(COPY).filter(([key]) => !['sentence', 'story'].includes(key)).map(([, line]) => line.text).join(' ');
  for (const banned of [/\bAI\b/, /artificial/i, /\bmodels?\b/i, /\bbest\b/i, /#1/, /\burgent/i, /breaking/i, /download now/i, /market/i]) assert.doesNotMatch(words, banned);
});

const BROWSERS = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const executablePath = BROWSERS.find(path => existsSync(path));
async function withComposition(t, run) {
  if (!executablePath) { t.skip('no Chrome or Chromium on this machine; set CHROME_PATH to run it'); return; }
  const { createServer } = await import('node:http');
  const { extname, resolve, sep } = await import('node:path');
  const { chromium } = await import('playwright-core');
  const root = resolve('.');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
  const server = createServer((req, res) => {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!path.startsWith(root + sep) || !existsSync(path)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' }).end(readFileSync(path));
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const browser = await chromium.launch({ executablePath });
  try {
    const page = await browser.newPage({ viewport: { width: TARGET.width, height: TARGET.height } });
    await page.goto(`http://127.0.0.1:${server.address().port}/store/video/today/composition.html`);
    await page.evaluate(() => window.NW.ready);
    await run(page);
  } finally {
    await browser.close();
    server.close();
  }
}

// YouTube's controls cover the top, the right edge and the bottom of a Short,
// and a tall phone crops its sides (vendor/skills/skills/youtube-shorts).
// Every word, number and widget stays inside the measured safe zone. One
// exception, as in the trailer: the reading's muted story line ("Iran War ·
// 9h ago") sits just below the box, above the title stack.
const ZONES = 'vendor/skills/skills/youtube-shorts/assets/zones.json';
test('every word, number and widget stays inside the Shorts safe zone', t => withComposition(t, async page => {
  const zones = JSON.parse(readFileSync(ZONES, 'utf8'));
  const k = TARGET.width / zones.frame.width;
  const area = z => ({ left: z.x * k, top: z.y * k, right: (z.x + z.width) * k, bottom: (z.y + z.height) * k });
  const safe = area(zones.safe), upper = area(zones.safeAboveRail);
  const stack = zones.keepOut.find(z => z.id === 'stack' || z.id === 'title' || /stack|title/i.test(z.id));
  const inside = (r, z) => r.left >= z.left - 0.5 && r.top >= z.top - 0.5 && r.right <= z.right + 0.5 && r.bottom <= z.bottom + 0.5;
  const storyText = COPY.story.text;
  const outside = [], seen = new Set();
  for (let time = 0; time < DURATION; time += 0.2) {
    const shown = await page.evaluate(time => {
      window.NW.render(time);
      const found = [];
      for (const e of document.querySelectorAll('[data-safe], [data-box]')) {
        let opacity = 1, r = e.getBoundingClientRect();
        let rect = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        for (let a = e; a && a.id !== 'stage'; a = a.parentElement) {
          const style = getComputedStyle(a);
          if (style.display === 'none') opacity = 0;
          opacity *= Number(style.opacity);
          if (a !== e && style.overflow !== 'visible') {
            const c = a.getBoundingClientRect();
            rect = { left: Math.max(rect.left, c.left), top: Math.max(rect.top, c.top), right: Math.min(rect.right, c.right), bottom: Math.min(rect.bottom, c.bottom) };
          }
        }
        if (opacity < 0.5 || rect.right - rect.left < 0.5 || rect.bottom - rect.top < 0.5) continue;
        found.push({ name: e.dataset.safe || e.dataset.box, text: e.textContent.slice(0, 30), rect });
      }
      return found;
    }, time);
    for (const { name, text, rect } of shown) {
      seen.add(name);
      if (text === storyText) {
        if (stack && rect.bottom > stack.y * k) outside.push(`${time.toFixed(1)} s story line reaches the title stack at ${(rect.bottom / k).toFixed(0)}`);
        continue;
      }
      if (!inside(rect, rect.bottom <= upper.bottom ? upper : safe)) {
        outside.push(`${time.toFixed(1)} s ${name} "${text}": ${['left', 'top', 'right', 'bottom'].map(s => `${s} ${(rect[s] / k).toFixed(0)}`).join(', ')}`);
      }
    }
  }
  assert.deepEqual(outside.slice(0, 12), [], `${outside.length} placements outside the safe zone (frame pixels)`);
  const expected = ['question', 'oneNumber', 'oneSentence', 'home', 'reading', 'medium', 'small', 'end'];
  assert.deepEqual(expected.filter(name => !seen.has(name)), [], 'parts of the film the check never saw');
}));

test('the phone runs off the bottom of the frame, clears the rail and is not a thumbnail', t => withComposition(t, async page => {
  const zones = JSON.parse(readFileSync(ZONES, 'utf8'));
  const k = TARGET.width / zones.frame.width;
  const rail = zones.keepOut.find(z => z.id === 'rail');
  for (let time = 0; time < CUES.phoneOut[0]; time += 0.25) {
    const r = await page.evaluate(time => {
      window.NW.render(time);
      const { right, bottom, width } = document.querySelector('[data-part="phone"]').getBoundingClientRect();
      return { right, bottom, width };
    }, time);
    assert.ok(r.bottom >= TARGET.height, `at ${time.toFixed(2)} s the phone ends at ${(r.bottom / k).toFixed(0)}, inside the frame`);
    assert.ok(r.right <= rail.x * k, `at ${time.toFixed(2)} s the phone reaches ${(r.right / k).toFixed(0)}, under the rail`);
    assert.ok(r.width >= TARGET.width * 0.6, `at ${time.toFixed(2)} s the phone is ${(r.width / k).toFixed(0)} wide`);
  }
}));
