# Preview video

A 15-second motion piece for the store listings, rendered frame by frame from
code. `composition.js` draws the picture as a pure function of time,
`score.mjs` synthesises the sound from the same clock (`timeline.js`), and
`store/scripts/render-video.mjs` captures and encodes both. `reel.js` lists
what the film is made of: its scenes and the app files each one draws, every
line on screen with the file it quotes, and the outputs with the store rules
they meet. `viewer.html` is the review page.

To remake it, use the
[preview-reel skill](../../.agents/skills/newsworthy-preview-reel/SKILL.md);
every cut is recorded in the [ledger](ledger.md).

| Output | Size | For |
|---|---|---|
| `store/assets/apple/app-preview/iphone-886x1920.mp4` | 886×1920, 30 fps | App Store app preview, 6.9-, 6.5- and 6.3-inch iPhones |
| `store/assets/google-play/video/promo-1080x1920.mp4` | 1080×1920, 30 fps | Google Play preview video, uploaded to YouTube and linked |

Both are H.264 High Profile at level 4.0 with a 256 kbps stereo AAC track at
48 kHz, 15.1 seconds long: Apple requires previews of 15 to 30 seconds with a
stereo track, and the last tenth of a second holds the end card so rounding
never lands under 15. The Android cut draws Android: Roboto, the three-node
share glyph, the Android widget's "Checked" time, the round launcher icon, the
notification card and "home screen" in lower case, as the introduction writes it.

## What it shows

| Time | Scene |
|---|---|
| 0.0–1.4 s | The splash's dash is drawn, then lifts into the reading as its empty-state dash; the header and `∕10` arrive. |
| 1.4–4.9 s | The number rolls like an odometer drum from the dash through 1 to 10, the canvas warming from Fog to Ember, then cools back to a 3, under the introduction's first title. |
| 4.9–7.0 s | The sentence is set down as placeholder bars and the time appears, under the introduction's first description. |
| 7.0–9.4 s | The screen closes into a medium widget, every element travelling to its place in it, and a small widget splits away, under the widget slide's title. |
| 9.4–12.3 s | Light gives way to dark along the canvas's own 160-degree diagonal; the widgets recede; the alerts switch turns on, and a notification arrives, under the notification slide's title. |
| 12.3–15.1 s | The notification's icon turns over, dark face to light, as it flies to the centre and the light spreads from it; the name and the core tagline arrive. |

The words themselves are only in `reel.js`, so a copy change is one edit there.

## What it may and may not claim

- **Nothing is a reading.** Scores are illustrative and the sentence is drawn
  as placeholder bars, exactly as the introduction's illustrations draw it
  (`apps/client/app/onboarding.tsx`), so no frame shows or invents news. The
  number rolls through the whole scale and settles low, on 3, so the film does
  not suggest the news usually reads high; the notification shows 8, the
  default threshold. Neither is a claim about what any day scores.
- **Every word is approved copy.** Each line in `reel.js` names the file it
  quotes: the introduction's titles and body (`apps/client/lib/onboarding.js`),
  a fragment of its notification line, the app's own labels and the core copy
  from `docs/product-messaging.md`. No AI, no urgency, no claims of rank, no
  call to download.
- **The design is the app's.** Colours come from `public/tokens.js` and the
  reading canvas is the four layers of `public/levels.css`; fractional levels
  mix neighbours in OKLab, the space `design/colors.js` spaces them in. Layout
  follows `apps/client/app/index.tsx`, the widgets `NewsworthyWidget.swift` and
  `rating_widget.xml`, the settings group `settings/notifications.tsx`, and
  the notification `src/push.js`.
- **Typefaces stand in for the system's.** SF Pro and SF Mono cannot be
  redistributed, so the iOS cut sets Inter and the numerals in Roboto Mono
  Light, whose outline matches SF Mono Light's at the same size: the same
  0.73 em figure height, horizontal terminals and a slashed zero. The Android
  cut uses Roboto. The fonts in `fonts/` are the latin subsets under the SIL
  Open Font License, whose text is beside them.
- **It is not a screen recording.** Apple's guideline 2.3.4 says app previews
  "may only use video screen captures of the app itself", with narration and
  textual overlays allowed. This is a faithful reconstruction, not a capture,
  so App Review may reject it as a preview. Google Play asks that 80% of a
  preview represent the in-app experience, shown within the first ten seconds;
  the reading is on screen from the first second.

## Render

```sh
npm ci
pip install --quiet --target artifacts/tools/py imageio-ffmpeg               # once: an ffmpeg with H.264 and AAC, found there
node store/scripts/render-video.mjs --stale                                  # what changed since the last render, and which stills to look at
node store/scripts/render-video.mjs --stills 1.6,5.9,8.9 --platform ios      # single renders, a sheet, and the changes since the last run
node store/scripts/render-video.mjs --segment 2.85,3.2 --platform ios        # finished, blurred frames as PNGs
node store/scripts/render-video.mjs --render                                 # both cuts, recorded in cut.json
node store/scripts/render-video.mjs --verify                                 # the cuts against the store rules and their record
node store/scripts/render-video.mjs --viewer                                 # the review page, ready to publish
```

It needs Chromium (`CHROMIUM_PATH`, or the cloud image's copy) and, to encode,
an ffmpeg built with libx264 and AAC: `FFMPEG_PATH`, else the one installed
under `artifacts/tools`, else `ffmpeg` on the path. Only `--render` writes the
cuts, and an unknown or malformed option refuses to run. Each cut is encoded
in `artifacts/preview-video/` and moved into place only when complete, so an
interrupted render leaves the last cut as it was. Stills, segments, contact
sheets and the review page go there too. Both cuts render in parallel in about
eighteen minutes on four cores, the iPhone's in about fourteen.

Every render records in `cut.json` its output's sha256 and the hash of every
file the film is made from: its own source (`FILM` in `reel.js`), the app files
each scene draws, and the files its lines quote. `--stale` compares against
that record, and `--verify` checks each committed cut still matches it. It is
written only by `--render`.

A render then compares its cut with the one it replaced, frame by decoded
frame, and prints the seconds where frames changed and the lowest PSNR among
them. From the same source the iPhone cut comes out byte for byte the same.
The Android cut can differ in a few frames by a few pixels a level or two
apart, which reads above 50 dB; why is not established (the ledger lists what
was ruled out).

Motion blur is sampled. Each frame averages renders spread across half the
frame interval, a 180-degree shutter, weighted to open and close softly and
summed in linear light. The count follows the motion: one for a frame where
nothing moves, twelve through the transitions, and up to forty while the
number rolls, so a moving edge is never sampled more than about four device
pixels apart. Four fixed samples left the fastest rolls as stacked copies of
each digit. `--draft` renders one sample per frame. A fixed grain at a few
percent keeps the soft gradients from banding once encoded; it has one noise
pixel per device pixel, so the browser never scales it.

The sound is synthesised, not sampled: a pad whose filter opens as the scale
warms, an A major pentatonic note per digit, filtered noise under the
transitions, a click for the switch, two FM bells for the notification and a
chord for the name. It peaks at −3 dBFS, about −16 LUFS integrated.
