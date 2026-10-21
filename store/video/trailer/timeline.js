// One clock for the trailer's picture (composition.js, in Chromium) and its
// sound (score.mjs, in Node). The film is cut to a 120 BPM bar, so every cut,
// every line and every digit lands on a beat the music plays. Times are
// seconds from the first frame.

export const FPS = 30;
export const BPM = 120;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
// Sixteen bars: the last holds the end card while the final chord rings out.
export const DURATION = 16 * BAR;
// The start of bar n, counted from 1 as a musician would.
export const bar = n => (n - 1) * BAR;

// ---------------------------------------------------------------- motion
// A quick start and a long, soft landing: a digit snapping into its detent.
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
export const detent = bezier(0.3, 0, 0.1, 1);

// Step response of a damped spring from rest: 0 at s = 0, settling on 1.
export function spring(s, zeta, omega) {
  if (s <= 0) return 0;
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * omega * s) * (Math.cos(wd * s) + (zeta * omega / wd) * Math.sin(wd * s));
}

// A deterministic stream of numbers in [0, 1), so every render scatters the
// feed, the pings and the grain the same way.
export function seeded(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

// ---------------------------------------------------------------- the number
// The reading's number rolls up the whole scale on eighth notes, a digit
// landing on each, holds on 10 for a beat and a half, then springs back down
// to a quiet 2. Position 0 is the dash the app shows before a reading.
const DIGIT_TIME = 0.2;
// Where the detent passes the halfway mark: the moment a digit reads as landed.
const HALF = (() => { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (detent(m) < 0.5) lo = m; else hi = m; } return lo; })();
export const ROLL = Array.from({ length: 10 }, (_, i) => {
  const lands = bar(6) + 2 * BEAT / 2 + i * BEAT / 2;
  return { to: i + 1, lands, start: lands - HALF * DIGIT_TIME, duration: DIGIT_TIME };
});
export const DOWN = { start: bar(7) + 3 * BEAT, from: 10, to: 2, zeta: 0.8, omega: 6.4 };
export const SETTLED = DOWN.to;

export function scoreAt(t) {
  if (t < DOWN.start) {
    let value = 0;
    for (const step of ROLL) value += detent((t - step.start) / step.duration);
    return value;
  }
  return DOWN.from + (DOWN.to - DOWN.from) * spring(t - DOWN.start, DOWN.zeta, DOWN.omega);
}

// Each moment the falling number centres on a whole digit, for the sound.
export function downCrossings() {
  const out = [];
  for (let k = DOWN.from - 1, prev = DOWN.from, t = DOWN.start; k >= DOWN.to && t < DOWN.start + 2; t += 1 / 4800) {
    const v = scoreAt(t);
    if (prev > k && v <= k) { out.push({ digit: k, t }); k--; }
    prev = v;
  }
  return out;
}

// ---------------------------------------------------------------- the feed
// How far the endless feed has scrolled, in feed pixels: a crawl that
// accelerates into a blur, then stops dead at the hush.
export const HUSH = bar(5);
export function feedTravel(t) {
  const u = Math.min(t, HUSH) / HUSH;
  return 60 * Math.min(t, HUSH) + 5200 * u ** 5;
}

// Notifications from other apps, piling up faster and faster until the hush.
// The picture draws one banner per ping and the score plays one blip per ping.
export const PINGS = (() => {
  const rand = seeded(4242), out = [];
  let t = 0.35;
  while (t < HUSH - 0.12) {
    out.push({ t, x: 0.12 + 0.76 * rand(), y: 0.1 + 0.8 * rand(), tilt: (rand() - 0.5) * 10, app: Math.floor(rand() * 6), badge: rand() < 0.35 ? Math.floor(rand() * 4) : -1, pitch: rand(), pan: rand() * 2 - 1 });
    // About two a second at first, nearer thirty a second at the end.
    const density = 1.6 + 26 * (t / HUSH) ** 3.2;
    t += (0.55 + 0.9 * rand()) / density;
  }
  return out;
})();

