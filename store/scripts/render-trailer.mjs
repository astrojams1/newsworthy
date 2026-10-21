// Renders, checks and reviews the YouTube Shorts trailer (store/video/trailer).
//
//   node store/scripts/render-trailer.mjs --stills 2,9.2,12.8    single renders, a contact sheet, and what changed since the last --stills run
//   node store/scripts/render-trailer.mjs --segment 7.4,8.1      finished, motion-blurred frames of a span as PNGs
//   node store/scripts/render-trailer.mjs --audio                the score alone: a WAV, its loudness and a spectrogram
//   node store/scripts/render-trailer.mjs --render [--workers 4] every frame, in parallel, then the MP4; writes cut.json
//   node store/scripts/render-trailer.mjs --encode               the MP4 again from the last frames and the current score
//   node store/scripts/render-trailer.mjs --verify               the committed MP4 against YouTube's settings and cut.json
//
// It works as store/scripts/render-video.mjs does for the store reel: Chromium
// draws composition.html as a pure function of time, each frame averages
// renders across a 180-degree shutter in linear light, and ffmpeg encodes.
// The frames are kept in artifacts/trailer/frames, so a change to the sound
// alone is an --encode rather than a render.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CUTS, DURATION, FPS, samplesAt } from '../video/trailer/timeline.js';
import { COPY, CUT_RECORD, FILM, POSTER_SECONDS, REQUIREMENTS, SCENES, TARGET, THUMBNAIL } from '../video/trailer/film.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const artifacts = join(root, 'artifacts/trailer');
const framesDir = join(artifacts, 'frames');
const FRAMES = Math.round(DURATION * FPS);

// ---------------------------------------------------------------- arguments
// Strict, so a mistyped option never falls through to the one mode that
// overwrites the committed trailer.
const MODES = ['stills', 'segment', 'audio', 'render', 'encode', 'verify', 'thumbnail', 'worker'];
const OPTIONS = { stills: 'list', segment: 'list', audio: 'flag', render: 'flag', encode: 'flag', verify: 'flag', thumbnail: 'flag', worker: 'value', workers: 'value', draft: 'flag' };
const USAGE = 'Usage: node store/scripts/render-trailer.mjs --stills 2,9.2 | --segment 7.4,8.1 | --audio | --render [--workers 4] | --encode | --verify | --thumbnail  [--draft]';
function parse(list) {
  const out = {};
  for (let i = 0; i < list.length; i++) {
    const [flag, inline] = list[i].split(/=(.*)/s);
    const name = flag.replace(/^--/, '');
    if (!flag.startsWith('--') || !OPTIONS[name]) throw new Error(`Unknown option ${list[i]}\n${USAGE}`);
    if (OPTIONS[name] === 'flag') {
      if (inline !== undefined) throw new Error(`--${name} takes no value\n${USAGE}`);
      out[name] = true;
      continue;
    }
    const value = inline ?? (list[i + 1]?.startsWith('--') ? undefined : list[++i]);
    if (!value) throw new Error(`--${name} needs a value\n${USAGE}`);
    if (OPTIONS[name] === 'list') {
      out[name] = value.split(',').map(Number);
      if (out[name].some(t => !Number.isFinite(t) || t < 0 || t > DURATION)) throw new Error(`--${name} takes times in seconds from 0 to ${DURATION}`);
    } else out[name] = value;
  }
  const modes = MODES.filter(m => out[m]);
  if (modes.length !== 1) throw new Error(`${modes.length ? `Choose one of --${modes.join(', --')}` : 'Choose what to do'}.\n${USAGE}`);
  if (out.segment && out.segment.length !== 2) throw new Error('--segment takes a start and an end, e.g. 7.4,8.1');
  if (out.workers && !(Number(out.workers) >= 1 && Number(out.workers) <= 16)) throw new Error('--workers takes 1 to 16');
  return { ...out, mode: modes[0], workers: Number(out.workers ?? 4) };
}
let args;

