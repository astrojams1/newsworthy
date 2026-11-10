#!/usr/bin/env node
// record-timeline-take.mjs
// Films one take of the live web app for a YouTube Short: the reading, a tap on the chevron to the timeline, swipes to the
// timeline's end, and a tap on the wordmark back to the reading. It records what the browser really drew (a
// screenshot as fast as Chrome returns one, in real time, each stamped with its time) and writes down what the page
// said at each step, so every caption can be checked against the take. It changes nothing in the app and stores nothing: it only reads the public page.
//
//   node store/source/shorts/record-timeline-take.mjs <out-dir> [--url https://newsworthy-indol.vercel.app/] [--speed 350]
//
// Needs Playwright's Chromium (PLAYWRIGHT_BROWSERS_PATH, or CHROME_PATH for another build) and ffmpeg on PATH. On the
// owner's Mac run it through /Volumes/ssd/builds/tools/sw-browser-test so every browser file stays on the SSD.
// Writes <out-dir>/take.mov (30 fps, H.264), frames/, state.jsonl (marks and what the page showed), current.json and
// timeline.json (the public API's answers when the take began). Chrome returns about 20 screenshots a second at this
// size, so scroll slowly (--speed, pixels a second) and speed the scroll up in the edit.
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(name); return i === -1 ? fallback : args.splice(i, 2)[1]; };
const url = flag('--url', 'https://newsworthy-indol.vercel.app/');
const speed = Number(flag('--speed', 350));
const out = path.resolve(args[0] || '');
if (!args[0]) { console.error('Usage: record-timeline-take.mjs <out-dir> [--url …] [--speed px/s]'); process.exit(2); }
const executablePath = process.env.CHROME_PATH || undefined;

const VIEWPORT = { width: 390, height: 844 }, SCALE = 2, FPS = 30;
rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(out, 'frames'), { recursive: true });
const log = path.join(out, 'state.jsonl');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// What the page shows right now: the reading, where the scroll is, and the timeline lines inside the viewport.
function sample() {
  const text = (id) => document.querySelector(`[data-testid="${id}"]`)?.innerText.replace(/\s+/g, ' ').trim() ?? null;
  const scroller = [...document.querySelectorAll('div')].find((e) => e.scrollHeight > e.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(e).overflowY));
  const timeline = document.querySelector('[data-testid="timeline"]');
  const visible = timeline ? [...timeline.querySelectorAll('[dir="auto"]')].map((e) => ({ r: e.getBoundingClientRect(), t: e.innerText }))
    .filter(({ r }) => r.bottom > 0 && r.top < innerHeight).map(({ r, t }) => ({ top: Math.round(r.top), bottom: Math.round(r.bottom), text: t })) : [];
  return { score: text('rating-score'), sentence: text('rating-explanation'), storyLine: text('rating-story-line'),
    scrollTop: scroller ? Math.round(scroller.scrollTop) : null, scrollMax: scroller ? scroller.scrollHeight - scroller.clientHeight : null, visible };
}

const browser = await chromium.launch({ executablePath, headless: true });
try {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, isMobile: true, hasTouch: true, colorScheme: 'light',
    locale: 'en-US', timezoneId: 'UTC' });
  const page = await context.newPage();
  for (const name of ['current', 'timeline']) {
    const response = await context.request.get(new URL(`/api/${name}`, url).href);
    writeFileSync(path.join(out, `${name}.json`), JSON.stringify({ fetched_at: new Date().toISOString(), body: await response.json() }, null, 1) + '\n');
  }
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByTestId('timeline').waitFor();
  await sleep(6000); // "Checked 9m ago" gives way to the story line off camera

  const cdp = await context.newCDPSession(page);
  const frames = [];
  let filming = true;
  const film = (async () => {
    while (filming) {
      const asked = Date.now() / 1000;
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: true,
        clip: { x: 0, y: 0, ...VIEWPORT, scale: SCALE } });
      const name = String(frames.length).padStart(5, '0') + '.jpg';
      writeFileSync(path.join(out, 'frames', name), Buffer.from(data, 'base64'));
      frames.push({ name, at: asked });
    }
  })();
  const mark = async (name) => appendFileSync(log, JSON.stringify({ mark: name, at: Date.now() / 1000, ...await page.evaluate(sample) }) + '\n');
  const position = () => page.evaluate(sample);
  // One thumb-length swipe up the screen. A longer synthetic gesture stops part of the way down the timeline.
  const swipe = (distance) => cdp.send('Input.synthesizeScrollGesture', { x: 195, y: 740, yDistance: -distance, speed,
    gestureSourceType: 'touch', preventFling: true });

  await mark('reading');
  await sleep(3000);
  await mark('chevron');
  await page.getByRole('button', { name: 'Earlier developments' }).tap(); // the app scrolls itself to the timeline
  await sleep(1800);
  await mark('timeline-top');
  for (let i = 0; i < 40; i += 1) {
    const { scrollTop, scrollMax } = await position();
    if (scrollTop >= scrollMax) break;
    await swipe(Math.min(600, scrollMax - scrollTop + 40));
  }
  await sleep(300);
  await mark('timeline-end');
  await swipe(400); // nothing further to scroll to
  await swipe(400);
  await sleep(1200);
  await mark('still-the-end');
  await page.getByRole('button', { name: /back to the reading/ }).tap();
  await sleep(2600);
  await mark('reading-again');
  filming = false;
  await film;
  const end = Date.now() / 1000;
  await context.close();

  // Real time to a constant frame rate: each drawn frame is held until the next one arrived.
  const list = frames.map((frame, i) => `file 'frames/${frame.name}'\nduration ${(((frames[i + 1]?.at ?? end) - frame.at)).toFixed(4)}`).join('\n')
    + `\nfile 'frames/${frames.at(-1).name}'\n`;
  writeFileSync(path.join(out, 'frames.txt'), list);
  writeFileSync(path.join(out, 'frames.json'), JSON.stringify({ start: frames[0].at, end, frames }, null, 1) + '\n');
  const made = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'frames.txt', '-vf', `fps=${FPS},scale=trunc(iw/2)*2:trunc(ih/2)*2`,
    '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    'take.mov'], { cwd: out, stdio: 'inherit' });
  if (made.status !== 0) throw new Error('ffmpeg could not write take.mov');
  console.log(JSON.stringify({ frames: frames.length, seconds: +(end - frames[0].at).toFixed(2), start: frames[0].at }));
} finally {
  await browser.close();
}
