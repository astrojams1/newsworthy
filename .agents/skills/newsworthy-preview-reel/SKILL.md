---
name: newsworthy-preview-reel
description: Remake, update or extend Newsworthy's 15-second store preview reel — the App Store app preview (886×1920) and Google Play promo video (1080×1920) rendered from code in store/video — and log the cut in store/video/ledger.md. Use whenever a shipped feature or a change to the reading screen, palette, widgets, settings, notifications, icon or approved copy may have left the store video out of date, and whenever someone asks for a new, refreshed, longer or platform-specific app preview, promo video, showreel or store video, even if they only say the store assets look old.
---

# Newsworthy preview reel

The reel is a 15-second film rendered frame by frame from code: the app's own
tokens, its reading canvas and its layout rules, redrawn in Chromium, so a
palette or copy change reaches the film by re-rendering, not by redrawing. A
remake is usually small: find what the app changed, change those scenes, look,
render, verify, log. This skill keeps it that small; a copy change takes
minutes of work and one twenty-minute render.

Work from the repository root on a branch from a freshly fetched `origin/main`
(AGENTS.md). Read [store/video/README.md](../../../store/video/README.md) once
for how the film is built.

## Start from the ledger

Read [the ledger](../../../store/video/ledger.md): the newest entry, its open
decisions, and every item under Lessons, which is what past cuts cost to learn.
Then ask the code what moved:

```
node store/scripts/render-video.mjs --stale
```

It compares every file the film is made from with the hashes the last render
recorded in `store/video/cut.json`, so a change to notes, or to files the film
does not use, does not show up. It lists the scenes whose app files changed,
each line whose source changed with the seconds it is on screen, the film's
own source, any line whose source no longer says it word for word, and a ready
`--stills` command for the affected moments. Last come the commits since the
render was recorded: a feature the film does not show yet appears only there,
so read them for anything the owner would want shown. That report is the scope
of the remake.

## Decide what the cut needs

| What changed | Where the film changes |
|---|---|
| Any words on screen | `COPY` in [reel.js](../../../store/video/reel.js). Every line the film draws is there, with `quote`, the exact text of its source; change `text` and `quote` together. Nothing else quotes the lines. |
| Palette or brand colours | Nothing. The film imports `public/tokens.js`; re-render and check the supers still read. |
| Reading screen layout | The reading block of `layout()` in `composition.js`, which mirrors the formulas in `apps/client/app/index.tsx`. |
| Widget layout | The widget block of `layout()` and `P.widget`, per platform. |
| Settings or notification layout | The notifications section of `update()`. |
| The icon | The icon section of `update()`, drawn from the brand tokens. |
| A feature worth showing | A scene: cues in `timeline.js`, elements in `world()`, motion in `update()`, sound in `score.mjs`, lines in `COPY`, and an entry with the files it draws in `SCENES`. |

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
  is the prompt's business, not the film's. When a change leaves the lines
  reading oddly together (one verb in the title, another in the tagline), say
  so to the owner rather than rewording approved copy.
- **Only what the app does.** No banner over the open app (it suppresses them);
  widgets are not shown changing with a notification (the system schedules
  them); each cut draws its own platform's UI and words ("Home Screen" on iOS,
  "home screen" on Android); the clocks agree (9:41, checked 4 min ago, 9:37).
- **The store rules.** Apple: 15–30 s, at most 30 fps, H.264 High at level 4.0
  or lower, a stereo AAC track, 886×1920 for iPhone. Its guideline 2.3.4 limits
  previews to screen captures of the app, so say plainly that the iPhone cut
  may be refused. Google: a YouTube link, most of the video showing the app
  early, no rank claims or calls to action.

## Look before you render

Every step before the full render takes seconds, and each run of `--stills`
compares itself with the previous run of the same times:

1. **Before editing**, run the `--stills` command `--stale` printed, or your own
   times (`--stills 1.3,3.6,6.0,8.9,11.6,14.5` covers every scene). It writes
   PNGs and a contact sheet per platform to `artifacts/preview-video/`, about
   0.15 s a still.