// ---------------------------------------------------------------- tools
const TOOLS = 'artifacts/tools/py';
const ffmpeg = process.env.FFMPEG_PATH ?? (() => {
  const dir = join(root, TOOLS, 'imageio_ffmpeg/binaries');
  const found = existsSync(dir) && readdirSync(dir).find(name => name.startsWith('ffmpeg'));
  return found ? join(dir, found) : 'ffmpeg';
})();
function preflight() {
  const found = spawnSync(ffmpeg, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
  if (found.error || !/libx264/.test(found.stdout) || !/ aac /.test(found.stdout)) {
    throw new Error(`${ffmpeg} cannot encode H.264 and AAC. From the repository root, install one where this script looks for it:\n` +
      `  pip install --quiet --target ${TOOLS} imageio-ffmpeg\nor set FFMPEG_PATH to one that can.`);
  }
}
const probe = list => spawnSync(ffmpeg, ['-hide_banner', ...list], { encoding: 'utf8', maxBuffer: 1 << 26 });
const sha256 = data => createHash('sha256').update(data).digest('hex');
const hashOf = path => (existsSync(join(root, path)) ? sha256(readFileSync(join(root, path))) : null);
const TO_LINEAR = Float32Array.from({ length: 256 }, (_, v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const TO_SRGB = Uint8Array.from({ length: 16384 }, (_, i) => { const l = i / 16383; return Math.round(255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055)); });
const SHUTTER = 0.5;
const width = Math.round(TARGET.width * TARGET.scale), height = Math.round(TARGET.height * TARGET.scale);

// ---------------------------------------------------------------- browser
let server, browser, origin;
async function start() {
  if (browser) return;
  const { chromium } = await import('playwright-core');
  // The page imports the production tokens and colour maths, so it is served
  // from the repository root rather than opened as a file.
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
  server = createServer(async (req, res) => {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    let body;
    try { body = await readFile(path); } catch { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' }).end(body);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--hide-scrollbars'],
  });
}
async function open() {
  await start();
  const page = await browser.newPage({ viewport: { width: TARGET.width, height: TARGET.height }, deviceScaleFactor: TARGET.scale });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => errors.push(`failed to load ${request.url()}`));
  await page.goto(`${origin}/store/video/trailer/composition.html`);
  await page.evaluate(() => window.NW.ready);
  if (errors.length) throw new Error(errors.join('\n'));
  const cdp = await page.context().newCDPSession(page);
  // As in the reel: a second CDP session sets the device scale once, rather
  // than a clip re-applying it on every capture.
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: TARGET.width, height: TARGET.height, deviceScaleFactor: TARGET.scale, mobile: false });
  const capture = async t => {
    await page.evaluate(t => window.NW.render(t), t);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    if (errors.length) throw new Error(errors.join('\n'));
    return Buffer.from(data, 'base64');
  };
  return { page, capture };
}

// One finished frame: renders spread across the shutter, weighted to open
// and close softly, summed in linear light.
async function frame(capture, i, sum, out) {
  let n = args.draft ? 1 : samplesAt(i / FPS);
  // Samples stay on the frame's own side of a hard cut.
  const centre = i / FPS;
  const time = s => CUTS.reduce((t, cut) => (centre >= cut ? Math.max(t, cut) : Math.min(t, cut - 1e-4)),
    Math.max(0, Math.min(DURATION, (i + ((s + 0.5) / n - 0.5) * SHUTTER) / FPS)));
  const opening = n > 1 ? await capture(time(0)) : null;
  // Nothing moved while the shutter was open: one render is the frame.
  if (opening && opening.equals(await capture(time(n - 1)))) n = 1;
  sum.fill(0);
  let total = 0;
  for (let s = 0; s < n; s++) {
    const weight = n > 1 ? Math.sin(Math.PI * (s + 0.5) / n) ** 2 : 1;
    const png = opening && s === 0 ? opening : await capture(n === 1 ? i / FPS : time(s));
    const raw = await sharp(png).removeAlpha().raw().toBuffer();
    for (let p = 0; p < raw.length; p++) sum[p] += TO_LINEAR[raw[p]] * weight;
    total += weight;
  }
  const scale = 16383 / total;
  for (let p = 0; p < out.length; p++) out[p] = TO_SRGB[Math.min(16383, Math.max(0, Math.round(sum[p] * scale)))];
  // A fixed, fine grain keeps the soft gradients from banding once encoded.
  // It is added here, once per finished frame: drawn in the page, its noise
  // cost a third of every capture to encode as PNG.
  if (!args.draft) for (let p = 0, q = 0; p < out.length; p += 3, q++) {
    const g = GRAIN[q];
    out[p] = Math.max(0, Math.min(255, out[p] + g)); out[p + 1] = Math.max(0, Math.min(255, out[p + 1] + g)); out[p + 2] = Math.max(0, Math.min(255, out[p + 2] + g));
  }
  return n;
}
// One noise value per device pixel, the same in every frame, so it costs the
// encoder nothing where the picture is still.
const GRAIN = (() => {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Int8Array.from({ length: width * height }, () => Math.round((rand() + rand() + rand() - 1.5) * 2.2));
})();

