# Original sound design

Composed and synthesized for these three films. No third-party recordings, music, samples or instrument libraries are used. All source is in `scripts/audio.py`; deterministic seed 281026. Reuse and editing are unrestricted within this Newsworthy production.

Stereo 48 kHz / 16-bit PCM. D-centered damped string tones, restrained paper textures, a dark small-room response and a shared two-note D–A signature. The sound has no speech, fake notification sounds, or news broadcasts.

A accelerates a tactile feed texture into an exact half-second of digital silence. B is dry and sparse, with an original coin-like FM strike and receipt marks. C opens on a low felt strike and lets long negative spaces carry the full-stop idea.

Mastering uses only a constant gain per film, bounded by −2.7 dBTP. There is no compressor, automatic volume riding, or loudness processing in the delivered WAV. ffmpeg loudnorm is used as a meter only. Integrated loudness can fall below the −17 LUFS target when preserving crest factor reaches the peak ceiling.

| Film | Length | Integrated | True peak | LRA |
|---|---:|---:|---:|---:|
| A | 22 s | -16.99 LUFS | -4.72 dBTP | 8.80 LU |
| B | 22 s | -17.00 LUFS | -6.76 dBTP | 14.00 LU |
| C | 24 s | -17.00 LUFS | -3.96 dBTP | 7.40 LU |

Verified by sample counts, exact silence in A at 3.5–4.0 seconds, waveform peak checks, and ffmpeg loudness/true-peak measurement. Not auditioned by ear in this environment. Listen on headphones and a phone speaker before paid distribution; the words remain entirely legible without sound.

Regenerate: `python scripts/audio.py` from the video workspace (Python 3, NumPy, ffmpeg).

```json
{
  "A": {
    "duration_seconds": 22.0,
    "sample_rate": 48000,
    "channels": 2,
    "bits_per_sample": 16,
    "constant_gain_db": 2.92,
    "integrated_lufs": -16.99,
    "true_peak_dbtp": -4.72,
    "loudness_range_lu": 8.8,
    "peak_sample_dbfs": -5.04,
    "silence_3_5_to_4_seconds_max_sample": 0.0
  },
  "B": {
    "duration_seconds": 22.0,
    "sample_rate": 48000,
    "channels": 2,
    "bits_per_sample": 16,
    "constant_gain_db": 2.95,
    "integrated_lufs": -17.0,
    "true_peak_dbtp": -6.76,
    "loudness_range_lu": 14.0,
    "peak_sample_dbfs": -6.76
  },
  "C": {
    "duration_seconds": 24.0,
    "sample_rate": 48000,
    "channels": 2,
    "bits_per_sample": 16,
    "constant_gain_db": 3.31,
    "integrated_lufs": -17.0,
    "true_peak_dbtp": -3.96,
    "loudness_range_lu": 7.4,
    "peak_sample_dbfs": -3.96
  }
}
```
