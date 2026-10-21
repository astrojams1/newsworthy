// The trailer's sound, synthesised from the same clock as the picture
// (timeline.js), so every blip, digit and stab lands on the frame that causes
// it. Nothing is sampled or licensed: every sound is oscillators, filtered
// noise and arithmetic.
//
// It tells the story in two keys. The noise is A minor: a clock that ticks in
// quarters, then eighths, then sixteenths, a pulse that opens up, one blip for
// every notification on screen, and a riser into a hard cut. The hush is
// silence, a sub drop and one bell. From the drop the film is in A major at
// 120 BPM: a half-time groove, a rising note for every digit as the number
// climbs the scale, the notification's two-note chime, three stabs for the
// price, and a chord for the name.
//
// Most people hear a Short through a phone's speaker, which plays almost
// nothing below 150 Hz, so the low end carries harmonics: the kick and the
// bass are driven, and every sub has a voice an octave or two above it.
import { BEAT, CUES, DOWN, DURATION, HUSH, PINGS, ROLL, bar, downCrossings, seeded } from './timeline.js';

export const RATE = 48000;
const TAU = Math.PI * 2;
const N = Math.round(DURATION * RATE);
const at = t => Math.round(t * RATE);
// Semitones from A4.
const hz = s => 440 * 2 ** (s / 12);
const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const noise = seed => { const r = seeded(seed); return () => r() * 2 - 1; };

// ---------------------------------------------------------------- buses
// Everything heard before the hush is mixed apart from everything after, so
// the cut can silence it, reverb tails and all, in a single frame.
const NAMES = ['drums', 'music', 'lead', 'fx', 'room', 'hall', 'echo'];
const buses = () => Object.fromEntries(NAMES.map(n => [n, [new Float32Array(N), new Float32Array(N)]]));
const PRE = buses(), POST = buses();
const gains = p => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];
// A writer onto a bus, panned, with its sends; t0 decides which side of the hush.
function out(name, t0, { pan = 0, room = 0, hall = 0, echo = 0 } = {}) {
  const set = t0 < HUSH - 1e-6 ? PRE : POST, [l, r] = gains(pan), b = set[name];
  return (i, v) => {
    if (i < 0 || i >= N) return;
    b[0][i] += v * l; b[1][i] += v * r;
    if (room) { set.room[0][i] += v * l * room; set.room[1][i] += v * r * room; }
    if (hall) { set.hall[0][i] += v * l * hall; set.hall[1][i] += v * r * hall; }
    if (echo) { set.echo[0][i] += v * l * echo; set.echo[1][i] += v * r * echo; }
  };
}

// ---------------------------------------------------------------- tools
// Zavalishin's state-variable filter; mode 0 low, 1 band, 2 high.
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
// A band-limited sawtooth: PolyBLEP smooths the jump, so high notes do not alias.
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
function saw() {
  let phase = 0;
  return f => {
    const dt = f / RATE;
    phase += dt; if (phase >= 1) phase -= 1;
    return 2 * phase - 1 - blep(phase, dt);
  };
}

// ---------------------------------------------------------------- drums
function kick(t0, { gain = 1, f0 = 155, f1 = 47, decay = 0.3, drive = 2.2 } = {}) {
  const w = out('drums', t0, { room: 0.03 }), n = noise(Math.round(t0 * 977) + 1);
  let phase = 0;
  for (let j = 0, len = at(decay * 5); j < len; j++) {
    const s = j / RATE, f = f1 + (f0 - f1) * Math.exp(-s / 0.038);
    phase += TAU * f / RATE;
    const env = Math.min(1, s / 0.0012) * Math.exp(-s / decay) * Math.min(1, (len - j) / 400);
    const click = s < 0.005 ? n() * 0.35 * (1 - s / 0.005) : 0;
    w(at(t0) + j, gain * (env * Math.tanh(drive * Math.sin(phase)) / Math.tanh(drive) + click));
  }
}
function clap(t0, { gain = 1, pan = 0, tone = 1250, room = 0.3, hall = 0 } = {}) {
  const w = out('drums', t0, { pan, room, hall }), n = noise(Math.round(t0 * 991) + 3), f = svf(), f2 = svf();
  for (let j = 0, len = at(0.45); j < len; j++) {
    const s = j / RATE;
    let env = 0;
    for (const d of [0, 0.0095, 0.019]) if (s >= d) env = Math.max(env, Math.exp(-(s - d) / 0.0055));
    if (s >= 0.026) env = Math.max(env, 0.6 * Math.exp(-(s - 0.026) / 0.085));
    const x = n();
    w(at(t0) + j, gain * env * (f(x, tone, 1.3, 1) * 1.6 + 0.35 * f2(x, 4500, 0.8, 2)));
  }
}
function snare(t0, { gain = 1, pan = 0, room = 0.25 } = {}) {
  const w = out('drums', t0, { pan, room }), n = noise(Math.round(t0 * 1013) + 5), f = svf();
  let phase = 0;
  for (let j = 0, len = at(0.22); j < len; j++) {
    const s = j / RATE;
    phase += TAU * (185 + 60 * Math.exp(-s / 0.01)) / RATE;
    const body = Math.sin(phase) * Math.exp(-s / 0.045) * 0.6;
    const rattle = f(n(), 3200, 0.7, 2) * Math.exp(-s / 0.06);
    w(at(t0) + j, gain * Math.min(1, s / 0.001) * (body + rattle));
  }
}
function hat(t0, { gain = 1, decay = 0.032, pan = 0.25 } = {}) {
  const w = out('drums', t0, { pan, room: 0.08 }), n = noise(Math.round(t0 * 1031) + 7), f = svf(), g = svf();
  // Six detuned squares make the metal; noise makes the air.
  const freqs = [205.3, 304.4, 369.6, 522.7, 540, 800].map(x => x * 1.85);
  for (let j = 0, len = at(decay * 6); j < len; j++) {
    const s = j / RATE;
    let metal = 0;
    for (const fr of freqs) metal += Math.sign(Math.sin(TAU * fr * s));
    const x = metal * 0.12 + n() * 0.7;
    w(at(t0) + j, gain * Math.exp(-s / decay) * Math.min(1, s / 0.0008) * g(f(x, 7800, 0.7, 2), 9000, 0.7, 2));
  }
}
function shaker(t0, { gain = 1, pan = -0.3 } = {}) {
  const w = out('drums', t0, { pan, room: 0.1 }), n = noise(Math.round(t0 * 1049) + 9), f = svf();
  for (let j = 0, len = at(0.09); j < len; j++) {
    const s = j / RATE;
    w(at(t0) + j, gain * Math.min(1, s / 0.007) * Math.exp(-s / 0.03) * f(n(), 6200, 0.9, 1));
  }
}
function cymbal(t0, { gain = 1, decay = 1.3, pan = 0, hall = 0.35 } = {}) {
  const w = out('fx', t0, { pan, hall }), n = noise(Math.round(t0 * 1061) + 11), f = svf(), g = svf();
  const freqs = [205.3, 304.4, 369.6, 522.7, 540, 800].map(x => x * 2.9);
  for (let j = 0, len = at(decay * 4.5); j < len; j++) {
    const s = j / RATE;
    let metal = 0;
    for (const fr of freqs) metal += Math.sign(Math.sin(TAU * fr * s));
    const x = metal * 0.1 + n() * 0.8;
    const env = Math.min(1, s / 0.002) * (0.55 * Math.exp(-s / 0.12) + 0.45 * Math.exp(-s / decay)) * Math.min(1, (len - j) / 4800);
    w(at(t0) + j, gain * env * g(f(x, 4200, 0.7, 2), 14000, 0.7, 0));
  }
}
// A cymbal played backwards: noise that swells and stops dead on `end`.
function reverseCymbal(end, dur, { gain = 1, pan = 0 } = {}) {
  const t0 = end - dur, w = out('fx', t0, { pan, hall: 0.15 }), n = noise(Math.round(end * 1087) + 13), f = svf();
  for (let j = 0, len = at(dur); j < len; j++) {
    const u = j / len;
    w(at(t0) + j, gain * (Math.exp(5 * u) - 1) / (Math.exp(5) - 1) * f(n(), 2500 + 6000 * u, 0.6, 2) * Math.min(1, (len - j) / 120));
  }
}

