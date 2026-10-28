#!/usr/bin/env python3
"""Newsworthy / three films: original deterministic stereo sound design.

No recordings, sound libraries, or commercial music. Requires numpy and ffmpeg.
The only mastering operation is constant gain; silence and dynamics survive.
Usage: python marketing/video/scripts/audio.py
"""
from __future__ import annotations
import json
import math
from pathlib import Path
import re
import subprocess
import tempfile
import wave
import numpy as np

SR = 48_000
OUT = Path(__file__).resolve().parents[1] / 'public' / 'audio'
RNG = np.random.default_rng(281026)


def envelope(n, attack=.008, release=.08):
    e = np.ones(n)
    a, r = min(int(attack*SR), n), min(int(release*SR), n)
    if a: e[:a] = np.sin(np.linspace(0, np.pi/2, a))**2
    if r: e[-r:] *= np.cos(np.linspace(0, np.pi/2, r))**2
    return e


def stereo(signal, pan=0.0):
    angle = (pan + 1) * np.pi/4
    return np.column_stack((signal*np.cos(angle), signal*np.sin(angle)))


def place(bus, signal, at, gain=1):
    first = round(at*SR)
    if signal.ndim == 1: signal = stereo(signal)
    count = min(len(signal), len(bus)-first)
    if count > 0: bus[first:first+count] += signal[:count]*gain


def low_noise(n, width=8):
    return np.convolve(RNG.normal(0, 1, n+width-1), np.ones(width)/width, mode='valid')


def felt(freq, length=2.7, strength=1., brightness=.3):
    """Damped strings, soft wooden onset, no sampled piano."""
    t = np.arange(round(length*SR))/SR
    s = np.zeros(len(t))
    for h, amp, decay in [(1,1,1.25),(2,.32,.87),(3,.16,.52),(4,.06,.31)]:
        # Tiny inharmonicity keeps the strike from sounding like a sine test.
        f = freq*h*(1 + .00018*h*h)
        s += amp*np.sin(2*np.pi*f*t + .07*h)*np.exp(-t/decay)
    s += brightness*low_noise(len(t), 18)*np.exp(-t/.018)
    s *= envelope(len(t), .006, .14)*strength
    return s


def glass(freq, length=1.9):
    t = np.arange(round(length*SR))/SR
    mod = .75*np.exp(-t/.18)*np.sin(2*np.pi*freq*2.01*t)
    s = np.sin(2*np.pi*freq*t + mod)*np.exp(-t/.42)
    s += .13*np.sin(2*np.pi*freq*3.02*t)*np.exp(-t/.18)
    return s*envelope(len(t), .003, .12)


def paper(length=.09, weight=.5):
    n = round(length*SR)
    t = np.arange(n)/SR
    noise = low_noise(n, 9)
    # A broad, soft upper-mid paper texture, not a notification.
    hp = noise - np.convolve(noise, np.ones(101)/101, mode='same')
    return (hp*np.exp(-t/(length*.23)) + weight*np.sin(2*np.pi*143*t)*np.exp(-t/.015))*envelope(n,.002,.02)


def pad(length, freqs, gain=.065):
    n = round(length*SR)
    t = np.arange(n)/SR
    s = np.zeros((n,2))
    for i, freq in enumerate(freqs):
        for channel in range(2):
            detune = (-1 if channel == 0 else 1)*.0011
            wobble = .15*np.sin(2*np.pi*(.08+i*.013)*t+i)
            tone = np.sin(2*np.pi*freq*(1+detune)*t+wobble)
            tone += .14*np.sin(2*np.pi*freq*2*t+i*.2)
            s[:,channel] += tone / len(freqs)
    s *= envelope(n, 1.5, 1.8)[:,None]*gain
    return s


def room(signal, amount=.22):
    """Small, dark chamber; taps stay shorter than the editorial holds."""
    result = signal.copy()
    for delay, gain in [(0.071,.34),(0.109,.27),(0.191,.19),(0.287,.13),(0.421,.085)]:
        shift = round(delay*SR)
        result[shift:,0] += signal[:-shift,1]*gain*amount
        result[shift:,1] += signal[:-shift,0]*gain*amount
    return result


def signature(bus, at):
    # The same restrained two-note identity in each film: D, then A above.
    place(bus, stereo(felt(293.6648,2.5),-.12), at, .30)
    place(bus, stereo(felt(440,2.2),.14), at+.43, .18)
    place(bus, pad(3.0,[146.8324,220,329.6276],.075),at-.1)


def render_a():
    b = np.zeros((22*SR,2))
    # Accelerating feed: quiet tactile motion, no alarms or fake news voices.
    at, i = .08, 0
    while at < 3.45:
        speed = at/3.45
        strike = paper(.065 + speed*.025, .25)
        place(b, stereo(strike, .50*np.sin(i*1.7)), at, .13 + .20*speed)
        if i%3 == 0:
            place(b, stereo(felt(146.8324*(1 + (i%4)*.07),.3),-.25),at,.055+.03*speed)
        at += .32*(1-speed)+.06*speed
        i += 1
    # A rising close-grained texture ends cleanly on the decisive cut.
    n = int(3.5*SR); t = np.arange(n)/SR
    bed = low_noise(n,24)*(.006+.022*(t/3.5)**2)
    bed += .015*np.sin(2*np.pi*(63*t+5*t*t))*np.sin(np.pi*np.minimum(t/2,1)/2)
    place(b,stereo(bed),0)
    cut = int(3.5*SR)
    b[cut-288:cut] *= np.linspace(1,0,288)[:,None]
    b[cut:] = 0
    place(b,stereo(felt(146.8324,2.8),-.06),4.03,.42)
    place(b,pad(9.6,[146.8324,220,329.6276],.10),6.7)
    place(b,stereo(felt(293.6648,2.6),-.12),7.04,.27)
    place(b,stereo(felt(329.6276,2.4),.13),11.04,.22)
    place(b,stereo(felt(220,2.8),-.05),14.05,.27)
    signature(b,18.04)
    b = room(b,.23)
    # The conceptual silence remains digital silence even after room tails.
    b[cut-288:cut] *= np.linspace(1,0,288)[:,None]
    b[int(3.5*SR):int(4*SR)] = 0
    return b


