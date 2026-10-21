// The trailer as a pure function of time. store/scripts/render-trailer.mjs
// calls NW.render(t) for every subframe and captures the page; nothing here
// runs on a clock, so every render of the same t is the same picture.
//
// The app's colours come from the production tokens and its reading canvas is
// the four layers of public/levels.css, as in the store preview reel, whose
// colour and numeral code this repeats (../composition.js). Scores are
// illustrative and every sentence, the opening feed's included, is drawn as
// placeholder bars: nothing here is a real or invented reading or headline.
import tokens from '../../../public/tokens.js';
import { hexToOklab } from '../../../design/colors.js';
import { CUES, DOWN, HUSH, PINGS, SETTLED, bezier, feedTravel, scoreAt, seeded, spring } from './timeline.js';
import { say } from './film.js';

const W = innerWidth, H = innerHeight;
const stage = document.getElementById('stage');

// ---------------------------------------------------------------- motion
const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, [a, b]) => clamp((t - a) / (b - a));
const E = {
  expo: x => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  cubic: x => 1 - (1 - x) ** 3,
  quart: x => 1 - (1 - x) ** 4,
  inCubic: x => x ** 3,
  inQuad: x => x * x,
  inOut: x => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  emph: bezier(0.2, 0, 0, 1),
  swift: bezier(0.7, 0, 0.3, 1),
};
// Springs start at a cue and settle on 1; unclamped, so overshoot shows.
const sp = (t, start, zeta = 0.86, omega = 13) => spring(t - start, zeta, omega);
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- colour
const labCache = new Map();
const hexLab = hex => { let v = labCache.get(hex); if (!v) labCache.set(hex, v = hexToOklab(hex)); return v; };
const encode = v => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const decode = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function labRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(v => encode(clamp(v)));
}
function rgbLab(rgb) {
  const [r, g, b] = rgb.map(c => decode(c / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
// Neighbouring levels are an even perceptual step apart (design/colors.js
// samples them by OKLab arc length), so a fractional level mixes in OKLab.
const mixHex = (a, b, u) => labRgb(hexLab(a).map((v, i) => lerp(v, hexLab(b)[i], u)));
const mixRgb = (a, b, u) => (u <= 0 ? a : u >= 1 ? b : labRgb(rgbLab(a).map((v, i) => lerp(v, rgbLab(b)[i], u))));
const css = (rgb, alpha = 1) => `rgb(${rgb[0].toFixed(2)} ${rgb[1].toFixed(2)} ${rgb[2].toFixed(2)}${alpha < 1 ? ` / ${Math.max(0, alpha).toFixed(4)}` : ''})`;
const hexRgb = hex => hex.slice(1).match(/../g).map(v => parseInt(v, 16));

const KEYS = ['surface', 'ink', 'muted', 'rule', 'gradientMuted', 'start', 'center', 'end', 'accent', 'tinted', 'elevated'];
const themes = new Map();
// A level's tokens, 'brand' for the Stone brand; fractional levels mix neighbours.
function theme(level, mode = 'light') {
  const key = `${level === 'brand' ? 'b' : level.toFixed(4)}${mode}`;
  let th = themes.get(key);
  if (th) return th;
  let a, b, u;
  if (level === 'brand') [a, b, u] = [tokens.brand, tokens.brand, 0];
  else {
    const v = clamp(level, 1, 10), i = Math.min(9, Math.floor(v));
    [a, b, u] = [tokens.levels[i - 1], tokens.levels[i], v - i];
  }
  const A = a[mode], B = b[mode];
  th = { dark: mode === 'dark', glow: A.glow, wash: A.wash, veil: A.veil, primary: mixHex(a.primary, b.primary, u), companion: mixHex(a.companion, b.companion, u) };
  for (const k of KEYS) th[k] = mixHex(A[k], B[k], u);
  themes.set(key, th);
  return th;
}
function blend(x, y, u) {
  if (u <= 0) return x;
  if (u >= 1) return y;
  const th = { dark: u < 0.5 ? x.dark : y.dark, glow: lerp(x.glow, y.glow, u), wash: lerp(x.wash, y.wash, u), veil: lerp(x.veil, y.veil, u) };
  for (const k of [...KEYS, 'primary', 'companion']) th[k] = mixRgb(x[k], y[k], u);
  return th;
}
// public/levels.css, layer for layer: companion glow, primary wash, companion
// veil, and the 160-degree diagonal, over the surface.
function readingBackground(th, strength = 1) {
  const c = th.companion, p = th.primary;
  return [
    `radial-gradient(ellipse at 5% 0%, ${css(c, th.glow * strength)}, ${css(c, 0)} 62%)`,
    `radial-gradient(ellipse at 100% 100%, ${css(p, th.wash * strength)}, ${css(p, 0)} 72%)`,
    `radial-gradient(ellipse at 0% 100%, ${css(c, th.veil * strength)}, ${css(c, 0)} 60%)`,
    `linear-gradient(160deg, ${css(p, 0)} 25%, ${css(p, th.veil * strength)})`,
    css(th.surface),
  ].join(', ');
}
// The same canvas grown to fill the frame around the phone, deeper, so the
// level's colour is the whole picture and not only the screen.
function stageBackground(th) {
  const c = th.companion, p = th.primary, deep = mixRgb(p, [24, 20, 22], 0.42);
  return [
    `radial-gradient(110% 62% at 12% 0%, ${css(c, 0.95)}, ${css(c, 0)} 70%)`,
    `radial-gradient(120% 80% at 100% 100%, ${css(p, 0.9)}, ${css(p, 0)} 75%)`,
    `radial-gradient(90% 55% at 0% 100%, ${css(c, 0.35)}, ${css(c, 0)} 66%)`,
    `linear-gradient(160deg, ${css(mixRgb(c, p, 0.3))}, ${css(mixRgb(p, deep, 0.55))})`,
  ].join(', ');
}
// The brand's light, for the price and the name.
function lightStage(th) {
  const c = th.companion, p = th.primary;
  return [
    `radial-gradient(120% 70% at 12% 0%, ${css(c, 0.6)}, ${css(c, 0)} 72%)`,
    `radial-gradient(130% 85% at 100% 100%, ${css(p, 0.6)}, ${css(p, 0)} 74%)`,
    `linear-gradient(160deg, ${css(th.start)}, ${css(th.center)} 45%, ${css(th.end)})`,
  ].join(', ');
}
// Widgets and the launcher icon: three stops, top-left to bottom-right.
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
// Text boxes are a fixed 1.3 em tall, so a gradient clipped to the glyphs has
// a box to paint; this is how far below the box's top the baseline sits.
const LH = 1.3;
const baselineIn = (family, weight) => { const m = fontMetrics(family, weight); return (LH - m.ascent - m.descent) / 2 + m.ascent; };
// Measured at the size it is set: Inter's optical size axis draws small text
// wider than large, so a width measured at 1000px runs words together.
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
// Text placed by its baseline; align 0 left, 0.5 centre, 1 right.
function text(e, { x, y, size, family = SANS, weight = 400, align = 0, tracking = 0, color, opacity = 1 }) {
  e.style.fontFamily = family; e.style.fontWeight = String(weight); e.style.fontSize = px(size);
  e.style.letterSpacing = px(tracking); e.style.lineHeight = String(LH);
  e.style.left = px(x); e.style.top = px(y - baselineIn(family, weight) * size);
  e.style.transform = align ? `translateX(${-align * 100}%)` : 'none';
  if (color) e.style.color = css(color);
  show(e, opacity);
}
function mask(e, value) { e.style.webkitMaskImage = value; e.style.maskImage = value; }
const svg = (w, h, body, extra = '') => `<svg width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="position:static;display:block" ${extra}>${body}</svg>`;
const ICON = {
  // apps/client/components/app-icon.tsx and glyph.tsx, stroked on a 24-unit grid.
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
};
function glyph(parent, name, size) {
  const e = el(parent, { width: px(size), height: px(size) });
  e.innerHTML = svg(size, size, ICON[name]);
  return e;
}
const STATUS_ICONS = `<svg width="78" height="13" viewBox="0 0 78 13" style="position:static;display:block" fill="currentColor">
  <rect x="0" y="8" width="3.2" height="4.5" rx="0.9"/><rect x="4.6" y="6" width="3.2" height="6.5" rx="0.9"/><rect x="9.2" y="3.6" width="3.2" height="8.9" rx="0.9"/><rect x="13.8" y="1" width="3.2" height="11.5" rx="0.9"/>
  <path d="M30.5 3.2a11 11 0 0 1 7.7 3.1l1.2-1.2a12.7 12.7 0 0 0-17.8 0l1.2 1.2a11 11 0 0 1 7.7-3.1zm0 3.6a7.3 7.3 0 0 1 5.1 2.1l1.2-1.2a9 9 0 0 0-12.6 0l1.2 1.2a7.3 7.3 0 0 1 5.1-2.1zm0 3.6a3.6 3.6 0 0 1 2.5 1l-2.5 2.5-2.5-2.5a3.6 3.6 0 0 1 2.5-1z"/>
  <rect x="47.5" y="0.8" width="25" height="11.6" rx="3.6" fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/><rect x="49.5" y="2.8" width="21" height="7.6" rx="2"/><path d="M74 4.6v4a2.1 2.1 0 0 0 0-4z" fill-opacity="0.45"/></svg>`;

// ---------------------------------------------------------------- the phone
// The app is drawn in its own points (an iPhone's 393 × 852) and the screen
// scaled into a phone in the frame.
const AW = 393, AH = 852;
const PS = 0.63, BEZ = 8;
const PH = { sw: AW * PS, sh: AH * PS, r: 55 };
PH.bw = PH.sw + 2 * BEZ; PH.bh = PH.sh + 2 * BEZ;
PH.x = W / 2 - PH.bw / 2; PH.y = H * 0.592 - PH.bh / 2;
// A point on the screen, in the frame.
const onScreen = (x, y) => ({ x: PH.x + BEZ + x * PS, y: PH.y + BEZ + y * PS });

// ---------------------------------------------------------------- layout
// The reading screen, apps/client/app/index.tsx, portrait on this phone.
let R, WG, MONO_ADV, DASH, DIGIT_CAP;
const WGT = { radius: 22, pad: 16, head: 10, headTracking: 2, timeSize: 11, gap: 1, headH: 14, timeH: 16, stack: 8 };
function layout() {
  MONO_ADV = textWidth('0', MONO, 300, 1);
  probe.font = `300 1000px ${MONO}`;
  const d = probe.measureText('–');
  DASH = { left: -d.actualBoundingBoxLeft / 1000, right: d.actualBoundingBoxRight / 1000, top: -d.actualBoundingBoxAscent / 1000, bottom: d.actualBoundingBoxDescent / 1000 };
  DIGIT_CAP = probe.measureText('3').actualBoundingBoxAscent / 1000;
  const F = Math.max(64, Math.min(AW * 0.42, AH * 0.24, 224));
  const sentence = Math.max(18, Math.min(AW * 0.045, 22)), line = sentence * 1.5;
  // Padded by the header and 24 above, the home indicator and 56 below, and centred.
  const top = 102 + 24, bottom = AH - 34 - 56;
  const lines = 4, storyBox = 12 * 1.2;
  const block = 1.05 * F + 24 + lines * line + 18 + storyBox;
  const blockTop = (top + bottom) / 2 - block / 2;
  const mono = fontMetrics(MONO, 300);
  const sentenceTop = blockTop + 1.05 * F + 24;
  R = {
    F, line, sentenceTop,
    // The baseline inside the number's 1.05 em line box.
    numBase: blockTop + 1.05 * F / 2 + (mono.ascent - mono.descent) / 2 * F,
    bars: [306, 290, 318, 176].map((w, i) => { const bw = Math.min(w, 320, AW - 60); return { x: AW / 2 - bw / 2, y: sentenceTop + i * line + line / 2 - 4, w: bw, h: 9 }; }),
    storyY: sentenceTop + lines * line + 18 + 6,
  };
  // The Home Screen: a medium widget across the top, a small one below it.
  const medium = { x: 27.5, y: 72, w: 338, h: 158 };
  const small = { x: 27.5, y: 256, w: 158, h: 158 };
  const body = r => ({ top: r.y + WGT.pad + WGT.headH + WGT.stack, bottom: r.y + r.h - WGT.pad - WGT.timeH - WGT.stack });
  const numeral = 69 * (medium.w / 364), inkH = DIGIT_CAP * numeral;
  // Medium: the numeral's ink spans the sentence's first capital to its third baseline.
  const mb = body(medium), sLine = 20 * (medium.w / 364), sSize = 14 * (medium.w / 364);
  const sTop = (mb.top + mb.bottom) / 2 - 2 * sLine, capTop = sTop + (sLine - sSize * 1.2) / 2 + sSize * 0.97 - sSize * 0.71;
  const groupW = (MONO_ADV - 0.04) * numeral + WGT.gap + 3 * MONO_ADV * 12;
  const column = medium.x + WGT.pad + groupW + 16, colW = medium.x + medium.w - WGT.pad - column;
  WG = {
    numeral, medium, small,
    headBase: r => r.y + WGT.pad + WGT.headH / 2 + fontMetrics(SANS, 400).cap * WGT.head / 2,
    timeBase: r => r.y + r.h - WGT.pad - WGT.timeH / 2 + fontMetrics(SANS, 400).cap * WGT.timeSize / 2,
    mediumBase: capTop + inkH,
    smallBase: (body(small).top + body(small).bottom) / 2 + inkH / 2,
    bars: [0.97, 0.9, 1, 0.58].map((f, i) => ({ x: column, y: sTop + i * sLine + sLine / 2 - 3.5, w: colW * f, h: 7 })),
  };
}

// A numeral with its denominator. `drum` makes the units a rolling drum, the
// dash the app shows before a reading being the drum's first face.
function numeral(parent, drum) {
  const g = el(parent, { left: '0', top: '0' });
  const cell = list => {
    const c = el(g, { overflow: 'hidden' });
    mask(c, 'linear-gradient(to bottom, transparent, #000 19%, #000 81%, transparent)');
    return { c, faces: list.map(f => (f === '–' ? el(c, {}) : el(c, {}, f))) };
  };
  return { g, drum, tens: cell(['', '1']), units: cell(drum ? ['–', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] : [String(SETTLED)]), denom: el(g, {}, '∕10') };
}
// Lays the numeral out and rolls its drums to `value` (0 is the dash).
function setNumeral(n, { x, align, base, size, tracking, denomSize, gap, value, ink, muted, opacity = 1 }) {
  const adv = (MONO_ADV + tracking) * size;
  const tensShown = n.drum ? E.inOut(clamp(value - 9)) : 0;
  const tensW = adv * tensShown, denomW = 3 * MONO_ADV * denomSize;
  const total = tensW + adv + gap + denomW, left = x - align * total;
  show(n.g, opacity);
  if (opacity <= 0.001) return { left, total };
  const winTop = base - 1.05 * size, winH = 1.41 * size, lift = baselineIn(MONO, 300) * size;
  const roll = (cell, v, cx, w) => {
    box(cell.c, cx, winTop, Math.max(0, w + size * 0.1), winH);
    cell.c.style.display = w > 0.01 ? 'block' : 'none';
    // Faces 0.6 rad apart on a drum of radius R: at rest a neighbour sits
    // wholly outside the window, and in motion faces foreshorten over the top.
    const pitch = 1.25 * size, Rd = pitch / 0.6, baseInCell = 1.05 * size;
    cell.faces.forEach((f, i) => {
      const theta = ((i - v) * pitch) / Rd;
      if (Math.abs(theta) > 1.35) { f.style.display = 'none'; return; }
      const y = Rd * Math.sin(theta), squash = Math.cos(theta);
      const inkCentre = baseInCell + y - (DIGIT_CAP * size) / 2;
      const alpha = clamp(squash * 1.25 - 0.25);
      if (cell.faces.length === 11 && i === 0) {
        // The dash, drawn where the glyph's own ink sits.
        const top = baseInCell + y + DASH.top * size;
        box(f, DASH.left * size, top, (DASH.right - DASH.left) * size, (DASH.bottom - DASH.top) * size);
        f.style.background = css(ink);
        f.style.transformOrigin = `50% ${px(inkCentre - top)}`;
        show(f, alpha);
      } else {
        text(f, { x: 0, y: baseInCell + y, size, family: MONO, weight: 300, tracking: tracking * size, color: ink, opacity: alpha });
        f.style.transformOrigin = `0 ${px(inkCentre - (baseInCell + y) + lift)}`;
      }
      f.style.transform = `scaleY(${squash.toFixed(4)})`;
    });
  };
  roll(n.tens, tensShown, left, tensW);
  roll(n.units, n.drum ? value : 0, left + tensW, adv);
  text(n.denom, { x: left + tensW + adv + gap, y: base, size: denomSize, family: MONO, weight: 300, color: muted });
  return { left, total };
}

// ---------------------------------------------------------------- kinetic type
// Words rise into place from behind their own baseline, and leave the same
// way, upward. A line too wide for the frame is set smaller rather than broken.
function kinetic(parent, key) {
  const line = el(parent, {});
  return { line, words: say(key).split(' ').map(w => { const clip = el(line, { overflow: 'hidden' }); return { w, clip, inner: el(clip, {}, w) }; }) };
}
function setKinetic(k, t, { on, base, size, weight = 700, color, gradient, tracking = -0.028, stagger = 0.07, x = W / 2, align = 0.5, maxW = W - 56, cut = false, dur = 0.7, opacity = 1 }) {
  const [inT, outT] = on;
  if (t < inT - 0.001 || t >= outT) { show(k.line, 0); return; }
  show(k.line, opacity);
  const n = k.words.length, exitEach = 0.3, exitLen = cut ? 0 : exitEach + 0.03 * (n - 1);
  const fit = s => {
    const space = textWidth(' ', SANS, weight, s, tracking * s), widths = k.words.map(w => textWidth(w.w, SANS, weight, s, tracking * s));
    return { space, widths, total: widths.reduce((a, b) => a + b, 0) + space * (n - 1) };
  };
  let s = size, m = fit(s);
  if (m.total > maxW) { s *= maxW / m.total; m = fit(s); }
  const lineLeft = x - align * m.total, pad = s * 0.12;
  let left = lineLeft;
  k.words.forEach((w, i) => {
    const p = E.expo(seg(t, [inT + i * stagger, inT + i * stagger + dur]));
    const o = exitLen ? E.inCubic(clamp((t - (outT - exitLen) - i * 0.03) / exitEach)) : 0;
    box(w.clip, left - pad, base - s * 1.08, m.widths[i] + 2 * pad, s * 1.45);
    text(w.inner, { x: pad, y: s * 1.08 + s * 1.25 * (1 - p) - s * 1.25 * o, size: s, weight, tracking: tracking * s, color, opacity: clamp(p * 2.5) * (1 - o) });
    if (gradient) {
      Object.assign(w.inner.style, { backgroundImage: gradient, backgroundSize: `${px(m.total)} 100%`, backgroundPosition: `${px(lineLeft - left)} 0`,
        webkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', webkitTextFillColor: 'transparent' });
    }
    left += m.widths[i] + m.space;
  });
}

// ---------------------------------------------------------------- the feed
// Cards from an endless news feed, drawn the way the app draws a sentence: as
// bars. The tags are the feed's own vocabulary, not stories.
const TAGS = ['BREAKING', 'LIVE', 'JUST IN', 'UPDATE', 'DEVELOPING', 'TRENDING', 'ALERT', 'LIVE', 'BREAKING', 'WATCH'];
const AGES = ['now', '1m', '2m', '4m', '7m', '12m', '18m', '33m', '1h', '2h'];
function tagHTML(tag, x, y) {
  const label = `font:700 7.5px/13px ${SANS};letter-spacing:0.7px;white-space:pre;`;
  if (tag === 'BREAKING' || tag === 'ALERT') return `<div style="left:${x}px;top:${y}px;height:13px;padding:0 5px;border-radius:3px;background:var(--alarm);color:#fff;${label}">${tag}</div>`;
  if (tag === 'LIVE') return `<div style="left:${x}px;top:${y + 4}px;width:5px;height:5px;border-radius:3px;background:var(--alarm)"></div><div style="left:${x + 8}px;top:${y}px;color:var(--alarm);${label}">LIVE</div>`;
  if (tag === 'JUST IN') return `<div style="left:${x}px;top:${y}px;color:var(--alarm);${label}">${tag}</div>`;
  return `<div style="left:${x}px;top:${y}px;color:rgba(255,255,255,0.58);${label}">${tag}</div>`;
}
function thumbHTML(rand, x, y, w, h, r) {
  const hue = Math.floor(rand() * 360), sat = 6 + rand() * 10;
  let inner = `<div style="inset:0;background:radial-gradient(70% 60% at ${20 + rand() * 60}% ${20 + rand() * 50}%, hsl(${hue} ${sat}% 42% / 0.55), transparent 70%)"></div>`;
  if (rand() < 0.3) inner += `<div style="left:${w / 2 - 9}px;top:${h / 2 - 9}px;width:18px;height:18px;border-radius:9px;background:rgba(0,0,0,0.45)"></div><div style="left:${w / 2 - 2}px;top:${h / 2 - 4.5}px;width:0;height:0;border-style:solid;border-width:4.5px 0 4.5px 7px;border-color:transparent transparent transparent rgba(255,255,255,0.85)"></div>`;
  else if (rand() < 0.35) inner += `<div style="left:6px;top:6px;height:11px;padding:0 4px;border-radius:3px;background:var(--alarm);color:#fff;font:700 6.5px/11px ${SANS};letter-spacing:0.6px">LIVE</div>`;
  return `<div style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${r}px;overflow:hidden;background:linear-gradient(135deg, hsl(${hue} ${sat}% 27%), hsl(${(hue + 30) % 360} ${sat + 3}% 13%))">${inner}</div>`;
}
const bar = (x, y, w, alpha, h = 6) => `<div style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${h / 2}px;background:rgba(255,255,255,${alpha})"></div>`;
function feedCard(rand, w) {
  const tag = TAGS[Math.floor(rand() * TAGS.length)], age = AGES[Math.floor(rand() * AGES.length)];
  const ageHTML = y => `<div style="right:10px;top:${y}px;color:rgba(255,255,255,0.36);font:500 7.5px/13px ${SANS};white-space:pre">${age}</div>`;
  if (rand() < 0.62) {
    const th = Math.round(w * (0.5 + rand() * 0.16)), lines = rand() < 0.5 ? 2 : 3;
    let html = thumbHTML(rand, 0, 0, w, th, 0) + tagHTML(tag, 10, th + 9) + ageHTML(th + 9);
    for (let i = 0; i < lines; i++) html += bar(10, th + 30 + i * 11, (w - 20) * (i === lines - 1 ? 0.45 + rand() * 0.3 : 0.85 + rand() * 0.15), i ? 0.3 : 0.55);
    return { html, h: th + 30 + lines * 11 + 6 };
  }
  let html = thumbHTML(rand, 10, 10, 44, 44, 8) + tagHTML(tag, 64, 9) + ageHTML(9);
  html += bar(64, 30, (w - 74) * (0.85 + rand() * 0.15), 0.55) + bar(64, 41, (w - 74) * (0.4 + rand() * 0.4), 0.3);
  return { html, h: 64 };
}
const FEED = { cols: 5, cw: 150, gap: 14, cards: [], period: 0 };
const APPS = ['#B8453F', '#3D66B8', '#2E8A55', '#C2801F', '#7A4FB8', '#B84F80'];

// ---------------------------------------------------------------- worlds
let N;
function build() {
  N = {};
  // ---- backgrounds, one per part of the story
  N.bgNoise = el(stage, { inset: '0', background: `radial-gradient(90% 55% at 50% 0%, rgba(84,98,122,0.28), transparent 70%), radial-gradient(70% 50% at 50% 110%, rgba(60,40,48,0.35), transparent 70%), #07070A` });
  N.bgLevel = el(stage, { inset: '0' });
  N.bgNight = el(stage, { inset: '0' });
  N.bgLight = el(stage, { inset: '0' });
  N.aurora = el(stage, { inset: '0' });

  // ---- the feed: a tilted wall of cards, scrolling forever
  N.feedWrap = el(stage, { inset: '0', perspective: '760px', perspectiveOrigin: '50% 34%' });
  N.plane = el(N.feedWrap, { left: px(W / 2), top: px(H / 2), width: '0', height: '0', transformStyle: 'preserve-3d' });
  const rand = seeded(97);
  let period = 0;
  const columns = Array.from({ length: FEED.cols }, () => []);
  for (let c = 0; c < FEED.cols; c++) {
    let y = 0;
    while (y < 2300) {
      const { html, h } = feedCard(rand, FEED.cw);
      const e = el(N.plane, { width: px(FEED.cw), height: px(h), borderRadius: '14px', overflow: 'hidden', background: '#141418', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.055)' });
      e.innerHTML = html;
      columns[c].push({ e, c, y0: y, h, sink: rand(), speed: 0.92 + 0.16 * rand() });
      y += h + FEED.gap;
    }
    columns[c].height = y;
    period = Math.max(period, y);
  }
  FEED.cards = columns.flatMap(col => col.map(card => ({ ...card, period: col.height })));
  N.hushShade = el(stage, { inset: '0', background: '#050506' });

  // ---- notifications from other apps
  N.pings = PINGS.map(p => {
    const e = el(stage, { width: '176px', height: '42px', borderRadius: '12px', background: 'rgba(30,30,35,0.95)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 6px 14px rgba(0,0,0,0.4)' });
    const color = APPS[p.app];
    let html = `<div style="left:8px;top:8px;width:26px;height:26px;border-radius:7px;background:linear-gradient(160deg, ${color}, color-mix(in srgb, ${color} 55%, #000))"><div style="left:8px;top:8px;width:10px;height:10px;border-radius:${p.app % 2 ? 5 : 2}px;border:1.5px solid rgba(255,255,255,0.85)"></div></div>`;
    if (p.badge >= 0) html += `<div style="left:25px;top:3px;min-width:14px;height:14px;padding:0 3px;border-radius:7px;background:var(--alarm);color:#fff;text-align:center;font:700 7.5px/14px ${SANS}">${['3', '12', '47', '99+'][p.badge]}</div>`;
    html += bar(42, 12, 88, 0.6) + bar(42, 24, 118, 0.3) + `<div style="right:9px;top:6px;color:rgba(255,255,255,0.4);font:500 7px/12px ${SANS}">now</div>`;
    e.innerHTML = html;
    return { e, p };
  });
  N.scrim = el(stage, { inset: '0' });

  // ---- the clock racing through the day
  N.clock = el(stage, {});
  N.clockDigits = el(N.clock, {}, '7:00');
  N.clockAmPm = el(N.clock, {}, 'AM');

  // ---- the one that breaks through
  N.bloom = el(stage, {});
  N.ring = el(stage, { borderRadius: '50%', borderStyle: 'solid' });
  N.hero = el(stage, { borderRadius: '18px' });
  N.heroCard = el(N.hero, { inset: '1.5px', borderRadius: '16.5px', overflow: 'hidden', background: '#141418' });
  N.heroThumb = el(N.heroCard, { left: '0', top: '0', overflow: 'hidden' });
  N.heroThumbGlow = el(N.heroThumb, { inset: '0' });
  N.heroTag = el(N.heroCard, { height: '15px', borderRadius: '4px', padding: '0 6px' }, 'BREAKING');
  N.heroAge = el(N.heroCard, {}, '1m');
  N.heroBars = [0, 1, 2].map(() => el(N.heroCard, {}));

  // ---- the phone
  N.phone = el(stage, { left: px(PH.x), top: px(PH.y), width: px(PH.bw), height: px(PH.bh), transformOrigin: '50% 50%' });
  N.phone.dataset.part = 'phone';
  // A soft shadow drawn as a gradient: a blur filter here doubled the cost of every frame.
  N.shadow = el(N.phone, { left: px(-PH.bw * 0.22), top: px(PH.bh * -0.04), width: px(PH.bw * 1.44), height: px(PH.bh * 1.16), background: 'radial-gradient(closest-side, rgba(0,0,0,0.42), rgba(0,0,0,0.2) 62%, rgba(0,0,0,0))' });
  for (const [x, y, h] of [[-1.6, 98, 22], [-1.6, 134, 40], [-1.6, 184, 40], [PH.bw - 1.4, 150, 62]]) el(N.phone, { left: px(x), top: px(y), width: '3px', height: px(h), borderRadius: '1.5px', background: 'linear-gradient(90deg, #2A2A2E, #4A4A50)' });
  N.body = el(N.phone, { inset: '0', borderRadius: px(PH.r * PS + BEZ), background: '#0A0A0C', boxShadow: 'inset 0 0 0 1.3px rgba(196,196,204,0.5), inset 0 0 0 2.6px rgba(20,20,22,1), inset 0 0 0 3.4px rgba(120,120,128,0.22)' });
  N.clip = el(N.phone, { left: px(BEZ), top: px(BEZ), width: px(PH.sw), height: px(PH.sh), borderRadius: px(PH.r * PS), overflow: 'hidden', background: '#000' });
  N.scr = el(N.clip, { left: '0', top: '0', width: px(AW), height: px(AH), transformOrigin: '0 0', transform: `scale(${PS})` });
  N.flt = el(N.phone, { left: px(BEZ), top: px(BEZ), width: px(AW), height: px(AH), transformOrigin: '0 0', transform: `scale(${PS})` });
  buildHome(N.scr, N.flt);
  buildLock(N.scr);
  buildReading(N.flt);
  buildNote(N.flt);
  N.status = el(N.flt, { left: '0', top: '0', width: px(AW), height: '58px' });
  N.statusTime = el(N.status, {}, '9:41');
  N.statusIcons = el(N.status, {});
  N.statusIcons.innerHTML = STATUS_ICONS;
  N.island = el(N.flt, { left: px((AW - 124) / 2), top: '11px', width: '124px', height: '36px', borderRadius: '18px', background: '#000' });
  // Named for test/trailer.test.js, which checks what is drawn over what.
  N.island.dataset.part = 'island';
  N.status.dataset.part = 'status';
  N.glare = el(N.flt, { left: '0', top: '0', width: px(AW), height: px(AH), borderRadius: px(PH.r), background: 'linear-gradient(118deg, rgba(255,255,255,0.10), rgba(255,255,255,0) 34%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.04))', pointerEvents: 'none' });

  // ---- the price
  N.dollar = el(stage, {});
  N.dollarText = el(N.dollar, {}, say('price'));
  N.once = el(stage, {}, say('once'));
  // The scale's ten colours, a quiet signature under the price.
  N.strip = Array.from({ length: 10 }, () => el(stage, { borderRadius: '3px' }));

  // ---- the end card
  N.icon = el(stage, { overflow: 'hidden' });
  N.iconDash = el(N.icon, {});
  N.sheen = el(N.icon, {});
  N.endWord = el(stage, {}, say('name'));
  N.endTag = el(stage, {}, say('tagline'));
  N.endStoreCap = el(stage, { borderRadius: '999px' });
  N.endStore = el(stage, {}, say('store'));

  // ---- words
  N.k = {};
  for (const key of ['everyDay', 'thousands', 'comeAndGo', 'doomscroll', 'allDay', 'orSee', 'breaks', 'worldNews', 'rated', 'oneNumber', 'oneSentence',
    'home', 'notify', 'choose', 'noAds', 'noSubscription', 'noPurchases', 'focus', 'matters']) N.k[key] = kinetic(stage, key);

  N.vignette = el(stage, { inset: '0', background: 'radial-gradient(130% 90% at 50% 45%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.62))' });
  N.flash = el(stage, { inset: '0', background: '#fff' });
}

// ---------------------------------------------------------------- the screens
const HOME_ICONS = [
  // Beside the small widget, then a row, then the dock.
  ...[[211.5, 262], [303.5, 262], [211.5, 358], [303.5, 358]],
  ...[27.5, 119.5, 211.5, 303.5].map(x => [x, 454]),
];
const DOCK = [27.5 + 6, 119.5 + 2, 211.5 - 2, 303.5 - 6].map(x => [x, 765]);
const SHAPES = [
  '<circle cx="12" cy="12" r="6.5"/>', '<rect x="5.5" y="5.5" width="13" height="13" rx="3.5"/>', '<path d="M12 5.5 19 18H5z"/>',
  '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2.2"/>', '<path d="M6 8h12M6 12h12M6 16h8"/>', '<path d="M7 17 17 7M9 7h8v8"/>',
  '<path d="M12 5v14M5 12h14"/>', '<path d="M6 15c2-6 10-6 12 0"/>', '<rect x="6" y="8" width="12" height="9" rx="2"/><path d="M9 8V6.5h6V8"/>',
  '<circle cx="9" cy="12" r="3.5"/><circle cx="15" cy="12" r="3.5"/>', '<path d="M6 18V9l6-4 6 4v9z"/>', '<path d="M12 6v6l4 3"/><circle cx="12" cy="12" r="7"/>',
];
function appIcon(parent, x, y, i, label = true) {
  const e = el(parent, { left: px(x), top: px(y), width: '62px', height: '62px', borderRadius: '15px',
    background: 'linear-gradient(160deg, rgba(255,255,255,0.24), rgba(255,255,255,0.08))', boxShadow: 'inset 0 0 0 0.75px rgba(255,255,255,0.35), 0 6px 14px rgba(0,0,0,0.18)', color: 'rgba(255,255,255,0.88)' });
  const g = el(e, { left: '17px', top: '17px', width: '28px', height: '28px' });
  g.innerHTML = svg(28, 28, SHAPES[i % SHAPES.length], 'stroke-width="1.7"');
  if (label) el(e, { left: '13px', top: '71px', width: '36px', height: '5px', borderRadius: '2.5px', background: 'rgba(255,255,255,0.42)' });
  return e;
}
const WALL = 'radial-gradient(90% 55% at 10% 0%, rgba(150,178,205,0.55), transparent 70%), radial-gradient(100% 60% at 100% 100%, rgba(190,104,70,0.6), transparent 72%), linear-gradient(165deg, #2A3342, #2B2A33 50%, #3A2A26)';
// The small widget sits with the reading's frame, above the screen, so it
// can lift off the phone with the medium one rather than dim with the rest.
function buildHome(parent, above) {
  N.home = el(parent, { left: '0', top: '0', width: px(AW), height: px(AH), background: WALL });
  N.icons = HOME_ICONS.map(([x, y], i) => appIcon(N.home, x, y, i));
  N.dock = el(N.home, { left: '12px', top: '748px', width: px(AW - 24), height: '96px', borderRadius: '36px', background: 'rgba(255,255,255,0.16)', boxShadow: 'inset 0 0 0 0.75px rgba(255,255,255,0.28)' });
  N.dockIcons = DOCK.map(([x, y], i) => appIcon(N.home, x, y, i + 8, false));
  N.homeBar = el(N.home, { left: px((AW - 134) / 2), top: px(AH - 13), width: '134px', height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.85)' });
  // The small widget, in its dark appearance (each widget chooses its own).
  N.smallWrap = el(above, { left: '0', top: '0', width: px(AW), height: px(AH) });
  N.small = el(N.smallWrap, { borderRadius: px(WGT.radius), overflow: 'hidden' });
  N.small.dataset.part = N.small.dataset.box = 'small';
  N.smallHead = el(N.small, {}, say('wordmark'));
  N.smallNum = numeral(N.small, false);
  N.smallTime = el(N.small, {}, say('checked'));
}
function buildLock(parent) {
  N.lock = el(parent, { left: '0', top: '0', width: px(AW), height: px(AH) });
  N.lockWall = el(N.lock, { inset: '0' });
  N.lockTime = el(N.lock, {}, '9:41');
  N.lockButtons = [46, AW - 46].map(cx => el(N.lock, { left: px(cx - 25), top: '760px', width: '50px', height: '50px', borderRadius: '25px', background: 'rgba(255,255,255,0.14)', boxShadow: 'inset 0 0 0 0.75px rgba(255,255,255,0.18)' }));
  el(N.lock, { left: px((AW - 134) / 2), top: px(AH - 13), width: '134px', height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.85)' });
}
function buildReading(parent) {
  // The reading's frame becomes the medium widget.
  N.med = el(parent, { left: '0', top: '0', width: px(AW), height: px(AH) });
  N.frame = el(N.med, { overflow: 'hidden' });
  N.med.dataset.part = 'medium';
  N.frame.dataset.box = 'medium';
  N.frameReading = el(N.frame, { inset: '0' });
  N.frameWidget = el(N.frame, { inset: '0' });
  N.content = el(N.med, { left: '0', top: '0', width: px(AW), height: px(AH) });
  N.bars = [0, 1, 2, 3].map(() => el(N.content, {}));
  N.story = [0, 1].map(() => el(N.content, {}));
  N.storyDot = el(N.content, {}, '·');
  N.widgetTime = el(N.content, {}, say('checked'));
  N.num = numeral(N.content, true);
  N.wordmark = el(N.content, {}, say('wordmark'));
  N.capsule = el(N.content, {});
  N.share = glyph(N.content, 'share', 24);
  N.gear = glyph(N.content, 'gear', 24);
  N.chevron = el(N.content, { width: '9px', height: '9px', borderRightStyle: 'solid', borderBottomStyle: 'solid', borderRightWidth: '1.25px', borderBottomWidth: '1.25px', transform: 'rotate(45deg)' });
}
function buildNote(parent) {
  N.note = el(parent, { borderRadius: '24px', overflow: 'hidden' });
  N.note.dataset.part = N.note.dataset.box = 'notification';
  N.noteIcon = el(N.note, { left: '14px', top: '17px', width: '38px', height: '38px', borderRadius: '9px', overflow: 'hidden' });
  N.noteDash = el(N.noteIcon, {});
  N.noteTitle = el(N.note, {}, say('notification'));
  N.noteMeta = el(N.note, {}, 'now');
  N.noteBars = [0, 1].map(() => el(N.note, {}));
}

// ---------------------------------------------------------------- scenes
const BRAND = theme('brand', 'light');
const NIGHT = theme(8, 'dark');
const readingLevel = t => (t < DOWN.start + 2 ? scoreAt(t) : SETTLED);

function updateBackgrounds(t) {
  show(N.bgNoise, t < CUES.morph[1] + 0.1 ? 1 : 0);
  // The level's colour fills the frame from the drop to the lock screen.
  const levelOn = smooth(CUES.drop + 0.05, CUES.drop + 0.55, t) * (t < CUES.night[1] + 0.05 ? 1 : 0);
  show(N.bgLevel, levelOn);
  if (levelOn > 0) {
    const v = readingLevel(t), th = v >= 1 ? theme(clamp(v, 1, 10)) : blend(BRAND, theme(1), clamp(v));
    N.bgLevel.style.background = stageBackground(th);
  }
  // Dark arrives along the canvas's own 160-degree diagonal.
  const night = E.swift(seg(t, CUES.night));
  show(N.bgNight, t >= CUES.night[0] && t < CUES.light[1] + 0.05 ? 1 : 0);
  if (t >= CUES.night[0]) {
    const edge = lerp(-16, 100, night);
    mask(N.bgNight, night >= 1 ? 'none' : `linear-gradient(160deg, #000 ${edge}%, transparent ${edge + 16}%)`);
    const pulse = 1 + 0.45 * Math.exp(-Math.max(0, t - CUES.notification) / 0.5) * (t >= CUES.notification ? 1 : 0);
    const p = NIGHT.primary, c = NIGHT.companion;
    N.bgNight.style.background = [
      `radial-gradient(110% 62% at 50% 108%, ${css(p, Math.min(1, 0.78 * pulse))}, ${css(p, 0)} 72%)`,
      `radial-gradient(80% 45% at 0% 0%, ${css(c, 0.16)}, ${css(c, 0)} 70%)`,
      `radial-gradient(70% 40% at 100% 30%, ${css(p, 0.18 * pulse)}, ${css(p, 0)} 70%)`,
      '#0B0B0E',
    ].join(', ');
  }
  // The light spreads from where the price lands.
  const light = E.inOut(seg(t, CUES.light));
  show(N.bgLight, t >= CUES.light[0] ? 1 : 0);
  if (t >= CUES.light[0]) {
    N.bgLight.style.background = lightStage(BRAND);
    const r = light * Math.hypot(W, H) * 1.05;
    mask(N.bgLight, light >= 1 ? 'none' : `radial-gradient(circle at ${px(W / 2)} ${px(H * 0.4)}, #000 ${px(Math.max(0, r - 110))}, transparent ${px(r)})`);
  }
  // Two slow lights drifting behind the last words, cool and warm: the scale's two ends.
  const aurora = smooth(CUES.priceOut[0], CUES.focus[0] + 0.4, t);
  show(N.aurora, aurora);
  if (aurora > 0) {
    const u = t - CUES.priceOut[0];
    const fog = theme(1), ember = theme(10);
    N.aurora.style.background = [
      `radial-gradient(70% 42% at ${30 + 10 * Math.sin(u * 0.7)}% ${26 + 6 * Math.cos(u * 0.5)}%, ${css(fog.companion, 0.9)}, ${css(fog.companion, 0)} 70%)`,
      `radial-gradient(75% 46% at ${72 - 10 * Math.sin(u * 0.6)}% ${74 - 5 * Math.cos(u * 0.8)}%, ${css(ember.companion, 0.85)}, ${css(ember.companion, 0)} 70%)`,
    ].join(', ');
    N.aurora.style.opacity = String(aurora * 0.9);
  }
}

function updateFeed(t) {
  const on = t < CUES.sink[1] + 0.1;
  show(N.feedWrap, on ? 1 : 0);
  show(N.hushShade, 0);
  if (!on) return;
  const k = Math.min(t, HUSH) / HUSH;
  // The scatter: the feed lurches forward on "come and go".
  const lurch = E.expo(seg(t, CUES.scatter));
  const travel = feedTravel(t) + 420 * lurch;
  const jolt = Math.sin(Math.PI * seg(t, CUES.scatter)) * 3;
  const sink = seg(t, CUES.sink);
  const rx = 40 - 9 * k + 8 * E.inOut(sink), rz = -17 + 6 * k + jolt, s = 0.94 + 0.3 * E.inQuad(k);
  N.plane.style.transform = `translate3d(0, ${px(-30 - 40 * k)}, 0) rotateX(${rx.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) scale(${s.toFixed(4)})`;
  N.plane.style.setProperty('--alarm', t < HUSH ? '#F0444C' : '#55555C');
  const fadeIn = E.cubic(seg(t, CUES.feedIn));
  const x0 = -(FEED.cols * FEED.cw + (FEED.cols - 1) * FEED.gap) / 2;
  for (const card of FEED.cards) {
    const y = ((((card.y0 - travel * card.speed) % card.period) + card.period) % card.period) - card.period * 0.62;
    // Far up the wall the cards fade into the dark; the nearest leave below.
    let o = smooth(-1300, -820, y) * (1 - smooth(560, 760, y + card.h)) * fadeIn;
    let z = 0, dy = 0;
    if (t >= CUES.sink[0]) {
      const u = clamp((t - CUES.sink[0] - 0.5 * card.sink) / 0.85);
      z = -1300 * E.inQuad(u); dy = 240 * E.inQuad(u);
      o *= 1 - smooth(0.35, 1, u);
    }
    if (o <= 0.002) { card.e.style.display = 'none'; continue; }
    card.e.style.display = 'block';
    card.e.style.opacity = String(o);
    card.e.style.transform = `translate3d(${px(x0 + card.c * (FEED.cw + FEED.gap))}, ${px(y + dy)}, ${px(z)})`;
  }
  // The hush: everything stops dead and drains.
  const hush = t >= HUSH ? 0.35 + 0.35 * smooth(HUSH, HUSH + 0.6, t) : 0;
  show(N.hushShade, hush);
}

function updatePings(t) {
  const sink = seg(t, CUES.sink);
  for (const { e, p } of N.pings) {
    if (t < p.t || sink >= 1) { e.style.display = 'none'; continue; }
    const age = Math.min(t, HUSH) - p.t;
    const pop = sp(t, p.t, 0.55, 26);
    const settle = 1 - 0.42 * smooth(0.4, 2.2, age);
    const u = clamp((sink - 0.08 * p.pitch) / 0.75);
    const o = clamp(pop * 3) * settle * (1 - u) * (t >= HUSH ? 0.55 : 1);
    if (o <= 0.002) { e.style.display = 'none'; continue; }
    e.style.display = 'block';
    e.style.opacity = String(o);
    e.style.setProperty('--alarm', t < HUSH ? '#F0444C' : '#55555C');
    const x = p.x * W - 88, y = p.y * H - 21 - 7 * age - 60 * E.inQuad(u);
    e.style.transform = `translate(${px(x)}, ${px(y)}) rotate(${(p.tilt * (1 - 0.3 * u)).toFixed(2)}deg) scale(${(lerp(0.72, 1, pop) * (1 - 0.25 * u)).toFixed(4)})`;
    e.style.filter = t >= HUSH ? 'grayscale(1)' : 'none';
  }
  // A dark pool behind the words keeps them legible over the noise.
  const words = t < HUSH ? 0.85 * smooth(0.2, 0.9, t) : 0;
  show(N.scrim, words);
  N.scrim.style.background = `radial-gradient(70% 26% at 50% ${t < CUES.doomscroll[0] ? 44 : 42}%, rgba(6,6,8,0.92), rgba(6,6,8,0) 100%)`;
}

function updateClock(t) {
  const on = seg(t, [CUES.clock[0], CUES.clock[0] + 0.35]);
  const gone = smooth(HUSH + 0.1, HUSH + 0.6, t);
  if (on <= 0 || gone >= 1) { show(N.clock, 0); return; }
  show(N.clock, E.cubic(on) * (1 - gone));
  // Seven in the morning to a minute before midnight, faster and faster.
  const u = seg(Math.min(t, HUSH), [CUES.clock[0], HUSH]);
  const minutes = Math.floor(lerp(7 * 60, 23 * 60 + 59, u ** 2.2));
  const h = Math.floor(minutes / 60), m = minutes % 60;
  N.clockDigits.textContent = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`;
  N.clockAmPm.textContent = h < 12 ? 'AM' : 'PM';
  const size = 60, y = H * 0.565 + 14 * (1 - E.expo(on)) + 30 * E.inQuad(gone), tracking = -0.035 * size;
  // Tabular figures, so the clock does not shuffle sideways as it runs; the
  // digits are measured as set, since the canvas cannot set tabular figures.
  N.clockDigits.style.fontVariantNumeric = 'tabular-nums';
  const ink = t < HUSH ? [242, 242, 245] : [150, 150, 156];
  text(N.clockDigits, { x: 0, y, size, weight: 300, tracking, color: ink });
  const digitsW = N.clockDigits.getBoundingClientRect().width;
  const apW = textWidth(N.clockAmPm.textContent, SANS, 600, 15, 1);
  const x = W / 2 - (digitsW + 10 + apW) / 2;
  N.clockDigits.style.left = px(x);
  text(N.clockAmPm, { x: x + digitsW + 10, y, size: 15, weight: 600, tracking: 1, color: ink, opacity: 0.6 });
}

function updateHero(t) {
  const [h0] = CUES.hero;
  const morph = t < CUES.morph[0] ? 0 : clamp(sp(t, CUES.morph[0], 0.88, 10.5), 0, 1.02);
  const on = t >= h0 && morph < 1.02 && t < CUES.morph[1] + 0.3;
  if (!on) { [N.hero, N.bloom, N.ring].forEach(e => show(e, 0)); return; }
  const rise = E.emph(seg(t, CUES.hero));
  const glow = E.inOut(seg(t, CUES.glow));
  const ember = theme(10, 'dark'), rust = theme(8, 'dark');
  // The card, as the feed drew it, rising out of the sinking wall.
  const cw = 208, thH = 116, ch = thH + 30 + 3 * 12 + 10;
  const lift = -26 * E.inOut(seg(t, [CUES.glow[0], CUES.morph[0]]));
  let x = W / 2 - cw / 2, y = H * 0.56 - ch / 2 + lift + 40 * (1 - rise), w = cw, h = ch, r = 18;
  // At the drop the card becomes the phone's screen.
  const m = morph;
  const target = onScreen(0, 0);
  x = lerp(x, target.x, m); y = lerp(y, target.y, m); w = lerp(w, PH.sw, m); h = lerp(h, PH.sh, m); r = lerp(r, PH.r * PS, clamp(m));
  box(N.hero, x, y, w, h);
  N.hero.style.borderRadius = px(r);
  N.heroCard.style.borderRadius = px(Math.max(0, r - 1.5));
  N.hero.style.transform = `scale(${lerp(0.84, 1, rise).toFixed(4)})`;
  N.hero.style.background = glow > 0 ? `linear-gradient(140deg, ${css(ember.companion, glow)}, ${css(rust.primary, glow)} 55%, ${css(ember.primary, glow)})` : 'rgba(255,255,255,0.06)';
  N.hero.style.boxShadow = glow > 0 ? `0 0 ${px(40 * glow)} ${css(rust.primary, 0.5 * glow)}, 0 20px 50px rgba(0,0,0,0.55)` : '0 20px 50px rgba(0,0,0,0.55)';
  const contentOut = 1 - smooth(0, 0.45, m);
  show(N.hero, clamp(rise * 1.6) * (1 - smooth(0.88, 1.01, m)));
  // The card's fill gives way to the reading's white as it opens.
  N.heroCard.style.background = css(mixRgb([20, 20, 24], BRAND.surface, smooth(0.08, 0.6, m)));
  box(N.heroThumb, 0, 0, cw, thH);
  N.heroThumb.style.background = 'linear-gradient(135deg, hsl(220 8% 27%), hsl(250 10% 13%))';
  N.heroThumbGlow.style.background = `linear-gradient(135deg, ${css(ember.companion)}, ${css(rust.primary)} 55%, ${css(ember.end)})`;
  show(N.heroThumbGlow, glow);
  show(N.heroThumb, contentOut);
  Object.assign(N.heroTag.style, { background: css(mixRgb([240, 68, 76], [85, 85, 92], smooth(HUSH, HUSH + 0.3, t))), color: '#fff' });
  text(N.heroTag, { x: 12, y: thH + 21, size: 8, weight: 700, tracking: 0.8, opacity: contentOut * (1 - glow) });
  N.heroTag.style.top = px(thH + 10); N.heroTag.style.lineHeight = '15px';
  text(N.heroAge, { x: cw - 12, y: thH + 21, size: 8, weight: 500, align: 1, color: [150, 150, 158], opacity: contentOut * (1 - glow) });
  N.heroBars.forEach((b, i) => {
    box(b, 12, thH + 34 + i * 12 - (glow > 0 ? 8 * glow : 0), (cw - 24) * [0.92, 0.84, 0.5][i], 7);
    b.style.borderRadius = '3.5px';
    b.style.background = css([255, 255, 255], lerp(i ? 0.3 : 0.55, i ? 0.55 : 0.85, glow));
    show(b, contentOut);
  });
  // A warm bloom behind it, and a ring of light on the beat.
  const bloom = glow * (1 - smooth(0.4, 1, m));
  show(N.bloom, bloom);
  if (bloom > 0) {
    const bw = 520 + 80 * glow;
    box(N.bloom, W / 2 - bw / 2, H * 0.56 + lift - bw / 2, bw, bw);
    N.bloom.style.background = `radial-gradient(circle, ${css(rust.primary, 0.55)}, ${css(ember.primary, 0.22)} 38%, ${css(ember.primary, 0)} 68%)`;
  }
  const ring = seg(t, [CUES.ring, CUES.ring + 0.8]);
  show(N.ring, ring > 0 && ring < 1 ? 1 - E.inCubic(ring) : 0);
  if (ring > 0 && ring < 1) {
    const rr = lerp(110, 420, E.cubic(ring));
    box(N.ring, W / 2 - rr, H * 0.56 + lift - rr, 2 * rr, 2 * rr);
    N.ring.style.borderWidth = px(lerp(3, 0.6, ring));
    N.ring.style.borderColor = css(ember.companion);
  }
}

// The phone, its screens, and the moments its contents lift toward us.
function updatePhone(t) {
  const m0 = t < CUES.morph[0] ? 0 : clamp(sp(t, CUES.morph[0], 0.88, 10.5), 0, 1.02);
  const exit = E.inCubic(seg(t, CUES.phoneOut));
  const on = m0 > 0.5 && exit < 1;
  show(N.phone, on ? 1 : 0);
  if (!on) return;
  // The bezel arrives around the opening card; then the phone floats.
  const arrive = smooth(0.5, 0.98, m0);
  const life = t - CUES.drop, amp = smooth(0, 1.2, life);
  const ry = amp * 6.5 * Math.sin(TAU * life / 9), rx = amp * 3 * Math.sin(TAU * life / 7.3 + 0.6);
  const ty = amp * 3.5 * Math.sin(TAU * life / 4.6) + 760 * exit;
  const s = lerp(0.9, 1, E.cubic(arrive));
  N.phone.style.transform = `perspective(1500px) translateY(${px(ty)}) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${(10 * exit).toFixed(3)}deg) scale(${s.toFixed(4)})`;
  for (const e of [N.body, N.shadow, N.clip, N.flt]) e.style.opacity = String(arrive);
  N.phone.querySelectorAll(':scope > div').forEach(e => { if (e !== N.clip && e !== N.flt && e !== N.body && e !== N.shadow) e.style.opacity = String(arrive); });
  // Whatever lifts off the screen dims what stays on it.
  const lift = popAmount(t);
  N.clip.style.filter = lift > 0.01 ? `brightness(${(1 - 0.38 * lift).toFixed(3)})` : 'none';
  updateReading(t);
  updateHome(t);
  updateLock(t);
}
// How far the widgets or the notification have lifted off the screen, and
// how much the widgets grow when they have.
const LIFT = 0.2;
function popAmount(t) {
  const widgets = clamp(sp(t, CUES.pushHome[0], 0.7, 9)) * (1 - E.inOut(seg(t, [CUES.pushHome[1], CUES.night[0] + 0.1])));
  const note = clamp(sp(t, CUES.pushNote[0], 0.7, 9));
  return t < CUES.night[0] ? (t >= CUES.pushHome[0] ? widgets : 0) : (t >= CUES.pushNote[0] ? note : 0);
}

function updateReading(t) {
  const value = readingLevel(t);
  const strength = clamp(value);
  const lt = theme(clamp(value, 1, 10));
  const th = strength >= 1 ? lt : blend(BRAND, lt, strength);
  const MR = WG.medium;
  // The reading closes into the medium widget.
  const m = t < CUES.widget[0] ? 0 : clamp(sp(t, CUES.widget[0], 0.92, 8.2), 0, 1.02), mc = clamp(m);
  const goneAt = t >= CUES.night[1] ? 1 : 0;
  mask(N.med, nightMask(t, true));
  const pop = t < CUES.night[0] && t >= CUES.pushHome[0] ? popAmount(t) : 0;
  show(N.med, 1 - goneAt);
  // Lifted toward the viewer it is in front of the whole phone, island and
  // status bar included; it grows about its centre, so its top stays clear
  // of the island and its bottom of the small widget's.
  const medScale = (1 + LIFT * pop) * (1 - 0.08 * goneAt);
  N.med.style.zIndex = pop > 0.001 ? '3' : 'auto';
  N.med.style.transformOrigin = `${px(MR.x + MR.w / 2)} ${px(MR.y + MR.h / 2)}`;
  N.med.style.transform = `scale(${medScale.toFixed(4)})`;
  const fx = lerp(0, MR.x, m), fy = lerp(0, MR.y, m), fw = lerp(AW, MR.w, m), fh = lerp(AH, MR.h, m);
  box(N.frame, fx, fy, fw, fh);
  const radius = lerp(PH.r, WGT.radius, smooth(0, 0.6, mc));
  N.frame.style.borderRadius = px(radius);
  N.content.style.clipPath = m > 0 ? `inset(${px(fy)} ${px(AW - fx - fw)} ${px(AH - fy - fh)} ${px(fx)} round ${px(radius)})` : 'none';
  N.frame.style.boxShadow = mc > 0 ? `0 ${px(14 * mc + 20 * pop)} ${px(36 * mc + 30 * pop)} rgba(0,0,0,${(0.28 * mc + 0.2 * pop).toFixed(3)})` : 'none';
  N.frameReading.style.background = readingBackground(lt, strength);
  const toWidget = smooth(0.3, 0.9, mc);
  show(N.frameWidget, toWidget);
  if (toWidget > 0) N.frameWidget.style.background = diagonal(th);
  // Header chrome: the wordmark becomes the widget's; the buttons leave.
  const iconsOut = 1 - smooth(0, 0.3, mc);
  text(N.wordmark, { x: lerp(20, MR.x + WGT.pad, mc), y: lerp(80 + fontMetrics(SANS, 400).cap * 13 / 2, WG.headBase(MR), mc), size: lerp(13, WGT.head, mc),
    tracking: lerp(1.6, WGT.headTracking, mc), color: mixRgb(th.accent, th.gradientMuted, mc) });
  const gearX = AW - 44, shareX = gearX - 48;
  for (const [g, x] of [[N.share, shareX], [N.gear, gearX]]) {
    box(g, x - 12, 80 - 12 + (g === N.share ? -2 : 0), 24, 24);
    g.style.color = css(th.accent);
    show(g, iconsOut);
  }
  // iOS 26 draws Share and Settings in one glass capsule.
  show(N.capsule, iconsOut);
  box(N.capsule, shareX - 28, 58, 104, 44);
  Object.assign(N.capsule.style, { borderRadius: '22px', background: 'rgba(255,255,255,0.42)', boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.05)' });
  // The number: the dash, the roll, then into the widget, number leading.
  const nm = t < CUES.widget[0] ? 0 : clamp(sp(t, CUES.widget[0], 0.9, 10.5), 0, 1.01);
  setNumeral(N.num, {
    x: lerp(AW / 2, MR.x + WGT.pad, nm), align: lerp(0.5, 0, clamp(nm)), base: lerp(R.numBase, WG.mediumBase, nm), size: lerp(R.F, WG.numeral, clamp(nm)),
    tracking: lerp(-0.055, -0.04, clamp(nm)), denomSize: lerp(20, 12, clamp(nm)), gap: lerp(3, WGT.gap, clamp(nm)), value,
    ink: th.ink, muted: th.gradientMuted,
  });
  // The sentence, as bars; across before up, so it never crosses the number.
  N.bars.forEach((b, i) => {
    const a = R.bars[i], z = WG.bars[i];
    const grow = E.expo(seg(t, [CUES.bars[0] + i * 0.125, CUES.bars[0] + i * 0.125 + 0.55]));
    const across = t < CUES.widget[0] ? 0 : clamp(sp(t, CUES.widget[0] + 0.02 * i, 0.9, 9), 0, 1.02);
    const up = t < CUES.widget[0] ? 0 : clamp(sp(t, CUES.widget[0] + 0.1 + 0.035 * i, 0.88, 8.6), 0, 1.02);
    const bw = lerp(a.w, z.w, across) * grow, bh = lerp(a.h, z.h, up);
    const cx = lerp(a.x + a.w / 2, z.x + (z.w * grow) / 2, across);
    box(b, cx - bw / 2, lerp(a.y, z.y, up), bw, bh);
    b.style.borderRadius = px(bh / 2);
    b.style.background = css(th.ink, lerp(0.17, 0.2, up));
    show(b, clamp(grow * 2));
  });
  // The story and its age, muted, below the sentence; the widget's time instead.
  const storyIn = E.expo(seg(t, CUES.storyLine)) * (1 - smooth(0, 0.3, mc));
  const sw = [84, 40], sx = AW / 2 - (sw[0] + 14 + sw[1]) / 2;
  N.story.forEach((b, i) => {
    box(b, i ? sx + sw[0] + 14 : sx, R.storyY + 3 * (1 - storyIn) - 3, sw[i] * lerp(0.6, 1, storyIn), 6);
    b.style.borderRadius = '3px';
    b.style.background = css(th.muted, 0.32);
    show(b, storyIn);
  });
  text(N.storyDot, { x: sx + sw[0] + 7, y: R.storyY + 4.5, size: 12, align: 0.5, color: th.muted, opacity: storyIn * 0.7 });
  const tu = t < CUES.widget[0] ? 0 : clamp(sp(t, CUES.widget[0] + 0.24, 0.88, 8.6), 0, 1.02);
  text(N.widgetTime, { x: MR.x + WGT.pad, y: lerp(R.storyY + 20, WG.timeBase(MR), tu), size: WGT.timeSize, color: th.gradientMuted, opacity: smooth(0.5, 0.9, tu) });
  box(N.chevron, AW / 2 - 4.5, AH - 34 - 8 - 24 - 4.5, 9, 9);
  N.chevron.style.borderColor = css(th.muted);
  show(N.chevron, (1 - smooth(0, 0.2, mc)) * 0.8);
  // The status bar follows whatever is behind it.
  const sb = mixRgb(th.ink, [255, 255, 255], smooth(0.2, 0.7, mc));
  N.status.style.color = css(sb);
  text(N.statusTime, { x: 81, y: 33 + fontMetrics(SANS, 600).cap * 17 / 2, size: 17, weight: 600, align: 0.5, tracking: -0.3, color: sb });
  box(N.statusIcons, AW - 32 - 78 + 6, 33 - 6.5, 78, 13);
}

function updateHome(t) {
  const on = t >= CUES.widget[0] && t < CUES.night[1] + 0.1;
  show(N.home, on ? 1 : 0);
  show(N.small, 0);
  if (!on) return;
  N.icons.concat(N.dockIcons).forEach((e, i) => {
    const start = CUES.icons[0] + 0.035 * i;
    const p = t < start ? 0 : sp(t, start, 0.62, 16);
    e.style.transform = `scale(${lerp(0.4, 1, p).toFixed(4)})`;
    show(e, clamp(p * 2.5));
  });
  show(N.dock, smooth(CUES.icons[0], CUES.icons[1], t));
  // The small widget joins, in its dark appearance.
  const p = t < CUES.small ? 0 : sp(t, CUES.small, 0.6, 15);
  const pop = t < CUES.night[0] && t >= CUES.pushHome[0] ? popAmount(t) : 0;
  const gone = t >= CUES.night[1] ? 1 : 0;
  mask(N.smallWrap, nightMask(t, true));
  const S = WG.small, dk = theme(SETTLED, 'dark');
  show(N.small, clamp(p * 2.5) * (1 - gone));
  if (p <= 0) return;
  box(N.small, S.x, S.y, S.w, S.h);
  N.small.style.transformOrigin = '50% 50%';
  N.smallWrap.style.zIndex = pop > 0.001 ? '3' : 'auto';
  N.small.style.transform = `translate(${px(-6 * pop)}, ${px(10 * pop)}) scale(${(lerp(0.55, 1, p) * (1 + LIFT * pop) * (1 - 0.08 * gone)).toFixed(4)})`;
  Object.assign(N.small.style, { background: diagonal(dk), boxShadow: `0 ${px(14 + 20 * pop)} ${px(36 + 30 * pop)} rgba(0,0,0,${(0.4 + 0.15 * pop).toFixed(3)})`, outline: '1px solid rgba(255,255,255,0.07)', outlineOffset: '-1px' });
  const r = { x: 0, y: 0, w: S.w, h: S.h };
  text(N.smallHead, { x: WGT.pad, y: WG.headBase(r), size: WGT.head, tracking: WGT.headTracking, color: dk.gradientMuted });
  setNumeral(N.smallNum, { x: WGT.pad, align: 0, base: WG.smallBase - S.y, size: WG.numeral, tracking: -0.04, denomSize: 12, gap: WGT.gap, value: SETTLED, ink: dk.ink, muted: dk.gradientMuted });
  text(N.smallTime, { x: WGT.pad, y: WG.timeBase(r), size: WGT.timeSize, color: dk.gradientMuted });
}

// The lock screen's diagonal, and its inverse for what it replaces.
function nightMask(t, inverse = false) {
  const wipe = E.swift(seg(t, CUES.night)), edge = lerp(-16, 100, wipe);
  if (t < CUES.night[0]) return inverse ? 'none' : 'linear-gradient(#0000, #0000)';
  if (wipe >= 1) return inverse ? 'linear-gradient(#0000, #0000)' : 'none';
  return inverse ? `linear-gradient(160deg, transparent ${edge}%, #000 ${edge + 16}%)` : `linear-gradient(160deg, #000 ${edge}%, transparent ${edge + 16}%)`;
}
function updateLock(t) {
  const on = t >= CUES.night[0];
  show(N.lock, on ? 1 : 0);
  if (!on) { show(N.note, 0); return; }
  mask(N.lock, nightMask(t));
  const p = NIGHT.primary;
  N.lockWall.style.background = `radial-gradient(110% 55% at 50% 105%, ${css(p, 0.55)}, ${css(p, 0)} 70%), radial-gradient(80% 40% at 15% 0%, rgba(120,140,170,0.22), transparent 70%), linear-gradient(170deg, #15171D, #0E0E12 60%, #1A1210)`;
  const clockIn = E.expo(seg(t, [CUES.night[0] + 0.2, CUES.night[0] + 0.8]));
  text(N.lockTime, { x: AW / 2, y: 190 + 10 * (1 - clockIn), size: 96, weight: 600, align: 0.5, tracking: -3.5, color: [246, 246, 248], opacity: clockIn * 0.94 });
  // The notification rises into place, then lifts toward us.
  const nIn = t < CUES.notification ? 0 : sp(t, CUES.notification, 0.74, 11);
  const pop = t >= CUES.pushNote[0] ? popAmount(t) : 0;
  show(N.note, clamp(nIn * 3));
  if (nIn <= 0) return;
  const nw = AW - 32, nh = 76, nx = 16, ny = lerp(AH + 30, 600, nIn);
  box(N.note, nx, ny, nw, nh);
  N.note.style.zIndex = pop > 0.001 ? '3' : 'auto';
  N.note.style.transformOrigin = '50% 50%';
  N.note.style.transform = `translateY(${px(-44 * pop)}) scale(${(lerp(0.94, 1, clamp(nIn)) * (1 + 0.38 * pop)).toFixed(4)})`;
  Object.assign(N.note.style, { background: `rgba(${Math.round(lerp(58, 72, pop))},${Math.round(lerp(54, 66, pop))},${Math.round(lerp(56, 66, pop))},0.94)`,
    boxShadow: `inset 0 0 0 0.75px rgba(255,255,255,0.14), 0 ${px(10 + 26 * pop)} ${px(30 + 40 * pop)} rgba(0,0,0,${(0.35 + 0.25 * pop).toFixed(3)})` });
  // The app's icon: the light brand mark.
  N.noteIcon.style.background = diagonal(BRAND, 0.45);
  const dw = 38 * 352 / 1024, dh = Math.max(1.4, 38 * 44 / 1024);
  box(N.noteDash, (38 - dw) / 2, (38 - dh) / 2, dw, dh);
  N.noteDash.style.background = css(BRAND.accent);
  text(N.noteTitle, { x: 64, y: 32, size: 15, weight: 600, color: [255, 255, 255] });
  text(N.noteMeta, { x: nw - 16, y: 32, size: 13, align: 1, color: [255, 255, 255], opacity: 0.55 });
  N.noteBars.forEach((b, i) => {
    box(b, 64, 43 + i * 13, [nw - 100, nw - 160][i], 7);
    b.style.borderRadius = '3.5px';
    b.style.background = `rgba(255,255,255,${i ? 0.28 : 0.42})`;
  });
}

function updatePrice(t) {
  const on = t >= CUES.dollar - 0.02 && t < CUES.priceOut[1];
  show(N.dollar, on ? 1 : 0);
  show(N.once, 0);
  if (!on) { N.strip.forEach(e => show(e, 0)); return; }
  const out = E.inCubic(seg(t, CUES.priceOut));
  const size = 172, tracking = -0.05;
  const adv = (MONO_ADV + tracking) * size;
  const onceSize = 34, onceW = textWidth(say('once'), MONO, 300, onceSize);
  const total = 2 * adv + 10 + onceW, left = W / 2 - total / 2, base = H * 0.43;
  const slam = sp(t, CUES.dollar, 0.55, 15);
  N.dollar.style.transformOrigin = `${px(left + adv)} ${px(base - size * 0.36)}`;
  // After the slam, a slow push in, so the held frame still breathes.
  const drift = 1 + 0.035 * E.inOut(seg(t, [CUES.dollar + 0.4, CUES.priceOut[0]]));
  N.dollar.style.transform = `translateY(${px(-36 * out)}) scale(${(lerp(1.7, 1, slam) * drift * (1 - 0.06 * out)).toFixed(4)})`;
  show(N.dollar, clamp((t - CUES.dollar + 0.02) / 0.06) * (1 - out));
  text(N.dollarText, { x: left, y: base, size, family: MONO, weight: 300, tracking: tracking * size, color: BRAND.ink });
  const o = E.expo(seg(t, [CUES.once, CUES.once + 0.6]));
  text(N.once, { x: left + 2 * adv + 10, y: base + 8 * (1 - o) - 36 * out, size: onceSize, family: MONO, weight: 300, color: BRAND.muted, opacity: o * (1 - out) });
  const segW = 18, gap = 4, stripX = W / 2 - (10 * segW + 9 * gap) / 2;
  N.strip.forEach((e, i) => {
    const p = E.expo(seg(t, [CUES.once + 0.035 * i, CUES.once + 0.035 * i + 0.5]));
    box(e, stripX + i * (segW + gap), base + 44 - 36 * out, segW, 6);
    e.style.background = css(theme(i + 1).primary);
    e.style.transform = `scaleX(${p.toFixed(4)})`;
    show(e, clamp(p * 3) * (1 - out));
  });
}

function updateEnd(t) {
  const iconP = t < CUES.icon[0] ? 0 : sp(t, CUES.icon[0], 0.6, 11);
  show(N.icon, clamp(iconP * 3));
  if (iconP > 0) {
    const s = 112, cx = W / 2, cy = H * 0.385;
    box(N.icon, cx - s / 2, cy - s / 2, s, s);
    N.icon.style.borderRadius = px(s * 0.225);
    N.icon.style.background = diagonal(BRAND, 0.45);
    N.icon.style.boxShadow = `0 ${px(s * 0.14)} ${px(s * 0.36)} rgba(40,36,30,0.22), inset 0 0 0 0.5px rgba(0,0,0,0.06)`;
    N.icon.style.transform = `translateY(${px(30 * (1 - iconP))}) rotate(${(-10 * (1 - iconP)).toFixed(3)}deg) scale(${lerp(0.5, 1, iconP).toFixed(4)})`;
    // The dash is drawn out from its centre, a little past its length, then settles.
    const draw = t < CUES.icon[0] + 0.12 ? 0 : Math.max(0, sp(t, CUES.icon[0] + 0.12, 0.55, 17));
    const dw = s * 352 / 1024 * draw, dh = s * 44 / 1024;
    box(N.iconDash, (s - dw) / 2, (s - dh) / 2, dw, dh);
    N.iconDash.style.background = css(BRAND.accent);
    const sh = seg(t, CUES.sheen);
    show(N.sheen, sh > 0 && sh < 1 ? 1 : 0);
    if (sh > 0 && sh < 1) {
      box(N.sheen, lerp(-s * 1.2, s * 1.2, E.inOut(sh)), -s * 0.5, s * 0.5, s * 2);
      Object.assign(N.sheen.style, { transform: 'rotate(24deg)', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.75), rgba(255,255,255,0))', mixBlendMode: 'soft-light' });
    }
  }
  const word = E.expo(seg(t, CUES.word));
  const wordSize = 40, wordBase = H * 0.385 + 56 + 50;
  text(N.endWord, { x: W / 2, y: wordBase + 18 * (1 - word), size: wordSize, weight: 600, align: 0.5,
    tracking: lerp(0.02, -0.03, E.expo(seg(t, [CUES.word[0], CUES.word[1] + 0.4]))) * wordSize, color: BRAND.ink, opacity: clamp(word * 2) });
  const tag = E.cubic(seg(t, CUES.tagline));
  text(N.endTag, { x: W / 2, y: wordBase + 36 + 8 * (1 - tag), size: 17, align: 0.5, color: BRAND.muted, opacity: tag });
  const store = E.cubic(seg(t, CUES.store));
  const storeSize = 14, storeW = textWidth(say('store'), SANS, 600, storeSize, 0.4), storeY = H * 0.705 + 6 * (1 - store);
  text(N.endStore, { x: W / 2, y: storeY, size: storeSize, weight: 600, align: 0.5, tracking: 0.4, color: BRAND.ink, opacity: store * 0.85 });
  box(N.endStoreCap, W / 2 - storeW / 2 - 18, storeY - 23, storeW + 36, 34);
  N.endStoreCap.style.boxShadow = `inset 0 0 0 1px ${css(BRAND.ink, 0.22)}`;
  show(N.endStoreCap, store);
}

function updateWords(t) {
  const white = [244, 244, 247], ink = BRAND.ink;
  const ember = theme(10, 'dark'), rust = theme(8, 'dark');
  const warm = `linear-gradient(90deg, ${css(ember.companion)}, ${css(rust.primary)} 60%, ${css(ember.primary)})`;
  // Over the level's canvas the words take its ink.
  const lt = theme(clamp(readingLevel(t), 1, 10));
  const k = N.k;
  const mid = H * 0.43, top = H * 0.104;
  setKinetic(k.everyDay, t, { on: CUES.everyDay, base: mid - 4, size: 44, color: white });
  setKinetic(k.thousands, t, { on: CUES.thousands, base: mid + 46, size: 44, color: white });
  setKinetic(k.comeAndGo, t, { on: CUES.comeAndGo, base: mid + 20, size: 50, color: white });
  setKinetic(k.doomscroll, t, { on: CUES.doomscroll, base: H * 0.36, size: 42, color: white, cut: true });
  setKinetic(k.allDay, t, { on: CUES.allDay, base: H * 0.36 + 50, size: 42, color: white, cut: true });
  setKinetic(k.orSee, t, { on: CUES.orSee, base: H * 0.2, size: 38, color: white, weight: 600 });
  setKinetic(k.breaks, t, { on: CUES.breaks, base: H * 0.2 + 46, size: 38, gradient: warm, weight: 700 });
  setKinetic(k.worldNews, t, { on: CUES.worldNews, base: top, size: 36, color: lt.ink, weight: 700 });
  setKinetic(k.rated, t, { on: CUES.rated, base: top + 44, size: 36, color: lt.ink, weight: 700 });
  setKinetic(k.oneNumber, t, { on: CUES.oneNumber, base: top, size: 36, color: lt.ink });
  setKinetic(k.oneSentence, t, { on: CUES.oneSentence, base: top + 44, size: 36, color: lt.ink });
  setKinetic(k.home, t, { on: CUES.homeLine, base: top + 20, size: 34, color: lt.ink, stagger: 0.06 });
  setKinetic(k.notify, t, { on: CUES.notifyLine, base: top, size: 34, color: white });
  setKinetic(k.choose, t, { on: CUES.scoreLine, base: top + 40, size: 27, weight: 500, color: [215, 212, 210] });
  const list = H * 0.6;
  setKinetic(k.noAds, t, { on: [CUES.noAds, CUES.priceOut[1]], base: list, size: 27, weight: 600, color: ink, stagger: 0.05 });
  setKinetic(k.noSubscription, t, { on: [CUES.noSubscription, CUES.priceOut[1]], base: list + 42, size: 27, weight: 600, color: ink, stagger: 0.05 });
  setKinetic(k.noPurchases, t, { on: [CUES.noPurchases, CUES.priceOut[1]], base: list + 84, size: 27, weight: 600, color: ink, stagger: 0.05 });
  const deep = `linear-gradient(90deg, ${css(theme(7).primary)}, ${css(theme(10).primary)})`;
  setKinetic(k.focus, t, { on: CUES.focus, base: H * 0.44, size: 44, color: ink });
  setKinetic(k.matters, t, { on: CUES.matters, base: H * 0.44 + 52, size: 44, gradient: deep });
}

// ---------------------------------------------------------------- frame
function render(t) {
  updateBackgrounds(t);
  updateFeed(t);
  updatePings(t);
  updateClock(t);
  updateHero(t);
  updatePhone(t);
  updatePrice(t);
  updateEnd(t);
  updateWords(t);
  // The noise is cornered in dark; the rest of the film is not.
  show(N.vignette, t < CUES.morph[1] ? 1 : lerp(0.35, 0, smooth(CUES.phoneOut[0], CUES.light[1], t)));
  // A breath of light as the story opens into the reading.
  const flash = t >= CUES.drop ? Math.exp(-(t - CUES.drop) / 0.12) * 0.22 * (t < CUES.drop + 0.6 ? 1 : 0) : 0;
  show(N.flash, flash);
}

window.NW = {
  ready: (async () => {
    await Promise.all(faces.map(f => f.load()));
    faces.forEach(f => document.fonts.add(f));
    await document.fonts.ready;
    layout();
    build();
    render(0);
    return { W, H };
  })(),
  render,
};
