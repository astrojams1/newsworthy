// The app preview as a pure function of time. store/scripts/render-video.mjs
// calls NW.render(t) for every subframe and captures the page; nothing here
// runs on a clock, so every render of the same t is the same picture.
//
// Colours come from the production tokens and the reading canvas is the
// four layers of public/levels.css, so the video cannot drift from the app's
// palette. Scores are illustrative and the sentence is drawn as placeholder
// bars, as the introduction draws it: nothing here is a real or invented
// reading.
import tokens from '../../public/tokens.js';
import { hexToOklab } from '../../design/colors.js';
import { CUES, DOWN, UP_STEPS, scoreAt, spring, bezier } from './timeline.js';
import { say } from './reel.js';

const query = new URLSearchParams(location.search);
const IOS = query.get('platform') !== 'android';
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
  inOut: x => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  emph: bezier(0.2, 0, 0, 1),
  swift: bezier(0.7, 0, 0.3, 1),
};
// Springs start at a cue and settle on 1; unclamped, so overshoot shows.
const sp = (t, start, zeta = 0.86, omega = 13) => spring(t - start, zeta, omega);
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };

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
function theme(level, mode) {
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
// Widgets and the launcher icon: three stops, top-left to bottom-right.
// `mirrored` is for a face seen from behind, which reads the right way once turned.
const diagonal = (th, middle = 0.5, mirrored = false) =>
  `linear-gradient(to bottom ${mirrored ? 'left' : 'right'}, ${css(th.start)}, ${css(th.center)} ${middle * 100}%, ${css(th.end)})`;

// ---------------------------------------------------------------- type
const MONO = "'NW Mono'", SANS = "'NW Sans'";
const faces = [new FontFace('NW Mono', 'url(./fonts/roboto-mono-latin-300-normal.woff2)', { weight: '300' })];
if (IOS) faces.push(new FontFace('NW Sans', 'url(./fonts/inter-latin-opsz-normal.woff2)', { weight: '100 900' }));
else faces.push(new FontFace('NW Sans', 'url(./fonts/roboto-latin-400-normal.woff2)', { weight: '400' }),
  new FontFace('NW Sans', 'url(./fonts/roboto-latin-500-normal.woff2)', { weight: '500' }));
const probe = document.createElement('canvas').getContext('2d');
const metrics = new Map();
function fontMetrics(family, weight) {
  const key = family + weight;
  if (!metrics.has(key)) {
    probe.font = `${weight} 1000px ${family}`;
    const m = probe.measureText('H');
    // With line-height 0 the baseline sits (ascent - descent) / 2 below the box top.
    metrics.set(key, { shift: (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2000, cap: m.actualBoundingBoxAscent / 1000 });
  }
  return metrics.get(key);
}
// Measured at the size it is set: Inter's optical size axis draws small text
// wider than large, so a width measured at 1000px runs words together.
function textWidth(text, family, weight, size, tracking = 0) {
  probe.font = `${weight} ${size}px ${family}`;
  return probe.measureText(text).width + tracking * text.length;
}

// ---------------------------------------------------------------- platform
const SEMI = IOS ? 600 : 500;
// Every line on screen comes from store/video/reel.js, which names its source.
const line = key => say(key, IOS ? 'ios' : 'android');
const P = IOS ? {
  status: { h: 58, time: { x: 81, y: 33, size: 17 } }, nav: 80, header: 102, bottom: 34,
  wordmark: { x: 20, size: 13, tracking: 1.6 },
  widget: { radius: 22, pad: 16, head: 10, headTracking: 2, time: '9:37 AM', timeSize: 11, gap: 1, headH: 14, timeH: 16, stack: 8 },
  denom: 20,
  title: 27, sub: 19, notifTop: 60, sheetInset: 22,
} : {
  status: { h: 30, time: { x: 30, y: 16, size: 14 } }, nav: 56, header: 84, bottom: 24,
  wordmark: { x: 20, size: 13, tracking: 1.6 },
  widget: { radius: 20, pad: 12, head: 10, headTracking: 1.8, time: 'Checked 9:37 AM', timeSize: 10, gap: 2, headH: 14, timeH: 14, stack: 8 },
  denom: 20,
  title: 26, sub: 18, notifTop: 40, sheetInset: 20,
};

// ---------------------------------------------------------------- layout
let L, MONO_ADV, DASH, DIGIT_CAP;
function layout() {
  MONO_ADV = textWidth('0', MONO, 300, 1);
  probe.font = `300 1000px ${MONO}`;
  const d = probe.measureText('–');
  DASH = { left: -d.actualBoundingBoxLeft / 1000, right: d.actualBoundingBoxRight / 1000, top: -d.actualBoundingBoxAscent / 1000, bottom: d.actualBoundingBoxDescent / 1000 };
  DIGIT_CAP = probe.measureText('3').actualBoundingBoxAscent / 1000;
  const mono = fontMetrics(MONO, 300);
  // The reading screen (apps/client/app/index.tsx), portrait.
  const F = Math.max(64, Math.min(W * 0.42, H * 0.24, 224));
  const sentence = Math.max(18, Math.min(W * 0.045, 22)), line = sentence * 1.5;
  const top = P.header + 24, bottom = H - (P.bottom + 32) - 56;
  const lines = 4, timeBox = 12 * 1.2;
  const block = 1.05 * F + 24 + lines * line + 18 + timeBox;
  const blockTop = (top + bottom) / 2 - block / 2;
  // Baseline inside a 1.05em line box.
  const numBase = blockTop + (1.05 / 2 + mono.shift) * F;
  const sentenceTop = blockTop + 1.05 * F + 24;
  const reading = {
    F, numBase, sentenceTop, line,
    bars: [306, 290, 318, 176].map((w, i) => ({ x: W / 2 - Math.min(w, 320, W - 60) / 2, y: sentenceTop + i * line + line / 2 + 1.5 - 5.5, w: Math.min(w, 320, W - 60), h: 11 })),
    timeBase: sentenceTop + lines * line + 18 + 11.5,
  };
  // Home Screen widgets: medium above small, the pair centred a little high.
  const mw = Math.min(364, W - 2 * 36), sw = Math.round(mw * 170 / 364), mh = sw, gap = 22;
  const pairTop = H * 0.475 - (mh + gap + sw) / 2;
  const medium = { x: (W - mw) / 2, y: pairTop, w: mw, h: mh };
  const small = { x: medium.x, y: pairTop + mh + gap, w: sw, h: sw };
  const wg = P.widget;
  const body = r => ({ top: r.y + wg.pad + wg.headH + wg.stack, bottom: r.y + r.h - wg.pad - wg.timeH - wg.stack });
  const numeral = 69 * (mw / 364);
  const inkH = DIGIT_CAP * numeral;
  // Medium: the numeral's ink spans the sentence's first capital to its third baseline.
  const mb = body(medium), sLine = 20 * (mw / 364), sSize = 14 * (mw / 364);
  const sTop = (mb.top + mb.bottom) / 2 - 2 * sLine, capTop = sTop + (sLine - sSize * 1.2) / 2 + sSize * 0.97 - sSize * 0.71;
  const groupW = (MONO_ADV - 0.04) * numeral + wg.gap + 3 * MONO_ADV * 12;
  const column = medium.x + wg.pad + groupW + 16;
  const colW = medium.x + medium.w - wg.pad - column;
  const widget = {
    numeral, medium, small,
    headBase: r => r.y + wg.pad + wg.headH / 2 + fontMetrics(SANS, 400).cap * wg.head / 2,
    timeBase: r => r.y + r.h - wg.pad - wg.timeH / 2 + fontMetrics(SANS, 400).cap * wg.timeSize / 2,
    mediumBase: capTop + inkH,
    smallBase: (body(small).top + body(small).bottom) / 2 + inkH / 2,
    bars: [0.97, 0.9, 1, 0.58].map((f, i) => ({ x: column, y: sTop + i * sLine + sLine / 2 + 1 - 4, w: colW * f, h: 8 })),
  };
  // The 9:16 frame is shorter, so its line sits lower to clear the reading.
  const titleBase = H * (IOS ? 0.815 : 0.865);
  L = { reading, widget, titleBase };
}

// ---------------------------------------------------------------- dom
function el(parent, style = {}, text) {
  const e = document.createElement('div');
  Object.assign(e.style, style);
  if (text !== undefined) { e.textContent = text; e.className = 't'; }
  parent.appendChild(e);
  return e;
}
const px = v => `${v}px`;
function box(e, x, y, w, h) { e.style.left = px(x); e.style.top = px(y); e.style.width = px(w); e.style.height = px(h); }
function show(e, opacity) { e.style.display = opacity <= 0.001 ? 'none' : 'block'; e.style.opacity = String(clamp(opacity)); }
// Text placed by its baseline; align 0 left, 0.5 centre, 1 right.
function text(e, { x, y, size, family = SANS, weight = 400, align = 0, tracking = 0, color, opacity = 1 }) {
  const m = fontMetrics(family, weight);
  e.style.fontFamily = family; e.style.fontWeight = String(weight); e.style.fontSize = px(size);
  e.style.letterSpacing = px(tracking);
  e.style.left = px(x); e.style.top = px(y - m.shift * size);
  e.style.transform = align ? `translateX(${-align * 100}%)` : 'none';
  if (color) e.style.color = css(color);
  show(e, opacity);
}
const ICON = {
  // apps/client/components/app-icon.tsx and glyph.tsx, stroked on a 24-unit grid.
  share: IOS ? '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>'
    : '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
};
function glyph(parent, name, size, stroke = 1.6) {
  const e = el(parent, { width: px(size), height: px(size) });
  e.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" style="position:static;display:block">${ICON[name]}</svg>`;
  return e;
}

// A numeral with its denominator. `drum` makes each digit a rolling drum,
// the dash the app shows before a reading being the drum's first face.
function numeral(parent, drum) {
  const g = el(parent, { left: '0', top: '0' });
  const cell = faces => {
    const c = el(g, { overflow: 'hidden' });
    mask(c, 'linear-gradient(to bottom, transparent, #000 19%, #000 81%, transparent)');
    return { c, faces: faces.map(f => (f === '–' ? el(c, {}) : el(c, {}, f))) };
  };
  return { g, drum, tens: cell(['', '1']), units: cell(drum ? ['–', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] : ['3']), denom: el(g, {}, '∕10') };
}
// Lays the numeral out and rolls its drums to `value` (0 is the dash).
// `digits: false` leaves only the denominator, for the moment before the
// splash's dash has landed in the drum.
function setNumeral(n, { x, align, base, size, tracking, denomSize, gap, value, ink, muted, opacity = 1, digits = true }) {
  const adv = (MONO_ADV + tracking) * size;
  const tensShown = n.drum ? E.inOut(clamp(value - 9)) : 0;
  const tensW = adv * tensShown;
  const denomW = 3 * MONO_ADV * denomSize;
  const total = tensW + adv + gap + denomW;
  const left = x - align * total;
  const result = { left, total, denomW };
  show(n.g, opacity);
  if (opacity <= 0.001) return result;
  const winTop = base - 1.05 * size, winH = 1.41 * size;
  const roll = (cell, v, cx, w) => {
    box(cell.c, cx, winTop, Math.max(0, w + size * 0.1), winH);
    cell.c.style.display = digits && w > 0.01 ? 'block' : 'none';
    // Faces 0.6 rad apart on a drum of radius R: at rest a neighbour sits
    // wholly outside the window, and in motion faces foreshorten over the top.
    const pitch = 1.25 * size, R = pitch / 0.6, baseInCell = 1.05 * size;
    cell.faces.forEach((f, i) => {
      const theta = ((i - v) * pitch) / R;
      if (Math.abs(theta) > 1.35) { f.style.display = 'none'; return; }
      const y = R * Math.sin(theta), squash = Math.cos(theta);
      const inkCentre = baseInCell + y - (DIGIT_CAP * size) / 2;
      f.style.display = 'block';
      f.style.opacity = String(clamp(squash * 1.25 - 0.25));
      if (cell.faces.length === 11 && i === 0) {
        // The dash, drawn where the glyph's own ink sits.
        box(f, DASH.left * size, baseInCell + y + DASH.top * size, (DASH.right - DASH.left) * size, (DASH.bottom - DASH.top) * size);
        f.style.background = css(ink);
        f.style.transformOrigin = `50% ${px(inkCentre - (baseInCell + y + DASH.top * size))}`;
      } else {
        text(f, { x: 0, y: baseInCell + y, size, family: MONO, weight: 300, tracking: tracking * size, color: ink, opacity: f.style.opacity });
        f.style.transformOrigin = `0 ${px(inkCentre - (baseInCell + y) + fontMetrics(MONO, 300).shift * size)}`;
      }
      f.style.transform = `scaleY(${squash.toFixed(4)})`;
    });
  };
  roll(n.tens, tensShown, left, tensW);
  roll(n.units, n.drum ? value : 0, left + tensW, adv);
  text(n.denom, { x: left + tensW + adv + gap, y: base, size: denomSize, family: MONO, weight: 300, color: muted });
  return result;
}

// Words that rise into place from behind their own baseline.
function superLine(parent, words) {
  const line = el(parent, {});
  return { line, words: words.split(' ').map(w => { const clip = el(line, { overflow: 'hidden' }); return { w, clip, inner: el(clip, {}, w) }; }) };
}
function setSuper(s, { t, cue, base, size, weight, color, tracking = -0.012, stagger = 0.045, exit }) {
  const inT = cue[0], outT = exit ?? cue[1];
  const out = E.inCubic(seg(t, [outT - 0.3, outT]));
  show(s.line, 1 - out);
  if (t < inT - 0.01 || out >= 1) { s.line.style.display = 'none'; return; }
  s.line.style.transform = `translateY(${px(-10 * out)})`;
  const space = textWidth(' ', SANS, weight, size, tracking * size);
  const widths = s.words.map(w => textWidth(w.w, SANS, weight, size, tracking * size));
  let x = W / 2 - (widths.reduce((a, b) => a + b, 0) + space * (widths.length - 1)) / 2;
  s.words.forEach((w, i) => {
    const p = E.expo(seg(t, [inT + i * stagger, inT + i * stagger + 0.7]));
    box(w.clip, x - 4, base - size * 1.05, widths[i] + 8, size * 1.4);
    text(w.inner, { x: 4, y: size * 1.05 + size * 1.2 * (1 - p), size, weight, tracking: tracking * size, color, opacity: clamp(p * 3) });
    x += widths[i] + space;
  });
}

// ---------------------------------------------------------------- worlds
// Two copies of the scene, light and dark. The appearance change is a wipe
// between them, and the end card's light spreads back over the dark one.
function world(mode) {
  const root = el(stage, {}); root.className = 'world';
  const w = { mode, root };
  w.home = el(root, { inset: '0', width: px(W), height: px(H) });
  w.warm = el(root, { width: px(W), height: px(H) });
  w.endBg = el(root, { width: px(W), height: px(H) });
  // The small widget sits under the medium one until it slides out.
  w.small = el(root, {});
  w.smallFrame = el(w.small, { overflow: 'hidden' });
  w.smallHead = el(w.small, {}, line('wordmark'));
  w.smallNum = numeral(w.small, false);
  w.smallTime = el(w.small, {}, P.widget.time);
  w.med = el(root, {});
  w.frame = el(w.med, { overflow: 'hidden' });
  w.frameReading = el(w.frame, { inset: '0' });
  w.frameSplash = el(w.frame, { inset: '0' });
  w.frameWidget = el(w.frame, { inset: '0' });
  // The screen's contents, clipped to the frame while it shrinks.
  w.content = el(w.med, { left: '0', top: '0', width: px(W), height: px(H) });
  w.bars = [0, 1, 2, 3].map(() => el(w.content, {}));
  w.checked = el(w.content, {}, line('checked'));
  w.widgetTime = el(w.content, {}, P.widget.time);
  w.num = numeral(w.content, true);
  w.wordmark = el(w.content, {}, line('wordmark'));
  w.capsule = el(w.content, {});
  w.share = glyph(w.content, 'share', 24);
  w.gear = glyph(w.content, 'gear', 24);
  w.dash = el(root, {});
  // Under the notification, which slides down over it.
  w.status = el(root, { width: px(W), height: px(P.status.h) });
  w.clock = el(w.status, {}, '9:41');
  w.statusIcons = el(w.status, {});
  w.statusIcons.innerHTML = statusIcons();
  // Notifications: the settings group, then the notification it produces.
  w.card = el(root, { overflow: 'hidden', borderStyle: 'solid', borderWidth: '1px' });
  w.row1 = el(w.card, {}, line('alerts'));
  w.track = el(w.card, {});
  w.thumb = el(w.track, {});
  w.rule = el(w.card, {});
  w.row2 = el(w.card, {}, line('threshold'));
  w.value = el(w.card, {}, line('thresholdValue'));
  w.chevron = glyph(w.card, 'chevron', 20);
  w.note = el(root, { borderStyle: 'solid', borderWidth: '1px' });
  w.noteTitle = el(root, {}, line('notification'));
  w.noteMeta = el(root, {}, IOS ? 'now' : 'Newsworthy · now');
  w.noteBars = [0, 1].map(() => el(root, {}));
  // The launcher icon, which carries the notification and ends the film.
  w.icon = el(root, { overflow: 'hidden' });
  w.iconDash = el(w.icon, {});
  w.sheen = el(w.icon, {});
  w.endWord = el(root, { overflow: 'hidden' });
  w.endWordText = el(w.endWord, {}, line('name'));
  w.endTag = el(root, {}, line('tagline'));
  w.s1 = superLine(root, line('s1'));
  w.s2a = superLine(root, line('s2a'));
  w.s2b = superLine(root, line('s2b'));
  w.s3 = superLine(root, line('s3'));
  w.s4 = superLine(root, line('s4'));
  w.s4b = superLine(root, line('s4b'));
  return w;
}
function statusIcons() {
  if (IOS) return `<svg width="78" height="13" viewBox="0 0 78 13" style="position:static;display:block" fill="currentColor">
    <rect x="0" y="8" width="3.2" height="4.5" rx="0.9"/><rect x="4.6" y="6" width="3.2" height="6.5" rx="0.9"/><rect x="9.2" y="3.6" width="3.2" height="8.9" rx="0.9"/><rect x="13.8" y="1" width="3.2" height="11.5" rx="0.9"/>
    <path d="M30.5 3.2a11 11 0 0 1 7.7 3.1l1.2-1.2a12.7 12.7 0 0 0-17.8 0l1.2 1.2a11 11 0 0 1 7.7-3.1zm0 3.6a7.3 7.3 0 0 1 5.1 2.1l1.2-1.2a9 9 0 0 0-12.6 0l1.2 1.2a7.3 7.3 0 0 1 5.1-2.1zm0 3.6a3.6 3.6 0 0 1 2.5 1l-2.5 2.5-2.5-2.5a3.6 3.6 0 0 1 2.5-1z"/>
    <rect x="47.5" y="0.8" width="25" height="11.6" rx="3.6" fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/><rect x="49.5" y="2.8" width="21" height="7.6" rx="2"/><path d="M74 4.6v4a2.1 2.1 0 0 0 0-4z" fill-opacity="0.45"/></svg>`;
  return `<svg width="58" height="14" viewBox="0 0 58 14" style="position:static;display:block" fill="currentColor">
    <path d="M8 13 0.6 5.2a10.6 10.6 0 0 1 14.8 0z"/><path d="M20 13 30 2v11z"/><rect x="42" y="1" width="7.2" height="12.4" rx="1.4"/><rect x="44.1" y="0" width="3" height="1.6" rx="0.5"/></svg>`;
}

// ---------------------------------------------------------------- scenes
const HOME = { light: hexRgb('#E7E6E2'), dark: hexRgb('#0E0E11') };
const SPLASH = { light: hexRgb(tokens.brand.light.tinted), dark: hexRgb(tokens.brand.dark.tinted) };

function readingLevel(t) {
  if (t < CUES.dashLift[1]) return 0;
  return t < DOWN.start + 2 ? scoreAt(t) : 3;
}

function update(w, t) {
  const mode = w.mode;
  const R = L.reading, WG = L.widget, wg = P.widget;
  const value = readingLevel(t);
  const brand = theme('brand', mode);
  // Before a reading the app wears the brand and a neutral canvas; the
  // level's colours arrive with the first number.
  const strength = clamp(value);
  const lt = theme(clamp(value, 1, 10), mode);
  const th = strength >= 1 ? lt : blend(brand, lt, strength);

  // ---- canvas layers
  w.home.style.background = css(HOME[mode]);
  const warm = E.inOut(seg(t, CUES.warm));
  show(w.warm, warm);
  if (warm > 0) w.warm.style.background = readingBackground(theme(8, mode));
  // The end card's canvas belongs to the light world alone; the dark one
  // keeps its warmth until the light has spread over it.
  const endIn = mode === 'light' && t >= CUES.reveal[0] ? 1 : 0;
  show(w.endBg, endIn);
  if (endIn) w.endBg.style.background = readingBackground(brand);

  // ---- the reading screen, which becomes the medium widget
  const m = t < CUES.morph[0] ? 0 : clamp(sp(t, CUES.morph[0], 0.92, 8.2), 0, 1.02);
  const mc = clamp(m);
  const MR = WG.medium;
  const fx = lerp(0, MR.x, m), fy = lerp(0, MR.y, m), fw = lerp(W, MR.w, m), fh = lerp(H, MR.h, m);
  // The widgets recede upward, out of the way of what comes next.
  const out = E.inOut(seg(t, CUES.widgetsOut));
  const medScale = 1 - 0.1 * out, medShift = -40 * out;
  w.med.style.transformOrigin = `${px(MR.x + MR.w / 2)} ${px(MR.y + MR.h / 2)}`;
  w.med.style.transform = `translateY(${px(medShift)}) scale(${medScale})`;
  w.med.style.filter = out > 0 ? `blur(${px(8 * out)})` : 'none';
  show(w.med, 1 - out);
  box(w.frame, fx, fy, fw, fh);
  const radius = lerp(0, wg.radius, smooth(0, 0.25, mc));
  w.frame.style.borderRadius = px(radius);
  w.content.style.clipPath = m > 0 ? `inset(${px(fy)} ${px(W - fx - fw)} ${px(H - fy - fh)} ${px(fx)} round ${px(radius)})` : 'none';
  w.frame.style.boxShadow = mc > 0 ? `0 ${px(14 * mc)} ${px(36 * mc)} rgba(0,0,0,${(th.dark ? 0.45 : 0.16) * mc}), 0 1px 3px rgba(0,0,0,${0.08 * mc})` : 'none';
  w.frame.style.outline = th.dark && mc > 0.5 ? '1px solid rgba(255,255,255,0.06)' : 'none';
  w.frame.style.outlineOffset = '-1px';
  w.frameReading.style.background = readingBackground(lt, strength);
  const splash = 1 - E.inOut(seg(t, CUES.dashLift));
  show(w.frameSplash, splash);
  if (splash > 0) w.frameSplash.style.background = css(SPLASH[mode]);
  const toWidget = smooth(0.3, 0.9, mc);
  show(w.frameWidget, toWidget);
  if (toWidget > 0) w.frameWidget.style.background = diagonal(th);

  // ---- header chrome
  const chrome = seg(t, CUES.chrome);
  const iconsOut = 1 - smooth(0, 0.3, mc);
  const wmTrack = lerp(lerp(8, P.wordmark.tracking, E.expo(chrome)), wg.headTracking, mc);
  const headBase = lerp(P.nav + fontMetrics(SANS, 400).cap * P.wordmark.size / 2, WG.headBase(MR), mc);
  text(w.wordmark, { x: lerp(P.wordmark.x, MR.x + wg.pad, mc), y: headBase, size: lerp(P.wordmark.size, wg.head, mc), tracking: wmTrack,
    color: mixRgb(th.accent, th.ink, mc), opacity: E.cubic(chrome) });
  const iconIn = E.expo(seg(t, [CUES.chrome[0] + 0.1, CUES.chrome[1] + 0.2]));
  const gearX = W - (IOS ? 44 : 40), shareX = gearX - 48;
  for (const [g, x] of [[w.share, shareX], [w.gear, gearX]]) {
    box(g, x - 12, P.nav - 12 + (IOS && g === w.share ? -2 : 0), 24, 24);
    g.style.color = css(th.accent);
    g.style.transform = `scale(${lerp(0.86, 1, iconIn)})`;
    show(g, iconIn * iconsOut);
  }
  // iOS 26 draws Share and Settings in one glass capsule.
  show(w.capsule, IOS ? iconIn * iconsOut : 0);
  if (IOS) {
    box(w.capsule, shareX - 24 - 4, P.nav - 22, 96 + 8, 44);
    Object.assign(w.capsule.style, { borderRadius: '22px', background: th.dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.42)',
      boxShadow: th.dark ? 'inset 0 0 0 0.5px rgba(255,255,255,0.14)' : 'inset 0 0 0 0.5px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.05)' });
  }

  // ---- the splash dash, which becomes the reading's dash
  // Drawn out from its centre, a little past its length, then settling.
  const draw = t < CUES.dashDraw[0] ? 0 : Math.max(0, sp(t, CUES.dashDraw[0], 0.55, 17));
  const lift = E.emph(seg(t, CUES.dashLift));
  const landed = t >= CUES.dashLift[1];
  const denomIn = E.expo(seg(t, [CUES.dashLift[0] + 0.25, CUES.dashLift[1] + 0.35]));
  // The number leads the morph; the sentence follows, across before up, so
  // the two never cross.
  const nm = t < CUES.morph[0] ? 0 : clamp(sp(t, CUES.morph[0], 0.9, 10.5), 0, 1.01);
  const group = setNumeral(w.num, {
    x: lerp(W / 2, MR.x + wg.pad, nm), align: lerp(0.5, 0, clamp(nm)), base: lerp(R.numBase, WG.mediumBase, nm), size: lerp(R.F, WG.numeral, clamp(nm)),
    tracking: lerp(-0.055, -0.04, clamp(nm)), denomSize: lerp(P.denom, 12, clamp(nm)), gap: lerp(3, wg.gap, clamp(nm)), value,
    ink: th.ink, muted: th.gradientMuted, opacity: denomIn > 0 ? 1 : 0, digits: landed,
  });
  // The denominator is wiped in beside the arriving dash.
  w.num.denom.style.clipPath = denomIn >= 1 ? 'none' : `inset(-60px ${px((1 - denomIn) * group.denomW + 2)} -60px -2px)`;
  // The splash's mark: 80pt image, dash 352/1024 wide and 44/1024 tall.
  const sw0 = 80 * 352 / 1024, sh0 = 80 * 44 / 1024;
  const dashEnd = { x: group.left + DASH.left * R.F, y: R.numBase + DASH.top * R.F, w: (DASH.right - DASH.left) * R.F, h: (DASH.bottom - DASH.top) * R.F };
  if (t < CUES.dashLift[1] && t >= CUES.dashDraw[0]) {
    const cx = lerp(W / 2, dashEnd.x + dashEnd.w / 2, lift), cy = lerp(H / 2, dashEnd.y + dashEnd.h / 2, lift) - 26 * Math.sin(Math.PI * lift);
    const dw = lerp(sw0 * draw, dashEnd.w, lift), dh = lerp(sh0, dashEnd.h, lift);
    box(w.dash, cx - dw / 2, cy - dh / 2, dw, dh);
    w.dash.style.background = css(mixRgb(brand.accent, th.ink, lift));
    w.dash.style.borderRadius = px(lerp(0.4, 0, lift));
    show(w.dash, 1);
  } else show(w.dash, 0);

  // ---- the sentence, drawn as the introduction draws it
  w.bars.forEach((b, i) => {
    const a = R.bars[i], z = WG.bars[i];
    const grow = E.expo(seg(t, [CUES.bars[0] + i * 0.08, CUES.bars[0] + i * 0.08 + 0.6]));
    const across = t < CUES.morph[0] ? 0 : clamp(sp(t, CUES.morph[0] + 0.02 * i, 0.9, 9), 0, 1.02);
    const up = t < CUES.morph[0] ? 0 : clamp(sp(t, CUES.morph[0] + 0.1 + 0.035 * i, 0.88, 8.6), 0, 1.02);
    const bw = lerp(a.w, z.w, across) * grow, bh = lerp(a.h, z.h, up);
    const cx = lerp(a.x + a.w / 2, z.x + (z.w * grow) / 2, across);
    box(b, cx - bw / 2, lerp(a.y, z.y, up), bw, bh);
    b.style.borderRadius = px(bh / 2);
    b.style.background = css(th.ink, lerp(0.16, 0.2, up));
    show(b, clamp(grow * 2));
  });
  const checkedIn = E.expo(seg(t, CUES.checked));
  // The time trails the last line of the sentence, so it never rides over it.
  const tc = t < CUES.morph[0] ? 0 : clamp(sp(t, CUES.morph[0] + 0.04, 0.9, 9), 0, 1.02);
  const tu = t < CUES.morph[0] ? 0 : clamp(sp(t, CUES.morph[0] + 0.24, 0.88, 8.6), 0, 1.02);
  const timeX = lerp(W / 2, MR.x + wg.pad, tc), timeY = lerp(R.timeBase + 4 * (1 - checkedIn), WG.timeBase(MR), tu);
  text(w.checked, { x: timeX, y: timeY, size: lerp(12, wg.timeSize, tc), align: lerp(0.5, 0, tc), color: th.gradientMuted, opacity: checkedIn * (1 - smooth(0.2, 0.55, tc)) });
  text(w.widgetTime, { x: timeX, y: timeY, size: lerp(12, wg.timeSize, tc), align: lerp(0.5, 0, tc), color: th.gradientMuted, opacity: smooth(0.4, 0.8, tc) });

  // ---- the small widget splits away from the medium one
  const split = t < CUES.split[0] ? 0 : sp(t, CUES.split[0], 0.72, 9.5);
  const S = WG.small;
  const sy = lerp(MR.y, S.y, split);
  show(w.small, t < CUES.split[0] ? 0 : 1 - out);
  w.small.style.transformOrigin = `${px(S.x + S.w / 2)} ${px(S.y + S.h / 2)}`;
  w.small.style.transform = `translateY(${px(medShift * 1.3)}) scale(${medScale})`;
  w.small.style.filter = out > 0 ? `blur(${px(8 * out)})` : 'none';
  if (t >= CUES.split[0]) {
    const r = { x: S.x, y: sy, w: S.w, h: S.h };
    box(w.smallFrame, r.x, r.y, r.w, r.h);
    Object.assign(w.smallFrame.style, { borderRadius: px(wg.radius), background: diagonal(th),
      boxShadow: `0 14px 36px rgba(0,0,0,${th.dark ? 0.45 : 0.16}), 0 1px 3px rgba(0,0,0,0.08)`,
      outline: th.dark ? '1px solid rgba(255,255,255,0.06)' : 'none', outlineOffset: '-1px' });
    text(w.smallHead, { x: r.x + wg.pad, y: WG.headBase(r), size: wg.head, tracking: wg.headTracking, color: th.ink });
    setNumeral(w.smallNum, { x: r.x + wg.pad, align: 0, base: WG.smallBase + (sy - S.y), size: WG.numeral, tracking: -0.04, denomSize: 12, gap: wg.gap, value: 3, ink: th.ink, muted: th.gradientMuted });
    text(w.smallTime, { x: r.x + wg.pad, y: WG.timeBase(r), size: wg.timeSize, color: th.gradientMuted });
  }

  // ---- notifications: the setting, then what it sends
  const n8 = theme(8, mode);
  const cardIn = t < CUES.card[0] ? 0 : sp(t, CUES.card[0], 0.8, 10);
  const cardOut = E.inCubic(seg(t, [CUES.flight[0], CUES.flight[0] + 0.35]));
  const cw = W - 2 * P.sheetInset, ch = 2 * 56 + 2;
  const cx = P.sheetInset, cy = H * 0.47 - ch / 2 + 110 * (1 - cardIn) + 40 * cardOut;
  show(w.card, clamp(cardIn * 1.4) * (1 - cardOut));
  if (cardIn > 0 && cardOut < 1) {
    box(w.card, cx, cy, cw, ch);
    Object.assign(w.card.style, { borderRadius: '16px', background: css(n8.elevated), borderColor: css(n8.rule),
      boxShadow: `0 18px 50px rgba(0,0,0,${n8.dark ? 0.5 : 0.14})` });
    const label = { size: 17, color: n8.ink };
    text(w.row1, { x: 16, y: 28 + 6, ...label });
    const flip = t < CUES.toggle[0] ? 0 : clamp(sp(t, CUES.toggle[0], 0.78, 22), 0, 1.06);
    const stretch = Math.sin(Math.PI * clamp(seg(t, [CUES.toggle[0] - 0.05, CUES.toggle[1] + 0.05]))) * 5;
    box(w.track, cw - 2 - 16 - 51, 28 - 15.5, 51, 31);
    w.track.style.borderRadius = '15.5px';
    w.track.style.background = css(mixRgb(hexRgb(n8.dark ? '#39393D' : '#E9E9EB'), n8.accent, clamp(flip)));
    box(w.thumb, 2 + (51 - 27 - 4) * flip - (flip > 0.5 ? stretch : 0), 2, 27 + stretch, 27);
    Object.assign(w.thumb.style, { borderRadius: '13.5px', background: '#FFFFFF', boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.16)' });
    box(w.rule, 16, 56, cw - 16, 1);
    w.rule.style.background = css(n8.rule);
    text(w.row2, { x: 16, y: 57 + 28 + 6, ...label });
    text(w.value, { x: cw - 2 - 16 - 22 - 12, y: 57 + 28 + 6, size: 17, align: 1, color: n8.gradientMuted });
    box(w.chevron, cw - 2 - 16 - 22 + 1, 57 + 28 - 10, 20, 20);
    w.chevron.style.color = css(n8.gradientMuted);
  }
  const nIn = t < CUES.notification[0] ? 0 : sp(t, CUES.notification[0], 0.74, 11);
  const nOut = E.inCubic(seg(t, [CUES.flight[0], CUES.flight[0] + 0.28]));
  const nw = IOS ? W - 20 : W - 16, nh = IOS ? 78 : 116, nx = (W - nw) / 2, ny = lerp(-nh - 30, P.notifTop, nIn) - 14 * nOut;
  const noteShow = clamp(nIn * 3) * (1 - nOut);
  show(w.note, noteShow);
  const iconStart = IOS ? { x: nx + 14, y: ny + (nh - 40) / 2, s: 40 } : { x: nx + 16, y: ny + 16, s: 22 };
  if (noteShow > 0) {
    box(w.note, nx, ny, nw, nh);
    Object.assign(w.note.style, { borderRadius: px(IOS ? 24 : 26), background: css(n8.elevated, 0.97), borderColor: css(n8.rule),
      boxShadow: `0 16px 44px rgba(0,0,0,${n8.dark ? 0.55 : 0.16})` });
    const tx = IOS ? nx + 14 + 40 + 12 : nx + 16;
    const titleY = IOS ? ny + 29 : ny + 64, metaY = IOS ? titleY : ny + 31.5;
    text(w.noteTitle, { x: tx, y: titleY, size: 15, weight: SEMI, color: n8.ink, opacity: noteShow });
    if (IOS) text(w.noteMeta, { x: nx + nw - 16, y: metaY, size: 13, align: 1, color: n8.gradientMuted, opacity: noteShow });
    else text(w.noteMeta, { x: nx + 16 + 22 + 8, y: metaY, size: 13, color: n8.gradientMuted, opacity: noteShow });
    w.noteBars.forEach((b, i) => {
      const bw = (IOS ? [nw - 110, nw - 170] : [nw - 90, nw - 150])[i];
      box(b, tx, (IOS ? ny + 40 : ny + 76) + i * 16, bw, 8);
      b.style.borderRadius = '4px';
      b.style.background = css(n8.rule, i ? 0.7 : 1);
      show(b, noteShow);
    });
  } else { show(w.noteTitle, 0); show(w.noteMeta, 0); w.noteBars.forEach(b => show(b, 0)); }

  // ---- the icon flies from the notification and ends the film
  const flight = E.emph(seg(t, CUES.flight));
  const iconSize = IOS ? 132 : 128;
  const endCy = H * 0.43;
  const iconOn = t >= CUES.notification[0] ? clamp(nIn * 3) : 0;
  show(w.icon, iconOn);
  const iconEnd = { x: W / 2 - iconSize / 2, y: endCy - iconSize / 2, s: iconSize };
  // An arc rather than a straight line: out, then down into place.
  const ix = lerp(iconStart.x, iconEnd.x, flight), iy = lerp(iconStart.y, iconEnd.y, flight) + (IOS ? -40 : -30) * Math.sin(Math.PI * flight);
  const is = lerp(iconStart.s, iconEnd.s, flight);
  if (iconOn > 0) {
    box(w.icon, ix, iy, is, is);
    // The icon turns over on its way to the centre, its dark variant giving
    // way to its light one as the light spreads. Both worlds draw the same face.
    const turn = E.inOut(seg(t, CUES.flip));
    const angle = turn >= 1 ? 0 : 180 * turn, back = turn >= 1 || angle > 90;
    const ib = theme('brand', back ? 'light' : 'dark');
    w.icon.style.background = diagonal(ib, 0.45, back && turn < 1);
    w.icon.style.transform = angle ? `perspective(${px(is * 3.2)}) rotateY(${angle.toFixed(3)}deg)` : 'none';
    w.icon.style.borderRadius = IOS ? px(is * 0.225) : '50%';
    w.icon.style.boxShadow = `0 ${px(is * 0.12)} ${px(is * 0.32)} rgba(0,0,0,${(back ? 0.16 : 0.35) * clamp(flight * 2)})`;
    const dw = is * 352 / 1024, dh = Math.max(1.2, is * 44 / 1024);
    box(w.iconDash, (is - dw) / 2, (is - dh) / 2, dw, dh);
    w.iconDash.style.background = css(ib.accent);
    const sh = seg(t, CUES.sheen);
    show(w.sheen, sh > 0 && sh < 1 ? 1 : 0);
    if (sh > 0 && sh < 1) {
      box(w.sheen, lerp(-is * 1.2, is * 1.2, E.inOut(sh)), -is * 0.5, is * 0.5, is * 2);
      Object.assign(w.sheen.style, { transform: 'rotate(24deg)', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.38), rgba(255,255,255,0))', mixBlendMode: 'soft-light' });
    }
  }
  const word = E.expo(seg(t, CUES.word));
  const wordSize = IOS ? 44 : 42;
  const wordBase = iconEnd.y + iconSize + 30 + fontMetrics(SANS, 400).cap * wordSize;
  show(w.endWord, t >= CUES.word[0] ? 1 : 0);
  if (t >= CUES.word[0]) {
    box(w.endWord, 0, wordBase - wordSize * 1.1, W, wordSize * 1.45);
    text(w.endWordText, { x: W / 2, y: wordSize * 1.1 + wordSize * 1.2 * (1 - word), size: wordSize, align: 0.5,
      tracking: lerp(-0.005, -0.034, E.expo(seg(t, [CUES.word[0], CUES.word[1] + 0.4]))) * wordSize, color: brand.ink });
  }
  const tag = E.cubic(seg(t, CUES.tagline));
  text(w.endTag, { x: W / 2, y: wordBase + 38 + 8 * (1 - tag), size: IOS ? 18 : 17, align: 0.5, color: brand.muted, opacity: tag });

  // ---- status bar
  const statusOn = E.cubic(seg(t, CUES.chrome)) * (1 - seg(t, [CUES.flight[0], CUES.flight[0] + 0.3]));
  show(w.status, statusOn);
  const sb = mixRgb(th.ink, n8.ink, warm);
  w.status.style.color = css(sb);
  text(w.clock, { x: P.status.time.x, y: P.status.time.y + fontMetrics(SANS, SEMI).cap * P.status.time.size / 2, size: P.status.time.size, weight: IOS ? 600 : 500, align: 0.5, tracking: IOS ? -0.3 : 0, color: sb });
  if (IOS) box(w.statusIcons, W - 32 - 78 + 6, P.status.time.y - 6.5, 78, 13);
  else box(w.statusIcons, W - 16 - 58, P.status.time.y - 7, 58, 14);

  // ---- supers, from the introduction's own words
  const ink = mode === 'dark' ? mixRgb(th.ink, n8.ink, warm) : th.ink;
  const sub = mode === 'dark' ? mixRgb(th.gradientMuted, n8.gradientMuted, warm) : th.gradientMuted;
  setSuper(w.s1, { t, cue: CUES.s1, base: L.titleBase, size: P.title, weight: SEMI, color: ink });
  setSuper(w.s2a, { t, cue: [CUES.s2[0], CUES.s2[1]], base: L.titleBase - 16, size: P.sub, weight: IOS ? 500 : 500, color: ink, stagger: 0.03 });
  setSuper(w.s2b, { t, cue: [CUES.bars[0], CUES.s2[1]], base: L.titleBase + 16, size: P.sub, weight: IOS ? 500 : 500, color: ink, stagger: 0.03 });
  setSuper(w.s3, { t, cue: CUES.s3, base: L.titleBase, size: P.title, weight: SEMI, color: ink });
  setSuper(w.s4, { t, cue: CUES.s4, base: L.titleBase - 12, size: P.title, weight: SEMI, color: ink });
  setSuper(w.s4b, { t, cue: [CUES.s4[0] + 0.2, CUES.s4[1]], base: L.titleBase + 22, size: P.sub, weight: 400, color: sub, stagger: 0.03 });
}

// ---------------------------------------------------------------- frame
let worlds, grain;
function mask(e, value) { e.style.webkitMaskImage = value; e.style.maskImage = value; }
function render(t) {
  const [light, dark] = worlds;
  const wipe = E.swift(seg(t, CUES.wipe));
  const reveal = E.inOut(seg(t, CUES.reveal));
  const inDark = t >= CUES.wipe[0] && t < CUES.reveal[1];
  const inLight = t < CUES.wipe[1] || t >= CUES.reveal[0];
  light.root.style.display = inLight ? 'block' : 'none';
  dark.root.style.display = inDark ? 'block' : 'none';
  if (inLight) update(light, t);
  if (inDark) update(dark, t);
  if (t < CUES.wipe[1]) {
    // Dark arrives from the top along the canvas's own 160-degree diagonal.
    light.root.style.zIndex = '1'; dark.root.style.zIndex = '2';
    const edge = lerp(-14, 100, wipe);
    mask(light.root, 'none');
    mask(dark.root, `linear-gradient(160deg, #000 ${edge}%, transparent ${edge + 14}%)`);
  } else if (t >= CUES.reveal[0]) {
    // The light spreads from the icon as it flies.
    light.root.style.zIndex = '2'; dark.root.style.zIndex = '1';
    const r = reveal * Math.hypot(W, H) * 1.1;
    const icon = light.icon.getBoundingClientRect();
    const cx = icon.left + icon.width / 2, cy = icon.top + icon.height / 2;
    mask(dark.root, 'none');
    mask(light.root, reveal >= 1 ? 'none' : `radial-gradient(circle at ${px(cx)} ${px(cy)}, #000 ${px(Math.max(0, r - 90))}, transparent ${px(r)})`);
  } else { mask(dark.root, 'none'); mask(light.root, 'none'); }
}

// A fixed, fine grain keeps the soft gradients from banding once encoded. The
// tile has one noise pixel per device pixel, so the browser never scales it
// and both cuts carry the same grain.
function grainTile(size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), img = g.createImageData(size, size);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (rand() + rand() + rand() - 1.5) * 60; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

window.NW = {
  ready: (async () => {
    await Promise.all(faces.map(f => f.load()));
    faces.forEach(f => document.fonts.add(f));
    await document.fonts.ready;
    layout();
    worlds = [world('light'), world('dark')];
    grain = el(stage, { position: 'absolute', inset: '0', zIndex: '10', opacity: '0.07', backgroundImage: `url(${grainTile(Math.round(128 * devicePixelRatio))})`, backgroundSize: '128px 128px' });
    grain.id = 'grain';
    render(0);
    return { W, H, platform: IOS ? 'ios' : 'android', steps: UP_STEPS.length };
  })(),
  render,
};
