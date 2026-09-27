export const channels = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16));
export const mix = (base, color, amount) => '#' + channels(base).map((v, i) => Math.round(v * (1 - amount) + channels(color)[i] * amount).toString(16).padStart(2, '0')).join('').toUpperCase();
export function resolveTheme(palette, appearance, dark = false) {
  const { surface, ink, wash, glow, veil } = appearance;
  return {
    ...appearance,
    // Opaque gradient stops for small icons and native RemoteViews. They share
    // the web's hues and strengths, while avoiding translucent widget text.
    start: mix(surface, palette.companion, glow),
    center: mix(surface, palette.primary, veil),
    end: mix(mix(surface, palette.primary, veil), palette.primary, wash),
    accent: mix(palette.primary, ink, dark ? 0.66 : 0.76),
    tinted: mix(surface, palette.primary, dark ? 0.10 : 0.08),
    elevated: mix(surface, palette.companion, dark ? 0.06 : 0.035),
  };
}
export function contrast(a, b) {
  const luminance = value => channels(value).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
  const [x, y] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (x + .05) / (y + .05);
}

// A scale is a path through OKLCH anchors ([lightness, chroma, hue degrees]).
// Levels are sampled by arc length in OKLab, so every neighbouring pair sits
// the same perceptual step apart however the anchors are spaced.
const lerp = (a, b, t) => a + (b - a) * t;
const toLab = ([L, C, h]) => [L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180)];
function labToHex(lab) {
  let [L, a, b] = lab;
  for (;;) {
    const l = (L + .3963377774 * a + .2158037573 * b) ** 3;
    const m = (L - .1055613458 * a - .0638541728 * b) ** 3;
    const s = (L - .0894841775 * a - 1.2914855480 * b) ** 3;
    const rgb = [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.7076147010 * s];
    // Out of the sRGB gamut: keep lightness and hue, reduce chroma.
    if (rgb.every(v => v >= -1e-4 && v <= 1 + 1e-4) || Math.hypot(a, b) < 1e-3) {
      const encode = x => x <= .0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - .055;
      return '#' + rgb.map(v => Math.round(Math.min(1, Math.max(0, encode(v))) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
    }
    a *= .97; b *= .97;
  }
}
export const oklchToHex = lch => labToHex(toLab(lch));
export function hexToOklab(hex) {
  const [r, g, b] = channels(hex).map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .7936177850 * m - .0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .8086757660 * s];
}
// Perceptual distance between two colours, OKLab ΔE × 100.
export const step = (a, b) => Math.hypot(...hexToOklab(a).map((v, i) => v - hexToOklab(b)[i])) * 100;
export function sampleEvenly(anchors, count) {
  const points = anchors.map(toLab), dense = [];
  for (let i = 0; i < points.length - 1; i++) for (let k = 0; k < 200; k++) dense.push(points[i].map((v, j) => lerp(v, points[i + 1][j], k / 200)));
  dense.push(points.at(-1));
  const length = [0];
  for (let i = 1; i < dense.length; i++) length.push(length[i - 1] + Math.hypot(...dense[i].map((v, j) => v - dense[i - 1][j])));
  return Array.from({ length: count }, (_, n) => {
    const target = count === 1 ? 0 : n / (count - 1) * length.at(-1);
    const i = Math.max(1, length.findIndex(l => l >= target));
    const u = (target - length[i - 1]) / (length[i] - length[i - 1] || 1);
    return labToHex(dense[i - 1].map((v, j) => lerp(v, dense[i][j], u)));
  });
}
// design/palette.json names a scale and a brand; this returns the ten levels
// and the brand as hex. A scale may list `levels` outright instead of anchors.
export function resolvePalette(source) {
  const { scale } = source;
  const levels = scale.levels ?? (() => {
    const primary = sampleEvenly(scale.primary, scale.names.length), companion = sampleEvenly(scale.companion, scale.names.length);
    return scale.names.map((name, i) => ({ name, primary: primary[i], companion: companion[i] }));
  })();
  if (levels.length !== 10) throw new Error(`design/palette.json: the scale needs 10 levels, found ${levels.length}`);
  const withScores = levels.map((level, i) => ({ score: i + 1, ...level }));
  const brand = source.brand.level
    ? { name: source.brand.name, primary: withScores[source.brand.level - 1].primary, companion: withScores[source.brand.level - 1].companion }
    : source.brand;
  return { levels: withScores, brand };
}
// Every text role must reach WCAG AA (4.5:1) on each surface it is drawn on.
export function contrastFailures(tokens) {
  const failures = [];
  for (const palette of [tokens.brand, ...tokens.levels]) for (const mode of ['light', 'dark']) {
    const t = palette[mode];
    const check = (role, surface) => { const ratio = contrast(t[role], t[surface]); if (ratio < 4.5) failures.push(`${palette.name} ${mode} ${role} on ${surface}: ${ratio.toFixed(2)}`); };
    for (const surface of ['start', 'center', 'end', 'surface', 'tinted', 'elevated']) for (const role of ['ink', 'gradientMuted', 'accent']) check(role, surface);
    for (const surface of ['surface', 'tinted', 'elevated']) for (const role of ['muted', 'faint', 'danger']) check(role, surface);
  }
  return failures;
}
