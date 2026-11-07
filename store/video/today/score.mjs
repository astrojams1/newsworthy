// The "today" Short's sound, synthesised from the same clock as the picture
// (timeline.js). Oscillators, filtered noise and arithmetic; nothing sampled.
//
// It starts on the first frame, as the picture does: a low hit and a warm pad
// in A major, then a light half-time groove under the reading, a pluck for
// each caption, air and a thump into the Home Screen, and the end card's
// chord and bell, ringing out into the loop. Most people hear a Short through
// a phone's speaker, so the low end carries harmonics an octave up.
import { BAR, BEAT, CUES, DURATION, seeded } from './timeline.js';

export const RATE = 48000;
const TAU = Math.PI * 2;
const N = Math.round(DURATION * RATE);
const at = t => Math.round(t * RATE);
const hz = s => 440 * 2 ** (s / 12);
const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const noise = seed => { const r = seeded(seed); return () => r() * 2 - 1; };

const NAMES = ['drums', 'music', 'lead', 'fx', 'room', 'hall'];
const B = Object.fromEntries(NAMES.map(n => [n, [new Float32Array(N), new Float32Array(N)]]));
const gains = p => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];
function out(name, { pan = 0, room = 0, hall = 0 } = {}) {
  const [l, r] = gains(pan), b = B[name];
  return (i, v) => {
    if (i < 0 || i >= N) return;
    b[0][i] += v * l; b[1][i] += v * r;
    if (room) { B.room[0][i] += v * l * room; B.room[1][i] += v * r * room; }
    if (hall) { B.hall[0][i] += v * l * hall; B.hall[1][i] += v * r * hall; }
  };
}
function svf() {
  let ic1 = 0, ic2 = 0;
  return (x, cutoff, q = 0.707, mode = 0) => {
    const g = Math.tan(Math.PI * Math.min(cutoff, RATE * 0.45) / RATE), k = 1 / q;
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    return mode === 0 ? v2 : mode === 1 ? v1 : x - k * v1 - v2;
  };
}
function saw() {
  let phase = 0;
  const blep = (t, dt) => (t < dt ? (t /= dt, t + t - t * t - 1) : t > 1 - dt ? (t = (t - 1) / dt, t * t + t + t + 1) : 0);
  return f => { const dt = f / RATE; phase += dt; if (phase >= 1) phase -= 1; return 2 * phase - 1 - blep(phase, dt); };
}

