// Renders store/video/composition.html into the store preview videos.
//
//   node store/scripts/render-video.mjs                 both platforms
//   node store/scripts/render-video.mjs --platform ios  one platform
//   node store/scripts/render-video.mjs --stills 1.2,4.9,8.4
//                                    PNG stills and a contact sheet in artifacts/
//
// Needs Chromium (CHROMIUM_PATH or the cloud image's copy) and an ffmpeg with
// libx264 and AAC (FFMPEG_PATH, or ffmpeg on PATH).
//
// Motion blur is sampled, not faked: each frame averages renders spread across
// half the frame interval, a 180-degree shutter, weighted to open and close
// softly and summed in linear light as a sensor would. How many depends on how
// fast things move: four for a still frame, up to forty while the number
// rolls, so no two samples of a moving edge land far enough apart to show as
// separate copies.
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { CUES, DOWN, DURATION, FPS, UP_STEPS, scoreAt } from '../video/timeline.js';
import { renderScore, wav } from '../video/score.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const option = name => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? undefined : process.argv[i + 1] ?? true; };
// App Store app previews: 886×1920 for 6.9-, 6.5- and 6.3-inch iPhones.
// Google Play takes a YouTube link; a 9:16 portrait video suits a portrait app.
const TARGETS = {
  ios: { width: 443, height: 960, scale: 2, out: 'store/assets/apple/app-preview/iphone-886x1920.mp4' },
  android: { width: 432, height: 768, scale: 2.5, out: 'store/assets/google-play/video/promo-1080x1920.mp4' },
};
const platforms = option('platform') ? [option('platform')] : Object.keys(TARGETS);
const stills = typeof option('stills') === 'string' ? option('stills').split(',').map(Number) : null;
// --segment 2.9,3.4: finished, motion-blurred frames of that span as PNGs, no video.
const segment = typeof option('segment') === 'string' ? option('segment').split(',').map(Number) : null;
const draft = Boolean(option('draft')), SHUTTER = 0.5;
// Moments with motion besides the number: the screen closing into a widget,
// the widgets receding, the wipe, the card, the notification and the icon.
const MOVING = [CUES.morph, CUES.split, CUES.wipe, CUES.widgetsOut, CUES.card, CUES.toggle, CUES.notification, CUES.flight, CUES.word];
function samplesAt(t, target) {
  if (draft) return 1;
  let n = MOVING.some(([a, b]) => t > a - 0.05 && t < b + 0.25) ? 12 : 4;
  if (t > UP_STEPS[0].start - 0.05 && t < DOWN.start + 1.3) {
    // The drum's faces are 1.25 numeral heights apart; the numeral is about
    // 0.42 of the frame's width. Keep samples within ~4 device pixels.
    const speed = Math.abs(scoreAt(t + 0.004) - scoreAt(t - 0.004)) / 0.008;
    const travel = speed * 1.25 * 0.42 * target.width * target.scale * SHUTTER / FPS;
    n = Math.max(n, Math.ceil(travel / 4));
  }
  return Math.min(40, n);
}
// sRGB and linear light, by table.
const TO_LINEAR = Float32Array.from({ length: 256 }, (_, v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const TO_SRGB = Uint8Array.from({ length: 16384 }, (_, i) => { const l = i / 16383; return Math.round(255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055)); });
const ffmpeg = process.env.FFMPEG_PATH ?? 'ffmpeg';

// The page imports the production tokens and colour maths, so it is served
// from the repository root rather than opened as a file.
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  let body;
  try { body = await readFile(path); } catch { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' }).end(body);
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--hide-scrollbars'],
});

