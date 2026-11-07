// The "today" Short as a pure function of time. store/scripts/render-trailer.mjs
// (--film today) calls NW.render(t) for every subframe and captures the page;
// nothing here runs on a clock, so every render of the same t is the same
// picture.
//
// It draws the day's real reading (reading.json, via film.js) the way the app
// lays it out: apps/client/app/index.tsx for the reading screen and
// NewsworthyWidget.swift for the widgets, in the production tokens. The
// colour, type and phone code repeats the trailer's (../trailer/composition.js).
import tokens from '../../../public/tokens.js';
import { hexToOklab } from '../../../design/colors.js';
import { CUES, DURATION, bezier, spring } from './timeline.js';
import { THUMBNAIL, reading, say } from './film.js';
import zones from '../../../vendor/skills/skills/youtube-shorts/assets/zones.json' with { type: 'json' };

const W = innerWidth, H = innerHeight;
const stage = document.getElementById('stage');
const LEVEL = reading.score;

// ---------------------------------------------------------------- the safe zone
// YouTube draws its controls over a Short and a tall phone crops its sides;
// every word, number and screen stays inside the box the youtube-shorts skill
// measured (test/today.test.js checks it). Backgrounds still fill the frame.
const ZS = W / zones.frame.width;
const zone = z => ({ x: z.x * ZS, y: z.y * ZS, right: (z.x + z.width) * ZS, bottom: (z.y + z.height) * ZS });
const SAFE = zone(zones.safe), UPPER = zone(zones.safeAboveRail);
const room = (bottom, x = W / 2) => { const z = bottom <= UPPER.bottom ? UPPER : SAFE; return 2 * Math.min(x - z.x, z.right - x) - 4; };