// ---------------------------------------------------------------- voices
function kick(t0, { gain = 1, f0 = 150, f1 = 48, decay = 0.28, drive = 2.2 } = {}) {
  const w = out('drums', { room: 0.03 });
  let phase = 0;
  for (let j = 0, len = at(decay * 5); j < len; j++) {
    const s = j / RATE, f = f1 + (f0 - f1) * Math.exp(-s / 0.038);
    phase += TAU * f / RATE;
    const env = Math.min(1, s / 0.0012) * Math.exp(-s / decay) * Math.min(1, (len - j) / 400);
    w(at(t0) + j, gain * env * Math.tanh(drive * Math.sin(phase)) / Math.tanh(drive));
  }
}
function hat(t0, { gain = 1, decay = 0.03, pan = 0.25 } = {}) {
  const w = out('drums', { pan, room: 0.08 }), n = noise(Math.round(t0 * 1031) + 7), f = svf();
  for (let j = 0, len = at(decay * 6); j < len; j++) {
    const s = j / RATE;
    w(at(t0) + j, gain * Math.exp(-s / decay) * Math.min(1, s / 0.0008) * f(n(), 7800, 0.7, 2));
  }
}
function snap(t0, { gain = 1, pan = 0 } = {}) {
  const w = out('drums', { pan, room: 0.3 }), n = noise(Math.round(t0 * 991) + 3), f = svf();
  for (let j = 0, len = at(0.3); j < len; j++) {
    const s = j / RATE;
    w(at(t0) + j, gain * Math.min(1, s / 0.001) * Math.exp(-s / 0.05) * f(n(), 1600, 1.2, 1) * 1.6);
  }
}
function pluck(t0, f, { gain = 1, decay = 0.25, bright = 3600, pan = 0, room = 0.25, bus = 'lead' } = {}) {
  const w = out(bus, { pan, room }), a = saw(), b = saw(), lp = svf();
  for (let j = 0, len = at(decay * 5); j < len; j++) {
    const s = j / RATE, env = Math.min(1, s / 0.002) * Math.exp(-s / decay) * Math.min(1, (len - j) / 1200);
    w(at(t0) + j, gain * env * lp(0.5 * a(f * 1.003) + 0.5 * b(f * 0.997), 300 + bright * Math.exp(-s / 0.07), 0.9, 0));
  }
}
function tick(t0, f, { gain = 1, pan = 0 } = {}) {
  const w = out('fx', { pan, room: 0.15 }), n = noise(Math.round(t0 * 1129) + 17), bp = svf();
  for (let j = 0, len = at(0.05); j < len; j++) {
    const s = j / RATE;
    w(at(t0) + j, gain * (Math.sin(TAU * f * s) * Math.exp(-s / 0.008) + 0.5 * bp(n(), f * 1.6, 2, 1) * Math.exp(-s / 0.004)));
  }
}
function bell(t0, f, { gain = 1, decay = 1.4, ratio = 3.5, index = 1.6, pan = 0 } = {}) {
  const w = out('lead', { pan, room: 0.2, hall: 0.5 });
  for (let j = 0, len = at(decay * 4); j < len; j++) {
    const s = j / RATE, env = Math.min(1, s / 0.003) * Math.exp(-s / decay) * Math.min(1, (len - j) / 2400);
    w(at(t0) + j, gain * env * Math.sin(TAU * f * s + index * Math.exp(-s / 0.2) * Math.sin(TAU * f * ratio * s)));
  }
}
function whoosh(t0, dur, { from = 300, to = 2200, gain = 1, pan0 = -0.5, pan1 = 0.5 } = {}) {
  const n = noise(5), f = svf();
  for (let j = 0, len = at(dur); j < len; j++) {
    const u = j / len, env = Math.sin(Math.PI * u) ** 2, [l, r] = gains(pan0 + (pan1 - pan0) * u), i = at(t0) + j;
    if (i >= N) break;
    const v = gain * env * f(n(), from * (to / from) ** u, 1, 1);
    B.fx[0][i] += v * l; B.fx[1][i] += v * r; B.room[0][i] += v * l * 0.2; B.room[1][i] += v * r * 0.2;
  }
}
function boom(t0, { gain = 1, f0 = 70, f1 = 34, decay = 0.8 } = {}) {
  const w = out('fx', { hall: 0.05 });
  let phase = 0;
  for (let j = 0, len = at(decay * 4); j < len; j++) {
    const s = j / RATE, f = f1 + (f0 - f1) * Math.exp(-s / 0.5);
    phase += TAU * f / RATE;
    const env = Math.min(1, s / 0.002) * Math.exp(-s / decay) * Math.min(1, (len - j) / 2400);
    w(at(t0) + j, gain * env * (Math.tanh(1.6 * Math.sin(phase)) + 0.3 * Math.sin(2 * phase)));
  }
}
// A soft supersaw pad, low-passed, for each chord span.
function pad(segments, { gain = 1, cutoff = 1400 } = {}) {
  const raw = [new Float32Array(N), new Float32Array(N)];
  for (const { from, to, notes, attack = 0.02, release = 0.6 } of segments) {
    for (const semitone of notes) for (const [v, cents] of [-12, -4, 4, 12].entries()) {
      const osc = saw(), [l, r] = gains((v - 1.5) * 0.45), f = hz(semitone) * 2 ** (cents / 1200), len = at(to - from + release);
      for (let j = 0, i = at(from); j < len && i < N; j++, i++) {
        const s = j / RATE, env = Math.min(1, s / attack) * clamp((to - from + release - s) / release) / Math.sqrt(notes.length * 4);
        const x = osc(f) * env;
        raw[0][i] += x * l; raw[1][i] += x * r;
      }
    }
  }
  const f = [[svf(), svf()], [svf(), svf()]];
  for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) B.music[c][i] += gain * f[c][1](f[c][0](raw[c][i], cutoff, 0.6), cutoff, 0.6);
}
function bass(t0, dur, root, { gain = 1 } = {}) {
  const w = out('music'), osc = saw(), lp = svf(), f = hz(root);
  let phase = 0;
  for (let j = 0, len = at(dur + 0.06); j < len; j++) {
    const s = j / RATE;
    phase += TAU * f / RATE;
    const env = Math.min(1, s / 0.004) * clamp((dur + 0.06 - s) / 0.06);
    w(at(t0) + j, gain * env * (0.55 * Math.sin(phase) + 0.5 * Math.tanh(1.5 * lp(osc(f * 2), 600 * (1 + 2.5 * Math.exp(-s / 0.06)), 0.9, 0))));
  }
}