// ---------------------------------------------------------------- stills
async function sheet(file, shots, tile = 240) {
  const meta = await sharp(shots[0].png).metadata(), th = Math.round(tile * meta.height / meta.width);
  const cols = Math.min(6, shots.length), rows = Math.ceil(shots.length / cols);
  const badge = label => Buffer.from(`<svg width="${tile}" height="28"><rect width="${12 + 9 * label.length}" height="24" rx="6" fill="#000" fill-opacity=".6"/><text x="8" y="17" font-family="monospace" font-size="15" fill="#fff">${label}</text></svg>`);
  const tiles = await Promise.all(shots.map(async ({ label, png }, i) => ({
    input: await sharp(png).resize(tile, th).composite([{ input: badge(label), top: th - 32, left: 4 }]).png().toBuffer(),
    left: (i % cols) * (tile + 8), top: Math.floor(i / cols) * (th + 8),
  })));
  await sharp({ create: { width: cols * (tile + 8) - 8, height: rows * (th + 8) - 8, channels: 3, background: '#222' } }).composite(tiles).png().toFile(file);
}
// Each run keeps the previous run's stills, so the same times before and
// after an edit show exactly which frames it changed.
async function renderStills() {
  const { capture, page } = await open();
  await mkdir(join(artifacts, 'previous'), { recursive: true });
  const shots = [], changed = [], same = [];
  for (const t of args.stills) {
    const name = `still-${t.toFixed(2)}.png`, file = join(artifacts, name), before = join(artifacts, 'previous', name);
    const had = existsSync(file);
    if (had) await rename(file, before);
    const png = await capture(t);
    await writeFile(file, png);
    shots.push({ label: `${t.toFixed(2)}s`, png });
    if (had) { const old = readFileSync(before); (old.equals(png) ? same : changed).push({ t, before: old, png }); }
  }
  await page.close();
  await sheet(join(artifacts, 'sheet.png'), shots);
  console.log(`${shots.length} stills, sheet at ${join(artifacts, 'sheet.png')}`);
  if (changed.length || same.length) {
    console.log(`  since the last run: ${changed.length ? `changed ${changed.map(c => c.t.toFixed(2)).join(', ')}` : 'nothing changed'}${same.length ? `; identical ${same.map(c => c.t.toFixed(2)).join(', ')}` : ''}`);
    if (changed.length) {
      await sheet(join(artifacts, 'changes.png'), changed.flatMap(c => [{ label: `${c.t.toFixed(2)} before`, png: c.before }, { label: `${c.t.toFixed(2)} after`, png: c.png }]));
      console.log(`  before and after: ${join(artifacts, 'changes.png')}`);
    }
  }
}

async function renderSegment() {
  const { capture, page } = await open();
  await mkdir(artifacts, { recursive: true });
  const [first, last] = args.segment.map(s => Math.round(s * FPS));
  const sum = new Float32Array(width * height * 3), out = Buffer.alloc(width * height * 3);
  let samples = 0;
  const started = Date.now();
  for (let i = first; i <= last; i++) {
    samples += await frame(capture, i, sum, out);
    await sharp(out, { raw: { width, height, channels: 3 } }).png().toFile(join(artifacts, `frame-${String(i).padStart(4, '0')}.png`));
  }
  await page.close();
  console.log(`frames ${first}–${last}, ${samples} samples in ${((Date.now() - started) / 1000).toFixed(0)} s, in ${artifacts}`);
}

// ---------------------------------------------------------------- render
// Each worker takes every Nth frame, so the slow, fast-moving spans are
// shared out evenly, and writes finished frames as PNGs.
async function worker() {
  const [index, count] = args.worker.split('/').map(Number);
  const { capture, page } = await open();
  const sum = new Float32Array(width * height * 3), out = Buffer.alloc(width * height * 3);
  let samples = 0, done = 0;
  for (let i = index; i < FRAMES; i += count) {
    samples += await frame(capture, i, sum, out);
    await sharp(out, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 1 }).toFile(join(framesDir, `frame-${String(i).padStart(4, '0')}.png`));
    if (++done % 10 === 0) console.log(`progress ${done} ${samples}`);
  }
  await page.close();
  console.log(`done ${done} ${samples}`);
}