2. **After editing**, run the same command. It reports which stills changed and
   which are identical, and writes `<platform>-changes.png` with each changed
   still before and after. Unchanged scenes should say identical; a refactor
   should change nothing at all. Read the sheets, then the changed frames at full
   size or cropped to the change.
3. **Motion** (`--segment 2.85,3.2`, about 0.17 s per sample) writes finished,
   motion-blurred frames of a span. Use it for anything fast before a full render.

## Render, then verify

The cloud image's ffmpeg encodes only VP8, and its Chromium cannot play H.264,
so do not try to play the MP4s locally. Install an encoder once where the
renderer finds it without any environment variable:

```
pip install --quiet --target artifacts/tools/py imageio-ffmpeg
```

Render both cuts in parallel, about 18 minutes on four cores, and wait on the
logs' `exit` lines rather than polling. Only `--render` writes the cuts; any
other or mistyped option refuses to run.

```
for p in ios android; do (node store/scripts/render-video.mjs --render --platform $p > artifacts/preview-video/render-$p.log 2>&1; echo "exit $?" >> artifacts/preview-video/render-$p.log) & done; wait
```

Each render records its output's hash and every input's in `store/video/cut.json`,
then compares the cut with the one it replaced: byte for byte the same, the
same picture, or the seconds where frames changed and the lowest PSNR among
them. A change should show where it was made and nowhere else, which is the
check that a refactor or a renderer fix did not reach the picture. The iPhone
cut renders byte for byte the same from the same source. The Android cut may
not: a few pixels can land a level or two apart in a few frames, reported
above 50 dB, which cannot be seen. An interrupted render leaves the last cut
in place. Do not edit a render input while a render runs, or the record is
stale on arrival.

Then `--verify`: every store rule, pass or fail, whether each file still matches
its record, each sha256, and a contact sheet decoded from the MP4 itself. Look
at the sheets, a frame from the fastest roll (about 3.1 s) and a dark frame
(about 11.5 s): the encoded file is what ships, not the captures. The sound
cannot be heard here; check it is near −16 LUFS with −3 dBFS peaks, and ask the
owner to listen.

## Review and ship

- **Review page.** `--viewer` builds it and prints the files map. Republish to
  the URL in the ledger (read it first, then publish with `url` and the map) so
  the owner's link stays the same.
- **Checks.** `npm test` includes `test/preview-reel.test.js`, which fails when
  a line's source no longer contains its `quote`. Before any PR, run the copy
  review in `.agents/skills/newsworthy-pr-copy-review/SKILL.md`.
- **Ledger.** Add a row and an entry to `store/video/ledger.md` from the
  template below, and new Lessons if the cut taught any. Record the gate too:
  `npm run ledger -- record --gate store.preview-video --summary … --evidence … --next …`.
- **Commit** the cuts, `cut.json` and the source that made them together, push,
  and open a PR only when asked.
- **Tell the owner what is theirs.** Uploading (App Store Connect's app preview
  slot; YouTube for Google Play, ads off, not age-restricted), setting the poster
  frame by hand at `POSTER_SECONDS`, the guideline 2.3.4 decision, and
  listening to the sound.

## Ledger entry template

```
| [YYYY-MM-DD](#yyyy-mm-dd) | <why, in a few words> | <what changed> | <what was checked> | <open decisions> |

## YYYY-MM-DD

**Why.** What shipped or who asked, and which scenes it touched.

**What changed.** Scene by scene, including timing and copy. "Unchanged" is an answer.

**Outputs.** Each file with its size and sha256 from `--verify`; their inputs are in `cut.json`.

**Verified.** What each render said changed against the cut it replaced, the `--verify` result, the stills and frames looked at, loudness, tests.

**Not verified.** At least the sound by ear, native parity and App Review.

**Cost.** Samples and minutes, from `cut.json`, where they differ from the last cut.

**Open.** What the owner has to decide or do, and what the next remake should check first.
```