// ---------------------------------------------------------------- the score
const CHORDS = { A: [-12, -8, -5, 2], E: [-10, -5, -1, 2], Fsm: [-12, -8, -3, 0], D: [-12, -7, -3, 4] };
const ROOTS = { A: -36, E: -29, Fsm: -27, D: -31 };
// One chord a bar until the end card, which holds A.
const PROGRESSION = ['A', 'E', 'Fsm', 'D', 'A', 'E'];
export function renderScore() {
  for (const n of NAMES) { B[n][0].fill(0); B[n][1].fill(0); }
  const end = CUES.phoneOut[0];
  // Frame 0: the hit, the pad and the bass, all at once.
  boom(0, { gain: 0.8 });
  kick(0, { gain: 0.9 });
  pad([...PROGRESSION.map((c, i) => ({ from: i * BAR, to: Math.min((i + 1) * BAR, end), notes: CHORDS[c] })),
    { from: CUES.icon[0], to: DURATION - 0.4, notes: [...CHORDS.A, 7], attack: 0.01, release: 0.4 }], { gain: 0.5 });
  PROGRESSION.forEach((c, i) => {
    for (const beat of [0, 1.5, 2.5]) if (i * BAR + beat * BEAT < end) bass(i * BAR + beat * BEAT, BEAT * (beat ? 0.9 : 1.4), ROOTS[c], { gain: 0.55 });
  });
  // A light half-time groove under the reading and the widgets.
  for (let t = 0; t < end - 0.01; t += BEAT / 2) {
    const beat = Math.round(t / BEAT * 2) % 8;
    if (t > 0 && beat % 4 === 0) kick(t, { gain: 0.7 });
    if (beat === 4) snap(t, { gain: 0.35 });
    if (t >= BAR / 2) hat(t, { gain: beat % 2 ? 0.16 : 0.1, pan: beat % 2 ? 0.3 : -0.2 });
  }
  // The sentence being set: soft ticks across it, rising.
  for (let k = 0; k < 5; k++) tick(CUES.sentence[0] + k * (CUES.sentence[1] - CUES.sentence[0]) / 5, 1400 + 140 * k, { gain: 0.16, pan: -0.4 + 0.2 * k });
  pluck(CUES.oneNumber, hz(4), { gain: 0.5, pan: -0.2 });
  pluck(CUES.oneSentence, hz(9), { gain: 0.5, pan: 0.2 });
  // Into the Home Screen.
  whoosh(CUES.home[0] - 0.15, 0.55, { gain: 0.35 });
  kick(CUES.medium, { gain: 0.8, decay: 0.35 });
  pluck(CUES.medium, hz(16), { gain: 0.35 });
  pluck(CUES.small, hz(21), { gain: 0.3, pan: 0.3 });
  // The end card: the phone drops, the chord, the bell for where to get it.
  whoosh(CUES.phoneOut[0], CUES.phoneOut[1] - CUES.phoneOut[0] + 0.1, { from: 1800, to: 200, gain: 0.3, pan0: 0.3, pan1: -0.3 });
  boom(CUES.icon[0], { gain: 0.6 });
  for (const [k, s] of [-12, -5, 0, 4, 7].entries()) pluck(CUES.icon[0] + k * 0.03, hz(s), { gain: 0.22, decay: 0.6, bright: 2600 });
  bell(CUES.store[0], hz(12), { gain: 0.32 });
  bell(CUES.store[0] + BEAT / 2, hz(19), { gain: 0.2, pan: 0.3 });
  return master();
}