async function render() {
  preflight();
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
  const started = Date.now();
  const made = recordNow();
  const progress = Array(args.workers).fill(0), samples = Array(args.workers).fill(0);
  await Promise.all(Array.from({ length: args.workers }, (_, w) => new Promise((ok, fail) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--worker', `${w}/${args.workers}`, ...(args.draft ? ['--draft'] : [])], { stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    child.stdout.on('data', chunk => {
      for (const line of String(chunk).split('\n')) {
        const m = /^(?:progress|done) (\d+) (\d+)/.exec(line);
        if (!m) continue;
        progress[w] = Number(m[1]); samples[w] = Number(m[2]);
        const all = progress.reduce((a, b) => a + b, 0);
        process.stdout.write(`\r${all}/${FRAMES} frames, ${samples.reduce((a, b) => a + b, 0)} samples, ${((Date.now() - started) / 1000).toFixed(0)} s`);
      }
    });
    child.stderr.on('data', chunk => { log = (log + chunk).slice(-4000); });
    child.on('close', code => (code === 0 ? ok() : fail(new Error(`worker ${w} exited ${code}\n${log}`))));
  })));
  const minutes = Number(((Date.now() - started) / 60000).toFixed(1));
  console.log(`\nframes rendered in ${minutes} minutes`);
  await encode({ samples: samples.reduce((a, b) => a + b, 0), minutes, inputs: made });
}

// ---------------------------------------------------------------- sound
let mixReport;
async function writeScore() {
  const score = await import('../video/trailer/score.mjs');
  await mkdir(artifacts, { recursive: true });
  const file = join(artifacts, 'score.wav');
  await writeFile(file, score.wav(score.renderScore()));
  mixReport = score.mixReport();
  return file;
}
function loudness(file) {
  const report = probe(['-nostats', '-i', file, '-map', '0:a:0', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-']).stderr;
  return { lufs: Number(report.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]), peak: Number(report.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]), lra: Number(report.match(/LRA:\s+(-?[\d.]+) LU/)?.[1]) };
}
async function audio() {
  preflight();
  const file = await writeScore();
  const { lufs, peak, lra } = loudness(file);
  const spectrum = join(artifacts, 'score-spectrogram.png');
  probe(['-y', '-loglevel', 'error', '-i', file, '-lavfi', 'showspectrumpic=s=1600x600:legend=1:scale=log:fscale=lin:stop=12000', spectrum]);
  const wave = join(artifacts, 'score-waveform.png');
  probe(['-y', '-loglevel', 'error', '-i', file, '-filter_complex', 'aformat=channel_layouts=mono,compand,showwavespic=s=1600x300:colors=0x3399ff,format=rgb24,pad=1600:300:0:0:black', '-frames:v', '1', wave]);
  console.log(`${file}\n  ${lufs} LUFS integrated, true peak ${peak} dBTP, range ${lra} LU\n  spectrogram ${spectrum}\n  waveform ${wave}`);
  // The mix by measurement, since this session cannot listen: each bus's
  // loudness in each part, the master's, the limiter's work and the groove's
  // octave bands.
  const { buses, master, bands, reduction } = mixReport;
  const parts = Object.keys(master), cell = v => (Number.isFinite(v) ? v.toFixed(1) : '—').padStart(8);
  console.log(`\n  LUFS      ${parts.map(p => p.padStart(8)).join('')}`);
  for (const [name, row] of [...Object.entries(buses), ['master', master]]) console.log(`  ${name.padEnd(8)}${parts.map(p => cell(row[p])).join('')}`);
  console.log(`\n  limiter: at most ${reduction.worst.toFixed(1)} dB, over 1 dB for ${(100 * reduction.over1).toFixed(1)}% of samples, over 3 dB for ${(100 * reduction.over3).toFixed(1)}%`);
  console.log(`  groove octaves (dB): ${Object.entries(bands).map(([f, db]) => `${f} Hz ${db.toFixed(1)}`).join(', ')}`);
}

