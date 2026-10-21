import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { BAR, CUES, DURATION, FPS, PINGS, ROLL, samplesAt } from '../store/video/trailer/timeline.js';
import { COPY, FILM, POSTER_SECONDS, REQUIREMENTS, SCENES, TARGET } from '../store/video/trailer/film.js';

// The YouTube trailer (store/video/trailer) is rendered rarely and slowly, so
// the cheap facts it rests on are checked here, before a render rather than
// after an upload.

test('the trailer runs about thirty seconds, inside a Short, at its frame rate', () => {
  const [min, max] = REQUIREMENTS.seconds;
  const seconds = Math.round(DURATION * FPS) / FPS;
  assert.ok(seconds >= min && seconds <= max, `${seconds} s is outside ${min}–${max} s`);
  assert.ok(Math.abs(seconds - 30) <= 3, `${seconds} s is not about thirty seconds`);
  assert.equal(FPS, REQUIREMENTS.fps);
});

test('every cue and scene falls inside the film, scenes in order', () => {
  for (const [name, cue] of Object.entries(CUES)) {
    for (const t of [cue].flat()) assert.ok(t >= 0 && t <= DURATION, `${name} at ${t} s`);
    if (Array.isArray(cue)) assert.ok(cue[0] < cue[1], `${name} ends before it starts`);
  }
  assert.equal(SCENES[0].start, 0);
  SCENES.forEach((scene, i) => {
    assert.ok(scene.start < DURATION, scene.id);
    if (i) assert.ok(scene.start > SCENES[i - 1].start, `${scene.id} starts before ${SCENES[i - 1].id}`);
  });
  assert.ok(POSTER_SECONDS > 0 && POSTER_SECONDS < DURATION);
});

// The picture and the score are cut to one bar; a cue that drifts off the
// grid lands a word or a digit between the beats the music plays.
test('the drop, the digits and the price land on the beat', () => {
  const onBeat = t => Math.abs(t / (BAR / 4) - Math.round(t / (BAR / 4))) < 1e-9;
  for (const name of ['drop', 'dollar', 'noAds', 'noSubscription', 'noPurchases', 'notification', 'ring']) assert.ok(onBeat(CUES[name]), `${name} at ${CUES[name]} s`);
  for (const step of ROLL) assert.ok(Math.abs(step.lands / (BAR / 8) - Math.round(step.lands / (BAR / 8))) < 1e-9, `digit ${step.to} at ${step.lands} s`);
  assert.ok(PINGS.every(p => p.t < CUES.hush), 'a notification after the hush');
  assert.ok(samplesAt(CUES.rush[1] - 0.2) > samplesAt(CUES.everyDay[0]));
});

test('every file the trailer is made from, depicts or quotes exists', () => {
  for (const file of FILM) assert.ok(existsSync(file), `the film is made from missing ${file}`);
  for (const scene of SCENES) for (const file of scene.depicts) assert.ok(existsSync(file), `${scene.id} depicts missing ${file}`);
  for (const [key, line] of Object.entries(COPY)) assert.ok(existsSync(line.source), `${key} quotes missing ${line.source}`);
});

// The film's words are the app's, the core copy, the listing's, or the
// script in the trailer's README, which records the owner's brief. A line
// changed in one place and not the other fails here.
test('every line on screen is still in its source, word for word', () => {
  for (const [key, line] of Object.entries(COPY)) {
    const source = readFileSync(line.source, 'utf8');
    for (const quote of [line.quote].flat()) {
      assert.ok(source.includes(quote), `store/video/trailer/film.js line ${key} quotes ${quote} from ${line.source}, which no longer contains it. ` +
        'Update the line there; the trailer then needs a new render (.agents/skills/newsworthy-preview-reel/SKILL.md).');
    }
  }
});

// docs/product-messaging.md keeps user-facing copy free of these; the
// trailer's brief made doomscrolling and the price an exception, not these.
test('no line mentions how ratings are made, or ranks or hurries', () => {
  const words = Object.values(COPY).map(line => line.text).join(' ');
  for (const banned of [/\bAI\b/, /artificial/i, /\bmodels?\b/i, /\bbest\b/i, /#1/, /\burgent/i, /download now/i, /market/i]) assert.doesNotMatch(words, banned);
});

test('the trailer renders vertical, at 1080 × 1920', () => {
  assert.equal(`${Math.round(TARGET.width * TARGET.scale)}x${Math.round(TARGET.height * TARGET.scale)}`, '1080x1920');
});

// The film is drawn in a browser, from code; these tests render single frames.
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
    await page.goto(`http://127.0.0.1:${server.address().port}/store/video/trailer/composition.html`);
    await page.evaluate(() => window.NW.ready);
    await run(page);
  } finally {
    await browser.close();
    server.close();
  }
}

