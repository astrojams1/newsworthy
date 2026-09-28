# Preview reel ledger

Every cut of the store preview reel, and every decision about one. Use the
[repository skill](../../.agents/skills/newsworthy-preview-reel/SKILL.md) to
make the next. Entries are append-only, oldest first: a later entry that
overturns an earlier one says so in its own words. The newest entry's open
decisions are where a remake starts, and
`node store/scripts/render-video.mjs --stale` lists what the app changed since.

The store gate itself (uploaded, approved, rejected) is `store.preview-video`
in the [release ledger](../ledger.md); record it there too.

| Cut | Why | What changed | Verified | Open |
|---|---|---|---|---|
| [2026-09-27](#2026-09-27) | First cut, owner request | Everything: six scenes, iPhone 886×1920 and Play 1080×1920, 15.1 s | Store rules, decoded frames, loudness | Guideline 2.3.4; poster frame; YouTube upload |
| [2026-09-28](#2026-09-28) | Re-render of unchanged source, testing the tooling | Nothing to the eye: capture, grain and render reporting | Repeat renders, store rules, the copy-change path, banding | Home screen from #171–#173; as the first cut |

## Lessons

What a past cut cost to learn. Read before changing the film or the renderer,
and add to it when a cut teaches something new; date each item.

- **Capture** (2026-09-27). `Page.captureScreenshot` on a second CDP session
  ignores Playwright's device-scale emulation, so frames first came out at
  443×960. Passing `clip.scale` fixed the size but re-applied the emulation on
  every capture, and now and then a frame of the widget morph came out
  differently in two runs of the same source. The session now sets the
  metrics once. After any change to capture, check a still's pixel size and
  render a moving span twice: two iPhone runs of `--segment 7.3,7.85` should
  match.
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
  encodes VP8 only: install `imageio-ffmpeg` under `artifacts/tools`. Its
  Chromium has no H.264 decoder, so the MP4s cannot be played locally; trust
  `--verify` and the published review page. `ffmpeg -progress` repeats its
  block, so read the last `frame=` line.
- **What the app does** (2026-09-27). The app shows no banner while it is open,
  so the notification arrives outside it. Widgets refresh on the system's
  schedule, so they are not shown changing with a notification. Under prompt
  v19 a 3 means "news elsewhere; little chance of market impact", not "a
  normal day": the film shows the scale, it does not describe it.
- **Safe defaults** (2026-09-27). In the first dry run of the skill, a
  mistyped `--stills` fell through to a full render that would have
  overwritten the committed cuts; only the ffmpeg preflight stopped it.
  Rendering now takes `--render`, and an unknown or malformed option refuses
  to run.
- **Staleness by content** (2026-09-27). Judging staleness by the commit that
  last changed a video flagged notes and a refactor proved identical, and
  missed copy sources outside any scene. Each render now records every input's
  hash in `cut.json`, and `--stale` compares content.
- **Copy checks** (2026-09-27). A lowercase substring check could not tell
  "Home Screen" from "home screen", and passed a rename that kept the old
  words inside it. Each line now carries an exact `quote`, checked with case
  and quotes by `--stale` and by `npm test`.
- **Shell state** (2026-09-27). Exported variables do not survive between tool
  calls, so the renderer finds an ffmpeg under `artifacts/tools` without one.
- **Before and after** (2026-09-27). The cheapest proof of any edit is the same
  stills before and after it; `--stills` keeps the previous run and reports
  what changed.
- **Dry runs** (2026-09-27). A fresh agent given only the skill found and made
  a two-line copy change in about six minutes, twenty seconds of it commands,
  and its report produced the five lessons above. Run one again when the skill
  changes much.
- **Interrupted renders** (2026-09-27). The renderer encoded straight over the
  committed cut, so a render stopped midway left a truncated file in its
  place. It now encodes in `artifacts/` and moves the cut into place only when
  complete.
- **Reproducibility** (2026-09-28). With the metrics set once, the iPhone cut
  renders byte for byte the same from the same source; four renders agreed.
  The Android cut does not: two renders differ in a few frames by a few pixels
  a level or two apart, at the edges of strokes and text as they move in (the
  header's gear at 1.17 s, a line at 4.93 s), and the encoder carries each
  through the rest of its group of frames. Ruled out: the grain, which now has
  one noise pixel per device pixel on both cuts; partial raster
  (`--disable-partial-raster`); GPU raster (`--disable-gpu`). Untested: whether
  Android's 2.5× device scale, where the iPhone's is 2×, is the reason.
  `--segment 0,1.3 --platform android` shows it in half a minute: frames 35–38
  vary between runs.

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

## 2026-09-28

**Why.** Not a request: a test of the tooling. Rendering unchanged source
should reproduce the committed cuts, so that the next remake can tell what it
changed. It did not quite. The audio matched, and so did every frame but those
of the screen closing into the widget (7.33–7.83 s: 16 on iPhone, 15 on
Android), which on iPhone differed by up to 18 of 255 levels around the
numeral, bars and wordmark. Two renders of that span from one source differed
too, so the variable was the renderer; see Capture and Reproducibility under
Lessons.

**What changed.** Nothing to the eye; every line resolves to the first cut's
words.

- Capture sets the device scale once, not with every sample. Stills are
  unchanged by it, but frames of the roll and the morph now differ from the
  first cut by at worst 48.9 dB PSNR on iPhone, and the rolling numeral could
  not be told apart side by side at one and a half times the size.
- The grain has one noise pixel per device pixel. The iPhone's tile is the one
  it had; Android's is finer, which brought its cut from 13.5 to 15.3 MB, the
  iPhone's rate per pixel. A dark frame stretched eightfold shows no banding.
- A cut is encoded in `artifacts/` and moved into place when complete, and a
  render then says how it differs from the cut it replaced.
- `--stale` suggests one still per moment rather than one per line.

**Outputs.**
- `store/assets/apple/app-preview/iphone-886x1920.mp4`: 12.5 MB, sha256
  `4f0d4d8c3020eb2ff66e4995df82a47e62734588eafd7e7c9e37aa0e1cadd6ba`.
- `store/assets/google-play/video/promo-1080x1920.mp4`: 15.3 MB, sha256
  `1b42560a2c21d3f138b13b7f42287563f8abd6facbfe5d5119161e267fbb6bb5`.

**Verified.** The last render reported the iPhone cut byte for byte the cut
it replaced, the fourth iPhone render in a row to agree, and the Android cut
changed from the one it replaced in two frames (1.17 and 1.33 s) at 79.2 dB.
`--verify` passes both: 453 frames, 15.10 s, 30 fps, H.264 High at level 4.0,
stereo AAC 256 kb/s at 48 kHz, −15.8 LUFS, −3.0 dBFS peak, each matching its
record; `--stale` reports nothing changed. The Android contact sheet decoded
from its MP4 shows every scene. A temporary edit to the introduction's first
title made `--stale` name the lines drawn from that file, the one that
drifted and four stills, and made `npm test` fail with its instructions; the
edit was undone. `npm test` passed.

**Not verified.** As for the first cut: the sound by ear, native parity and
App Review. Why Android renders vary.

**Cost.** iPhone 3,569 samples, Android 3,800: both in parallel in about 18
minutes on four cores, the iPhone's in 14. `--segment` about 0.17 s per
sample.

**Open.** As the first cut: guideline 2.3.4, the poster frame, the YouTube
upload and listening. The review page plays these files. Since this render,
#171–#173 changed the home screen: without the timeline the reading sits
16 pt lower (`layout()` still has the old bottom padding), and on load it fades
in, number then sentence then time, where the film lifts the splash's dash into
it. `--stale` lists `apps/client/app/index.tsx` and `design/surfaces.json`,
whose change is web-only. The next remake starts there.
