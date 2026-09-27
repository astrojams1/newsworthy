// The preview's sound, synthesised from the same clock as the picture
// (timeline.js), so a tick lands on the frame whose digit makes it. Nothing is
// sampled or licensed: every sound is a few sine waves or filtered noise.
//
// It stays quiet and plain, like the app: a pad whose filter opens as the
// scale warms and closes as it cools, one note per digit on an A major
// pentatonic, soft air under each transition, a click for the switch, two
// notes for the notification, and a chord for the name.
import { CUES, DOWN, DURATION, UP_STEPS, detent, scoreAt } from './timeline.js';

export const RATE = 48000;
const TAU = Math.PI * 2;
const hz = semitonesFromA4 => 440 * 2 ** (semitonesFromA4 / 12);
// A major pentatonic from A4: one step per digit, 1 to 10.
const DIGIT = [0, 2, 4, 7, 9, 12, 14, 16, 19, 24].map(hz);

function rng(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; };
}

// Zavalishin's state-variable filter: low, band and high from one pass.
function svf() {
  let ic1 = 0, ic2 = 0;
  return (x, cutoff, q = 0.7) => {
    const g = Math.tan(Math.PI * Math.min(cutoff, RATE * 0.45) / RATE), k = 1 / q;
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    return { low: v2, band: v1, high: x - k * v1 - v2 };
  };
}