// ---------------------------------------------------------------- tones
// A soft mallet: fundamental, a little octave, a trace of the twelfth.
function mallet(t0, f, { gain = 1, decay = 0.35, pan = 0, room = 0.3, hall = 0, echo = 0, bus = 'lead' } = {}) {
  const w = out(bus, t0, { pan, room, hall, echo }), n = noise(Math.round(t0 * 1103 + f) + 15);
  for (let j = 0, len = at(decay * 6); j < len; j++) {
    const s = j / RATE, env = Math.min(1, s / 0.002) * Math.exp(-s / decay) * Math.min(1, (len - j) / 2400);
    const tone = Math.sin(TAU * f * s) + 0.25 * Math.sin(TAU * 2 * f * s) * Math.exp(-s / (decay * 0.4)) + 0.08 * Math.sin(TAU * 3 * f * s) * Math.exp(-s / (decay * 0.2));
    const strike = s < 0.004 ? n() * 0.2 * (1 - s / 0.004) : 0;
    w(at(t0) + j, gain * (env * tone + strike));
  }
}
// A frequency-modulated bell; its brightness fades faster than its body.
function bell(t0, f, { gain = 1, decay = 1.2, ratio = 3.5, index = 2, pan = 0, room = 0.2, hall = 0.5, bus = 'lead' } = {}) {
  const w = out(bus, t0, { pan, room, hall });
  for (let j = 0, len = at(decay * 4); j < len; j++) {
    const s = j / RATE, env = Math.min(1, s / 0.003) * Math.exp(-s / decay) * Math.min(1, (len - j) / 2400);
    w(at(t0) + j, gain * env * Math.sin(TAU * f * s + index * Math.exp(-s / 0.2) * Math.sin(TAU * f * ratio * s)));
  }
}
// A plucked synth: two saws through a low-pass whose envelope snaps shut.
function pluck(t0, f, { gain = 1, decay = 0.2, bright = 3800, pan = 0, room = 0.15, echo = 0, bus = 'music' } = {}) {
  const w = out(bus, t0, { pan, room, echo }), a = saw(), b = saw(), lp = svf();
  for (let j = 0, len = at(decay * 5); j < len; j++) {
    const s = j / RATE, env = Math.min(1, s / 0.002) * Math.exp(-s / decay) * Math.min(1, (len - j) / 1200);
    const x = 0.5 * a(f * 1.003) + 0.5 * b(f * 0.997);
    w(at(t0) + j, gain * env * lp(x, 300 + bright * Math.exp(-s / 0.07), 0.9, 0));
  }
}
// A short, bright chord: the price's stabs and the drop's hit.
function stab(t0, notes, { gain = 1, decay = 0.28, cutoff = 5200 } = {}) {
  for (const [k, semitone] of notes.entries()) {
    for (const [v, cents] of [-11, -4, 4, 11].entries()) {
      const w = out('music', t0, { pan: (v - 1.5) * 0.4, room: 0.25, hall: 0.12 }), osc = saw(), lp = svf(), f = hz(semitone) * 2 ** (cents / 1200);
      for (let j = 0, len = at(decay * 5); j < len; j++) {
        const s = j / RATE, env = Math.min(1, s / 0.003) * Math.exp(-s / decay) * Math.min(1, (len - j) / 1200);
        w(at(t0) + j, gain * 0.25 * env * lp(osc(f), 500 + cutoff * Math.exp(-s / 0.12), 0.8, 0) / Math.sqrt(notes.length) * (k === notes.length - 1 ? 1.3 : 1));
      }
    }
  }
}
// A notification from somebody else's app: two quick glassy notes.
function blip(t0, f, { gain = 1, pan = 0, interval = 1.5 } = {}) {
  const w = out('fx', t0, { pan, room: 0.2 });
  for (const [k, freq] of [f, f * interval].entries()) {
    const start = at(t0 + k * 0.07);
    for (let j = 0, len = at(0.16); j < len; j++) {
      const s = j / RATE, env = Math.min(1, s / 0.002) * Math.exp(-s / 0.045);
      w(start + j, gain * env * Math.sin(TAU * freq * s + 0.8 * Math.exp(-s / 0.03) * Math.sin(TAU * freq * 2 * s)));
    }
  }
}
// A clock's tick: a small wooden knock.
function tick(t0, f, { gain = 1, pan = 0 } = {}) {
  const w = out('fx', t0, { pan, room: 0.12 }), n = noise(Math.round(t0 * 1129) + 17), bp = svf();
  for (let j = 0, len = at(0.05); j < len; j++) {
    const s = j / RATE;
    w(at(t0) + j, gain * (Math.sin(TAU * f * s) * Math.exp(-s / 0.008) + 0.5 * bp(n(), f * 1.6, 2, 1) * Math.exp(-s / 0.004)));
  }
}
// Air: noise through a band-pass swept between two frequencies.
function whoosh(t0, dur, { from = 300, to = 1800, gain = 1, q = 1, pan0 = 0, pan1 = 0, seed = 3 } = {}) {
  const n = noise(seed), f = svf();
  for (let j = 0, len = at(dur); j < len; j++) {
    const u = j / len, env = Math.sin(Math.PI * u) ** 2 * (u < 0.5 ? 1 : 1 - 0.3 * (u - 0.5));
    const p = pan0 + (pan1 - pan0) * u, [l, r] = gains(p), v = gain * env * f(n(), from * (to / from) ** u, q, 1);
    const set = t0 < HUSH - 1e-6 ? PRE : POST, i = at(t0) + j;
    if (i >= N) break;
    set.fx[0][i] += v * l; set.fx[1][i] += v * r;
    set.room[0][i] += v * l * 0.2; set.room[1][i] += v * r * 0.2;
  }
}
// A low boom that falls in pitch: the hush, the drop, the price.
function boom(t0, { gain = 1, f0 = 62, f1 = 30, glide = 0.9, decay = 0.9, drive = 1.6 } = {}) {
  const w = out('fx', t0, { hall: 0.05 });
  let phase = 0;
  for (let j = 0, len = at(decay * 4); j < len; j++) {
    const s = j / RATE, f = f1 + (f0 - f1) * Math.exp(-s / glide);
    phase += TAU * f / RATE;
    const env = Math.min(1, s / 0.004) * Math.exp(-s / decay) * Math.min(1, (len - j) / 2400);
    w(at(t0) + j, gain * env * Math.tanh(drive * Math.sin(phase)) / Math.tanh(drive));
  }
}
// A rising sweep of noise and a gliding tone, into a cue.
function riser(t0, t1, { gain = 1, from = 500, to = 9000, glide = [-12, 12] } = {}) {
  const w = out('fx', t0, { room: 0.2, hall: 0.2 }), n = noise(Math.round(t0 * 1151) + 19), f = svf(), osc = saw(), lp = svf();
  for (let j = 0, len = at(t1 - t0); j < len; j++) {
    const u = j / len, env = u ** 2.2 * Math.min(1, (len - j) / 96);
    const air = f(n(), from * (to / from) ** u, 1.2, 1);
    const tone = lp(osc(hz(glide[0] + (glide[1] - glide[0]) * u)), 1200 + 5000 * u, 0.8, 0) * 0.25;
    w(at(t0) + j, gain * env * (air + tone));
  }
}