def render_b():
    b = np.zeros((22*SR,2))
    place(b,stereo(glass(587.3295,1.8),.05),.15,.34)
    place(b,stereo(felt(146.8324,2.65),-.08),3.04,.37)
    for at,freq,pan in [(6,293.6648,-.18),(7,329.6276,0),(8,440,.18)]:
        place(b,stereo(paper(.065,.12),pan),at,.19)
        place(b,stereo(felt(freq,1.7),pan),at+.015,.16)
    place(b,pad(7.8,[146.8324,220,329.6276],.105),9.7)
    place(b,stereo(felt(293.6648,2.5),-.08),10.04,.28)
    place(b,stereo(felt(440,2.8),.15),13.03,.21)
    signature(b,17.1)
    return room(b,.24)


def render_c():
    b = np.zeros((24*SR,2))
    place(b,stereo(felt(110,1.35,brightness=.45),0),.04,.42)
    place(b,stereo(paper(.105,.3),0),.04,.20)
    place(b,pad(3.3,[146.8324,220,329.6276],.10),4)
    place(b,stereo(felt(293.6648,2.8),-.1),4.1,.24)
    place(b,pad(9.8,[146.8324,220,329.6276],.09),6.8)
    place(b,stereo(felt(329.6276,2.7),.1),7.04,.24)
    place(b,stereo(felt(220,2.8),-.12),12.04,.28)
    # The paper-like stop makes a clean, literal punctuation mark.
    place(b,stereo(paper(.12,.8),0),17.02,.4)
    place(b,stereo(felt(146.8324,1.5),0),17.02,.17)
    signature(b,20.04)
    return room(b,.24)


def write_wav(path,b):
    pcm = np.clip(b,-1,1)
    with wave.open(str(path),'wb') as file:
        file.setparams((2,2,SR,len(b),'NONE','not compressed'))
        file.writeframes(np.round(pcm*32767).astype('<i2').tobytes())


def measure(path):
    proc = subprocess.run(['ffmpeg','-hide_banner','-i',str(path),'-af',
        'loudnorm=I=-17:TP=-2:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
    block = re.search(r'\{\s*"input_i".*?\}',proc.stderr,re.S)
    return json.loads(block.group())


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    report = {}
    for name,make in [('A',render_a),('B',render_b),('C',render_c)]:
        b = make()
        b *= envelope(len(b), .003, .48)[:,None]
        path = OUT/f'{name}.wav'
        write_wav(path,b)
        initial = measure(path)
        # Constant gain to -17 integrated, bounded by conservative true peak.
        gain_db = min(-17-float(initial['input_i']),-2.7-float(initial['input_tp']))
        b *= 10**(gain_db/20)
        write_wav(path,b)
        final = measure(path)
        report[name] = {'duration_seconds':len(b)/SR,'sample_rate':SR,'channels':2,
            'bits_per_sample':16,'constant_gain_db':round(gain_db,2),
            'integrated_lufs':float(final['input_i']),'true_peak_dbtp':float(final['input_tp']),
            'loudness_range_lu':float(final['input_lra']),
            'peak_sample_dbfs':round(20*np.log10(np.abs(b).max()),2)}
        if name == 'A': report[name]['silence_3_5_to_4_seconds_max_sample']=float(np.abs(b[int(3.5*SR):int(4*SR)]).max())
        print(name,json.dumps(report[name]))
    lines=['# Original sound design','',
        'Composed and synthesized for these three films. No third-party recordings, music, samples or instrument libraries are used. All source is in `scripts/audio.py`; deterministic seed 281026. Reuse and editing are unrestricted within this Newsworthy production.','',
        'Stereo 48 kHz / 16-bit PCM. D-centered damped string tones, restrained paper textures, a dark small-room response and a shared two-note D–A signature. The sound has no speech, fake notification sounds, or news broadcasts.','',
        'A accelerates a tactile feed texture into an exact half-second of digital silence. B is dry and sparse, with an original coin-like FM strike and receipt marks. C opens on a low felt strike and lets long negative spaces carry the full-stop idea.','',
        'Mastering uses only a constant gain per film, bounded by −2.7 dBTP. There is no compressor, automatic volume riding, or loudness processing in the delivered WAV. ffmpeg loudnorm is used as a meter only. Integrated loudness can fall below the −17 LUFS target when preserving crest factor reaches the peak ceiling.','',
        '| Film | Length | Integrated | True peak | LRA |','|---|---:|---:|---:|---:|']
    for name,r in report.items(): lines.append(f"| {name} | {r['duration_seconds']:g} s | {r['integrated_lufs']:.2f} LUFS | {r['true_peak_dbtp']:.2f} dBTP | {r['loudness_range_lu']:.2f} LU |")
    lines += ['', 'Verified by sample counts, exact silence in A at 3.5–4.0 seconds, waveform peak checks, and ffmpeg loudness/true-peak measurement. Not auditioned by ear in this environment. Listen on headphones and a phone speaker before paid distribution; the words remain entirely legible without sound.', '', 'Regenerate: `python scripts/audio.py` from the video workspace (Python 3, NumPy, ffmpeg).', '', '```json',json.dumps(report,indent=2),'```','']
    (OUT/'sound-design.md').write_text('\n'.join(lines))

if __name__ == '__main__': main()