// ---------------------------------------------------------------- mixing
let REPORT = null;
export const mixReport = () => REPORT;
const SECTIONS = [['reading', 0, CUES.home[0]], ['home', CUES.home[0], CUES.phoneOut[0]], ['end', CUES.phoneOut[0], DURATION]];
const CEILING = 10 ** (-2 / 20);
function master() {
  const room = reverb(B.room, 0.84, 0.4), hall = reverb(B.hall, 0.9, 0.3);
  const mix = [new Float32Array(N), new Float32Array(N)];
  for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) {
    mix[c][i] = B.drums[c][i] + 0.8 * B.music[c][i] + B.lead[c][i] + 0.85 * B.fx[c][i] + 0.3 * room[c][i] + 0.38 * hall[c][i];
  }
  let gain = 1;
  for (let pass = 0; pass < 3; pass++) {
    const trial = mix.map(ch => ch.map(v => v * gain));
    limit(trial, CEILING);
    gain *= 10 ** ((-14 - loudness(trial)) / 20);
  }
  for (const ch of mix) for (let i = 0; i < N; i++) ch[i] *= gain;
  const before = mix.map(ch => Float32Array.from(ch));
  limit(mix, CEILING);
  let worst = 0, over1 = 0, over3 = 0;
  for (let i = 0; i < N; i++) {
    const peak = Math.max(Math.abs(before[0][i]), Math.abs(before[1][i])), now = Math.max(Math.abs(mix[0][i]), Math.abs(mix[1][i]));
    if (peak < 1e-4) continue;
    const db = 20 * Math.log10(peak / Math.max(1e-9, now));
    worst = Math.max(worst, db); if (db > 1) over1++; if (db > 3) over3++;
  }
  const part = ([l, r], a, b) => [l.subarray(at(a), at(b)), r.subarray(at(a), at(b))];
  const buses = {};
  for (const name of ['drums', 'music', 'lead', 'fx']) buses[name] = Object.fromEntries(SECTIONS.map(([id, a, b]) => [id, loudness(part(B[name], a, b))]));
  REPORT = { buses, master: Object.fromEntries(SECTIONS.map(([id, a, b]) => [id, loudness(part(mix, a, b))])), bands: {}, reduction: { worst, over1: over1 / N, over3: over3 / N } };
  // The first samples ramp in a few milliseconds, so the hit lands on frame 0;
  // the last 0.4 s fade, into the loop.
  for (const ch of mix) for (let i = 0; i < N; i++) ch[i] *= Math.min(1, i / 96, (N - 1 - i) / (0.4 * RATE));
  return mix;
}
function limit([l, r], ceiling) {
  const len = l.length, look = at(0.005), need = new Float32Array(len), min = new Float32Array(len);
  for (let i = 0; i < len; i++) need[i] = Math.min(1, ceiling / Math.max(1e-9, Math.abs(l[i]), Math.abs(r[i])));
  const q = [];
  for (let i = len - 1; i >= 0; i--) {
    while (q.length && need[q[q.length - 1]] >= need[i]) q.pop();
    q.push(i);
    while (q[0] > i + look) q.shift();
    min[i] = need[q[0]];
  }
  const release = 1 - Math.exp(-1 / (0.12 * RATE));
  let sum = look, g = 1;
  for (let i = 0; i < len; i++) {
    sum += min[i] - (i >= look ? min[i - look] : 1);
    g = Math.min(sum / look, g + (1 - g) * release);
    l[i] *= g; r[i] *= g;
  }
}
// ITU-R BS.1770 integrated loudness: K-weighted, 400 ms blocks, gated.
export function loudness([l, r]) {
  const kw = x => {
    let y = Float64Array.from(x);
    for (const [[b0, b1, b2], [a1, a2]] of [[[1.53512485958697, -2.69169618940638, 1.19839281085285], [-1.69065929318241, 0.73248077421585]],
      [[1, -2, 1], [-1.99004745483398, 0.99007225036621]]]) {
      const o = new Float64Array(y.length);
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < y.length; i++) { const v = b0 * y[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = y[i]; y2 = y1; y1 = v; o[i] = v; }
      y = o;
    }
    return y;
  };
  const kl = kw(l), kr = kw(r), block = at(0.4), hop = at(0.1), blocks = [];
  for (let s = 0; s + block <= kl.length; s += hop) {
    let z = 0;
    for (let i = s; i < s + block; i++) z += kl[i] * kl[i] + kr[i] * kr[i];
    blocks.push(z / block);
  }
  const lufs = z => -0.691 + 10 * Math.log10(z);
  const loud = blocks.filter(z => lufs(z) > -70);
  if (!loud.length) return -Infinity;
  const mean = loud.reduce((a, b) => a + b, 0) / loud.length;
  const gated = loud.filter(z => lufs(z) > lufs(mean) - 10);
  return lufs(gated.reduce((a, b) => a + b, 0) / gated.length);
}
function reverb([inL, inR], feedback, damp) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], passes = [556, 441, 341, 225];
  const channel = (input, spread) => {
    const o = new Float32Array(N);
    for (const size of combs) {
      const buf = new Float32Array(Math.round((size + spread) * RATE / 44100));
      let idx = 0, store = 0;
      for (let i = 0; i < N; i++) {
        const y = buf[idx];
        store = y * (1 - damp) + store * damp;
        buf[idx] = input[i] * 0.015 + store * feedback;
        idx = (idx + 1) % buf.length;
        o[i] += y;
      }
    }
    for (const size of passes) {
      const buf = new Float32Array(Math.round((size + spread) * RATE / 44100));
      let idx = 0;
      for (let i = 0; i < N; i++) { const b = buf[idx], x = o[i]; o[i] = b - x; buf[idx] = x + b * 0.5; idx = (idx + 1) % buf.length; }
    }
    return o;
  };
  return [channel(inL, 0), channel(inR, 23)];
}
export function wav([left, right]) {
  const frames = left.length, data = Buffer.alloc(frames * 4), dither = seeded(31);
  const q = v => Math.round(Math.max(-1, Math.min(1, v)) * 32767 + dither() - dither());
  for (let i = 0; i < frames; i++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, q(left[i]))), i * 4);
    data.writeInt16LE(Math.max(-32768, Math.min(32767, q(right[i]))), i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
  header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