// ---------------------------------------------------------------- harmony
// Pad chords, per bar, voiced close in the middle of the keyboard.
const CHORD = {
  Am: [-12, -9, -5, 0], F: [-16, -12, -9, -4], Dm: [-19, -12, -7, -4], E: [-17, -13, -10, -5],
  A: [-12, -8, -5, 2], Emaj: [-10, -5, -1, 2], Fsm: [-12, -8, -3, 0], D: [-12, -7, -3, 4], Aend: [-12, -8, -5, -1, 2],
};
const ROOT = { Am: -36, F: -40, Dm: -31, E: -29, A: -36, Emaj: -29, Fsm: -27, D: -31, Aend: -36 };
// Bars 6 to 16: the groove, the price, the build, the name.
const PROGRESSION = [['A', 6], ['Emaj', 7], ['Fsm', 8], ['D', 9], ['A', 10], ['Emaj', 11], ['Fsm', 12], ['A', 13], ['Emaj', 14], ['D', 15], ['Aend', 16]];
const ACT_ONE = [['Am', 1], ['F', 2], ['Dm', 3], ['E', 4]];
// The digits climb A major pentatonic, as the store reel's do.
const DIGIT = [0, 2, 4, 7, 9, 12, 14, 16, 19, 24];

// A supersaw pad: four detuned saws per note, spread across the field,
// summed raw so one filter can follow the scene.
function padLayer(segments, cutoffAt, { gain = 1, duck = null, bus = 'music', when }) {
  const raw = [new Float32Array(N), new Float32Array(N)];
  for (const { from, to, notes, attack = 0.04, release = 0.25 } of segments) {
    for (const semitone of notes) {
      for (const [v, cents] of [-13, -5, 5, 13].entries()) {
        const osc = saw(), [l, r] = gains((v - 1.5) * 0.45), f = hz(semitone) * 2 ** (cents / 1200), len = at(to - from + release);
        for (let j = 0, i = at(from); j < len && i < N; j++, i++) {
          const s = j / RATE, env = Math.min(1, s / attack) * clamp((to - from + release - s) / release) / Math.sqrt(notes.length * 4);
          const x = osc(f) * env;
          raw[0][i] += x * l; raw[1][i] += x * r;
        }
      }
    }
  }
  const lpL = [svf(), svf()], lpR = [svf(), svf()];
  for (const [set, range] of [[PRE, [0, at(HUSH)]], [POST, [at(HUSH), N]]]) {
    if (when && !when(set)) continue;
    const b = set[bus];
    for (let i = range[0]; i < range[1]; i++) {
      const c = cutoffAt(i / RATE), d = duck ? duck[i] : 1;
      b[0][i] += gain * d * lpL[1](lpL[0](raw[0][i], c, 0.6), c, 0.6);
      b[1][i] += gain * d * lpR[1](lpR[0](raw[1][i], c, 0.6), c, 0.6);
    }
  }
}
// Bass: a driven saw an octave above a sine, so a phone hears the line.
function bassNote(t0, dur, root, { gain = 1, cutoff = 600, pluckiness = 2.5, duck = null } = {}) {
  const w = out('music', t0), osc = saw(), lp = svf(), f = hz(root);
  let phase = 0;
  for (let j = 0, len = at(dur + 0.06); j < len; j++) {
    const s = j / RATE, i = at(t0) + j;
    phase += TAU * f / RATE;
    const env = Math.min(1, s / 0.004) * clamp((dur + 0.06 - s) / 0.06);
    const c = cutoff * (1 + pluckiness * Math.exp(-s / 0.06));
    const x = 0.55 * Math.sin(phase) + 0.6 * Math.tanh(1.5 * lp(osc(f * 2), c, 0.9, 0));
    w(i, gain * env * x * (duck && i < N ? duck[i] : 1));
  }
}

