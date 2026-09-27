// Five exploratory level palettes. Each is a continuous OKLCH curve over
// t = (score - 1) / 9, so adjacent levels sit an even perceptual step apart.
// Exploration record; the chosen scale lives in design/palette.json.
import { oklchToHex, hexToOklab, sampleEvenly } from '../../../design/colors.js';
export { oklchToHex, hexToOklab };

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

// Temperature, refined: anchors sampled by arc length (design/colors.js).
iterations.push({
  id: 'temperature-refined', name: 'Temperature, refined',
  idea: 'Even steps end to end. Fog rather than sky at 1, warm stone through the middle, clay, then a deep terracotta ember at 10.',
  texture: 'stone',
  // Shipped: design/palette.json holds these anchors as the Temperature scale.
  hexes: {
    primary: sampleEvenly([[.74, .04, 238], [.70, .018, 215], [.65, .018, 75], [.59, .075, 55], [.525, .14, 38]], 10),
    companion: sampleEvenly([[.91, .025, 235], [.89, .012, 200], [.87, .018, 80], [.85, .045, 62], [.82, .07, 48]], 10),
  },
});