// When the widgets and the notification lift off the phone toward the viewer,
// they are in front of everything on it. Reported 2026-10-21 from the first
// cut: the enlarged medium widget slid under the Dynamic Island, and the
// small widget, meant to lift with it, stayed dimmed with the screen.
test('what lifts off the phone is drawn over the island and is not dimmed', t => withComposition(t, async page => {
  const lifted = [['medium', CUES.pushHome], ['small', CUES.pushHome], ['notification', CUES.pushNote]];
  for (const [part, [from, to]] of lifted) {
    for (let time = from + 0.1; time < to; time += 0.1) {
      const found = await page.evaluate(({ part, time }) => {
        window.NW.render(time);
        const box = document.querySelector(`[data-box="${part}"]`).getBoundingClientRect();
        const covered = [];
        for (const other of ['island', 'status']) {
          const o = document.querySelector(`[data-part="${other}"]`).getBoundingClientRect();
          const left = Math.max(box.left, o.left), right = Math.min(box.right, o.right), top = Math.max(box.top, o.top), bottom = Math.min(box.bottom, o.bottom);
          if (right - left < 1 || bottom - top < 1) continue;
          // The topmost of the phone's own layers there; the frame's overlays are not the phone's.
          const hit = document.elementsFromPoint((left + right) / 2, (top + bottom) / 2).find(e => e.closest('[data-part="phone"]'));
          if (!hit?.closest(`[data-part="${part}"]`)) covered.push(other);
        }
        const dimmed = [];
        for (let e = document.querySelector(`[data-box="${part}"]`); e; e = e.parentElement) if (getComputedStyle(e).filter.includes('brightness')) dimmed.push(e.tagName);
        return { covered, dimmed: dimmed.length > 0 };
      }, { part, time });
      assert.deepEqual(found.covered, [], `at ${time.toFixed(1)} s the ${part} widget is drawn under the ${found.covered.join(' and ')}`);
      assert.equal(found.dimmed, false, `at ${time.toFixed(1)} s the lifted ${part} is dimmed with the screen`);
    }
  }
}));

// A Short plays under YouTube's controls, and a tall phone crops its sides.
// Reported 2026-10-21 from the posted first cut: its lines sat under back,
// search and the menu, and the phone under the title stack. Every word,
// number and screen the film shows stays inside the safe zone the shared
// youtube-shorts skill measured, wherever it is in its motion; the phone is
// exempt only once it leaves the frame at the end of its scene.
const ZONES = 'vendor/skills/skills/youtube-shorts/assets/zones.json';
test('every word, number and screen stays inside the Shorts safe zone', t => withComposition(t, async page => {
  const zones = JSON.parse(readFileSync(ZONES, 'utf8'));
  const k = TARGET.width / zones.frame.width;
  const area = z => ({ left: z.x * k, top: z.y * k, right: (z.x + z.width) * k, bottom: (z.y + z.height) * k });
  const safe = area(zones.safe), upper = area(zones.safeAboveRail);
  const inside = (r, z) => r.left >= z.left - 0.5 && r.top >= z.top - 0.5 && r.right <= z.right + 0.5 && r.bottom <= z.bottom + 0.5;
  const outside = [], seen = new Set();
  for (let time = 0.1; time < DURATION; time += 0.2) {
    const shown = await page.evaluate(({ time, phoneGone }) => {
      window.NW.render(time);
      const found = [];
      for (const e of document.querySelectorAll('[data-safe], [data-box]')) {
        if (phoneGone && e.closest('[data-part="phone"]')) continue;
        let opacity = 1, r = e.getBoundingClientRect();
        let rect = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        for (let a = e; a && a.id !== 'stage'; a = a.parentElement) {
          const style = getComputedStyle(a);
          if (style.display === 'none') opacity = 0;
          opacity *= Number(style.opacity);
          // What a clipping parent hides is not on screen.
          if (a !== e && style.overflow !== 'visible') {
            const c = a.getBoundingClientRect();
            rect = { left: Math.max(rect.left, c.left), top: Math.max(rect.top, c.top), right: Math.min(rect.right, c.right), bottom: Math.min(rect.bottom, c.bottom) };
          }
        }
        if (opacity < 0.5 || rect.right - rect.left < 0.5 || rect.bottom - rect.top < 0.5) continue;
        found.push({ name: e.dataset.safe || e.dataset.box, text: e.textContent.slice(0, 24), rect });
      }
      return found;
    }, { time, phoneGone: time >= CUES.phoneOut[0] });
    for (const { name, text, rect } of shown) {
      seen.add(name);
      if (!inside(rect, rect.bottom <= upper.bottom ? upper : safe)) {
        outside.push(`${time.toFixed(1)} s ${name}${text ? ` "${text}"` : ''}: ${['left', 'top', 'right', 'bottom'].map(s => `${s} ${(rect[s] / k).toFixed(0)}`).join(', ')}`);
      }
    }
  }
  assert.deepEqual(outside.slice(0, 12), [], `${outside.length} placements outside the safe zone (frame pixels)`);
  // Checked only if marked: a line or part that lost its marker would pass unseen.
  const expected = ['everyDay', 'thousands', 'comeAndGo', 'doomscroll', 'allDay', 'orSee', 'breaks', 'worldNews', 'rated', 'oneNumber', 'oneSentence',
    'home', 'notify', 'choose', 'noAds', 'noSubscription', 'noPurchases', 'focus', 'matters', 'clock', 'hero', 'phone', 'medium', 'small', 'notification', 'price', 'end'];
  assert.deepEqual(expected.filter(name => !seen.has(name)), [], 'parts of the film the check never saw');
}));