// ---------------------------------------------------------------- the score
export function renderScore() {
  for (const set of [PRE, POST]) for (const n of NAMES) { set[n][0].fill(0); set[n][1].fill(0); }

  // ---- sidechain: the music breathes around every kick from the drop on
  const kicks = [];
  const duck = new Float32Array(N).fill(1);
  const K = (t, opts = {}) => {
    kicks.push(t);
    kick(t, opts);
    for (let j = 0, len = at(0.4); j < len; j++) {
      const i = at(t) + j; if (i >= N) break;
      const s = j / RATE, d = 1 - 0.6 * Math.min(1, s / 0.004) * Math.exp(-s / 0.11);
      duck[i] = Math.min(duck[i], d);
    }
  };

  // ================================================================ I. the noise
  // A low drone from the first frame, the pad's minor chords above it.
  {
    const w = out('music', 0);
    for (let i = 0, len = at(HUSH); i < len; i++) {
      const t = i / RATE, env = Math.min(1, t / 1.6);
      w(i, 0.2 * env * (Math.sin(TAU * 55 * t) + (0.45 * Math.sin(TAU * 110 * t + 0.4) + 0.2 * Math.sin(TAU * 165 * t + 1.1)) * (0.6 + 0.4 * Math.sin(TAU * 0.5 * t))));
    }
  }
  padLayer(ACT_ONE.map(([c, n]) => ({ from: bar(n), to: bar(n + 1), notes: CHORD[c], attack: n === 1 ? 1.2 : 0.06, release: 0.05 })),
    t => 380 + 1900 * (t / HUSH) ** 1.6, { gain: 0.38, when: set => set === PRE });
  // The clock: quarters, then eighths, then sixteenths.
  for (let t = 0, k = 0; t < HUSH - 1e-6; k++) {
    const step = t < bar(3) ? BEAT : t < bar(4) ? BEAT / 2 : BEAT / 4;
    tick(t, k % 2 ? 1900 : 2500, { gain: 0.42 + 0.26 * (t / HUSH), pan: k % 2 ? 0.25 : -0.25 });
    t += step;
  }
  // The pulse: eighths from bar 2, the filter opening as the day runs on.
  for (let t = bar(2); t < HUSH - 1e-6; t += BEAT / 2) {
    const n = Math.floor(t / 2) + 1, chord = ACT_ONE[n - 1][0];
    const octave = n === 4 && Math.round(t / (BEAT / 2)) % 2 ? 12 : 0;
    bassNote(t, BEAT / 2 - 0.03, ROOT[chord] - (chord === 'E' ? 12 : 0) + octave, { gain: 0.34, cutoff: 260 + 900 * (t / HUSH) ** 1.5 });
  }
  // A heartbeat kick from bar 3; a roll and a riser through bar 4.
  for (let t = bar(3); t < HUSH - 1e-6; t += BEAT) kick(t, { gain: 0.55, decay: 0.22 });
  for (let t = bar(4) + 2 * BEAT, k = 0; t < HUSH - 1e-6; k++) {
    snare(t, { gain: 0.12 + 0.36 * ((t - bar(4) - 2 * BEAT) / BEAT) ** 1.5, pan: k % 2 ? 0.15 : -0.15 });
    t += t < bar(4) + 3 * BEAT ? BEAT / 4 : BEAT / 8;
  }
  riser(bar(4) - 0.5, HUSH, { gain: 0.5, glide: [-17, 19] });
  // A blip for every notification on screen, quieter as they pile up.
  const BLIPS = [hz(14), hz(15), hz(17), hz(19), hz(20), hz(22), hz(24), hz(26), hz(27)];
  PINGS.forEach((p, k) => {
    const crowd = PINGS.filter(q => Math.abs(q.t - p.t) < 0.5).length;
    blip(p.t, BLIPS[Math.floor(p.pitch * BLIPS.length)], { gain: 0.55 / Math.sqrt(crowd), pan: p.pan * 0.8, interval: k % 3 ? 1.5 : 1.335 });
  });
  // The words land with a soft knock; the feed lurches with a rush of air.
  for (const t of [CUES.everyDay[0], CUES.thousands[0], CUES.doomscroll[0], CUES.allDay[0]]) boom(t, { gain: 0.35, f0: 110, f1: 70, glide: 0.05, decay: 0.12, drive: 2 });
  whoosh(CUES.scatter[0] - 0.08, 0.75, { from: 2400, to: 300, gain: 0.55, q: 0.9, pan0: -0.6, pan1: 0.6, seed: 21 });

  // ================================================================ II. the hush
  boom(HUSH, { gain: 0.32, f0: 60, f1: 30, glide: 0.7, decay: 0.9, drive: 1 });
  bell(CUES.orSee[0], hz(7), { gain: 0.22, decay: 2.2, ratio: 3.5, index: 1.4, hall: 0.9 });
  // The ring of light on the beat, and a swell into the drop.
  bell(CUES.ring, hz(16), { gain: 0.15, decay: 1.8, ratio: 2.76, index: 1.2, pan: 0.15, hall: 0.9 });
  bell(CUES.ring + 0.02, hz(12), { gain: 0.12, decay: 1.8, ratio: 2.76, index: 1.2, pan: -0.15, hall: 0.9 });
  boom(CUES.ring, { gain: 0.5, f0: 90, f1: 50, glide: 0.2, decay: 0.4 });
  whoosh(CUES.ring - 0.02, 0.6, { from: 250, to: 1500, gain: 0.35, q: 0.8, seed: 23 });
  reverseCymbal(CUES.drop, 1.0, { gain: 0.5 });
  padLayer([{ from: CUES.ring + 0.25, to: CUES.drop, notes: CHORD.A, attack: 0.75, release: 0.02 }], t => 300 + 3600 * clamp((t - CUES.ring) / 1) ** 2, { gain: 0.42, when: set => set === POST });

  // ================================================================ III. the drop and the groove
  const groove = (from, to) => {
    for (let n = from; n <= to; n++) {
      const b = bar(n), half = n <= 7;
      if (half) { K(b); K(b + 3 * BEAT / 2, { gain: 0.75 }); clap(b + 2 * BEAT, { gain: 0.7 }); }
      else { K(b); K(b + 2 * BEAT); K(b + 3.5 * BEAT, { gain: 0.6 }); clap(b + BEAT, { gain: 0.6 }); clap(b + 3 * BEAT, { gain: 0.65 }); }
      for (let k = 0; k < 8; k++) hat(b + (k + 0.5) * BEAT / 2, { gain: k % 2 ? 0.6 : 0.42, pan: 0.3 });
      if (!half) for (let k = 0; k < 16; k++) shaker(b + k * BEAT / 4 + 0.006 * (k % 2), { gain: k % 4 === 2 ? 0.5 : 0.28 });
    }
  };
  // The drop's hit.
  cymbal(CUES.drop, { gain: 0.5, decay: 1.4, hall: 0.4 });
  boom(CUES.drop, { gain: 0.9, f0: 70, f1: 40, glide: 0.25, decay: 0.7 });
  stab(CUES.drop, [-24, ...CHORD.A], { gain: 0.9, decay: 0.45 });
  groove(6, 11);
  // Bar 12 stops halfway, leaving room for the price.
  K(bar(12)); clap(bar(12) + BEAT, { gain: 0.6 });
  // The price's kicks are placed now, so the bass and pad duck under them too.
  const STABS = [[CUES.noAds, [-24, -12, -8, -5, 4]], [CUES.noSubscription, [-24, -12, -8, -5, 7]], [CUES.noPurchases, [-29, -10, -5, -1, 11]]];
  K(CUES.dollar, { gain: 1.15 });
  for (const [t] of STABS) K(t, { gain: 0.95 });
  for (let t = bar(14) + BEAT; t < bar(15) - 1e-6; t += BEAT) K(t, { gain: 0.85 });
  for (let k = 0; k < 4; k++) hat(bar(12) + (k + 0.5) * BEAT / 2, { gain: 0.38, pan: 0.3 });
  // Bass and pad from the drop to the price, then through the build and the name.
  for (const [chord, n] of PROGRESSION) {
    if (n === 13 || n >= 15) continue;
    const end = n === 12 ? bar(12) + 2 * BEAT : bar(n + 1);
    for (let t = bar(n); t < end - 1e-6; t += BEAT / 2) bassNote(t, BEAT / 2 - 0.04, ROOT[chord] - 12 + (n === 14 && Math.round(t / (BEAT / 2)) % 2 ? 12 : 0), { gain: 0.5, cutoff: 420, duck });
  }
  // The name's chord arrives with the icon, half a bar early.
  padLayer(PROGRESSION.filter(([, n]) => n !== 13).map(([chord, n]) => ({ from: n === 16 ? CUES.icon[0] : bar(n), to: n === 12 ? bar(12) + 2 * BEAT : n === 16 ? DURATION - 0.3 : n === 15 ? CUES.icon[0] : bar(n + 1), notes: CHORD[chord],
    attack: n >= 15 ? 0.5 : 0.03, release: n >= 15 ? 0.6 : 0.12 })), t => {
    // Open through the groove; dark under the lock screen's wipe; opening again into the build.
    if (t < bar(14)) return 2600 - 1900 * Math.exp(-(((t - CUES.night[0] - 0.35) / 0.35) ** 2));
    if (t < bar(15)) return 1600 + 3000 * ((t - bar(14)) / 4) ** 2;
    return 2200;
  }, { gain: 0.42, duck, when: set => set === POST });
  // The number climbs: one note per digit, landing with it.
  ROLL.forEach((step, i) => {
    mallet(step.lands, hz(DIGIT[i]), { gain: 0.32 + 0.02 * i, decay: i === 9 ? 0.9 : 0.3, pan: -0.35 + 0.07 * i, room: 0.3, echo: 0.12 });
    if (i === 9) { bell(step.lands, hz(DIGIT[9] + 12), { gain: 0.14, decay: 1.1, hall: 0.6 }); cymbal(step.lands, { gain: 0.25, decay: 1.0 }); }
  });
  // And falls, a note each time it passes a digit.
  for (const { digit, t } of downCrossings()) mallet(t, hz(DIGIT[digit - 1]), { gain: digit === DOWN.to ? 0.3 : 0.17, decay: digit === DOWN.to ? 0.6 : 0.2, pan: 0.25 - 0.05 * (9 - digit), echo: 0.1 });
  whoosh(DOWN.start, 0.8, { from: 1800, to: 300, gain: 0.25, q: 0.9, pan0: 0.3, pan1: -0.1, seed: 25 });
  // The sentence set down, line by line, and the story's line beneath it.
  for (let i = 0; i < 4; i++) tick(CUES.bars[0] + i * BEAT / 4, 2600 + 220 * i, { gain: 0.1, pan: -0.25 + 0.15 * i });
  tick(CUES.storyLine[0], 3400, { gain: 0.07, pan: 0.2 });
  // The arpeggio joins from bar 8: sixteenths over each chord, echoing.
  for (const [chord, n] of PROGRESSION) {
    if (n < 8 || n > 12) continue;
    const tones = CHORD[chord].map(s => s + 12), order = [0, 1, 2, 3, 2, 1, 2, 3];
    const end = n === 12 ? bar(12) + 2 * BEAT : bar(n + 1);
    for (let k = 0, t = bar(n); t < end - 1e-6; k++, t += BEAT / 4) pluck(t, hz(tones[order[k % 8]]), { gain: 0.13 * (k % 4 === 0 ? 1.15 : 1), decay: 0.12, pan: k % 2 ? 0.35 : -0.35, echo: 0.22, bright: 3000 });
  }

  // ================================================================ IV. the Home Screen
  whoosh(CUES.widget[0] - 0.05, 0.7, { from: 2400, to: 260, gain: 0.5, q: 0.9, pan0: 0.1, pan1: -0.1, seed: 27 });
  boom(CUES.widget[0] + 0.45, { gain: 0.45, f0: 80, f1: 52, glide: 0.08, decay: 0.18 });
  // Each icon arrives with a small note, the small widget with two.
  for (let i = 0; i < 12; i++) mallet(CUES.icons[0] + 0.035 * i + 0.03, hz([12, 14, 16, 19, 21, 24][i % 6] + (i >= 6 ? 0 : 0)), { gain: 0.05, decay: 0.08, pan: -0.5 + i / 11, room: 0.2 });
  mallet(CUES.small + 0.06, hz(7), { gain: 0.16, decay: 0.3, pan: -0.25 });
  mallet(CUES.small + 0.14, hz(12), { gain: 0.13, decay: 0.3, pan: -0.3 });
  whoosh(CUES.pushHome[0] - 0.05, 0.55, { from: 400, to: 3200, gain: 0.32, q: 0.8, seed: 29 });
  whoosh(CUES.pushHome[1] - 0.1, 0.5, { from: 2400, to: 500, gain: 0.25, q: 0.8, seed: 31 });

  // ================================================================ V. the notification
  whoosh(CUES.night[0] - 0.08, 0.8, { from: 180, to: 1100, gain: 0.55, q: 0.8, pan0: -0.4, pan1: 0.4, seed: 33 });
  boom(CUES.night[0] + 0.4, { gain: 0.5, f0: 58, f1: 38, glide: 0.2, decay: 0.45 });
  bell(CUES.notification + 0.08, hz(19), { gain: 0.3, decay: 0.9, ratio: 2.76, index: 1.6, pan: -0.1, hall: 0.35 });
  bell(CUES.notification + 0.21, hz(24), { gain: 0.3, decay: 1.1, ratio: 2.76, index: 1.6, pan: 0.1, hall: 0.35 });
  whoosh(CUES.pushNote[0] - 0.05, 0.55, { from: 400, to: 3200, gain: 0.3, q: 0.8, seed: 35 });

  // ================================================================ VI. the price
  reverseCymbal(CUES.dollar, 1.4, { gain: 0.55 });
  whoosh(CUES.phoneOut[0] - 0.05, 0.5, { from: 2600, to: 220, gain: 0.45, q: 0.9, seed: 37 });
  boom(CUES.dollar, { gain: 1, f0: 66, f1: 36, glide: 0.35, decay: 0.9 });
  cymbal(CUES.dollar, { gain: 0.55, decay: 1.6, hall: 0.45 });
  stab(CUES.dollar, [-24, ...CHORD.A], { gain: 1, decay: 0.6 });
  // "once", and the scale's ten colours drawn in: a ripple up the pentatonic.
  mallet(CUES.once, hz(12), { gain: 0.2, decay: 0.5, room: 0.3, hall: 0.2 });
  for (let i = 0; i < 10; i++) mallet(CUES.once + 0.035 * i, hz(DIGIT[i] + 12), { gain: 0.06, decay: 0.15, pan: -0.5 + i / 9, echo: 0.1 });
  // Three stabs, one per line, the top note rising.
  for (const [t, notes] of STABS) { clap(t, { gain: 0.55 }); stab(t, notes, { gain: 0.85, decay: 0.3 }); }
  // The build: quarter kicks (placed above), a tightening roll, a riser, and a cut.
  for (let k = 0; k < 16; k++) hat(bar(14) + k * BEAT / 4, { gain: 0.3 + 0.2 * (k / 16), pan: k % 2 ? 0.3 : -0.3 });
  for (let t = bar(14) + 2 * BEAT, k = 0; t < bar(15) - 1e-6; k++) {
    snare(t, { gain: 0.15 + 0.45 * ((t - bar(14) - 2 * BEAT) / (2 * BEAT)) ** 1.4, pan: k % 2 ? 0.15 : -0.15 });
    t += t < bar(14) + 3 * BEAT ? BEAT / 4 : BEAT / 8;
  }
  riser(bar(14) + BEAT, bar(15), { gain: 0.42, glide: [-5, 19] });

  // ================================================================ VII. why, then the name
  // The drums fall away: a warm D major, and a slow line over it.
  boom(CUES.focus[0], { gain: 0.6, f0: 60, f1: 40, glide: 0.4, decay: 0.8 });
  cymbal(CUES.focus[0], { gain: 0.22, decay: 1.4, hall: 0.6 });
  for (const [t, s, d] of [[CUES.focus[0], 12, 0.9], [CUES.matters[0], 9, 0.9], [CUES.matters[0] + BEAT * 0.75, 7, 1.1]]) mallet(t, hz(s), { gain: 0.24, decay: d, room: 0.35, hall: 0.35, echo: 0.18 });
  for (let t = bar(15); t < CUES.icon[0] - 1e-6; t += BEAT / 2) bassNote(t, BEAT / 2 - 0.02, ROOT.D - 12, { gain: 0.32, cutoff: 300, pluckiness: 0.6 });
  // The name: a strummed A major, a bell, and the low A beneath.
  const logo = CUES.icon[0];
  [-36, -24, -17, -12, -8, -5, 0].forEach((s, i) => mallet(logo + 0.028 * i, hz(s), { gain: 0.22, decay: 1.5, pan: -0.35 + 0.1 * i, room: 0.35, hall: 0.4 }));
  bell(logo + 0.12, hz(19), { gain: 0.12, decay: 2.2, ratio: 3.5, index: 1.1, hall: 0.8 });
  boom(logo, { gain: 0.55, f0: 56, f1: 46, glide: 0.5, decay: 1.4, drive: 1.3 });
  bassNote(logo, DURATION - logo - 0.4, ROOT.A - 12, { gain: 0.3, cutoff: 260, pluckiness: 0.4 });
  bell(CUES.sheen[0] + 0.25, hz(31), { gain: 0.05, decay: 0.8, ratio: 4.1, index: 0.8, pan: 0.3, hall: 0.7 });

  return master();
}