// ---------------------------------------------------------------- encode
const inputs = () => [...new Set([...FILM, ...SCENES.flatMap(s => s.depicts), ...Object.values(COPY).map(c => c.source)])].sort();
const recordNow = () => Object.fromEntries(inputs().map(path => [path, hashOf(path)]));
async function encode(made) {
  preflight();
  const missing = Array.from({ length: FRAMES }, (_, i) => i).filter(i => !existsSync(join(framesDir, `frame-${String(i).padStart(4, '0')}.png`)));
  if (missing.length) throw new Error(`${missing.length} frames are missing from ${framesDir}; render with --render.`);
  const score = await writeScore();
  const out = join(root, TARGET.out), partial = join(artifacts, 'partial.mp4');
  await mkdir(dirname(out), { recursive: true });
  const started = Date.now();
  const { done } = run(ffmpeg, [
    '-y', '-framerate', String(FPS), '-i', join(framesDir, 'frame-%04d.png'), '-i', score,
    '-vf', 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p', '-frames:v', String(FRAMES),
    // YouTube: H.264 High, progressive, closed GOPs of half the frame rate, 2 B-frames.
    '-c:v', 'libx264', '-profile:v', 'high', '-level:v', '4.1', '-preset', 'slow', '-crf', '18', '-maxrate', '16M', '-bufsize', '32M',
    '-x264-params', 'aq-mode=3:open-gop=0', '-g', String(FPS / 2), '-bf', '2', '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    // YouTube: AAC-LC stereo at 48 kHz, 384 kbps recommended for stereo; 320 is ample here.
    '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-ac', '2', '-shortest',
    '-movflags', '+faststart', partial,
  ]);
  await done;
  await rename(partial, out);
  const data = await readFile(out);
  // An --encode reuses the last render's frames, so only the score is new.
  const previous = existsSync(join(root, CUT_RECORD)) ? JSON.parse(readFileSync(join(root, CUT_RECORD), 'utf8')).render : null;
  const SCORE = 'store/video/trailer/score.mjs';
  const entry = { file: TARGET.out, bytes: data.length, sha256: sha256(data), frames: FRAMES,
    samples: made?.samples ?? previous?.samples, minutes: made?.minutes ?? previous?.minutes,
    inputs: made?.inputs ?? { ...previous?.inputs, [SCORE]: hashOf(SCORE) } };
  await writeFile(join(root, CUT_RECORD), JSON.stringify({ render: entry }, null, 2) + '\n');
  console.log(`${out}: ${(data.length / 1e6).toFixed(1)} MB in ${((Date.now() - started) / 1000).toFixed(0)} s, recorded in ${CUT_RECORD}`);
}
function run(command, list) {
  const child = spawn(command, list, { stdio: ['ignore', 'ignore', 'pipe'] });
  let log = '';
  child.stderr.on('data', chunk => { log = (log + chunk).slice(-4000); });
  const done = new Promise((ok, fail) => child.on('close', code => (code === 0 ? ok() : fail(new Error(`${command} exited ${code}\n${log}`)))));
  return { child, done };
}

// ---------------------------------------------------------------- thumbnail
// A still, drawn once: no shutter, no grain. JPEG, under YouTube's limit.
async function renderThumbnail() {
  const { page } = await open();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: TARGET.width, height: TARGET.height, deviceScaleFactor: TARGET.scale, mobile: false });
  await page.evaluate(() => window.NW.thumbnail());
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  await page.close();
  const jpeg = await sharp(Buffer.from(data, 'base64')).removeAlpha().jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer();
  const meta = await sharp(jpeg).metadata();
  if (`${meta.width}x${meta.height}` !== `${width}x${height}`) throw new Error(`thumbnail is ${meta.width}x${meta.height}, not ${width}x${height}`);
  if (jpeg.length > THUMBNAIL.maxBytes) throw new Error(`thumbnail is ${(jpeg.length / 1e6).toFixed(2)} MB, over YouTube's ${THUMBNAIL.maxBytes / 1e6} MB`);
  await writeFile(join(root, THUMBNAIL.out), jpeg);
  console.log(`${THUMBNAIL.out}: ${meta.width}x${meta.height}, ${(jpeg.length / 1e6).toFixed(2)} MB, sha256 ${sha256(jpeg)}`);
}

