// One clock for the picture (composition.js, in Chromium) and the sound
// (score.mjs, in Node), so every tick lands on the frame that causes it.
// Times are seconds from the first frame.

export const FPS = 30;
// App Store previews must run 15 to 30 seconds. The last tenth of a second
// holds the end card, so rounding in either track never lands under 15.
export const DURATION = 15.1;

// The reading's number, which rolls like an odometer drum: up through the
// whole scale, a moment on 10, then down to a quiet 3. Position 0 is the dash
// the app shows before a reading arrives.
const UP_START = 1.35;
// Accelerating then settling, so the count reads as a count and not a blur.
const UP_INTERVALS = [0.30, 0.25, 0.21, 0.18, 0.16, 0.15, 0.15, 0.17, 0.21, 0.29];
export const UP_STEPS = (() => {
  let start = UP_START;
  return UP_INTERVALS.map((interval, i) => {
    const step = { to: i + 1, start, duration: i === UP_INTERVALS.length - 1 ? 0.34 : Math.min(0.24, interval * 0.9) };
    start += interval;
    return step;
  });
})();
export const DOWN = { start: 3.85, from: 10, to: 3, zeta: 0.82, omega: 5.2 };

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

export function scoreAt(t) {
  if (t < DOWN.start) {
    let value = 0;
    for (const step of UP_STEPS) value += detent((t - step.start) / step.duration);
    return value;
  }
  return DOWN.from + (DOWN.to - DOWN.from) * spring(t - DOWN.start, DOWN.zeta, DOWN.omega);
}

// Named moments. Each scene reads its own; the score reads them all.
export const CUES = {
  dashDraw: [0.05, 0.6],
  dashLift: [0.7, 1.3],
  chrome: [0.85, 1.45],
  s1: [1.55, 4.35],
  settle: 4.85,
  s2: [4.8, 6.75],
  bars: [4.95, 5.55],
  checked: [5.3, 5.75],
  morph: [7.0, 7.95],
  split: [7.85, 8.6],
  s3: [8.15, 9.55],
  wipe: [9.4, 10.05],
  widgetsOut: [9.9, 10.4],
  warm: [10.0, 10.9],
  card: [10.3, 10.8],
  toggle: [10.9, 11.15],
  s4: [10.42, 12.2],
  notification: [11.25, 11.75],
  flight: [12.3, 13.1],
  flip: [12.42, 13.0],
  reveal: [12.4, 13.15],
  word: [12.95, 13.55],
  tagline: [13.3, 13.9],
  sheen: [13.95, 14.65],
};