// ---------------------------------------------------------------- mixing
// Bus levels, set by measured loudness rather than by ear (see the ledger).
const LEVEL = { drums: 1, music: 0.8, lead: 1, fx: 0.85 };
// What the last render measured, for the renderer's --audio report: each
// bus's loudness in each part of the film, how hard the limiter worked, and
// the master's balance across the spectrum.
const SECTIONS = [['noise', 0, HUSH], ['hush', HUSH, CUES.ring], ['swell', CUES.ring, CUES.drop], ['groove', CUES.drop, bar(13)], ['price', bar(13), bar(15)], ['name', bar(15), DURATION]];
let REPORT = null;
export const mixReport = () => REPORT;
function measure(mix, reduction) {
  const part = ([l, r], a, b) => [l.subarray(at(a), at(b)), r.subarray(at(a), at(b))];
  const buses = {};
  for (const name of ['drums', 'music', 'lead', 'fx']) {
    const sum = [0, 1].map(c => PRE[name][c].map((v, i) => (i < at(HUSH) ? v : 0) * LEVEL[name] + POST[name][c][i] * LEVEL[name]));
    buses[name] = Object.fromEntries(SECTIONS.map(([id, a, b]) => [id, loudness(part(sum, a, b))]));
  }
  const master = Object.fromEntries(SECTIONS.map(([id, a, b]) => [id, loudness(part(mix, a, b))]));
  // Octave bands of the groove, from 63 Hz to 8 kHz, by band-pass energy.
  const [a, b] = [at(CUES.drop), at(bar(13))], bands = {};
  for (const f of [63, 125, 250, 500, 1000, 2000, 4000, 8000]) {
    const bp = svf();
    let e = 0;
    for (let i = a; i < b; i++) { const v = bp((mix[0][i] + mix[1][i]) / 2, f, 1.41, 1); e += v * v; }
    bands[f] = 10 * Math.log10(e / (b - a) + 1e-20);
  }
  REPORT = { buses, master, bands, reduction };
}
function master() {
  const mixes = [PRE, POST].map(set => {
    const room = reverb(set.room, 0.84, 0.4), hall = reverb(set.hall, 0.9, 0.3), echo = pingPong(set.echo);
    const out = [new Float32Array(N), new Float32Array(N)];
    for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) {
      out[c][i] = LEVEL.drums * set.drums[c][i] + LEVEL.music * set.music[c][i] + LEVEL.lead * set.lead[c][i] + LEVEL.fx * set.fx[c][i] +
        0.3 * room[c][i] + 0.38 * hall[c][i] + 0.5 * echo[c][i];
    }
    return out;
  });
  // The hush: everything before it stops within half a frame.
  const cut = at(HUSH), fade = at(0.012);
  const mix = [new Float32Array(N), new Float32Array(N)];
  for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) {
    const gate = i < cut - fade ? 1 : i >= cut ? 0 : (cut - i) / fade;
    mix[c][i] = gate * mixes[0][c][i] + mixes[1][c][i];
  }
  // Under the lock screen's wipe the whole mix dips, as if a door closed.
  const dl = [svf(), svf()];
  for (let i = 0; i < N; i++) {
    const t = i / RATE, x = (t - CUES.night[0] - 0.3) / 0.32, c = 18000 - 17200 * Math.exp(-x * x * (x < 0 ? 2 : 1));
    if (c < 17900) for (let ch = 0; ch < 2; ch++) mix[ch][i] = dl[ch](mix[ch][i], c, 0.75); else for (let ch = 0; ch < 2; ch++) dl[ch](mix[ch][i], c, 0.75);
  }
  // Loud enough that YouTube leaves it alone (−14 LUFS), peaks under −1 dBTP.
  let gain = 1;
  for (let pass = 0; pass < 3; pass++) {
    const trial = mix.map(ch => ch.map(v => v * gain));
    limit(trial, CEILING);
    gain *= 10 ** ((-14 - loudness(trial)) / 20);
  }
  for (const ch of mix) for (let i = 0; i < N; i++) ch[i] *= gain;
  const before = mix.map(ch => Float32Array.from(ch));
  limit(mix, CEILING);
  // How much the limiter took off, sample by sample.
  let worst = 0, over1 = 0, over3 = 0;
  for (let i = 0; i < N; i++) {
    const peak = Math.max(Math.abs(before[0][i]), Math.abs(before[1][i])), now = Math.max(Math.abs(mix[0][i]), Math.abs(mix[1][i]));
    if (peak < 1e-4) continue;
    const db = 20 * Math.log10(peak / Math.max(1e-9, now));
    worst = Math.max(worst, db); if (db > 1) over1++; if (db > 3) over3++;
  }
  measure(mix, { worst, over1: over1 / N, over3: over3 / N });
  // The last half second fades; the first few samples ramp.
  for (const ch of mix) for (let i = 0; i < N; i++) ch[i] *= Math.min(1, i / 240, (N - 1 - i) / (0.6 * RATE));
  return mix;
}

