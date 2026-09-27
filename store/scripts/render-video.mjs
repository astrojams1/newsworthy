// Renders, checks and reviews the store preview reel (store/video).
//
//   node store/scripts/render-video.mjs --stale        what changed in the app since the last cut
//   node store/scripts/render-video.mjs --stills 1.2,4.9,8.4
//                                    single renders and a contact sheet in artifacts/
//   node store/scripts/render-video.mjs --segment 2.85,3.2
//                                    finished, motion-blurred frames of a span as PNGs
//   node store/scripts/render-video.mjs                both cuts; --platform ios for one
//   node store/scripts/render-video.mjs --verify       the rendered cuts against the store rules
//   node store/scripts/render-video.mjs --viewer       the review page, ready to publish
//
// Rendering needs Chromium (CHROMIUM_PATH or the cloud image's copy); encoding,
// --verify and --viewer need an ffmpeg with libx264 and AAC (FFMPEG_PATH, or
// ffmpeg on PATH). The skill in .agents/skills/newsworthy-preview-reel says when
// to use which, and store/video/ledger.md records every cut.
//
// Motion blur is sampled, not faked: each frame averages renders spread across
// half the frame interval, a 180-degree shutter, weighted to open and close
// softly and summed in linear light as a sensor would. How many depends on how
// fast things move: four for a still frame, up to forty while the number
// rolls, so no two samples of a moving edge land far enough apart to show as
// separate copies.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CUES, DOWN, DURATION, FPS, UP_STEPS, scoreAt } from '../video/timeline.js';
import { COPY, POSTER_SECONDS, REQUIREMENTS, SCENES, TARGETS } from '../video/reel.js';
import { renderScore, wav } from '../video/score.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const artifacts = join(root, 'artifacts/preview-video');
const option = name => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? undefined : process.argv[i + 1]?.startsWith('--') ? true : process.argv[i + 1] ?? true; };
const list = name => (typeof option(name) === 'string' ? option(name).split(',').map(Number) : null);
const platforms = typeof option('platform') === 'string' ? [option('platform')] : Object.keys(TARGETS);
const stills = list('stills'), segment = list('segment');
const draft = Boolean(option('draft')), SHUTTER = 0.5;
const ffmpeg = process.env.FFMPEG_PATH ?? 'ffmpeg';
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

// ---------------------------------------------------------------- sampling
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