// ---------------------------------------------------------------- motion
const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, [a, b]) => clamp((t - a) / (b - a));
const E = {
  expo: x => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  cubic: x => 1 - (1 - x) ** 3,
  inCubic: x => x ** 3,
  inOut: x => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  swift: bezier(0.7, 0, 0.3, 1),
};
const sp = (t, start, zeta = 0.86, omega = 13) => spring(t - start, zeta, omega);
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- colour
const labCache = new Map();
const hexLab = hex => { let v = labCache.get(hex); if (!v) labCache.set(hex, v = hexToOklab(hex)); return v; };
const encode = v => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
function labRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
    .map(v => clamp(encode(clamp(v)), 0, 255));
}
const mixHex = (a, b, u) => labRgb(hexLab(a).map((v, i) => lerp(v, hexLab(b)[i], u)));
const css = (rgb, alpha = 1) => `rgb(${rgb[0].toFixed(2)} ${rgb[1].toFixed(2)} ${rgb[2].toFixed(2)}${alpha < 1 ? ` / ${Math.max(0, alpha).toFixed(4)}` : ''})`;
const KEYS = ['surface', 'ink', 'muted', 'rule', 'gradientMuted', 'start', 'center', 'end', 'accent', 'tinted', 'elevated'];
function theme(level, mode = 'light') {
  const a = level === 'brand' ? tokens.brand : tokens.levels[level - 1], A = a[mode];
  const th = { dark: mode === 'dark', glow: A.glow, wash: A.wash, veil: A.veil, primary: mixHex(a.primary, a.primary, 0), companion: mixHex(a.companion, a.companion, 0) };
  for (const k of KEYS) th[k] = mixHex(A[k], A[k], 0);
  return th;
}
// public/levels.css, layer for layer, over the surface.
function readingBackground(th) {
  const c = th.companion, p = th.primary;
  return [
    `radial-gradient(ellipse at 5% 0%, ${css(c, th.glow)}, ${css(c, 0)} 62%)`,
    `radial-gradient(ellipse at 100% 100%, ${css(p, th.wash)}, ${css(p, 0)} 72%)`,
    `radial-gradient(ellipse at 0% 100%, ${css(c, th.veil)}, ${css(c, 0)} 60%)`,
    `linear-gradient(160deg, ${css(p, 0)} 25%, ${css(p, th.veil)})`,
    css(th.surface),
  ].join(', ');
}
// The same canvas grown to fill the frame around the phone, deeper.
function stageBackground(th, drift = 0) {
  const c = th.companion, p = th.primary, deep = labRgb(hexLab('#181416'));
  const mid = labRgb(rgbMix(p, deep, 0.42));
  return [
    `radial-gradient(110% 62% at ${12 + 6 * Math.sin(drift)}% 0%, ${css(c, 0.95)}, ${css(c, 0)} 70%)`,
    `radial-gradient(120% 80% at 100% ${100 - 5 * Math.cos(drift * 0.8)}%, ${css(p, 0.9)}, ${css(p, 0)} 75%)`,
    `radial-gradient(90% 55% at 0% 100%, ${css(c, 0.35)}, ${css(c, 0)} 66%)`,
    `linear-gradient(160deg, ${css(labRgb(rgbMix(c, p, 0.3)))}, ${css(labRgb(rgbMix(p, mid, 0.55)))})`,
  ].join(', ');
}
// Mixing two sRGB colours in OKLab, returning Lab.
function rgbLab(rgb) {
  const [r, g, b] = rgb.map(c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const rgbMix = (a, b, u) => rgbLab(a).map((v, i) => lerp(v, rgbLab(b)[i], u));
function lightStage(th) {
  const c = th.companion, p = th.primary;
  return [
    `radial-gradient(120% 70% at 12% 0%, ${css(c, 0.6)}, ${css(c, 0)} 72%)`,
    `radial-gradient(130% 85% at 100% 100%, ${css(p, 0.6)}, ${css(p, 0)} 74%)`,
    `linear-gradient(160deg, ${css(th.start)}, ${css(th.center)} 45%, ${css(th.end)})`,
  ].join(', ');
}
const diagonal = (th, middle = 0.5) => `linear-gradient(to bottom right, ${css(th.start)}, ${css(th.center)} ${middle * 100}%, ${css(th.end)})`;

// ---------------------------------------------------------------- type
const MONO = "'NW Mono'", SANS = "'NW Sans'";
const faces = [
  new FontFace('NW Mono', 'url(../fonts/roboto-mono-latin-300-normal.woff2)', { weight: '300' }),
  new FontFace('NW Sans', 'url(../fonts/inter-latin-opsz-normal.woff2)', { weight: '100 900' }),
];
const probe = document.createElement('canvas').getContext('2d');
const metrics = new Map();
function fontMetrics(family, weight) {
  const key = family + weight;
  if (!metrics.has(key)) {
    probe.font = `${weight} 1000px ${family}`;
    const m = probe.measureText('H');
    metrics.set(key, { ascent: m.fontBoundingBoxAscent / 1000, descent: m.fontBoundingBoxDescent / 1000, cap: m.actualBoundingBoxAscent / 1000 });
  }
  return metrics.get(key);
}
const LH = 1.3;
const baselineIn = (family, weight) => { const m = fontMetrics(family, weight); return (LH - m.ascent - m.descent) / 2 + m.ascent; };
function textWidth(value, family, weight, size, tracking = 0) {
  probe.font = `${weight} ${size}px ${family}`;
  return probe.measureText(value).width + tracking * value.length;
}

// ---------------------------------------------------------------- dom
function el(parent, style = {}, content) {
  const e = document.createElement('div');
  Object.assign(e.style, style);
  if (content !== undefined) { e.textContent = content; e.className = 't'; }
  parent.appendChild(e);
  return e;
}
const px = v => `${v}px`;
function box(e, x, y, w, h) { e.style.left = px(x); e.style.top = px(y); e.style.width = px(w); e.style.height = px(h); }
function show(e, opacity) { e.style.display = opacity <= 0.001 ? 'none' : 'block'; e.style.opacity = String(clamp(opacity)); }
function text(e, { x, y, size, family = SANS, weight = 400, align = 0, tracking = 0, color, opacity = 1 }) {
  e.style.fontFamily = family; e.style.fontWeight = String(weight); e.style.fontSize = px(size);
  e.style.letterSpacing = px(tracking); e.style.lineHeight = String(LH);
  e.style.left = px(x); e.style.top = px(y - baselineIn(family, weight) * size);
  e.style.transform = align ? `translateX(${-align * 100}%)` : 'none';
  if (color) e.style.color = css(color);
  show(e, opacity);
}
const svg = (w, h, body, extra = '') => `<svg width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="position:static;display:block" ${extra}>${body}</svg>`;
const ICON = {
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
};
const STATUS_ICONS = `<svg width="78" height="13" viewBox="0 0 78 13" style="position:static;display:block" fill="currentColor">
  <rect x="0" y="8" width="3.2" height="4.5" rx="0.9"/><rect x="4.6" y="6" width="3.2" height="6.5" rx="0.9"/><rect x="9.2" y="3.6" width="3.2" height="8.9" rx="0.9"/><rect x="13.8" y="1" width="3.2" height="11.5" rx="0.9"/>
  <path d="M30.5 3.2a11 11 0 0 1 7.7 3.1l1.2-1.2a12.7 12.7 0 0 0-17.8 0l1.2 1.2a11 11 0 0 1 7.7-3.1zm0 3.6a7.3 7.3 0 0 1 5.1 2.1l1.2-1.2a9 9 0 0 0-12.6 0l1.2 1.2a7.3 7.3 0 0 1 5.1-2.1zm0 3.6a3.6 3.6 0 0 1 2.5 1l-2.5 2.5-2.5-2.5a3.6 3.6 0 0 1 2.5-1z"/>
  <rect x="47.5" y="0.8" width="25" height="11.6" rx="3.6" fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/><rect x="49.5" y="2.8" width="21" height="7.6" rx="2"/><path d="M74 4.6v4a2.1 2.1 0 0 0 0-4z" fill-opacity="0.45"/></svg>`;

// ---------------------------------------------------------------- the phone
// The app in its own points (an iPhone's 393 × 852), scaled into a phone that
// is the subject: large, under a one-line caption, a little left of centre to
// clear the action rail, its body running off the bottom under YouTube's title.
const AW = 393, AH = 852;
const BEZ = 8, PS = 0.7, STAGE = { x: W / 2 - 10 };
const PH = { sw: AW * PS, sh: AH * PS, r: 55 };
// The body runs on below the frame, so its lower corners are never seen.
PH.bw = PH.sw + 2 * BEZ; PH.bh = PH.sh + 2 * BEZ + 24;
PH.x = STAGE.x - PH.bw / 2; PH.y = SAFE.y + 38;

// ---------------------------------------------------------------- layout
// The reading screen, apps/client/app/index.tsx, portrait: the number, the
// sentence in a 320-point column, the story line, centred between the header
// and the chevron.
let R, WG;
const COLUMN = 320;
const WGT = { radius: 22, pad: 16, head: 10, headTracking: 2, timeSize: 11, headH: 14, timeH: 16, stack: 8 };
function wrap(value, family, weight, size, width) {
  const lines = [];
  let line = '';
  for (const word of value.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, family, weight, size) > width) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
function layout() {
  const F = Math.max(64, Math.min(AW * 0.42, AH * 0.24, 224));
  const sentence = Math.max(18, Math.min(AW * 0.045, 22)), line = sentence * 1.5;
  const words = (say('newLabel') ? `${say('newLabel')} ` : '') + say('sentence');
  const lines = wrap(words, SANS, 400, sentence, COLUMN);
  const top = 102 + 24, bottom = AH - 34 - 56, storyBox = 12 * 1.2;
  const block = 1.05 * F + 24 + lines.length * line + 18 + storyBox;
  const blockTop = (top + bottom) / 2 - block / 2;
  const mono = fontMetrics(MONO, 300);
  const sentenceTop = blockTop + 1.05 * F + 24;
  R = {
    F, sentence, line, lines, sentenceTop,
    numBase: blockTop + 1.05 * F / 2 + (mono.ascent - mono.descent) / 2 * F,
    storyY: sentenceTop + lines.length * line + 18 + 10,
  };
  // The Home Screen: a medium widget across the top, a small one below it.
  const medium = { x: 27.5, y: 72, w: 338, h: 158 }, small = { x: 27.5, y: 256, w: 158, h: 158 };
  const numeral = 69 * (medium.w / 364);
  const groupW = (textWidth('0', MONO, 300, 1) - 0.04) * numeral + 1 + textWidth('∕10', MONO, 300, 12);
  const column = medium.x + WGT.pad + groupW + 16;
  WG = { medium, small, numeral, column, colW: medium.x + medium.w - WGT.pad - column };
}

// ---------------------------------------------------------------- build
let N;
function build() {
  N = {};
  N.bgLevel = el(stage, { inset: '0' });
  N.bgLight = el(stage, { inset: '0' });

  N.phone = el(stage, { left: px(PH.x), top: px(PH.y), width: px(PH.bw), height: px(PH.bh), transformOrigin: '50% 100%' });
  N.phone.dataset.part = 'phone';
  N.shadow = el(N.phone, { left: px(-PH.bw * 0.22), top: px(PH.bh * -0.04), width: px(PH.bw * 1.44), height: px(PH.bh * 1.16), background: 'radial-gradient(closest-side, rgba(0,0,0,0.42), rgba(0,0,0,0.2) 62%, rgba(0,0,0,0))' });
  for (const [x, y, h] of [[-1.6, 98, 22], [-1.6, 134, 40], [-1.6, 184, 40], [PH.bw - 1.4, 150, 62]]) el(N.phone, { left: px(x), top: px(y), width: '3px', height: px(h), borderRadius: '1.5px', background: 'linear-gradient(90deg, #2A2A2E, #4A4A50)' });
  N.body = el(N.phone, { inset: '0', borderRadius: px(PH.r * PS + BEZ), background: '#0A0A0C', boxShadow: 'inset 0 0 0 1.3px rgba(196,196,204,0.5), inset 0 0 0 2.6px rgba(20,20,22,1), inset 0 0 0 3.4px rgba(120,120,128,0.22)' });
  N.clip = el(N.phone, { left: px(BEZ), top: px(BEZ), width: px(PH.sw), height: px(PH.sh), borderRadius: px(PH.r * PS), overflow: 'hidden', background: '#000' });
  N.scr = el(N.clip, { left: '0', top: '0', width: px(AW), height: px(AH), transformOrigin: '0 0', transform: `scale(${PS})` });
  // The Home Screen is behind the app, as on the phone: going home, the app
  // shrinks away and reveals it.
  buildHome(N.scr);
  buildReading(N.scr);
  N.status = el(N.scr, { left: '0', top: '0', width: px(AW), height: '58px' });
  N.statusTime = el(N.status, {}, say('statusTime'));
  N.statusIcons = el(N.status, {});
  N.statusIcons.innerHTML = STATUS_ICONS;
  N.island = el(N.scr, { left: px((AW - 124) / 2), top: '11px', width: '124px', height: '36px', borderRadius: '18px', background: '#000' });
  N.glare = el(N.scr, { left: '0', top: '0', width: px(AW), height: px(AH), background: 'linear-gradient(118deg, rgba(255,255,255,0.10), rgba(255,255,255,0) 34%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.04))' });

  // ---- the end card
  N.icon = el(stage, { overflow: 'hidden' });
  N.iconDash = el(N.icon, {});
  N.endWord = el(stage, {}, say('name'));
  N.endTag = el(stage, {}, say('tagline'));
  N.endStoreCap = el(stage, { borderRadius: '999px' });
  N.endStore = el(stage, {}, say('store'));
  for (const e of [N.icon, N.endWord, N.endTag, N.endStoreCap, N.endStore]) e.dataset.safe = 'end';

  // ---- captions over the phone
  N.k = {};
  for (const key of ['question', 'oneNumber', 'oneSentence', 'home']) N.k[key] = kinetic(stage, key);

  N.thumb = el(stage, { display: 'none' }, say('question'));
  N.thumb.dataset.thumb = 'question';
  N.vignette = el(stage, { inset: '0', background: 'radial-gradient(130% 90% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.4))' });
}
function buildReading(parent) {
  N.reading = el(parent, { left: '0', top: '0', width: px(AW), height: px(AH) });
  N.wordmark = el(N.reading, {}, say('wordmark'));
  N.capsule = el(N.reading, {});
  N.share = el(N.reading, { width: '24px', height: '24px' }); N.share.innerHTML = svg(24, 24, ICON.share);
  N.gear = el(N.reading, { width: '24px', height: '24px' }); N.gear.innerHTML = svg(24, 24, ICON.gear);
  N.score = el(N.reading, {}, say('score'));
  N.denom = el(N.reading, {}, '∕10');
  // The sentence, a word at a time; a "New:" label leads it in bold.
  const words = [];
  if (say('newLabel')) words.push({ w: say('newLabel'), bold: true });
  for (const w of say('sentence').split(' ')) words.push({ w });
  N.words = words.map(({ w, bold }) => ({ w, bold, e: el(N.reading, {}, w) }));
  N.storyLine = el(N.reading, {}, say('story'));
  N.chevron = el(N.reading, { width: '9px', height: '9px', borderRightStyle: 'solid', borderBottomStyle: 'solid', borderRightWidth: '1.25px', borderBottomWidth: '1.25px', transform: 'rotate(45deg)' });
  for (const e of [N.wordmark, N.score, N.denom, N.storyLine, ...N.words.map(w => w.e)]) e.dataset.safe = 'reading';
}
const WALL = 'radial-gradient(90% 55% at 10% 0%, rgba(150,178,205,0.55), transparent 70%), radial-gradient(100% 60% at 100% 100%, rgba(190,104,70,0.6), transparent 72%), linear-gradient(165deg, #2A3342, #2B2A33 50%, #3A2A26)';
const SHAPES = [
  '<circle cx="12" cy="12" r="6.5"/>', '<rect x="5.5" y="5.5" width="13" height="13" rx="3.5"/>', '<path d="M12 5.5 19 18H5z"/>',
  '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2.2"/>', '<path d="M6 8h12M6 12h12M6 16h8"/>', '<path d="M7 17 17 7M9 7h8v8"/>',
  '<path d="M12 5v14M5 12h14"/>', '<path d="M6 15c2-6 10-6 12 0"/>', '<rect x="6" y="8" width="12" height="9" rx="2"/><path d="M9 8V6.5h6V8"/>',
  '<circle cx="9" cy="12" r="3.5"/><circle cx="15" cy="12" r="3.5"/>', '<path d="M6 18V9l6-4 6 4v9z"/>', '<path d="M12 6v6l4 3"/><circle cx="12" cy="12" r="7"/>',
];
function appIcon(parent, x, y, i, label = true) {
  const e = el(parent, { left: px(x), top: px(y), width: '62px', height: '62px', borderRadius: '15px',
    background: 'linear-gradient(160deg, rgba(255,255,255,0.24), rgba(255,255,255,0.08))', boxShadow: 'inset 0 0 0 0.75px rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.88)' });
  const g = el(e, { left: '17px', top: '17px', width: '28px', height: '28px' });
  g.innerHTML = svg(28, 28, SHAPES[i % SHAPES.length], 'stroke-width="1.7"');
  if (label) el(e, { left: '13px', top: '71px', width: '36px', height: '5px', borderRadius: '2.5px', background: 'rgba(255,255,255,0.42)' });
  return e;
}
function buildHome(parent) {
  N.home = el(parent, { left: '0', top: '0', width: px(AW), height: px(AH), background: WALL });
  const spots = [[211.5, 262], [303.5, 262], [211.5, 358], [303.5, 358], ...[27.5, 119.5, 211.5, 303.5].map(x => [x, 454])];
  N.icons = spots.map(([x, y], i) => appIcon(N.home, x, y, i));
  N.dock = el(N.home, { left: '12px', top: '748px', width: px(AW - 24), height: '96px', borderRadius: '36px', background: 'rgba(255,255,255,0.16)', boxShadow: 'inset 0 0 0 0.75px rgba(255,255,255,0.28)' });
  [33.5, 121.5, 209.5, 297.5].forEach((x, i) => appIcon(N.home, x, 765, i + 8, false));
  el(N.home, { left: px((AW - 134) / 2), top: px(AH - 13), width: '134px', height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.85)' });
  // Medium, light; small, dark: each widget chooses its own appearance.
  N.medium = widget(N.home, 'medium', true);
  N.small = widget(N.home, 'small', false);
}
function widget(parent, name, medium) {
  const w = { e: el(parent, { borderRadius: px(WGT.radius), overflow: 'hidden' }) };
  w.e.dataset.box = name;
  w.head = el(w.e, {}, say('wordmark'));
  w.num = el(w.e, {}, say('score'));
  w.denom = el(w.e, {}, '∕10');
  w.time = el(w.e, {}, say('checked'));
  if (medium) w.body = el(w.e, { whiteSpace: 'normal', lineHeight: '20px', fontFamily: SANS, fontSize: '14px' });
  return w;
}

// ---------------------------------------------------------------- captions
// Words rise into place from behind their baseline and leave upward. A line
// on screen at frame 0 is simply there: the first frame is the hook.
function kinetic(parent, key) {
  const line = el(parent, {});
  return { line, words: say(key).split(' ').map(w => {
    const clip = el(line, { overflow: 'hidden' }), inner = el(clip, {}, w);
    inner.dataset.safe = key;
    return { w, clip, inner };
  }) };
}
function setKinetic(k, t, { on, base, size, weight = 700, color, x = STAGE.x, align = 0.5, stagger = 0.06, dur = 0.6, tracking = -0.028, instant = false, maxW = room(base + 0.3 * size, x) }) {
  const [inT, outT] = on;
  if (t < inT - 0.001 || t >= outT) { show(k.line, 0); return; }
  show(k.line, 1);
  const n = k.words.length, exitEach = 0.3, exitLen = exitEach + 0.03 * (n - 1);
  const fit = s => {
    const space = textWidth(' ', SANS, weight, s, tracking * s), widths = k.words.map(w => textWidth(w.w, SANS, weight, s, tracking * s));
    return { space, widths, total: widths.reduce((a, b) => a + b, 0) + space * (n - 1) };
  };
  let s = size, m = fit(s);
  if (m.total > maxW) { s *= maxW / m.total; m = fit(s); }
  let left = x - align * m.total;
  const pad = s * 0.12;
  k.words.forEach((w, i) => {
    const p = instant ? 1 : E.expo(seg(t, [inT + i * stagger, inT + i * stagger + dur]));
    const o = E.inCubic(clamp((t - (outT - exitLen) - i * 0.03) / exitEach));
    box(w.clip, left - pad, base - s * 1.08, m.widths[i] + 2 * pad, s * 1.45);
    text(w.inner, { x: pad, y: s * 1.08 + s * 1.25 * (1 - p) - s * 1.25 * o, size: s, weight, tracking: tracking * s, color, opacity: clamp(p * 2.5) * (1 - o) });
    left += m.widths[i] + m.space;
  });
}
// Two lines' words set side by side on one line, each on its own cue.
function sideBySide(t, [a, onA], [b, onB], { base, size, color }) {
  const width = (value, s) => textWidth(value, SANS, 700, s, -0.028 * s);
  const both = `${say(a)} ${say(b)}`;
  const s = Math.min(size, size * room(base + 0.3 * size, STAGE.x) / width(both, size));
  const left = STAGE.x - width(both, s) / 2, second = left + width(`${say(a)} `, s);
  setKinetic(N.k[a], t, { on: onA, base, size: s, color, x: left, align: 0, maxW: Infinity });
  setKinetic(N.k[b], t, { on: onB, base, size: s, color, x: second, align: 0, maxW: Infinity });
}

// ---------------------------------------------------------------- scenes
const BRAND = theme('brand', 'light');
const LT = theme(LEVEL, 'light'), DK = theme(LEVEL, 'dark');

function updateBackgrounds(t) {
  const light = E.inOut(seg(t, CUES.phoneOut));
  const back = E.inOut(seg(t, CUES.loop));
  N.bgLevel.style.background = stageBackground(LT, t * 0.5);
  show(N.bgLevel, 1);
  show(N.bgLight, light * (1 - back));
  if (light > 0) N.bgLight.style.background = lightStage(BRAND);
}

function updatePhone(t) {
  const exit = E.inCubic(seg(t, CUES.phoneOut));
  // It fades as it drops, so nothing it shows passes under YouTube's title.
  show(N.phone, 1 - smooth(0.1, 0.45, exit));
  if (exit >= 1) return;
  // It floats, gently; the first frame is already at rest where it lands.
  const hit = 1 + 0.015 * Math.exp(-t / 0.18) * Math.cos(TAU * t / 0.5);
  const ry = 5 * Math.sin(TAU * t / 9), rx = 2.4 * Math.sin(TAU * t / 7.3 + 0.6), ty = 3 * Math.sin(TAU * t / 4.6) + 760 * exit;
  N.phone.style.transform = `perspective(1500px) translateY(${px(ty)}) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${(8 * exit).toFixed(3)}deg) scale(${hit.toFixed(4)})`;
  updateReading(t);
  updateHome(t);
  // The status bar follows whatever is behind it.
  const onHome = smooth(CUES.home[0], CUES.home[1], t);
  const sb = labRgb(rgbMix(LT.ink, [255, 255, 255], onHome));
  N.status.style.color = css(sb);
  text(N.statusTime, { x: 81, y: 33 + fontMetrics(SANS, 600).cap * 17 / 2, size: 17, weight: 600, align: 0.5, tracking: -0.3, color: sb });
  box(N.statusIcons, AW - 32 - 78 + 6, 33 - 6.5, 78, 13);
}

function updateReading(t) {
  // Going home: the app shrinks toward the top of the screen and fades.
  const gone = E.swift(seg(t, CUES.home));
  show(N.reading, 1 - smooth(0.35, 1, gone));
  if (gone >= 1) return;
  N.reading.style.background = readingBackground(LT);
  N.reading.style.transform = `scale(${lerp(1, 0.32, gone).toFixed(4)})`;
  N.reading.style.transformOrigin = '50% 18%';
  N.reading.style.borderRadius = px(PH.r + 10 * gone);
  N.reading.style.overflow = 'hidden';
  text(N.wordmark, { x: 20, y: 80 + fontMetrics(SANS, 400).cap * 13 / 2, size: 13, tracking: 1.6, color: LT.accent });
  const gearX = AW - 44, shareX = gearX - 48;
  box(N.capsule, shareX - 28, 58, 104, 44);
  Object.assign(N.capsule.style, { borderRadius: '22px', background: 'rgba(255,255,255,0.42)', boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.07)' });
  for (const [g, x] of [[N.share, shareX], [N.gear, gearX]]) { box(g, x - 12, 80 - 12 + (g === N.share ? -2 : 0), 24, 24); g.style.color = css(LT.accent); }
  // The number with its denominator, on one baseline, centred.
  const tr = -0.055 * R.F, sw = textWidth(say('score'), MONO, 300, R.F, tr), dw = textWidth('∕10', MONO, 300, 20);
  const left = AW / 2 - (sw + 3 + dw) / 2;
  text(N.score, { x: left, y: R.numBase, size: R.F, family: MONO, weight: 300, tracking: tr, color: LT.ink });
  text(N.denom, { x: left + sw + 3, y: R.numBase, size: 20, family: MONO, weight: 300, color: LT.muted });
  // The sentence, set word by word into the lines the app's column makes.
  let i = 0;
  const each = (CUES.sentence[1] - CUES.sentence[0]) / N.words.length;
  R.lines.forEach((line, row) => {
    const parts = line.split(' ');
    const lineW = textWidth(line, SANS, 400, R.sentence);
    let x = AW / 2 - lineW / 2;
    const base = R.sentenceTop + row * R.line + R.line / 2 + fontMetrics(SANS, 400).cap * R.sentence / 2;
    for (const part of parts) {
      const w = N.words[i], start = CUES.sentence[0] + i * each;
      const p = E.cubic(seg(t, [start, start + 0.32]));
      text(w.e, { x, y: base + 6 * (1 - p), size: R.sentence, weight: w.bold ? 700 : 400, color: LT.ink, opacity: p });
      x += textWidth(`${part} `, SANS, 400, R.sentence);
      i++;
    }
  });
  const story = E.cubic(seg(t, CUES.storyLine));
  text(N.storyLine, { x: AW / 2, y: R.storyY + 4 * (1 - story), size: 12, align: 0.5, color: LT.muted, opacity: story });
  box(N.chevron, AW / 2 - 4.5, AH - 34 - 8 - 24 - 4.5, 9, 9);
  N.chevron.style.borderColor = css(LT.muted);
  show(N.chevron, 0.8 * (1 - gone));
}

function updateHome(t) {
  const on = t >= CUES.home[0] ? 1 : 0;
  show(N.home, on);
  if (!on) return;
  N.icons.forEach((e, i) => {
    const p = sp(t, CUES.home[0] + 0.05 + 0.03 * i, 0.62, 16);
    e.style.transform = `scale(${lerp(0.5, 1, clamp(p, 0, 1.2)).toFixed(4)})`;
  });
  drawWidget(N.medium, WG.medium, LT, t < CUES.medium ? 0 : sp(t, CUES.medium, 0.62, 14), true);
  drawWidget(N.small, WG.small, DK, t < CUES.small ? 0 : sp(t, CUES.small, 0.6, 15), false);
}
function drawWidget(w, r, th, p, medium) {
  show(w.e, clamp(p * 2.5));
  if (p <= 0) return;
  box(w.e, r.x, r.y, r.w, r.h);
  w.e.style.transform = `scale(${lerp(0.6, 1, p).toFixed(4)})`;
  w.e.style.background = diagonal(th);
  w.e.style.boxShadow = `0 14px 36px rgba(0,0,0,${th.dark ? 0.4 : 0.28})`;
  const capBase = (top, h, size) => top + h / 2 + fontMetrics(SANS, 400).cap * size / 2;
  text(w.head, { x: WGT.pad, y: capBase(WGT.pad, WGT.headH, WGT.head), size: WGT.head, tracking: WGT.headTracking, color: th.gradientMuted });
  text(w.time, { x: WGT.pad, y: capBase(r.h - WGT.pad - WGT.timeH, WGT.timeH, WGT.timeSize), size: WGT.timeSize, color: th.gradientMuted });
  const bodyTop = WGT.pad + WGT.headH + WGT.stack, bodyBottom = r.h - WGT.pad - WGT.timeH - WGT.stack;
  const n = WG.numeral, inkH = fontMetrics(MONO, 300).cap * n;
  // Medium: the numeral's ink spans the sentence's first three lines; small: centred.
  const base = medium ? bodyTop + 2 + 0.72 * 14 + 2 * 20 : (bodyTop + bodyBottom) / 2 + inkH / 2;
  const tr = -0.04 * n, sw = textWidth(say('score'), MONO, 300, n, tr);
  text(w.num, { x: WGT.pad, y: base, size: n, family: MONO, weight: 300, tracking: tr, color: th.ink });
  text(w.denom, { x: WGT.pad + sw + 1, y: base, size: 12, family: MONO, weight: 300, color: th.gradientMuted });
  if (!medium) return;
  // The sentence, led by its age in muted type, stepped down until it fits.
  const age = say('widgetAge'), label = say('newLabel');
  const lead = label ? `<b>${label}</b> ` : age ? `<span style="color:${css(th.gradientMuted)}">${age}</span> ` : '';
  w.body.innerHTML = `${lead}${say('sentence').replace(/&/g, '&amp;').replace(/</g, '&lt;')}`;
  w.body.style.color = css(th.ink);
  const lines = Math.floor((bodyBottom - bodyTop + 6) / 20);
  for (const step of [1, 27 / 28, 13 / 14, 25 / 28]) {
    w.body.style.fontSize = px(14 * step);
    box(w.body, WG.column - r.x, bodyTop, WG.colW, lines * 20);
    if (w.body.scrollHeight <= lines * 20 + 1) break;
  }
  w.body.style.overflow = 'hidden';
}

const END = (SAFE.y + SAFE.bottom) / 2 - 90;
function updateEnd(t) {
  const back = 1 - E.inOut(seg(t, CUES.loop));
  const iconP = t < CUES.icon[0] ? 0 : sp(t, CUES.icon[0], 0.6, 11);
  show(N.icon, clamp(iconP * 3) * back);
  if (iconP > 0) {
    const s = 112, cx = W / 2, cy = END;
    box(N.icon, cx - s / 2, cy - s / 2, s, s);
    N.icon.style.borderRadius = px(s * 0.225);
    N.icon.style.background = diagonal(BRAND, 0.45);
    N.icon.style.boxShadow = `0 ${px(s * 0.14)} ${px(s * 0.36)} rgba(40,36,30,0.22), inset 0 0 0 0.5px rgba(0,0,0,0.06)`;
    N.icon.style.transform = `translateY(${px(30 * (1 - iconP))}) rotate(${(-10 * (1 - iconP)).toFixed(3)}deg) scale(${lerp(0.5, 1, iconP).toFixed(4)})`;
    const draw = t < CUES.icon[0] + 0.12 ? 0 : Math.max(0, sp(t, CUES.icon[0] + 0.12, 0.55, 17));
    const dw = s * 352 / 1024 * draw, dh = s * 44 / 1024;
    box(N.iconDash, (s - dw) / 2, (s - dh) / 2, dw, dh);
    N.iconDash.style.background = css(BRAND.accent);
  }
  const word = E.expo(seg(t, CUES.word)), wordBase = END + 106;
  text(N.endWord, { x: W / 2, y: wordBase + 18 * (1 - word), size: 40, weight: 600, align: 0.5, tracking: -0.03 * 40, color: BRAND.ink, opacity: clamp(word * 2) * back });
  const tag = E.cubic(seg(t, CUES.tagline));
  text(N.endTag, { x: W / 2, y: wordBase + 36 + 8 * (1 - tag), size: 17, align: 0.5, color: BRAND.muted, opacity: tag * back });
  const store = E.cubic(seg(t, CUES.store));
  const size = 19, sw = textWidth(say('store'), SANS, 600, size, 0.2), y = wordBase + 112 + 6 * (1 - store);
  text(N.endStore, { x: W / 2, y, size, weight: 600, align: 0.5, tracking: 0.2, color: [255, 255, 255], opacity: store * back });
  box(N.endStoreCap, W / 2 - sw / 2 - 22, y - 29, sw + 44, 42);
  N.endStoreCap.style.background = css(BRAND.ink);
  show(N.endStoreCap, store * back);
}

function updateWords(t) {
  const head = SAFE.y + 28;
  setKinetic(N.k.question, t, { on: CUES.question, base: head, size: 24, color: LT.ink, instant: true });
  sideBySide(t, ['oneNumber', [CUES.oneNumber, CUES.numberLine[1]]], ['oneSentence', [CUES.oneSentence, CUES.numberLine[1]]], { base: head, size: 24, color: LT.ink });
  setKinetic(N.k.home, t, { on: CUES.homeLine, base: head, size: 24, color: LT.ink });
}

// ---------------------------------------------------------------- frame
function render(t) {
  show(N.thumb, 0);
  updateBackgrounds(t);
  updatePhone(t);
  updateEnd(t);
  updateWords(t);
  show(N.vignette, 1 - E.inOut(seg(t, CUES.phoneOut)) + E.inOut(seg(t, CUES.loop)));
}

// The Shorts thumbnail: the reading with its sentence down and the question
// set large, since a thumbnail is seen small in the shelf, search and grid.
function thumbnail() {
  render(THUMBNAIL.seconds);
  show(N.k.question.line, 0);
  const size = 44, lines = wrap(say('question'), SANS, 700, size, W - 60);
  N.thumb.style.whiteSpace = 'pre';
  N.thumb.textContent = lines.join('\n');
  text(N.thumb, { x: W / 2, y: 70, size, weight: 700, align: 0.5, tracking: -0.03 * size, color: LT.ink });
  N.thumb.style.lineHeight = '1.15';
  N.phone.style.transform = `translateX(${px(W / 2 - STAGE.x)}) translateY(${px(lines.length > 1 ? 40 : 0)})`;
}

window.NW = {
  ready: (async () => {
    await Promise.all(faces.map(f => f.load()));
    faces.forEach(f => document.fonts.add(f));
    await document.fonts.ready;
    layout();
    build();
    render(0);
    return { W, H, DURATION };
  })(),
  render,
  thumbnail,
};