// Sample peaks at −2 dBFS leave room for the peaks between samples and the
// encoder's, so true peaks stay under −1 dBTP.
const CEILING = 10 ** (-2 / 20);
// A look-ahead limiter: the gain each peak needs, eased in over 5 ms before
// it and released over 120 ms after.
function limit([l, r], ceiling) {
  const look = at(0.005), need = new Float32Array(N), min = new Float32Array(N);
  for (let i = 0; i < N; i++) need[i] = Math.min(1, ceiling / Math.max(1e-9, Math.abs(l[i]), Math.abs(r[i])));
  // Sliding minimum over the look-ahead window.
  const q = [];
  for (let i = N - 1; i >= 0; i--) {
    while (q.length && need[q[q.length - 1]] >= need[i]) q.pop();
    q.push(i);
    while (q[0] > i + look) q.shift();
    min[i] = need[q[0]];
  }
  // Averaged over the window too, so the gain eases down rather than steps;
  // every value averaged at a peak already allows for it, so none gets past.
  const release = 1 - Math.exp(-1 / (0.12 * RATE));
  let sum = look, g = 1;
  for (let i = 0; i < N; i++) {
    sum += min[i] - (i >= look ? min[i - look] : 1);
    g = Math.min(sum / look, g + (1 - g) * release);
    l[i] *= g; r[i] *= g;
  }
}