// ---------------------------------------------------------------- tools
// Fail before a ten-minute render rather than at its end.
function preflight() {
  const found = spawnSync(ffmpeg, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
  if (found.error || !/libx264/.test(found.stdout) || !/ aac /.test(found.stdout)) {
    throw new Error(`${ffmpeg} cannot encode H.264 and AAC. Set FFMPEG_PATH to one that can; in a cloud session:\n` +
      '  pip install --target "$SCRATCH/py" imageio-ffmpeg\n  export FFMPEG_PATH=$(ls "$SCRATCH"/py/imageio_ffmpeg/binaries/ffmpeg-*)');
  }
}
// ffmpeg's report on a file: its stream table goes to stderr.
const probe = args => spawnSync(ffmpeg, ['-hide_banner', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });

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

function run(command, args) {
  const child = spawn(command, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let log = '';
  child.stderr.on('data', chunk => { log = (log + chunk).slice(-4000); });
  const done = new Promise((ok, fail) => child.on('close', code => (code === 0 ? ok() : fail(new Error(`${command} exited ${code}\n${log}`)))));
  return { child, done };
}

async function open(platform) {
  await start();
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
  return { page, capture, target };
}

// ---------------------------------------------------------------- stills
async function renderStills(platform) {
  const { capture, page } = await open(platform);
  await mkdir(artifacts, { recursive: true });
  const shots = [];
  for (const t of stills) {
    const png = await capture(t);
    await writeFile(join(artifacts, `${platform}-${t.toFixed(2)}.png`), png);
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
  const sheet = join(artifacts, `${platform}-sheet.png`);
  await sharp({ create: { width: cols * (tile + 8) - 8, height: rows * (th + 8) - 8, channels: 3, background: '#222' } }).composite(tiles).png().toFile(sheet);
  console.log(`${platform}: ${shots.length} stills, sheet at ${sheet}`);
}

// ---------------------------------------------------------------- video
async function renderVideo(platform) {
  if (!segment) preflight();
  const { capture, page, target } = await open(platform);
  const frames = Math.round(DURATION * FPS);
  const audioPath = join(artifacts, `${platform}-score.wav`);
  await mkdir(artifacts, { recursive: true });
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
  ]);
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
      await sharp(frame, { raw: { width, height, channels: 3 } }).png().toFile(join(artifacts, `${platform}-frame-${String(i).padStart(3, '0')}.png`));
      continue;
    }
    if (!encoder.child.stdin.write(frame)) await once(encoder.child.stdin, 'drain');
    if (i % 30 === 29) process.stdout.write(`\r${platform}: ${i + 1}/${frames} frames, ${samples} samples, ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  await page.close();
  if (segment) { console.log(`${platform}: frames ${first}–${last}, ${samples} samples, in ${artifacts}`); return; }
  encoder.child.stdin.end();
  await encoder.done;
  console.log(`\n${platform}: ${out}`);
}

// ---------------------------------------------------------------- stale
// What moved since the last cut: the commit that last changed each video is
// the source it was rendered from, because a cut is committed with its source.
function stale() {
  const cuts = [...new Set(Object.values(TARGETS).map(t => git('log', '-1', '--format=%h', '--', t.out)))];
  const film = ['store/video', 'store/scripts/render-video.mjs'];
  const depicted = [...new Set(SCENES.flatMap(s => s.depicts))];
  for (const cut of cuts) {
    if (!cut) { console.log('No cut is committed yet.'); continue; }
    console.log(`Last cut: ${git('log', '-1', '--format=%h %cs %s', cut)}`);
    // Against the working tree, so uncommitted changes count too.
    const changed = new Set([...git('diff', '--name-only', cut, '--', ...depicted, ...film).split('\n'),
      ...git('ls-files', '--others', '--exclude-standard', '--', ...film).split('\n')].filter(Boolean));
    const scenes = SCENES.map(s => [s, s.depicts.filter(f => changed.has(f))]).filter(([, files]) => files.length);
    console.log(scenes.length ? '\nScenes whose app sources changed:' : '\nNo app source the film draws has changed.');
    for (const [s, files] of scenes) console.log(`  ${s.id.padEnd(14)} ${String(s.start).padStart(4)} s  ${s.title}\n${files.map(f => `      ${f}`).join('\n')}`);
    const own = [...changed].filter(f => film.some(p => f === p || f.startsWith(p + '/')));
    if (own.length) console.log(`\nThe film's own source changed (re-render to ship it):\n${own.map(f => `  ${f}`).join('\n')}`);
    const log = git('log', '--no-merges', '--format=%h %cs %s', `${cut}..HEAD`);
    console.log(log ? `\nCommits since the cut (look for features the film should now show):\n${log.split('\n').slice(0, 40).map(l => `  ${l}`).join('\n')}` : '\nNo commits since the cut.');
  }
  // Every line on screen still has to be in the file it came from.
  const drift = [];
  for (const [key, line] of Object.entries(COPY)) {
    const source = readFileText(line.source).toLowerCase();
    for (const text of [line.match ?? line.text, line.ios, line.android].filter(Boolean)) {
      if (!source.includes(text.toLowerCase())) drift.push(`  ${key}: "${text}" is no longer in ${line.source}`);
    }
  }
  console.log(drift.length ? `\nCopy that has drifted from its source:\n${drift.join('\n')}` : '\nEvery line on screen is still in its source.');
}
const readFileText = path => { try { return readFileSync(join(root, path), 'utf8'); } catch { return ''; } };

