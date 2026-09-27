# Preview reel ledger

Every cut of the store preview reel, and every decision about one. Use the
[repository skill](../../.agents/skills/newsworthy-preview-reel/SKILL.md) to
make the next. Entries are append-only, oldest first: a later entry that
overturns an earlier one says so in its own words. The newest entry's open
decisions are where a remake starts, and
`node store/scripts/render-video.mjs --stale` lists what the app changed since.

The store gate itself (uploaded, approved, rejected) is `store.preview-video`
in the [release ledger](../ledger.md); record it there too.

| Cut | Rendered from | Why | Outputs | Verified | Open |
|---|---|---|---|---|---|
| [2026-09-27](#2026-09-27) | `2f4abbf` | First cut, owner request | iPhone 886×1920, Play 1080×1920, 15.1 s | Store rules, decoded frames, loudness | Guideline 2.3.4; poster frame; YouTube upload |

## Lessons

What a past cut cost to learn. Read before changing the film or the renderer,
and add to it when a cut teaches something new; date each item.

- **Capture scale** (2026-09-27). `Page.captureScreenshot` on a second CDP
  session ignores Playwright's device-scale emulation, so frames came out at
  443×960. The capture passes `clip.scale`; after any change to capture, check
  the first still's pixel size.
- **Motion blur** (2026-09-27). Four fixed samples per frame left the fastest
  odometer rolls as stacked copies of each digit. Sampling now follows the
  speed, up to forty per frame, weighted and summed in linear light. After a
  timing change, look at `--segment` frames of the fastest roll (≈2.9–3.2 s).
- **Text width** (2026-09-27). Inter's optical-size axis draws small text
  wider than large; widths measured at 1000 px ran the supers' words
  together. Measure at the size the text is set.
- **Style names** (2026-09-27). `WebkitMaskImage` is silently ignored as a
  style property; use the `mask()` helper. A percentage `clip-path` on a text
  box with `line-height: 0` clips everything; use pixels.
- **Stacking** (2026-09-27). DOM order is z-order: the status bar sits before
  the notification, which slides over it; the end card's canvas belongs to the
  light world only, or it covers the dark world's warmth.
- **Shared-element morph** (2026-09-27). Moving every element on one spring
  made the sentence cross the number. The number leads, the sentence moves
  across before up, the time trails the last line, and the content is clipped
  to the shrinking frame.
- **Colour transitions** (2026-09-27). Crossfading the dark icon into the
  light one passes through a muddy grey; the icon turns over instead.
- **Strict loads** (2026-09-27). The renderer fails on any failed request, and
  Chromium asks for `/favicon.ico`; the page declares a `data:` favicon.
- **Audio checks** (2026-09-27). This session cannot listen. ffmpeg's
  log-frequency spectrogram mislabels bands, so check a linear spectrogram or
  Goertzel magnitudes at named frequencies. FM bell tails ran seconds into
  later scenes until their length was cut to four time constants with a fade.
- **Environment** (2026-09-27). The cloud image's ffmpeg (Playwright's)
  encodes VP8 only: install `imageio-ffmpeg` and set `FFMPEG_PATH`. Its
  Chromium has no H.264 decoder, so the MP4s cannot be played locally; trust
  `--verify` and the published review page. `ffmpeg -progress` repeats its
  block, so read the last `frame=` line.
- **What the app does** (2026-09-27). The app shows no banner while it is open,
  so the notification arrives outside it. Widgets refresh on the system's
  schedule, so they are not shown changing with a notification. Under prompt
  v19 a 3 means "news elsewhere; little chance of market impact", not "a
  normal day": the film shows the scale, it does not describe it.

## 2026-09-27

**Why.** The owner asked for a dynamic 15-second video for both stores,
showreel quality, on brand.

**What it shows.** Six scenes (`store/video/reel.js`): the splash dash lifting
into the empty reading; an odometer roll from the dash through 1 to 10 and
back to 3, the canvas warming from Fog to Ember and cooling; the sentence set
down as placeholder bars with "Checked 4 min ago"; the screen closing into a
medium widget and a small one splitting away; light to dark along the 160°
diagonal, the High-score alerts switch, a "Newsworthy · 8/10" notification;
the icon turning over into the end card. Supers are the introduction's words
and the core tagline. The Android cut draws Android's share glyph, widget
time, notification card, round icon and lower-case "home screen".

**Rendered from** `2f4abbf`, which added the cuts with their source. The
change that added this ledger moved the film's lines into `reel.js` and added
`--stale`, `--verify` and `--viewer` without re-rendering: 24 stills across
both cuts rendered byte-identical before and after it, so the cuts still match
their source.

**Outputs.**
- `store/assets/apple/app-preview/iphone-886x1920.mp4`: 12.4 MB, sha256
  `08afc97ae5231b566720b78b9908910d433d01fcc3e9a799365e09b782ed3a3d`.
- `store/assets/google-play/video/promo-1080x1920.mp4`: 13.5 MB, sha256
  `27b8dec2ce2b0e059ac48acc9e0128c1028c205df50f5d8803e0a098dfc33e34`.

**Verified.** `--verify` passes both: 453 frames, 15.10 s, 30 fps, H.264 High
at level 4.0, stereo AAC 256 kb/s at 48 kHz, −15.8 LUFS, −3.0 dBFS peak.
Frames decoded from both files were inspected: the fastest rolls show
continuous blur, and a dark frame stretched eightfold shows no banding.
`npm test` passed.

**Not verified.** The sound by ear. Native parity: the film is a
reconstruction from the tokens and layout code, not a capture, and its
typefaces stand in for SF Pro and SF Mono. App Review's reading of guideline
2.3.4.

**Review page.** https://claude.ai/artifact/1EjL4QT4CvPqod4apZYNrV (private to
the owner). Rebuild with `--viewer` and republish to this URL.

**Cost.** Stills about 0.15 s each; `--segment` about 0.25 s per sample; a full
cut about 4,000 samples, 15 minutes alone or 19 for both in parallel on four
cores.

**Open.** Whether to submit the iPhone cut as an app preview despite guideline
2.3.4, or pair its titles with a device screen recording. Set the poster frame
by hand in App Store Connect (6.0 s, the composed reading). Upload the Play cut
to YouTube, ads off and not age-restricted, once the Google app exists.
