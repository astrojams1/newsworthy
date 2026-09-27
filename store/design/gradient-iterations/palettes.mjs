// Five exploratory level palettes. Each is a continuous OKLCH curve over
// t = (score - 1) / 9, so adjacent levels sit an even perceptual step apart.
// Exploration only: nothing here feeds design/palette.json.

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t, p) => Math.pow(t, p);

export const iterations = [
  {
    id: 'dusk', name: 'Dusk',
    idea: 'Overcast slate at 1, through lilac and plum, to a low crimson sky at 10. No greens, no corals.',
    texture: 'grain',
    primary: t => [lerp(.72, .52, t), lerp(.035, .15, ease(t, .9)), lerp(250, 368, t)],
    companion: t => [lerp(.90, .80, t), lerp(.02, .09, t), lerp(235, 350, t)],
  },
  {
    id: 'newsprint', name: 'Newsprint',
    idea: 'Unbleached paper at 1, warming through ochre and sienna to vermilion ink at 10.',
    texture: 'paper',
    primary: t => [lerp(.82, .56, t), lerp(.025, .17, ease(t, 1.1)), lerp(88, 32, t)],
    companion: t => [lerp(.94, .84, t), lerp(.02, .08, t), lerp(92, 55, t)],
  },
  {
    id: 'ink', name: 'Ink',
    idea: 'Graphite at 1 deepening into blue-black ink and a violet stain at 10. One hue family, rising weight.',
    texture: 'halftone',
    primary: t => [lerp(.74, .42, t), lerp(.02, .15, ease(t, .85)), lerp(245, 292, t)],
    companion: t => [lerp(.91, .78, t), lerp(.012, .07, t), lerp(230, 280, t)],
  },
  {
    id: 'temperature', name: 'Temperature',
    idea: 'Cool mist at 1, neutral stone at the middle, banked ember at 10. Chroma passes through grey, so the turn is seamless.',
    texture: 'stone',
    // Signed chroma: cool below the midpoint, warm above it.
    primary: t => {
      const s = (t - .5) * 2;
      return [lerp(.74, .56, t), Math.abs(s) * (s < 0 ? .05 : .15) + .004, s < 0 ? 240 : lerp(70, 35, s)];
    },
    companion: t => {
      const s = (t - .5) * 2;
      return [lerp(.92, .84, t), Math.abs(s) * .05 + .004, s < 0 ? 230 : lerp(80, 55, s)];
    },
  },
  {
    id: 'signal', name: 'Stone & Signal',
    idea: 'Warm greys for the ordinary days; colour only arrives as the score climbs. An ember signal saves itself for 8 to 10.',
    texture: 'linen',
    primary: t => [lerp(.78, .58, t), lerp(.012, .18, ease(t, 2.2)), lerp(75, 30, ease(t, 1.4))],
    companion: t => [lerp(.92, .85, t), lerp(.008, .09, ease(t, 2)), lerp(80, 50, t)],
  },
];

// OKLCH -> sRGB with chroma reduction until in gamut.
function oklchToLinear([L, C, h]) {
  const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180);
  const l = (L + .3963377774 * a + .2158037573 * b) ** 3;
  const m = (L - .1055613458 * a - .0638541728 * b) ** 3;
  const s = (L - .0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + .2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s,
    -.0041960863 * l - .7034186147 * m + 1.7076147010 * s,
  ];
}
const gammaEncode = x => x <= .0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - .055;
export function oklchToHex(lch) {
  let [L, C, h] = lch, rgb;
  for (;;) {
    rgb = oklchToLinear([L, C, h]);
    if (rgb.every(v => v >= -1e-4 && v <= 1 + 1e-4) || C < 1e-3) break;
    C *= .97;
  }
  return '#' + rgb.map(v => Math.round(Math.min(1, Math.max(0, gammaEncode(v))) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function hexToOklab(hex) {
  const lin = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  const [r, g, b] = lin;
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .7936177850 * m - .0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + .4505937099 * s,
    .0259040371 * l + .7827717662 * m - .8086757660 * s];
}

// Temperature, refined: a path through OKLab anchors, sampled by arc length so
// every step between neighbouring levels is the same perceptual size.
const toLab = ([L, C, h]) => [L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180)];
const toLch = ([L, a, b]) => [L, Math.hypot(a, b), (Math.atan2(b, a) * 180 / Math.PI + 360) % 360];
function evenPath(anchors) {
  const pts = anchors.map(toLab), dense = [];
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 200; k++) {
    const u = k / 200; dense.push(pts[i].map((v, j) => lerp(v, pts[i + 1][j], u)));
  }
  dense.push(pts.at(-1));
  const len = [0];
  for (let i = 1; i < dense.length; i++) len.push(len[i - 1] + Math.hypot(...dense[i].map((v, j) => v - dense[i - 1][j])));
  return t => {
    const target = t * len.at(-1);
    let i = len.findIndex(l => l >= target); if (i <= 0) return toLch(dense[0]);
    const u = (target - len[i - 1]) / (len[i] - len[i - 1]);
    return toLch(dense[i - 1].map((v, j) => lerp(v, dense[i][j], u)));
  };
}
iterations.push({
  id: 'temperature-refined', name: 'Temperature, refined',
  idea: 'Even steps end to end. Fog rather than sky at 1, warm stone through the middle, clay, then a deep terracotta ember at 10.',
  texture: 'stone',
  primary: evenPath([[.74, .04, 238], [.70, .018, 215], [.65, .018, 75], [.59, .075, 55], [.525, .14, 38]]),
  companion: evenPath([[.91, .025, 235], [.89, .012, 200], [.87, .018, 80], [.85, .045, 62], [.82, .07, 48]]),
});