function run(command, args, input) {
  const child = spawn(command, args, { stdio: [input ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
  let log = '';
  child.stderr.on('data', chunk => { log = (log + chunk).slice(-4000); });
  const done = new Promise((ok, fail) => child.on('close', code => (code === 0 ? ok() : fail(new Error(`${command} exited ${code}\n${log}`)))));
  return { child, done };
}

async function open(platform) {
  const target = TARGETS[platform];
  const page = await browser.newPage({ viewport: { width: target.width, height: target.height }, deviceScaleFactor: target.scale });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${origin}/store/video/composition.html?platform=${platform}`);
  await page.evaluate(() => window.NW.ready);
  if (errors.length) throw new Error(errors.join('\n'));
  const cdp = await page.context().newCDPSession(page);
  // A second CDP session does not carry Playwright's device-scale emulation,
  // so the clip asks for device pixels itself; the result matches
  // page.screenshot() pixel for pixel, in a little less time.
  const clip = { x: 0, y: 0, width: target.width, height: target.height, scale: target.scale };
  const capture = async t => {
    await page.evaluate(t => window.NW.render(t), t);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, clip });
    return Buffer.from(data, 'base64');
  };
  return { page, capture, target, errors };
}

async function renderStills(platform) {
  const { capture, page } = await open(platform);
  const dir = join(root, 'artifacts/preview-video');
  await mkdir(dir, { recursive: true });
  const shots = [];
  for (const t of stills) {
    const png = await capture(t);
    const file = join(dir, `${platform}-${t.toFixed(2)}.png`);
    await writeFile(file, png);
    shots.push({ t, png });
  }
  await page.close();
  // One sheet to review a run of stills at a glance.
  const tile = 300, meta = await sharp(shots[0].png).metadata(), th = Math.round(tile * meta.height / meta.width), cols = Math.min(6, shots.length);
  const rows = Math.ceil(shots.length / cols);
  const tiles = await Promise.all(shots.map(async ({ t, png }, i) => ({
    input: await sharp(png).resize(tile, th).composite([{ input: Buffer.from(`<svg width="${tile}" height="28"><rect width="72" height="24" rx="6" fill="#000" fill-opacity=".6"/><text x="10" y="17" font-family="monospace" font-size="15" fill="#fff">${t.toFixed(2)}s</text></svg>`), top: 4, left: 4 }]).png().toBuffer(),
    left: (i % cols) * (tile + 8), top: Math.floor(i / cols) * (th + 8),
  })));
  const sheet = join(dir, `${platform}-sheet.png`);
  await sharp({ create: { width: cols * (tile + 8) - 8, height: rows * (th + 8) - 8, channels: 3, background: '#222' } }).composite(tiles).png().toFile(sheet);
  console.log(`${platform}: ${shots.length} stills, sheet at ${sheet}`);
}

async function renderVideo(platform) {
  const { capture, page, target } = await open(platform);
  const frames = Math.round(DURATION * FPS);
  const audioPath = join(root, `artifacts/preview-video/${platform}-score.wav`);
  await mkdir(dirname(audioPath), { recursive: true });
  await writeFile(audioPath, wav(renderScore({ platform })));
  const out = join(root, target.out);
  await mkdir(dirname(out), { recursive: true });
  const width = Math.round(target.width * target.scale), height = Math.round(target.height * target.scale);
  const [first, last] = segment ? segment.map(s => Math.round(s * FPS)) : [0, frames - 1];
  const encoder = segment ? null : run(ffmpeg, [
    '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${width}x${height}`, '-framerate', String(FPS), '-i', '-', '-i', audioPath,
    '-vf', 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-frames:v', String(frames),
    // Apple: H.264 High Profile up to level 4.0, 30 fps at most, 10–12 Mbps.
    '-c:v', 'libx264', '-profile:v', 'high', '-level:v', '4.0', '-preset', 'slow', '-crf', '14', '-maxrate', '12M', '-bufsize', '24M',
    '-x264-params', 'aq-mode=3', '-g', String(FPS), '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    // Apple: a stereo AAC track at 256 kbps, 44.1 or 48 kHz, is required.
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart', out,
  ], true);
  const started = Date.now();
  const sum = new Float32Array(width * height * 3), frame = Buffer.alloc(width * height * 3);
  let samples = 0;
  for (let i = first; i <= last; i++) {
    let n = samplesAt(i / FPS, target);
    // Sample times centred on the frame; weights rise and fall like a
    // shutter opening and closing, so trails fade rather than stop.
    const time = s => Math.max(0, (i + ((s + 0.5) / n - 0.5) * SHUTTER) / FPS);
    const opening = n > 1 ? await capture(time(0)) : null;
    // Nothing moved while the shutter was open: one render is the frame.
    if (opening && opening.equals(await capture(time(n - 1)))) n = 1;
    sum.fill(0);
    let total = 0;
    for (let s = 0; s < n; s++) {
      const weight = n > 1 ? Math.sin(Math.PI * (s + 0.5) / n) ** 2 : 1;
      const png = opening && s === 0 ? opening : await capture(time(s));
      const raw = await sharp(png).removeAlpha().raw().toBuffer();
      for (let p = 0; p < raw.length; p++) sum[p] += TO_LINEAR[raw[p]] * weight;
      total += weight;
    }
    const scale = 16383 / total;
    for (let p = 0; p < frame.length; p++) frame[p] = TO_SRGB[Math.min(16383, Math.round(sum[p] * scale))];
    samples += n;
    if (segment) {
      await sharp(frame, { raw: { width, height, channels: 3 } }).png().toFile(join(root, `artifacts/preview-video/${platform}-frame-${String(i).padStart(3, '0')}.png`));
      continue;
    }
    if (!encoder.child.stdin.write(frame)) await once(encoder.child.stdin, 'drain');
    if (i % 30 === 29) process.stdout.write(`\r${platform}: ${i + 1}/${frames} frames, ${samples} samples, ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  await page.close();
  if (segment) { console.log(`${platform}: frames ${first}–${last}, ${samples} samples, in artifacts/preview-video/`); return; }
  encoder.child.stdin.end();
  await encoder.done;
  console.log(`\n${platform}: ${out}`);
}

try {
  for (const platform of platforms) {
    if (!TARGETS[platform]) throw new Error(`Unknown platform ${platform}`);
    if (stills) await renderStills(platform);
    else await renderVideo(platform);
  }
} finally {
  await browser.close();
  server.close();
}
