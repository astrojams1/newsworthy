// Renders, checks and reviews the store preview reel (store/video).
//
//   node store/scripts/render-video.mjs --stale          what changed since the last cut, and which stills to look at
//   node store/scripts/render-video.mjs --stills 1.3,3.6,6.0
//                                    single renders, a contact sheet, and what changed since the last --stills run
//   node store/scripts/render-video.mjs --segment 2.85,3.2
//                                    finished, motion-blurred frames of a span as PNGs
//   node store/scripts/render-video.mjs --render         both cuts (--platform ios for one); writes store/video/cut.json
//   node store/scripts/render-video.mjs --verify         the committed cuts against the store rules and cut.json
//   node store/scripts/render-video.mjs --viewer         the review page, ready to publish
//
// Rendering needs Chromium (CHROMIUM_PATH or the cloud image's copy); --render,
// --verify and --viewer need an ffmpeg with libx264 and AAC: FFMPEG_PATH, else
// one installed under artifacts/tools (see the preflight message), else ffmpeg
// on PATH. The skill in .agents/skills/newsworthy-preview-reel says when to use
// which, and store/video/ledger.md records every cut.
//
// Motion blur is sampled, not faked: each frame averages renders spread across
// half the frame interval, a 180-degree shutter, weighted to open and close
// softly and summed in linear light as a sensor would. How many depends on how
// fast things move: four for a still frame, up to forty while the number
// rolls, so no two samples of a moving edge land far enough apart to show as
// separate copies.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmdirSync, writeFileSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CUES, DOWN, DURATION, FPS, UP_STEPS, scoreAt } from '../video/timeline.js';
import { COPY, CUT_RECORD, FILM, POSTER_SECONDS, REQUIREMENTS, SCENES, TARGETS } from '../video/reel.js';
import { renderScore, wav } from '../video/score.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const artifacts = join(root, 'artifacts/preview-video');

// ---------------------------------------------------------------- arguments
// Strict, because the one mode that overwrites the committed cuts has to be
// asked for by name: a mistyped --stills once fell through to a full render.
const MODES = ['stale', 'stills', 'segment', 'render', 'verify', 'viewer'];
const OPTIONS = { stale: 'flag', stills: 'list', segment: 'list', render: 'flag', verify: 'flag', viewer: 'flag', platform: 'value', draft: 'flag' };
const USAGE = 'Usage: node store/scripts/render-video.mjs --stale | --stills 1.3,3.6 | --segment 2.85,3.2 | --render | --verify | --viewer  [--platform ios|android] [--draft]';
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
  if (out.segment && out.segment.length !== 2) throw new Error('--segment takes a start and an end, e.g. 2.85,3.2');
  if (out.platform && !TARGETS[out.platform]) throw new Error(`Unknown platform ${out.platform}; one of ${Object.keys(TARGETS).join(', ')}`);
  return { ...out, mode: modes[0], platforms: out.platform ? [out.platform] : Object.keys(TARGETS) };
}
let args;