// ---------------------------------------------------------------- cues
// Named moments, in seconds. Each scene reads its own; the score reads them all.
export const CUES = {
  // I. The noise: four bars of a feed that never ends.
  feedIn: [0, 0.7],
  everyDay: [bar(1) + BEAT, bar(2) + 1.5 * BEAT],
  thousands: [bar(1) + 2 * BEAT, bar(2) + 1.5 * BEAT],
  comeAndGo: [bar(2) + 2 * BEAT, bar(3) + 1.5 * BEAT],
  scatter: [bar(2) + 2 * BEAT, bar(2) + 3.4 * BEAT],
  doomscroll: [bar(3) + 2 * BEAT, HUSH],
  allDay: [bar(3) + 3 * BEAT, HUSH],
  clock: [bar(3) + 3 * BEAT, HUSH],
  rush: [bar(4), HUSH],
  // II. The hush: everything stops, the feed sinks, one story rises.
  hush: HUSH,
  sink: [HUSH + 0.05, HUSH + 1.5],
  hero: [HUSH + 0.25, HUSH + 0.95],
  glow: [bar(5) + 2 * BEAT, bar(5) + 3 * BEAT],
  ring: bar(5) + 2 * BEAT,
  orSee: [bar(5) + BEAT, bar(6) - 0.12],
  breaks: [bar(5) + 2 * BEAT, bar(6) - 0.12],
  // III. The drop: the story becomes the reading.
  drop: bar(6),
  morph: [bar(6), bar(6) + 1.4 * BEAT],
  worldNews: [bar(6) + 1.2 * BEAT, bar(8) - 0.25],
  rated: [bar(6) + 2.2 * BEAT, bar(8) - 0.25],
  peak: ROLL[9].lands,
  oneNumber: [bar(8), bar(9) - 0.2],
  oneSentence: [bar(8) + BEAT, bar(9) - 0.2],
  bars: [bar(8) + BEAT, bar(8) + 2 * BEAT],
  storyLine: [bar(8) + 2 * BEAT, bar(8) + 3 * BEAT],
  // IV. The Home Screen: the reading closes into a widget.
  widget: [bar(9), bar(9) + 1.6 * BEAT],
  icons: [bar(9) + 0.5 * BEAT, bar(9) + 1.8 * BEAT],
  small: bar(9) + 2 * BEAT,
  homeLine: [bar(9) + 0.8 * BEAT, bar(11) - 0.25],
  pushHome: [bar(9) + 3 * BEAT, bar(11) - BEAT],
  // V. A notification, on a dark lock screen.
  night: [bar(11), bar(11) + 1.3 * BEAT],
  notifyLine: [bar(11) + 0.6 * BEAT, bar(13) - 0.3],
  scoreLine: [bar(11) + 1.6 * BEAT, bar(13) - 0.3],
  notification: bar(11) + 2 * BEAT,
  pushNote: [bar(11) + 3 * BEAT, bar(13) - BEAT],
  // VI. The price.
  phoneOut: [bar(13) - 0.5 * BEAT, bar(13) + 0.2 * BEAT],
  light: [bar(13) - 0.16, bar(13) + 0.26],
  dollar: bar(13),
  once: bar(13) + 0.75 * BEAT,
  noAds: bar(13) + 2 * BEAT,
  noSubscription: bar(13) + 3 * BEAT,
  noPurchases: bar(14),
  priceOut: [bar(14) + 2.5 * BEAT, bar(15) - 0.1],
  // VII. Why it exists, then the name.
  focus: [bar(15), bar(15) + 3 * BEAT - 0.05],
  matters: [bar(15) + 0.75 * BEAT, bar(15) + 3 * BEAT - 0.05],
  icon: [bar(15) + 3 * BEAT, bar(16) + 0.5 * BEAT],
  word: [bar(16) + 0.25 * BEAT, bar(16) + 1.5 * BEAT],
  tagline: [bar(16) + 0.9 * BEAT, bar(16) + 2 * BEAT],
  store: [bar(16) + 1.6 * BEAT, bar(16) + 2.6 * BEAT],
  sheen: [bar(16) + 2.2 * BEAT, bar(16) + 3.4 * BEAT],
};

// How many renders to average per frame where things move fast; elsewhere a
// frame takes four, or one when nothing moved while the shutter was open.
export const BLUR = [
  { span: [CUES.rush[0] + 0.5, HUSH + 0.04], samples: 16 },
  { span: [CUES.scatter[0] - 0.05, CUES.scatter[1] + 0.1], samples: 10 },
  { span: [CUES.hero[0], CUES.hero[1]], samples: 6 },
  { span: [CUES.drop - 0.05, CUES.morph[1] + 0.1], samples: 12 },
  { span: [ROLL[0].start - 0.05, ROLL[9].lands + 0.15], samples: 14 },
  { span: [DOWN.start - 0.02, DOWN.start + 0.9], samples: 14 },
  { span: [CUES.widget[0] - 0.05, CUES.widget[1] + 0.3], samples: 10 },
  { span: [CUES.pushHome[0], CUES.pushHome[0] + 0.5], samples: 6 },
  { span: [CUES.night[0] - 0.05, CUES.night[1] + 0.1], samples: 8 },
  { span: [CUES.notification, CUES.notification + 0.5], samples: 8 },
  { span: [CUES.pushNote[0], CUES.pushNote[0] + 0.5], samples: 6 },
  { span: [CUES.phoneOut[0] - 0.05, CUES.light[1] + 0.2], samples: 14 },
  { span: [CUES.icon[0] - 0.05, CUES.icon[1]], samples: 10 },
];
export const BASE_SAMPLES = 4;
// Hard cuts: no frame's shutter reaches across one, so each side stays clean.
export const CUTS = [HUSH];
export const samplesAt = t => Math.max(BASE_SAMPLES, ...BLUR.filter(({ span: [a, b] }) => t > a && t < b).map(b => b.samples));