// ITU-R BS.1770 integrated loudness: K-weighted, 400 ms blocks, gated.
export function loudness([l, r]) {
  const kw = x => {
    const out = new Float64Array(x.length);
    const stages = [[[1.53512485958697, -2.69169618940638, 1.19839281085285], [-1.69065929318241, 0.73248077421585]],
      [[1, -2, 1], [-1.99004745483398, 0.99007225036621]]];
    let y = Float64Array.from(x);
    for (const [[b0, b1, b2], [a1, a2]] of stages) {
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < y.length; i++) { const v = b0 * y[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = y[i]; y2 = y1; y1 = v; out[i] = v; }
      y = Float64Array.from(out);
    }
    return y;
  };
  const kl = kw(l), kr = kw(r), block = at(0.4), hop = at(0.1), blocks = [];
  for (let s = 0; s + block <= N; s += hop) {
    let z = 0;
    for (let i = s; i < s + block; i++) z += kl[i] * kl[i] + kr[i] * kr[i];
    blocks.push(z / block);
  }
  const lufs = z => -0.691 + 10 * Math.log10(z);
  const loud = blocks.filter(z => lufs(z) > -70);
  const mean = loud.reduce((a, b) => a + b, 0) / loud.length;
  const gated = loud.filter(z => lufs(z) > lufs(mean) - 10);
  return lufs(gated.reduce((a, b) => a + b, 0) / gated.length);
}