// ---------------------------------------------------------------- sampling
// Moments with motion besides the number: the screen closing into a widget,
// the widgets receding, the wipe, the card, the notification and the icon.
const SHUTTER = 0.5;
const MOVING = [CUES.morph, CUES.split, CUES.wipe, CUES.widgetsOut, CUES.card, CUES.toggle, CUES.notification, CUES.flight, CUES.word];
function samplesAt(t, target) {
  if (args.draft) return 1;
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
// An ffmpeg installed where the preflight message says is found without an
// environment variable, which does not survive between shell calls.
const TOOLS = 'artifacts/tools/py';
const ffmpeg = process.env.FFMPEG_PATH ?? (() => {
  const dir = join(root, TOOLS, 'imageio_ffmpeg/binaries');
  const found = existsSync(dir) && readdirSync(dir).find(name => name.startsWith('ffmpeg'));
  return found ? join(dir, found) : 'ffmpeg';
})();
// Fail before a fifteen-minute render rather than at its end.
function preflight() {
  const found = spawnSync(ffmpeg, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
  if (found.error || !/libx264/.test(found.stdout) || !/ aac /.test(found.stdout)) {
    throw new Error(`${ffmpeg} cannot encode H.264 and AAC. From the repository root, install one where this script looks for it:\n` +
      `  pip install --quiet --target ${TOOLS} imageio-ffmpeg\nor set FFMPEG_PATH to one that can.`);
  }
}
// ffmpeg's report on a file: its stream table goes to stderr.
const probe = list => spawnSync(ffmpeg, ['-hide_banner', ...list], { encoding: 'utf8', maxBuffer: 1 << 26 });
const git = (...list) => execFileSync('git', list, { cwd: root, encoding: 'utf8' }).trim();
const sha256 = data => createHash('sha256').update(data).digest('hex');
const hashOf = path => (existsSync(join(root, path)) ? sha256(readFileSync(join(root, path))) : null);
const readText = path => (existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : '');

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

function run(command, list) {
  const child = spawn(command, list, { stdio: ['pipe', 'ignore', 'pipe'] });
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
// A labelled grid of PNGs; the label sits low so the status bar stays visible.
async function sheet(file, shots, tile = 300) {
  const meta = await sharp(shots[0].png).metadata(), th = Math.round(tile * meta.height / meta.width);
  const cols = Math.min(6, shots.length), rows = Math.ceil(shots.length / cols);
  const badge = label => Buffer.from(`<svg width="${tile}" height="28"><rect width="${12 + 9 * label.length}" height="24" rx="6" fill="#000" fill-opacity=".6"/><text x="8" y="17" font-family="monospace" font-size="15" fill="#fff">${label}</text></svg>`);
  const tiles = await Promise.all(shots.map(async ({ label, png }, i) => ({
    input: await sharp(png).resize(tile, th).composite([{ input: badge(label), top: th - 32, left: 4 }]).png().toBuffer(),
    left: (i % cols) * (tile + 8), top: Math.floor(i / cols) * (th + 8),
  })));
  await sharp({ create: { width: cols * (tile + 8) - 8, height: rows * (th + 8) - 8, channels: 3, background: '#222' } }).composite(tiles).png().toFile(file);
}

// Each run keeps the previous run's stills, so rendering the same times before
// and after an edit shows exactly which frames it changed.
async function renderStills(platform) {
  const { capture, page } = await open(platform);
  await mkdir(join(artifacts, 'previous'), { recursive: true });
  const shots = [], changed = [], same = [];
  for (const t of args.stills) {
    const name = `${platform}-${t.toFixed(2)}.png`, file = join(artifacts, name), before = join(artifacts, 'previous', name);
    const had = existsSync(file);
    if (had) await rename(file, before);
    const png = await capture(t);
    await writeFile(file, png);
    shots.push({ label: `${t.toFixed(2)}s`, png });
    if (had) { const old = readFileSync(before); (old.equals(png) ? same : changed).push({ t, before: old, png }); }
  }
  await page.close();
  await sheet(join(artifacts, `${platform}-sheet.png`), shots);
  console.log(`${platform}: ${shots.length} stills, sheet at ${join(artifacts, `${platform}-sheet.png`)}`);
  if (changed.length || same.length) {
    console.log(`  since the last run: ${changed.length ? `changed ${changed.map(c => c.t.toFixed(2)).join(', ')}` : 'nothing changed'}${same.length ? `; identical ${same.map(c => c.t.toFixed(2)).join(', ')}` : ''}`);
    if (changed.length) {
      const pairs = changed.flatMap(c => [{ label: `${c.t.toFixed(2)} before`, png: c.before }, { label: `${c.t.toFixed(2)} after`, png: c.png }]);
      await sheet(join(artifacts, `${platform}-changes.png`), pairs);
      console.log(`  before and after: ${join(artifacts, `${platform}-changes.png`)}`);
    }
  }
}

// ---------------------------------------------------------------- record
// What a render was made from: the hash of every file that can change the
// film. --stale compares against it, so a commit that only touches notes, or
// a refactor proved identical, does not read as a change to the picture.
const inputs = () => [...new Set([...FILM, ...SCENES.flatMap(s => s.depicts), ...Object.values(COPY).map(c => c.source)])].sort();
const recordNow = () => Object.fromEntries(inputs().map(path => [path, hashOf(path)]));
const readRecord = () => (existsSync(join(root, CUT_RECORD)) ? JSON.parse(readText(CUT_RECORD)) : { cuts: {} });
// Both cuts render in parallel and each records itself when done, so the
// read-and-write is held under a lock directory (mkdir is atomic).
async function record(platform, entry) {
  const lock = join(root, `${CUT_RECORD}.lock`);
  for (let tries = 0; ; tries++) {
    try { mkdirSync(lock); break; } catch (error) {
      if (error.code !== 'EEXIST' || tries > 300) throw error;
      await new Promise(done => setTimeout(done, 100));
    }
  }
  try {
    const cut = readRecord();
    cut.cuts[platform] = entry;
    writeFileSync(join(root, CUT_RECORD), JSON.stringify(cut, null, 2) + '\n');
  } finally { rmdirSync(lock); }
}

// ---------------------------------------------------------------- video
async function renderVideo(platform) {
  if (!args.segment) preflight();
  const { capture, page, target } = await open(platform);
  const frames = Math.round(DURATION * FPS);
  const made = recordNow();
  const audioPath = join(artifacts, `${platform}-score.wav`);
  await mkdir(artifacts, { recursive: true });
  await writeFile(audioPath, wav(renderScore({ platform })));
  const out = join(root, target.out);
  await mkdir(dirname(out), { recursive: true });
  const width = Math.round(target.width * target.scale), height = Math.round(target.height * target.scale);
  const [first, last] = args.segment ? args.segment.map(s => Math.round(s * FPS)) : [0, frames - 1];
  const encoder = args.segment ? null : run(ffmpeg, [
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
    if (args.segment) {
      await sharp(frame, { raw: { width, height, channels: 3 } }).png().toFile(join(artifacts, `${platform}-frame-${String(i).padStart(3, '0')}.png`));
      continue;
    }
    if (!encoder.child.stdin.write(frame)) await once(encoder.child.stdin, 'drain');
    if (i % 30 === 29) process.stdout.write(`\r${platform}: ${i + 1}/${frames} frames, ${samples} samples, ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  await page.close();
  if (args.segment) { console.log(`${platform}: frames ${first}–${last}, ${samples} samples, in ${artifacts}`); return; }
  encoder.child.stdin.end();
  await encoder.done;
  const data = await readFile(out);
  await record(platform, { file: target.out, bytes: data.length, sha256: sha256(data), frames, samples,
    minutes: Number(((Date.now() - started) / 60000).toFixed(1)), inputs: made });
  console.log(`\n${platform}: ${out}, recorded in ${CUT_RECORD}`);
}

// ---------------------------------------------------------------- stale
// What moved since each cut was rendered, by content: scenes whose app files
// changed, lines whose source changed or no longer says what the film says,
// the film's own source, and the stills that would show the difference.
function stale() {
  const cut = readRecord(), now = recordNow(), looks = new Set();
  const look = ([a, b]) => looks.add(Number(((a + b) / 2).toFixed(2)));
  const cuts = Object.entries(cut.cuts);
  if (!cuts.length) console.log(`No render is recorded in ${CUT_RECORD}; render with --render.`);
  const reports = new Map();
  for (const [platform, entry] of cuts) {
    const changed = inputs().filter(path => entry.inputs[path] !== now[path]);
    const key = changed.join('\n');
    reports.set(key, [...(reports.get(key) ?? []), platform]);
    if (hashOf(entry.file) !== entry.sha256) console.log(`${platform}: ${entry.file} is not the file its render recorded; render it again.`);
  }
  for (const [key, platforms] of reports) {
    const changed = new Set(key ? key.split('\n') : []);
    console.log(`\n${platforms.join(' and ')}: ${changed.size ? `${changed.size} input${changed.size > 1 ? 's' : ''} changed since the render` : 'nothing the film is made from has changed since the render'}.`);
    SCENES.forEach((s, i) => {
      const files = s.depicts.filter(f => changed.has(f)), end = SCENES[i + 1]?.start ?? DURATION;
      if (!files.length) return;
      console.log(`  scene ${s.id} (${s.start}–${end} s, ${s.title}): ${files.join(', ')}`);
      look([s.start, end]);
    });
    for (const [line, c] of Object.entries(COPY)) {
      if (!changed.has(c.source)) continue;
      console.log(`  line ${line} (${c.on[0].toFixed(2)}–${c.on[1].toFixed(2)} s): its source ${c.source} changed`);
      look(c.on);
    }
    const own = FILM.filter(f => changed.has(f));
    if (own.length) console.log(`  the film's own source (a render ships it): ${own.join(', ')}`);
  }
  // Each line must still be in its source exactly, case and quotes included.
  const drift = Object.entries(COPY).flatMap(([line, c]) => [c.quote].flat().filter(q => !readText(c.source).includes(q))
    .map(q => { look(c.on); return `  ${line} (${c.on[0].toFixed(2)}–${c.on[1].toFixed(2)} s): ${c.source} no longer contains ${q}`; }));
  console.log(drift.length ? `\nLines the app has changed; update COPY in store/video/reel.js:\n${drift.join('\n')}` : '\nEvery line on screen is still in its source, word for word.');
  if (looks.size) console.log(`\nLook at: node store/scripts/render-video.mjs --stills ${[...looks].sort((a, b) => a - b).join(',')}`);
  const base = git('log', '-1', '--format=%h', '--', CUT_RECORD);
  if (base) {
    const log = git('log', '--no-merges', '--format=%h %cs %s', `${base}..HEAD`);
    console.log(log ? `\nCommits since the render was recorded (${base}); look for features the film should now show:\n${log.split('\n').slice(0, 40).map(l => `  ${l}`).join('\n')}` : `\nNo commits since the render was recorded (${base}).`);
  }
}

// ---------------------------------------------------------------- verify
async function verify() {
  preflight();
  await mkdir(artifacts, { recursive: true });
  const cut = readRecord();
  let failed = false;
  for (const platform of args.platforms) {
    const target = TARGETS[platform], file = join(root, target.out);
    const info = probe(['-i', file]).stderr;
    if (!/Duration/.test(info)) { console.log(`${platform}: ${target.out} is missing or unreadable`); failed = true; continue; }
    const video = info.match(/Video: (\w+) \(([^)]+)\).*?, (\d+)x(\d+).*?, ([\d.]+) fps/);
    const audio = info.match(/Audio: (\w+).*?, (\d+) Hz, (\w+),.*?(\d+) kb\/s/);
    // -progress repeats its block while decoding; the last one has the total.
    const frames = Number([...probe(['-nostats', '-i', file, '-map', '0:v:0', '-f', 'null', '-', '-progress', 'pipe:1']).stdout.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1] ?? 0);
    const level = Number(probe(['-i', file, '-map', '0:v:0', '-c', 'copy', '-bsf:v', 'trace_headers', '-frames:v', '1', '-f', 'null', '-']).stderr.match(/ level_idc\s+\d+ = (\d+)/)?.[1] ?? 0);
    const loud = probe(['-nostats', '-i', file, '-map', '0:a:0', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-']).stderr;
    const data = await readFile(file), digest = sha256(data);
    const seconds = frames / FPS, [lo, hi] = REQUIREMENTS.seconds, a = REQUIREMENTS.audio;
    const want = `${Math.round(target.width * target.scale)}x${Math.round(target.height * target.scale)}`;
    const recorded = cut.cuts[platform];
    const checks = [
      ['length', seconds >= lo && seconds <= hi, `${seconds.toFixed(2)} s, ${frames} frames (${lo}–${hi} s)`],
      ['frame size', video && `${video[3]}x${video[4]}` === want, `${video?.[3]}x${video?.[4]} (${want})`],
      ['frame rate', video && Number(video[5]) <= REQUIREMENTS.maxFps, `${video?.[5]} fps (at most ${REQUIREMENTS.maxFps})`],
      ['video codec', video?.[1] === REQUIREMENTS.codec && /High|Main|Baseline/.test(video?.[2]), `${video?.[1]} ${video?.[2]}`],
      ['H.264 level', level > 0 && level <= REQUIREMENTS.maxLevel, `${(level / 10).toFixed(1)} (at most ${(REQUIREMENTS.maxLevel / 10).toFixed(1)})`],
      ['audio', audio?.[1] === a.codec && audio?.[3] === a.channels && a.rates.includes(Number(audio?.[2])) && Math.abs(Number(audio?.[4]) - a.kbps) <= 8,
        `${audio?.[1]} ${audio?.[3]} ${audio?.[2]} Hz ${audio?.[4]} kb/s`],
      ['file size', data.length <= REQUIREMENTS.maxBytes, `${(data.length / 1e6).toFixed(1)} MB`],
      ['render record', recorded?.sha256 === digest, recorded ? (recorded.sha256 === digest ? `matches ${CUT_RECORD}` : `differs from ${CUT_RECORD}`) : `none in ${CUT_RECORD}`],
    ];
    console.log(`\n${platform}: ${target.out} (${target.store})`);
    for (const [name, ok, detail] of checks) { console.log(`  ${ok ? 'pass' : 'FAIL'}  ${name.padEnd(13)} ${detail}`); failed ||= !ok; }
    console.log(`        loudness      ${loud.match(/I:\s+(-?[\d.]+ LUFS)/)?.[1]}, peak ${loud.match(/Peak:\s+(-?[\d.]+ dBFS)/)?.[1]}`);
    console.log(`        sha256        ${digest}`);
    // Frames decoded from the file itself, to look at.
    const contact = join(artifacts, `${platform}-mp4-sheet.png`);
    probe(['-y', '-loglevel', 'error', '-i', file, '-vf', `fps=24/${DURATION},scale=222:-1,tile=8x3:padding=6:color=0x222222`, '-frames:v', '1', contact]);
    console.log(`        sheet         ${contact}`);
  }
  if (failed) { console.log('\nA cut breaks the store rules or its render record.'); process.exitCode = 1; }
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
  args = parse(process.argv.slice(2));
  if (args.mode === 'stale') stale();
  else if (args.mode === 'verify') await verify();
  else if (args.mode === 'viewer') await viewer();
  else for (const platform of args.platforms) {
    if (args.mode === 'stills') await renderStills(platform);
    else await renderVideo(platform);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server?.close();
}
