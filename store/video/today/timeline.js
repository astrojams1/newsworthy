// One clock for the "today" Short's picture (composition.js, in Chromium) and
// its sound (score.mjs, in Node). Seven bars at 120 BPM, fourteen seconds: a
// Short a viewer finishes, and loops. Times are seconds from the first frame.
//
// The first frame already answers the question it asks: the phone, the
// day's number and its colour are there before anything moves. The trailer
// it replaces spent its first five seconds on a feed of blank cards.

export const FPS = 30;
export const BPM = 120;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
export const DURATION = 7 * BAR;
export const bar = n => (n - 1) * BAR;

// ---------------------------------------------------------------- motion
export const bezier = (x1, y1, x2, y2) => x => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let u = x;
  for (let i = 0; i < 8; i++) {
    const cx = 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3 - x;
    const dx = 3 * x1 * (1 - u) ** 2 + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u * u;
    if (Math.abs(cx) < 1e-7 || dx === 0) break;
    u -= cx / dx;
  }
  return 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
};
// Step response of a damped spring from rest: 0 at s = 0, settling on 1.
export function spring(s, zeta, omega) {
  if (s <= 0) return 0;
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * omega * s) * (Math.cos(wd * s) + (zeta * omega / wd) * Math.sin(wd * s));
}
export function seeded(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

// ---------------------------------------------------------------- cues
// Single times are moments; pairs are spans.
export const CUES = {
  // The question and the number are on screen from frame 0; the number lands
  // with a hit on the downbeat.
  hit: 0,
  // The sentence is set down word by word, fast enough to read along with.
  sentence: [0.25, 1.5],
  storyLine: [1.5, 1.9],
  question: [0, bar(3) - 0.3],
  oneNumber: bar(3),
  oneSentence: bar(3) + 2 * BEAT,
  numberLine: [bar(3), bar(4) + 2 * BEAT - 0.3],
  // The phone goes to the Home Screen, the same reading in its widgets.
  home: [bar(4) + 2 * BEAT, bar(4) + 3 * BEAT],
  medium: bar(4) + 2 * BEAT + 0.15,
  small: bar(4) + 3 * BEAT,
  homeLine: [bar(4) + 2 * BEAT, bar(6) - 0.3],
  // Then the name, the price and where to get it.
  phoneOut: [bar(6) - 0.35, bar(6) + 0.3],
  icon: [bar(6), bar(6) + 0.8],
  word: [bar(6) + BEAT / 2, bar(6) + BEAT / 2 + 0.6],
  tagline: [bar(6) + BEAT, bar(6) + BEAT + 0.6],
  store: [bar(6) + 2 * BEAT, bar(6) + 2 * BEAT + 0.5],
  // The last beat fades back toward the opening's colour, so the loop joins.
  loop: [DURATION - 0.45, DURATION],
};

// Samples per frame for the motion blur: more where things move fast.
export const BLUR = [
  { span: [0, 0.5], samples: 8 },
  { span: CUES.home, samples: 10 },
  { span: [CUES.medium, CUES.small + 0.6], samples: 8 },
  { span: CUES.phoneOut, samples: 14 },
  { span: [CUES.icon[0], CUES.store[1]], samples: 8 },
];
export const BASE_SAMPLES = 3;
export const CUTS = [];
export const samplesAt = t => Math.max(BASE_SAMPLES, ...BLUR.filter(({ span: [a, b] }) => t > a && t < b).map(b => b.samples));