// Freeverb: eight combs and four all-passes per side.
function reverb([inL, inR], feedback, damp) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], passes = [556, 441, 341, 225];
  const channel = (input, spread) => {
    const out = new Float32Array(N);
    for (const size of combs) {
      const buf = new Float32Array(Math.round((size + spread) * RATE / 44100));
      let idx = 0, store = 0;
      for (let i = 0; i < N; i++) {
        const y = buf[idx];
        store = y * (1 - damp) + store * damp;
        buf[idx] = input[i] * 0.015 + store * feedback;
        idx = (idx + 1) % buf.length;
        out[i] += y;
      }
    }
    for (const size of passes) {
      const buf = new Float32Array(Math.round((size + spread) * RATE / 44100));
      let idx = 0;
      for (let i = 0; i < N; i++) {
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
// A dotted-eighth echo that crosses from side to side, darkening as it repeats.
function pingPong([inL, inR]) {
  const d = at(BEAT * 0.75), outL = new Float32Array(N), outR = new Float32Array(N), lp = [svf(), svf()];
  for (let i = 0; i < N; i++) {
    const fromR = i >= d ? outR[i - d] : 0, fromL = i >= d ? outL[i - d] : 0;
    outL[i] = lp[0](inL[i] * 0.6 + inR[i] * 0.4 + fromR * 0.38, 3200, 0.6);
    outR[i] = lp[1](fromL * 0.38, 3200, 0.6);
  }
  return [outL, outR];
}

// 16-bit stereo PCM WAV, with triangular dither.
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