export function renderScore() {
  const n = Math.round(DURATION * RATE);
  const dry = [new Float32Array(n), new Float32Array(n)];
  const wet = [new Float32Array(n), new Float32Array(n)];
  const at = t => Math.round(t * RATE);
  const put = (i, v, pan, send) => {
    if (i < 0 || i >= n) return;
    const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4);
    dry[0][i] += v * l; dry[1][i] += v * r;
    wet[0][i] += v * l * send; wet[1][i] += v * r * send;
  };

  // A soft mallet on a small bar: fundamental, a little octave, a trace of
  // the twelfth, and a breath of noise at the strike.
  const noise = rng(11);
  function pluck(t0, f, { gain = 0.2, decay = 0.35, pan = 0, send = 0.35 } = {}) {
    const start = at(t0), len = at(decay * 6);
    for (let j = 0; j < len; j++) {
      const s = j / RATE, env = Math.min(1, s / 0.002) * Math.exp(-s / decay);
      const tone = Math.sin(TAU * f * s) + 0.22 * Math.sin(TAU * 2 * f * s) * Math.exp(-s / (decay * 0.4)) + 0.06 * Math.sin(TAU * 3 * f * s) * Math.exp(-s / (decay * 0.2));
      const strike = s < 0.004 ? noise() * 0.25 * (1 - s / 0.004) : 0;
      put(start + j, gain * env * tone + gain * strike, pan, send);
    }
  }
  // A frequency-modulated bell; its brightness fades faster than its body.
  function bell(t0, f, { gain = 0.16, decay = 1.2, ratio = 3.5, index = 2.2, pan = 0, send = 0.5 } = {}) {
    const start = at(t0), len = at(decay * 4);
    for (let j = 0; j < len; j++) {
      const s = j / RATE, env = Math.min(1, s / 0.003) * Math.exp(-s / decay) * Math.min(1, (len - j) / (0.05 * RATE));
      put(start + j, gain * env * Math.sin(TAU * f * s + index * Math.exp(-s / 0.18) * Math.sin(TAU * f * ratio * s)), pan, send);
    }
  }
  // Air: noise through a band-pass swept between two frequencies.
  function whoosh(t0, dur, { from = 300, to = 1800, gain = 0.12, q = 1.1, pan0 = 0, pan1 = 0, send = 0.4, seed = 3 } = {}) {
    const start = at(t0), len = at(dur), noiseL = rng(seed), f = svf();
    for (let j = 0; j < len; j++) {
      const u = j / len, env = Math.sin(Math.PI * u) ** 2 * (u < 0.5 ? 1 : 1 - 0.3 * (u - 0.5));
      const cutoff = from * (to / from) ** u;
      put(start + j, gain * env * f(noiseL(), cutoff, q).band, pan0 + (pan1 - pan0) * u, send);
    }
  }
  // A low felt knock: a sine that drops in pitch as it dies away.
  function thump(t0, { f = 72, gain = 0.3, decay = 0.16, send = 0.15 } = {}) {
    const start = at(t0), len = at(decay * 6);
    let phase = 0;
    for (let j = 0; j < len; j++) {
      const s = j / RATE;
      phase += TAU * f * (1 + 1.2 * Math.exp(-s / 0.03)) / RATE;
      put(start + j, gain * Math.min(1, s / 0.002) * Math.exp(-s / decay) * Math.sin(phase), 0, send);
    }
  }
  // A small, dry click, as a switch makes under a finger.
  function click(t0, { gain = 0.12, f = 3200, pan = 0.25 } = {}) {
    const start = at(t0), len = at(0.02), hp = svf(), noiseC = rng(29);
    for (let j = 0; j < len; j++) {
      const s = j / RATE, env = Math.exp(-s / 0.0025);
      put(start + j, gain * env * (0.7 * hp(noiseC(), 2500, 0.8).high + 0.6 * Math.sin(TAU * f * s)), pan, 0.1);
    }
  }

  // ---- the pad: four chords, crossfaded, its filter following the scene.
  const chords = [
    { from: 0.15, to: 7.2, notes: [-24, -17, -10, -8, -5] },          // A: A E B C# E
    { from: 6.8, to: 9.7, notes: [-24, -19, -15, -12, -5] },          // D/A: A D F# A E
    { from: 9.3, to: 12.6, notes: [-27, -20, -12, -5, -1] },          // F#m9: F# C# A E G#
    { from: 12.25, to: DURATION, notes: [-24, -17, -12, -8, -5, 0] }, // A: A E A C# E A
  ];
  const brightness = t => {
    if (t < CUES.morph[0]) return 380 + 240 * Math.max(0, t < DOWN.start + 2 ? scoreAt(t) : 3);
    if (t < CUES.wipe[0]) return 1300;
    if (t < CUES.flight[0]) return 650 + 700 * Math.min(1, Math.max(0, (t - CUES.warm[0]) / (CUES.warm[1] - CUES.warm[0])));
    return 1500;
  };
  const padL = svf(), padR = svf();
  const fadeIn = (t, a, len) => Math.min(1, Math.max(0, (t - a) / len));
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let l = 0, r = 0;
    for (const c of chords) {
      if (t < c.from || t > c.to) continue;
      const env = Math.min(fadeIn(t, c.from, 0.9), 1 - fadeIn(t, c.to - 0.9, 0.9));
      for (const [k, semitone] of c.notes.entries()) {
        const f = hz(semitone), detune = 2 ** ((3 + k) / 1200);
        const v = env / c.notes.length;
        l += v * (Math.sin(TAU * f / detune * t + k) + Math.sin(TAU * 3 * f * t) / 12);
        r += v * (Math.sin(TAU * f * detune * t + 2 * k) + Math.sin(TAU * 3 * f * t + 1) / 12);
      }
    }
    // The name gets a slow swell; the last half second fades to silence.
    const swell = 1 + 0.6 * Math.exp(-(((t - 13.25) / 0.6) ** 2));
    const tail = 1 - fadeIn(t, DURATION - 0.8, 0.75);
    const cutoff = brightness(t);
    const g = 0.16 * swell * tail;
    const pl = g * padL(l, cutoff).low, pr = g * padR(r, cutoff).low;
    dry[0][i] += pl; dry[1][i] += pr;
    wet[0][i] += 0.3 * pl; wet[1][i] += 0.3 * pr;
  }

  // ---- the open: the dash drawn, then lifted into the reading.
  whoosh(CUES.dashDraw[0], 0.22, { from: 2400, to: 5200, gain: 0.05, q: 1.6, send: 0.25, seed: 5 });
  pluck(CUES.dashDraw[0] + 0.07, hz(-12), { gain: 0.09, decay: 0.5, send: 0.5 });
  whoosh(CUES.dashLift[0], 0.62, { from: 250, to: 1400, gain: 0.08, pan0: 0, pan1: 0.1, seed: 7 });

  // ---- the count: a note per digit as it snaps into place.
  const landing = step => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (detent(mid) < 0.5) lo = mid; else hi = mid; }
    return step.start + lo * step.duration;
  };
  UP_STEPS.forEach((step, i) => {
    const t = landing(step), last = i === UP_STEPS.length - 1;
    if (last) {
      bell(t, hz(24), { gain: 0.11, decay: 0.9, pan: 0.05 });
      pluck(t, DIGIT[9] / 2, { gain: 0.1, decay: 0.8, send: 0.5 });
    } else pluck(t, DIGIT[i], { gain: 0.1 + 0.012 * i, decay: 0.34, pan: -0.25 + 0.05 * i });
    click(t - 0.004, { gain: 0.025, f: 5200, pan: -0.25 + 0.05 * i });
  });
  // Down through the scale as it cools: a note each time a digit is centred.
  for (let k = 9, prev = scoreAt(DOWN.start), t = DOWN.start; k >= 3 && t < DOWN.start + 2; t += 1 / RATE) {
    const v = scoreAt(t);
    if (prev > k && v <= k) {
      pluck(t, DIGIT[k - 1], { gain: k === 3 ? 0.12 : 0.07, decay: k === 3 ? 0.6 : 0.2, pan: 0.2 - 0.05 * (9 - k), send: 0.45 });
      if (k === 3) thump(t + 0.01, { f: 96, gain: 0.16, decay: 0.12 });
      k--;
    }
    prev = v;
  }
  whoosh(DOWN.start, 0.9, { from: 1600, to: 300, gain: 0.045, q: 0.9, pan0: 0.2, pan1: -0.1, seed: 13 });

  // ---- the sentence set down, line by line.
  for (let i = 0; i < 4; i++) click(CUES.bars[0] + 0.02 + i * 0.08, { gain: 0.03, f: 2400 + 200 * i, pan: -0.2 + 0.13 * i });

  // ---- the screen closes into a widget; the small one splits away.
  whoosh(CUES.morph[0] - 0.05, 0.75, { from: 2200, to: 260, gain: 0.11, q: 0.9, pan0: 0.15, pan1: -0.1, seed: 17 });
  thump(CUES.morph[0] + 0.52, { f: 64, gain: 0.22, decay: 0.2 });
  pluck(CUES.split[0] + 0.12, hz(7), { gain: 0.07, decay: 0.3, pan: -0.2 });
  pluck(CUES.split[0] + 0.2, hz(12), { gain: 0.05, decay: 0.3, pan: -0.25 });

  // ---- light to dark, then the setting and what it sends.
  whoosh(CUES.wipe[0] - 0.1, 0.95, { from: 180, to: 900, gain: 0.12, q: 0.8, pan0: -0.3, pan1: 0.3, seed: 19 });
  thump(CUES.wipe[1] - 0.2, { f: 48, gain: 0.2, decay: 0.35, send: 0.3 });
  whoosh(CUES.card[0], 0.5, { from: 400, to: 1600, gain: 0.05, seed: 23 });
  click(CUES.toggle[0] + 0.02, { gain: 0.11, f: 3400, pan: 0.35 });
  click(CUES.toggle[0] + 0.09, { gain: 0.07, f: 2600, pan: 0.35 });
  const chime = CUES.notification[0] + 0.1;
  bell(chime, hz(19), { gain: 0.12, decay: 0.9, ratio: 2.76, index: 1.6, pan: -0.1 });
  bell(chime + 0.13, hz(24), { gain: 0.12, decay: 1.0, ratio: 2.76, index: 1.6, pan: 0.1 });

  // ---- the icon turns over, the light spreads, the name arrives.
  whoosh(CUES.flight[0], 0.95, { from: 500, to: 6000, gain: 0.07, q: 0.7, pan0: -0.2, pan1: 0, seed: 31 });
  for (const [i, semitone] of [-12, -8, -5, 0].entries()) pluck(CUES.word[0] + 0.03 * i, hz(semitone), { gain: 0.09, decay: 1.1, pan: -0.15 + 0.1 * i, send: 0.6 });
  bell(CUES.word[0] + 0.12, hz(19), { gain: 0.05, decay: 1.8, ratio: 3.5, index: 1.2, send: 0.7 });
  bell(CUES.sheen[0] + 0.25, hz(31), { gain: 0.025, decay: 0.8, ratio: 4.1, index: 0.8, pan: 0.3, send: 0.6 });

  // ---- space: a small Freeverb room on the send.
  const room = reverb(wet);
  const out = [new Float32Array(n), new Float32Array(n)];
  let peak = 0;
  for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) {
    out[c][i] = dry[c][i] + 0.32 * room[c][i];
    peak = Math.max(peak, Math.abs(out[c][i]));
  }
  // Peaks at -3 dBFS, a gentle level for a store page; the edges ramp.
  const scale = 0.708 / (peak || 1);
  for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) {
    const edge = Math.min(1, i / (0.005 * RATE), (n - 1 - i) / (0.02 * RATE));
    out[c][i] *= scale * Math.max(0, edge);
  }
  return out;
}

function reverb([inL, inR]) {
  const n = inL.length;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], passes = [556, 441, 341, 225];
  const channel = (input, spread) => {
    const out = new Float32Array(n);
    for (const size of combs) {
      const buf = new Float32Array(Math.round((size + spread) * RATE / 44100));
      let idx = 0, store = 0;
      for (let i = 0; i < n; i++) {
        const y = buf[idx];
        store = y * 0.6 + store * 0.4;
        buf[idx] = input[i] * 0.015 + store * 0.84;
        idx = (idx + 1) % buf.length;
        out[i] += y;
      }
    }
    for (const size of passes) {
      const buf = new Float32Array(Math.round((size + spread) * RATE / 44100));
      let idx = 0;
      for (let i = 0; i < n; i++) {
        const b = buf[idx], x = out[i];
        out[i] = b - x;
        buf[idx] = x + b * 0.5;
        idx = (idx + 1) % buf.length;
      }
    }
    return out;
  };
  return [channel(inL, 0), channel(inR, 23)];
}

// 16-bit stereo PCM WAV.
export function wav([left, right]) {
  const frames = left.length, data = Buffer.alloc(frames * 4);
  for (let i = 0; i < frames; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
  header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
