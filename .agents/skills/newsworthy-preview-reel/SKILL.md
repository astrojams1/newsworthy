---
name: newsworthy-preview-reel
description: Remake, update or extend Newsworthy's 15-second store preview reel — the App Store app preview (886×1920) and Google Play promo video (1080×1920) rendered from code in store/video — and log the cut in store/video/ledger.md. Use whenever a shipped feature or a change to the reading screen, palette, widgets, settings, notifications, icon or approved copy may have left the store video out of date, and whenever someone asks for a new, refreshed, longer or platform-specific app preview, promo video, showreel or store video, even if they only say the store assets look old.
---

# Newsworthy preview reel

The reel is a 15-second film rendered frame by frame from code: the app's own
tokens, its reading canvas and its layout rules, redrawn in Chromium, so a
palette or copy change reaches the film by re-rendering, not by redrawing. A
remake is usually small: find what the app changed, change those scenes,
render, verify, log. This skill keeps it that small.

Work from the repository root on a branch from a freshly fetched `origin/main`
(AGENTS.md). Read [store/video/README.md](../../../store/video/README.md) once
for how the film is built.

## Start from the ledger

Read [the ledger](../../../store/video/ledger.md): the newest row and its open
decisions, and every item under Lessons, which is what past cuts cost to learn.
Then ask the code what moved:

```
node store/scripts/render-video.mjs --stale
```

It names the commit that last shipped the cuts, then lists each scene whose app
sources changed since (each scene's sources are in `SCENES` in
[reel.js](../../../store/video/reel.js)), changes to the film's own source,
commits since the cut, and any line on screen that is no longer in the file it
came from. That report is the scope of the remake. A feature the film does not
show yet appears only in the commit list, so read it for anything the owner
would want shown.

## Decide what the cut needs

| What changed | Where the film changes |
|---|---|
| Palette or brand colours | Nothing. The film imports `public/tokens.js`; re-render and check the supers still read. |
| Approved copy | `COPY` in `reel.js`. Every line names its source; keep lines short enough to read in about two seconds. |
| Reading screen layout | The reading block of `layout()` in `composition.js`, which mirrors the formulas in `apps/client/app/index.tsx`. |
| Widgets | The widget block of `layout()` and `P.widget`, per platform. |
| Settings or notifications | The notifications section of `update()`. |
| The icon | The icon section of `update()`, drawn from the brand tokens. |
| A feature worth showing | A scene: cues in `timeline.js`, elements in `world()`, motion in `update()`, sound in `score.mjs`, and an entry with its sources in `SCENES`. |

Fifteen seconds is full. A new scene takes time from another, or the film
grows: Apple allows up to 30 seconds and Google autoplays the first 30. When
`DURATION` changes, cues move with it, sound events follow their cues, and
`--verify` checks the length. Ask the owner before cutting a scene they have
seen.

## Keep the film true

These are why the film is trusted, so each is a reason, not a rule to satisfy:

- **No frame is a reading.** Scores are illustrative and the sentence is drawn
  as placeholder bars, as the introduction draws it. A real sentence dates the
  film and an invented one is a fabricated reading, which the store rules in
  `store/README.md` forbid. The number settles low so the film does not imply
  the news usually reads high; the notification shows 8, the default threshold.
- **Only approved words.** Every line comes from `COPY` with its source. No AI,
  models, markets, urgency, rank ("best", "#1") or call to download; see
  `docs/product-messaging.md`. Do not describe what a score means: calibration
  is the prompt's business, not the film's.
- **Only what the app does.** No banner over the open app (it suppresses them);
  widgets are not shown changing with a notification (the system schedules
  them); each cut draws its own platform's UI and words ("Home Screen" on iOS,
  "home screen" on Android); the clocks agree (9:41, checked 4 min ago, 9:37).