// ---------------------------------------------------------------- verify
async function verify() {
  preflight();
  await mkdir(artifacts, { recursive: true });
  let failed = false;
  for (const platform of platforms) {
    const target = TARGETS[platform], file = join(root, target.out);
    const info = probe(['-i', file]).stderr;
    if (!/Duration/.test(info)) { console.log(`${platform}: ${target.out} is missing or unreadable`); failed = true; continue; }
    const video = info.match(/Video: (\w+) \(([^)]+)\).*?, (\d+)x(\d+).*?, ([\d.]+) fps/);
    const audio = info.match(/Audio: (\w+).*?, (\d+) Hz, (\w+),.*?(\d+) kb\/s/);
    // -progress repeats its block while decoding; the last one has the total.
    const frames = Number([...probe(['-nostats', '-i', file, '-map', '0:v:0', '-f', 'null', '-', '-progress', 'pipe:1']).stdout.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1] ?? 0);
    const level = Number(probe(['-i', file, '-map', '0:v:0', '-c', 'copy', '-bsf:v', 'trace_headers', '-frames:v', '1', '-f', 'null', '-']).stderr.match(/ level_idc\s+\d+ = (\d+)/)?.[1] ?? 0);
    const loud = probe(['-nostats', '-i', file, '-map', '0:a:0', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-']).stderr;
    const data = await readFile(file), bytes = data.length, sha = createHash('sha256').update(data).digest('hex');
    const seconds = frames / FPS, [lo, hi] = REQUIREMENTS.seconds, a = REQUIREMENTS.audio;
    const want = `${Math.round(target.width * target.scale)}x${Math.round(target.height * target.scale)}`;
    const checks = [
      ['length', seconds >= lo && seconds <= hi, `${seconds.toFixed(2)} s, ${frames} frames (${lo}–${hi} s)`],
      ['frame size', video && `${video[3]}x${video[4]}` === want, `${video?.[3]}x${video?.[4]} (${want})`],
      ['frame rate', video && Number(video[5]) <= REQUIREMENTS.maxFps, `${video?.[5]} fps (at most ${REQUIREMENTS.maxFps})`],
      ['video codec', video?.[1] === REQUIREMENTS.codec && /High|Main|Baseline/.test(video?.[2]), `${video?.[1]} ${video?.[2]}`],
      ['H.264 level', level > 0 && level <= REQUIREMENTS.maxLevel, `${(level / 10).toFixed(1)} (at most ${(REQUIREMENTS.maxLevel / 10).toFixed(1)})`],
      ['audio', audio?.[1] === a.codec && audio?.[3] === a.channels && a.rates.includes(Number(audio?.[2])) && Math.abs(Number(audio?.[4]) - a.kbps) <= 8,
        `${audio?.[1]} ${audio?.[3]} ${audio?.[2]} Hz ${audio?.[4]} kb/s`],
      ['file size', bytes <= REQUIREMENTS.maxBytes, `${(bytes / 1e6).toFixed(1)} MB`],
    ];
    console.log(`\n${platform}: ${target.out} (${target.store})`);
    for (const [name, ok, detail] of checks) { console.log(`  ${ok ? 'pass' : 'FAIL'}  ${name.padEnd(12)} ${detail}`); failed ||= !ok; }
    console.log(`        loudness     ${loud.match(/I:\s+(-?[\d.]+ LUFS)/)?.[1]}, peak ${loud.match(/Peak:\s+(-?[\d.]+ dBFS)/)?.[1]}`);
    console.log(`        sha256       ${sha}`);
    // Frames decoded from the file itself, to look at.
    const sheet = join(artifacts, `${platform}-mp4-sheet.png`);
    probe(['-y', '-loglevel', 'error', '-i', file, '-vf', `fps=24/${DURATION},scale=222:-1,tile=8x3:padding=6:color=0x222222`, '-frames:v', '1', sheet]);
    console.log(`        sheet        ${sheet}`);
  }
  if (failed) { console.log('\nA cut breaks the store rules.'); process.exitCode = 1; }
}

// ---------------------------------------------------------------- viewer
// The review page: both cuts, and a strip of the film's own colour to seek by.
async function viewer() {
  preflight();
  const dir = join(artifacts, 'viewer');
  await mkdir(dir, { recursive: true });
  const cuts = [];
  for (const [platform, target] of Object.entries(TARGETS)) {
    const poster = `poster-${platform}.jpg`;
    probe(['-y', '-loglevel', 'error', '-ss', String(POSTER_SECONDS), '-i', join(root, target.out), '-frames:v', '1', '-q:v', '3', join(dir, poster)]);
    const w = Math.round(target.width * target.scale), h = Math.round(target.height * target.scale);
    cuts.push({ id: platform, src: basename(target.out), poster, width: w, height: h,
      store: platform === 'ios' ? 'App Store · iPhone' : 'Google Play · Android', spec: `${w} × ${h} · ${FPS} fps · ${DURATION} s · stereo` });
  }
  // One average colour per frame of the first cut.
  const raw = spawnSync(ffmpeg, ['-loglevel', 'error', '-i', join(root, Object.values(TARGETS)[0].out), '-vf', 'scale=1:1:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 24 }).stdout;
  const frames = [];
  for (let i = 0; i + 2 < raw.length; i += 3) frames.push(((raw[i] << 16) | (raw[i + 1] << 8) | raw[i + 2]).toString(16).padStart(6, '0'));
  const page = (await readFile(join(root, 'store/video/viewer.html'), 'utf8'))
    .replace('__CUTS__', JSON.stringify(cuts)).replace('__FRAMES__', JSON.stringify(frames))
    .replace('__SCENES__', JSON.stringify(SCENES.map(s => [s.start, s.title]))).replace('__DURATION__', String(DURATION));
  const html = join(dir, 'newsworthy-store-preview.html');
  await writeFile(html, page);
  const files = Object.fromEntries([...Object.values(TARGETS).map(t => [basename(t.out), t.out]), ...cuts.map(c => [c.poster, `artifacts/preview-video/viewer/${c.poster}`])]);
  console.log(`Review page: ${html}\nPublish it with these files (the Artifact tool's files map):\n${JSON.stringify(files, null, 2)}`);
}

// ---------------------------------------------------------------- main
try {
  for (const platform of platforms) if (!TARGETS[platform]) throw new Error(`Unknown platform ${platform}`);
  if (option('stale')) stale();
  else if (option('verify')) await verify();
  else if (option('viewer')) await viewer();
  else for (const platform of platforms) {
    if (stills) await renderStills(platform);
    else await renderVideo(platform);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server?.close();
}