// ---------------------------------------------------------------- verify
async function verify() {
  preflight();
  await mkdir(artifacts, { recursive: true });
  const file = join(root, TARGET.out);
  const info = probe(['-i', file]).stderr;
  if (!/Duration/.test(info)) { console.log(`${TARGET.out} is missing or unreadable`); process.exitCode = 1; return; }
  const video = info.match(/Video: (\w+) \(([^)]+)\).*?, (\d+)x(\d+).*?, (\d+) kb\/s.*?, ([\d.]+) fps/);
  const audioInfo = info.match(/Audio: (\w+).*?, (\d+) Hz, (\w+),.*?(\d+) kb\/s/);
  const frames = Number([...probe(['-nostats', '-i', file, '-map', '0:v:0', '-f', 'null', '-', '-progress', 'pipe:1']).stdout.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1] ?? 0);
  const { lufs, peak } = loudness(file);
  const data = await readFile(file), digest = sha256(data);
  const cut = existsSync(join(root, CUT_RECORD)) ? JSON.parse(readFileSync(join(root, CUT_RECORD), 'utf8')).render : null;
  const seconds = frames / FPS, [lo, hi] = REQUIREMENTS.seconds, a = REQUIREMENTS.audio, l = REQUIREMENTS.loudness;
  const want = `${width}x${height}`;
  const checks = [
    ['length', seconds >= lo && seconds <= hi, `${seconds.toFixed(2)} s, ${frames} frames (${lo}–${hi} s)`],
    ['frame size', video && `${video[3]}x${video[4]}` === want, `${video?.[3]}x${video?.[4]} (${want}, 9:16)`],
    ['frame rate', video && Number(video[6]) === REQUIREMENTS.fps, `${video?.[6]} fps`],
    ['video codec', video?.[1] === REQUIREMENTS.codec && /High/.test(video?.[2]), `${video?.[1]} ${video?.[2]}`],
    ['video bitrate', Number(video?.[5]) >= REQUIREMENTS.minKbps, `${video?.[5]} kb/s (at least ${REQUIREMENTS.minKbps})`],
    ['audio', audioInfo?.[1] === a.codec && audioInfo?.[3] === a.channels && a.rates.includes(Number(audioInfo?.[2])) && Math.abs(Number(audioInfo?.[4]) - a.kbps) <= 16,
      `${audioInfo?.[1]} ${audioInfo?.[3]} ${audioInfo?.[2]} Hz ${audioInfo?.[4]} kb/s`],
    ['loudness', lufs >= l.lufs[0] && lufs <= l.lufs[1], `${lufs} LUFS (${l.lufs.join(' to ')})`],
    ['true peak', peak <= l.truePeak, `${peak} dBTP (at most ${l.truePeak})`],
    ['file size', data.length <= REQUIREMENTS.maxBytes, `${(data.length / 1e6).toFixed(1)} MB`],
    ['render record', cut?.sha256 === digest, cut ? (cut.sha256 === digest ? `matches ${CUT_RECORD}` : `differs from ${CUT_RECORD}`) : `none in ${CUT_RECORD}`],
  ];
  let failed = false;
  console.log(`${TARGET.out}`);
  for (const [name, ok, detail] of checks) { console.log(`  ${ok ? 'pass' : 'FAIL'}  ${name.padEnd(14)} ${detail}`); failed ||= !ok; }
  console.log(`        sha256         ${digest}`);
  const contact = join(artifacts, 'mp4-sheet.png');
  probe(['-y', '-loglevel', 'error', '-i', file, '-vf', `fps=32/${DURATION},scale=180:-1,tile=8x4:padding=6:color=0x222222`, '-frames:v', '1', contact]);
  const poster = join(artifacts, 'poster.jpg');
  probe(['-y', '-loglevel', 'error', '-ss', String(POSTER_SECONDS), '-i', file, '-frames:v', '1', '-q:v', '2', poster]);
  console.log(`        sheet          ${contact}\n        poster         ${poster} (${POSTER_SECONDS} s)`);
  if (failed) { console.log('\nThe trailer breaks a rule or its render record.'); process.exitCode = 1; }
}

// ---------------------------------------------------------------- main
try {
  args = parse(process.argv.slice(2));
  if (args.mode === 'stills') await renderStills();
  else if (args.mode === 'segment') await renderSegment();
  else if (args.mode === 'audio') await audio();
  else if (args.mode === 'render') await render();
  else if (args.mode === 'encode') await encode();
  else if (args.mode === 'verify') await verify();
  else if (args.mode === 'thumbnail') await renderThumbnail();
  else if (args.mode === 'worker') await worker();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server?.close();
}