- **The store rules.** Apple: 15–30 s, at most 30 fps, H.264 High at level 4.0
  or lower, a stereo AAC track, 886×1920 for iPhone. Its guideline 2.3.4 limits
  previews to screen captures of the app, so say plainly that the iPhone cut
  may be refused. Google: a YouTube link, most of the video showing the app
  early, no rank claims or calls to action.

## Set up once per session

The cloud image's ffmpeg encodes only VP8 and its Chromium cannot play H.264,
so install an encoder and do not try to play the MP4s locally:

```
pip install --quiet --target "$SCRATCH/py" imageio-ffmpeg
export FFMPEG_PATH=$(ls "$SCRATCH"/py/imageio_ffmpeg/binaries/ffmpeg-*)
```

`$SCRATCH` is the session's scratchpad. The renderer refuses to start a video
render without a capable ffmpeg rather than failing at the end of one.

## Iterate cheaply, then render once

1. **Stills** (`--stills 1.3,3.6,6.0,8.9,11.6,14.5`, about 0.15 s each) write
   PNGs and a contact sheet to `artifacts/preview-video/`. Get layout, colour
   and copy right here; view the sheet, then any frame at full size.
2. **Refactors** that should change nothing: hash a set of stills before and
   after and require them identical.
3. **Motion** (`--segment 2.85,3.2`, about 0.25 s per sample) writes finished,
   motion-blurred frames of a span. Use it for anything fast before a full render.
4. **Full render**: both cuts in parallel in the background, about 19 minutes
   on four cores. Wait on the logs' `exit` lines instead of polling:
   ```
   for p in ios android; do (node store/scripts/render-video.mjs --platform $p > artifacts/preview-video/render-$p.log 2>&1; echo "exit $?" >> artifacts/preview-video/render-$p.log) & done; wait
   ```
5. **Verify** with `--verify`: every store rule, pass or fail, with each file's
   sha256 and a contact sheet decoded from the MP4 itself. Look at the sheets, at
   a frame from the fastest roll and at a dark frame; the encoded file is what
   ships, not the captures.
6. **Sound** cannot be heard here. Check it is near −16 LUFS with −3 dBFS peaks
   and that a linear spectrogram shows each event where the cues put it, then
   ask the owner to listen.

## Review and ship

- **Review page.** `--viewer` builds it and prints the files map. Republish to
  the URL in the ledger (read it first, then publish with `url` and the map) so
  the owner's link stays the same.
- **Checks.** `npm test` (which includes `test/preview-reel.test.js`), and the
  copy review in `.agents/skills/newsworthy-pr-copy-review/SKILL.md` before any PR.
- **Ledger.** Add a row and an entry to `store/video/ledger.md` from the
  template below, and new Lessons if the cut taught any. Record the gate too:
  `npm run ledger -- record --gate store.preview-video --summary … --evidence … --next …`.
- **Commit the cuts with the source that made them.** `--stale` takes the
  commit that last changed a video as the source it was rendered from, which
  stays true only if they land together. Push; open a PR only when asked.
- **Tell the owner what is theirs.** Uploading (App Store Connect's app preview
  slot; YouTube for Google Play, ads off, not age-restricted), setting the poster
  frame by hand at `POSTER_SECONDS`, the guideline 2.3.4 decision, and
  listening to the sound.

## Ledger entry template

```
| [YYYY-MM-DD](#yyyy-mm-dd) | `<commit>` | <why, in a few words> | <outputs> | <what was checked> | <open decisions> |

## YYYY-MM-DD

**Why.** What shipped or who asked, and which scenes it touched.

**What changed.** Scene by scene, including timing and copy. "Unchanged" is an answer.

**Rendered from** `<commit>` (the commit that carries the cuts and their source).

**Outputs.** Each file with its size and sha256 from `--verify`.

**Verified.** The `--verify` result, the frames looked at, loudness, tests.

**Not verified.** At least the sound by ear, native parity and App Review.

**Cost.** Samples and minutes, where they differ from the last cut.

**Open.** What the owner has to decide or do, and what the next remake should check first.
```
