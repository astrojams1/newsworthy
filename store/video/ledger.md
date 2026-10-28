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
| [2026-10-21 trailer](#2026-10-21-trailer) | Owner request: a YouTube Shorts trailer after Apple's approval | A second film, `store/video/trailer`: seven scenes, 32 s, 1080×1920 | YouTube settings, decoded frames, loudness and a per-bus mix report | Listen; publish once the listing is live at $1 |
| [2026-10-21 trailer fix](#2026-10-21-trailer-fix) | Owner report: the lifted widget slid under the Dynamic Island | 17–24 s only: what lifts off the phone is drawn in front of it; the small widget lifts undimmed | A browser test of what is drawn over what, stills before and after, `--verify` | As the trailer's first cut |
| [2026-10-21 trailer framing](#2026-10-21-trailer-framing-decision-no-cut) | Owner report: on the phone, YouTube's controls cover the trailer | Nothing yet: a measurement, a new skill and the list of beats to move | The owner's screenshot fitted to the source frame; a safe-zone contact sheet of the whole cut | Re-frame and re-upload, or leave the posted Short |
| [2026-10-21 trailer re-frame](#2026-10-21-trailer-re-frame) | Owner: "did you fix the video?" | Every line, number and screen inside the Shorts safe zone: supers lower, phone smaller, long lines set smaller, end card raised | A browser test of every placement through the film, the safe-zone contact sheet, `--verify`, frame-by-frame against the first cut | Replace the posted Short; check it on the phone |
| [2026-10-21 trailer restage](#2026-10-21-trailer-restage) | Owner: the re-frame shrank everything; a tiny phone, headlines out of proportion | Phone scenes recomposed: a large phone running off the bottom edge, one-line headlines, the notification under the clock | Both browser tests, a new one for the phone's framing, `--verify`, the contact sheet, previews under YouTube's controls from the owner's screenshot | Replace the posted Short; check it on the phone |
| [2026-10-21 trailer thumbnail](#2026-10-21-trailer-thumbnail) | Owner request: a custom thumbnail | A still, `--thumbnail`: the 12.9 s reading, its line at twice the size | A browser test, the JPEG's size and limit; stills of the film unchanged | Upload needs custom Shorts thumbnails on the channel |

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
- **Capture cost** (2026-10-21, trailer). At 1080×1920 a PNG capture is most
  of a sample's cost. A grain overlay drawn in the page added about 100 ms to
  every capture (330 to 230 ms on the phone scenes without it; noise
  compresses badly), and a `blur()` filter on the phone's shadow another 30 or
  so. The trailer adds its grain in Node to the finished frame and draws soft
  shadows as radial gradients. Profile a few captures before a full render.
- **Mixing without ears** (2026-10-21, trailer). Loudness alone said the
  first score was fine; a per-bus, per-scene report (`--audio`) showed the
  notifications and the clock, the sounds the first act is about, 11 dB under
  the pulse, and a "hush" only 6 dB below the groove. Measure the parts, not
  only the whole. The first limiter also had a bug that raised peaks by 5 dB:
  check true peak on every render.
- **Lifted layers** (2026-10-21, trailer fix). Anything shown lifting off the
  phone toward the viewer must be drawn in front of the phone's own chrome
  (island, status bar, glass) and outside whatever dims the screen; the first
  cut drew the enlarged widget under the island and left the small one dimmed.
  `test/trailer.test.js` hit-tests the lifted parts against the island and
  status bar, among the phone's own layers only: the frame's vignette covers
  everything and made the first version of that test fail for the wrong reason.

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

## 2026-09-29 (decision, no cut)

**Why.** #188 moved "Checked" off the reading screen: the app now shows a
muted "story · age" line below the sentence ("US Iran War · 5h ago") and
"Last checked 18m ago" in Settings, and the widgets read "Checked at 10:21",
a clock time. The film draws "Checked 4 min ago" under the reading and morphs
it into the widget's time, so its quote no longer matched.

**Decision (owner).** No re-render now: the film is regenerated once, before
the next store submission. Until then `COPY.checked` quotes the widget's
"Checked at" line, where that line ends in the film, as "Checked at 9:37"
(the clocks agree: 9:41, four minutes earlier). The published cuts still
show "Checked 4 min ago".

**Open for that cut.** The reading's line before the morph: the app shows
the sentence's story and age there, and the film draws no real reading, so
either an age alone ("4m ago") that becomes "Checked at 9:37" on the widget,
or no line on the reading and the time on the widget only. Plus everything
still open from 2026-09-28.


## 2026-10-21 trailer

**Why.** Apple approved version 1.0.0 (build 27). The owner asked for a trailer
of about 30 seconds for YouTube Shorts that tells why the app exists: many
stories come and go through the day, the app shows only what breaks through,
so you can stay focused instead of doomscrolling; it is $1 with no ads,
subscription or in-app purchases; show the widgets, the notifications and the
colour gradients, with motion graphics, and treat the sound as storytelling.
That brief, its script and the exception it makes to
`docs/product-messaging.md` are in `store/video/trailer/README.md`.

**What it shows.** A new film, `store/video/trailer`, with its own renderer,
`store/scripts/render-trailer.mjs`. Sixteen bars at 120 BPM, 32 s:

- 0–8 s: a tilted, endless wall of feed cards (placeholder bars and feed tags,
  no headlines) scrolling ever faster while notifications from other apps
  pile up. "Every day, thousands of stories come and go." "You could
  doomscroll all day…" over a clock racing from 7 AM to 11:59 PM.
- 8–10 s: a hard cut. The feed drains and sinks; one card stays, rises and
  glows ember. "…or see only what breaks through."
- 10–16 s: the card opens into an iPhone showing the reading. The number rolls
  up the scale, a digit on each eighth note, the whole frame warming from Fog
  to Ember, then springs down to a quiet 2. "World news, rated 1 to 10." "One
  number. One sentence."
- 16–20 s: the reading closes into the medium widget; icons and a dark small
  widget join it, and both lift off the screen. "Also on your Home Screen".
- 20–24 s: a 160° wipe to a dark lock screen warmed by an 8; "Newsworthy ·
  8/10" arrives and lifts. "Optional notifications at the score you choose."
- 24–28 s: the phone drops away and the light spreads. "$1 once", the ten
  levels' colours, "No ads. No subscription. No in-app purchases."
- 28–32 s: "Stay focused on what matters." over two slow lights, Fog and
  Ember; then the icon, "Newsworthy", the core tagline and "On the App Store".

The score: A minor for the noise (a clock ticking in quarters, eighths, then
sixteenths; a pulse whose filter opens; a blip for every notification on
screen; a snare roll and a riser), cut dead on the hush, a soft sub drop and
one bell, then A major at the drop (half-time groove, sidechained pad and bass,
one pentatonic note per digit as the number climbs and falls, the store reel's
two-note chime, an impact and three rising stabs for the price, a breakdown
and a strummed chord for the name).

**Outputs.** `store/assets/youtube/trailer-1080x1920.mp4`: 35.4 MB, sha256
`066dfa1744f36de4f59a103b34d6ab04edbe2b697c17bc48c6a46b5514cfff9f`; its
inputs are in `store/video/trailer/cut.json`.

**Verified.** `--verify` passes: 960 frames, 32.00 s, 1080×1920 at 30 fps,
H.264 High at 8.5 Mb/s, AAC stereo 48 kHz 324 kb/s, −14 LUFS integrated,
−1.5 dBTP. Stills of every scene, finished frames of the fastest moments (the
feed's rush, the rolling digits, the phone's drop and the light), the frames
either side of the cut at 8 s, and a contact sheet decoded from the MP4 were
looked at. The mix report (`--audio`): the hush measures about 11 dB under the
groove before its bell; the limiter takes at most about 6 dB, more than 3 dB on
0.5% of samples; the groove's octave bands fall about 4 dB an octave above
1 kHz. `test/trailer.test.js` and `npm test` passed.

**Not verified.** The sound by ear. That a phone shows the app this way: the
phone, its Home Screen and lock screen are reconstructions from the tokens and
layout code, with Inter and Roboto Mono standing in for Apple's typefaces, not
captures. YouTube's re-encode. That the App Store listing is public at $1:
`apple.release` was still waiting on the Paid Apps Agreement.

**Cost.** 6,437 samples, 12.1 minutes on four browsers in parallel; the encode
about a minute and a quarter.

**Open.** The owner listens, then uploads to YouTube Shorts once the listing
is public at $1 (the end card says "On the App Store"). Pick 12.9 s, the
reading at 10, as the thumbnail. Whether a narrated cut is wanted; none was
recorded.

## 2026-10-21 trailer fix

**Why.** The owner watched the first cut: on the Home Screen, when the widgets
lift off the phone, the enlarged medium widget slid under the Dynamic Island.
Checking it showed a second fault in the same moment: the small widget, meant
to lift with the medium one, sat in the screen's layer and was dimmed with it.

**What changed.** Only the Home Screen and lock-screen scenes, and visibly
only the lifts: the widgets' at 17.5–20 s and the notification's from 21.5 s.
Whatever lifts toward the viewer is drawn in front of the phone's island,
status bar and glass while it is lifted; the small widget moved out of the
dimmed screen layer to lift with the medium one; both now grow by a fifth
about their centres, rather than a quarter with the medium one rising, so the
medium widget's top clears the island and the two widgets do not touch.
Unchanged elsewhere, by stills before and after: 14 times across the film,
7 identical and 7 changed, all of them in the widget and notification scenes.

**Outputs.** `store/assets/youtube/trailer-1080x1920.mp4`: 35.4 MB, sha256
`9896e699d784941569841290654843f07309205d0f81689a59784547f0b350d9`.

**Verified.** `test/trailer.test.js` gains a browser test: at every tenth of a
second of both lifts, each lifted part is the topmost of the phone's layers
wherever it overlaps the island or status bar, and nothing above it dims it.
It failed on the first cut's picture and passes on this one. `--verify` passes
as before (8.5 Mb/s, −14 LUFS, −1.5 dBTP). Against the first cut, decoded frame
by frame: 17.53–20.0 s changed, as intended (down to 23.5 dB PSNR while the
widgets are lifted); 30 frames of the feed's rush at 5.3–8.0 s and one at 9.1 s
differ at 46.5–48 dB, render-to-render variance in the most blurred frames,
not a change; every other frame matches above 48 dB. `npm test` passed.

**Not verified.** As the first cut: the sound by ear, a device, YouTube's
re-encode, the listing being public at $1.

**Cost.** 12.7 minutes on four browsers.

**Open.** As the first cut.

## 2026-10-21 trailer framing (decision, no cut)

**Why.** The owner posted the trailer as a Short and sent a screenshot of it
playing in YouTube for iOS on an iPhone 16 Pro: "the video does not frame well
when viewed with all the youtube chrome". "Optional notifications" sat under
back, search and the menu; the notification card ran under Save; the phone's
lower third sat under the channel row, title and "Share your video".

**What was found.** Fitting the screenshot to the source frame at 23.2 s
(scale 1.238, offset −66, −4, match 0.997) gives what the player hides on a
1080×1920 frame: y < 245 (status bar, back, search, menu), x > 898 below
y 1061 (the action rail), y > 1534 left of the rail (the title stack), and
54 px off each side, which the player crops to fill the phone. The first cut
was framed to the whole frame and the stills never showed the overlay. The
safe box is x 96–864, y 288–1440, and above y 1020 it runs right to x 984.
Every scene breaks it somewhere (`safe-zone.mjs --at`):

- 1.8 s, 6.5 s, 9.5 s: "thousands of stories", "You could doomscroll" and
  "what breaks through." run edge to edge, into the cropped sides.
- 12.9 s, 15.5 s, 18.5 s, 23.4 s: every super ("World news, rated 1 to 10.",
  "One number. One sentence.", "Also on your Home Screen", "Optional
  notifications…") sits in the top band.
- 12–26 s: the phone's lower third, home-screen dock and lock-screen buttons
  sit under the title stack and the rail. At 23.4 s the notification card
  ends at x 926, under the rail.
- 28.9 s, 31 s: "on what matters." and "World news, rated by significance."
  reach the cropped right edge.

**What changed.** No cut. The constraint is now a skill in the vendored skills
repository, `vendor/skills/skills/youtube-shorts/SKILL.md`: the zones as data,
a contact-sheet checker (`scripts/safe-zone.mjs`) and the screenshot fit
(`scripts/fit-screenshot.py`). The trailer section of this repository's skill
points to it.

**Not verified.** A viewer's view, Android, and whether captions or a Related
video row move the stack.

**Open.** A re-framed cut would bring the supers down below y 288, keep the
lines inside x 96–864, and scale and raise the phone so its screen ends above
y 1440, with `trailer.test.js` asserting the boxes against the skill's
`zones.json`. A corrected upload is a new video: the posted Short's views,
likes and comments do not carry over. The owner decides.

## 2026-10-21 trailer re-frame

**Why.** The owner asked whether the video was fixed after the framing
finding above. It answers that entry's open decision: re-frame it.

**What changed.** Layout only; the script, timing and sound are unchanged.
The film reads the youtube-shorts skill's `zones.json` (now in `FILM` and
`cut.json`) and places everything against it:

- Supers start just below YouTube's top controls (y 288 at the earliest)
  instead of at y 200.
- The phone is scaled from 0.63 to 0.40 of the app's points so it sits
  between the supers and y 1440, above the title stack; the lifted widgets
  and notification scale with it and stay clear of the rail.
- A line is set no wider than its room: the full safe width above the rail,
  the narrower box below it. Lines set together share the size their widest
  fits ("thousands of stories", "You could doomscroll", "what breaks
  through.", "Also on your Home Screen").
- The end card sits 40 px higher, so its tagline ends above the rail.

The cover (`store/assets/youtube/trailer-cover-1080x1920.png`) is the new
render's frame at 12.9 s, sha256 `5b2d4e6f…`. The sound-description captions
are unchanged, as is the sound.

**Outputs.** `store/assets/youtube/trailer-1080x1920.mp4`: 36.5 MB, sha256
`1f67fd76fad3520cda54b0178e5acdef0ad1e72454c5e3d0f93a40f5e331deee`.

**Verified.** `test/trailer.test.js` gains a browser test: every 0.2 s it
renders the film and checks every marked word, number, phone and lifted
widget against the zones, through its motion and clipped as drawn, and fails
if a marked part goes unseen. On the first cut's layout it finds 394
placements outside; on this one, none. It runs in CI, which now checks out
`vendor/skills`. `--verify` passes (8.8 Mb/s, −14 LUFS, −1.5 dBTP). The
skill's contact sheet, a frame a second, shows nothing readable outside the
green box or the yellow room above the rail. Against the first cut, decoded frame by frame: 0.5–2.8 s,
5.0–8.0 s, 8.5–9.8 s, 10.0–24.1 s and 29.6–32 s changed; the rest, the price
scene included, is unchanged (above 48 dB). A preview built from the owner's
screenshot (YouTube's controls lifted onto the new frame at 23.2 s) shows the
headline below the search button and the phone above the title. `npm test`
passed.

**Not verified.** On a phone: the preview is a composite, not a capture. As
the first cut: the sound by ear and YouTube's re-encode.

**Cost.** 13 minutes on four browsers, 6,437 samples.

**Open.** The posted Short still carries the first cut. Replacing it is a
new upload (its 1 view, like and comment stay with the old one). After
posting, a phone screenshot of a busy frame would confirm the zones.

## 2026-10-21 trailer restage

**Why.** The owner on the re-framed cut: "you shrunk everything to fit but the
video needs some deeper rethinking not just shrinking. it looks weird to have
tiny phone and ratio of headlines to content feels off. look at it yourself."
Seen through YouTube's controls, it was so: at 0.40 the phone was a thumbnail,
its score, widgets and notification small, and the 90 px headlines were the
heaviest thing in every phone scene. The type-only scenes held up.

**What changed.** The phone scenes (10–24 s) only; the script, timing, sound
and the other scenes are the second cut's.

- The phone is the subject: scaled 0.70 (the first cut's was 0.63), centred
  at x 520 so its edge clears the action rail at 898, its body running off
  the bottom of the frame under YouTube's title, so its lower edge is never
  seen there. Its screen's content sits in the safe box; the score's digits are
  about 210 px tall. The muted story line under the sentence sits just below the
  box, above the title.
- Headlines are one line of 60 px above the phone: "World news, rated 1 to
  10." and "One number. One sentence." each set as one line, their words
  still landing on their own beats.
- On the lock screen the phone settles 65 px lower during the wipe for a
  second line of type, the clock sits higher, and the notification rests
  under it, rises a short way into place, and lifts up and out (rising before
  it grows, so it clears the rail).
- Arriving, the phone scales about its bottom edge, so that edge never rises
  into view.

The cover is the new frame at 12.9 s (sha256 `3490976b…`); the captions are
unchanged.

**Outputs.** `store/assets/youtube/trailer-1080x1920.mp4`: 35.6 MB, sha256
`2a7b2b5e7ad7fe571596a5dda46062576957d0ec6fcc1040f897f8fad8975472`.

**Verified.** The safe-zone test now checks what the screen shows (the score's
cells, the sentence, the wordmark, the lock clock, the widgets and the
notification) rather than the phone's body, and passes. A new test fails if
the phone stops running off the frame, reaches under the rail or shrinks
below 60% of the frame's width. `--verify` passes (8.6 Mb/s, −14 LUFS,
−1.5 dBTP). The contact sheet shows nothing readable outside the safe areas.
Frames were looked at under YouTube's controls lifted from the owner's
screenshot, before and after the render. `npm test` passed.

**Not verified.** On a phone; the previews are composites. In the light
scenes YouTube's white channel and title text sits over a light background;
how far YouTube darkens it there is not measured. As before: the sound by ear
and YouTube's re-encode.

**Cost.** 14.9 minutes on four browsers, 6,437 samples.

**Open.** As the re-frame: replace the posted Short, then a phone screenshot
of a busy frame.

## 2026-10-21 trailer thumbnail

**Why.** The owner asked for a custom thumbnail for the Short.

**What changed.** A thumbnail mode beside the film: `NW.thumbnail()` draws the
reading at 12.9 s (the 10, on the warm end of the scale) with "World news,
rated 1 to 10." as two lines of 115 px, twice the film's, and the phone
centred and still, running off the bottom as in the film. A thumbnail is seen
small, in the Shorts shelf, search and the channel's grid, under the title but
without the player's controls, so the film's 60 px caption would not read
there. `render-trailer.mjs --thumbnail` writes it as a JPEG.

**Outputs.** `store/assets/youtube/trailer-thumbnail-1080x1920.jpg`: 1080×1920,
0.15 MB (YouTube's limit is 2 MB), sha256
`88f5f896aa35ea373c192ba5eb77ac644ac0e9471ac3cd9b685f103986c213d8`.

**Verified.** A browser test: the line sits inside the frame with a 60 px
margin, is set large, ends above the phone, the phone runs off the bottom,
and rendering the film hides the line again. Stills of the film at 14 times
across the phone scenes are identical to those rendered before the change,
so the committed MP4 still matches its source. The line quotes `COPY`, which
the tests already hold to its sources.

**Not verified.** How it looks in the shelf at its real size, and whether the
channel can upload a custom Shorts thumbnail.

**Open.** Upload it in Studio on desktop if the channel has custom Shorts
thumbnails; otherwise pick the 12.9 s frame in the mobile app.


## 2026-10-28 three social advertisements

**Why.** The owner commissioned three original 15–30-second vertical ads: an anti-feed concept, a $1 proposition, and an original direction. The brief explicitly authorizes new anti-doomscrolling copy, a price/CTA, authentic product screens, and parallel creative review.

**What changed.** New isolated `marketing/video/` workspace with Remotion/React/TypeScript compositions: A “More. More. Enough.” (22s), B “Pay with a dollar.” (22s), C “News. Full stop.” (24s). Existing preview/trailer cuts and production app behavior are preserved. Uses unchanged October 1 native captures, labeled outside the device; C explains the real one-week timeline in a separate editorial diagram rather than fabricating an end-of-list screen. Original sound synthesis, licensed local fonts, exact scripts, a review page, and render/verification tools accompany the files.

**Outputs.** Three 1080×1920/30fps H.264/AAC MP4s in `marketing/video/output/`. Final sizes, hashes, stream properties, audio levels and input hashes are generated in `marketing/video/qa/verification.json`.

**Review.** Complete draft renders, full-size stills, independent product/copy and visual review, revised native framing/date labels, proper vector CTA glyph, and stronger differentiated B/C execution. Final decoded frame sheets and safe-zone boards are under `marketing/video/previews/` and `marketing/video/qa/`; `qa/REVIEW.md` records the precise checks and their scope.

**Not verified.** Audio by ear, current native builds, physical-phone social overlays, or audience performance. These are social advertisements, not submitted App Store previews. No upload or publication occurred; the existing store-preview release gate is unaffected.

**Next.** Use the local review page; lead with A and compare B/C using actual purchase conversion. The owner controls publication. No permission is needed to finish these local deliverables, and no publication was requested.

## Follow-up: B opening-copy variants

**Why.** After the owner reported B was the strongest performer, they asked for the proposed opening-copy variations.

**What changed.** Three additional full-length B cuts, changing only the first three seconds' headline. `marketing/video/src/b-hooks.json` defines the copy; Remotion exposes B1-App, B2-Once and B3-Attention. The dedicated renderer checks the original B's hash and 3-second keyframe, renders only the new opening, then stream-copies the original remaining video and complete audio.

**Outputs.** `marketing/video/output/b-hooks/{B1-App,B2-Once,B3-Attention}-1080x1920.mp4`, with preview frames, a comparison viewer, scripts and `B-HOOKS.md`. Each is 22 seconds of video at 1080×1920/30fps, H.264/BT.709 with the control's stereo AAC. Input/output hashes and checks are in `marketing/video/qa/b-hooks/verification.json`.

**Review.** Full-resolution opening/boundary stills, independent claim/copy review, final decoded contact sheets, TypeScript checking, headline wrapping/safe-zone checks and browser playback. Verification compares all 570 post-opening video frames and the full audio with the control, rather than relying on a claim that only the opening changed.

**Scope.** The original A/B/C files and production application are preserved. Existing historical native capture and audio-audition limitations remain. No publishing, upload, spend or new performance result is implied.
