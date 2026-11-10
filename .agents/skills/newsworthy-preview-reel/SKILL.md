---
name: newsworthy-preview-reel
description: Remake, update or extend Newsworthy's 15-second store preview reel — the App Store app preview (886×1920) and Google Play promo video (1080×1920) rendered from code in store/video — or its 32-second YouTube Shorts trailer (store/video/trailer), and log the cut in store/video/ledger.md. Use whenever a shipped feature or a change to the reading screen, palette, widgets, settings, notifications, icon or approved copy may have left the store video out of date, and whenever someone asks for a new, refreshed, longer or platform-specific app preview, promo video, showreel, trailer, YouTube Short or store video, even if they only say the store assets look old.
---

# Newsworthy preview reel

**Keep the store video true to the app as it ships.** The reel is a 15-second film rendered frame by frame from code.
It uses the app's own tokens, reading canvas and layout rules, redrawn in Chromium. So a palette or copy change
reaches the film by re-rendering, not by redrawing.

Done means: both cuts pass `--verify` and the review page is republished. The ledger has the cut, and the owner
knows what is theirs to do.

A remake is usually small: find what the app changed, change those scenes, look, render, verify, log. A copy change
takes minutes of work and one twenty-minute render.

## Where things are

| What | Where |
|---|---|
| How the film is built | [store/video/README.md](../../../store/video/README.md) |
| Ledger | [the ledger](../../../store/video/ledger.md) |
| Last render's record | `store/video/cut.json` |
| Renderer | `store/scripts/render-video.mjs` |
| On-screen words | `COPY` in [reel.js](../../../store/video/reel.js) |
| The trailer and the day's Short | [references/other-films.md](references/other-films.md) |
| Stills, sheets and logs | `artifacts/preview-video/` |

Work from the repository root on a branch from a freshly fetched `origin/main` (`AGENTS.md`). Read
`store/video/README.md` once.

## A run

1. **Read the ledger:** the newest entry, its open decisions, and every item under Lessons. Lessons are what past cuts
   cost to learn.
2. **Ask the code what moved.** Run `node store/scripts/render-video.mjs --stale`. Its report is the scope of the
   remake (see [What --stale reports](#what---stale-reports)).
3. **Decide what the cut needs** ([details](#decide-what-the-cut-needs)).
4. **Look before you render** ([details](#look-before-you-render)).
5. **Render, then verify** ([details](#render-then-verify)).
6. **Review and ship** ([details](#review-and-ship)).

For the 32-second trailer (`store/video/trailer`) or the day's Short (`store/video/today`), also read
[references/other-films.md](references/other-films.md). Each has its own renderer, record and tests.

### What --stale reports

It compares every file the film is made from with the hashes the last render recorded in `store/video/cut.json`. A
change to notes, or to files the film doesn't use, doesn't show up. It lists:

- the scenes whose app files changed;
- each line whose source changed, with the seconds it is on screen;
- the film's own source;
- any line whose source no longer says it word for word;
- a ready `--stills` command for the affected moments;
- last, the commits since the render was recorded.

A feature the film doesn't show yet appears only in those commits. Read them for anything the owner would want shown.

### Decide what the cut needs

| What changed | Where the film changes |
|---|---|
| Any words on screen | `COPY` in [reel.js](../../../store/video/reel.js). Every line the film draws is there, with `quote`, the exact text of its source; change `text` and `quote` together. Nothing else quotes the lines. |
| Palette or brand colours | Nothing. The film imports `public/tokens.js`; re-render and check the supers still read. |
| Reading screen layout | The reading block of `layout()` in `composition.js`, which mirrors the formulas in `apps/client/app/index.tsx`. |
| Widget layout | The widget block of `layout()` and `P.widget`, per platform. |
| Settings or notification layout | The notifications section of `update()`. |
| The icon | The icon section of `update()`, drawn from the brand tokens. |
| A feature worth showing | A scene: cues in `timeline.js`, elements in `world()`, motion in `update()`, sound in `score.mjs`, lines in `COPY`, and an entry with the files it draws in `SCENES`. |

Fifteen seconds is full. A new scene takes time from another, or the film grows. Apple allows up to 30 seconds and
Google autoplays the first 30. When `DURATION` changes, cues move with it, sound events follow their cues, and
`--verify` checks the length. Ask the owner before cutting a scene they have seen.

### Look before you render

Every step before the full render takes seconds. Each run of `--stills` compares itself with the previous run of the
same times.

1. **Before editing**, run the `--stills` command that `--stale` printed, or your own times.
   `--stills 1.3,3.6,6.0,8.9,11.6,14.5` covers every scene. It writes PNGs and a contact sheet per platform to
   `artifacts/preview-video/`, about 0.15 s a still.
2. **After editing**, run the same command. It reports which stills changed and which are identical. It writes
   `<platform>-changes.png` with each changed still before and after. Unchanged scenes should say identical, and a
   refactor should change nothing at all. Read the sheets, then the changed frames at full size or cropped to the
   change.
3. **Motion.** `--segment 2.85,3.2` (about 0.17 s per sample) writes finished, motion-blurred frames of a span. Use it
   for anything fast before a full render.

### Render, then verify

The cloud image's ffmpeg encodes only VP8, and its Chromium can't play H.264. So don't try to play the MP4s locally.
Install an encoder once, where the renderer finds it without any environment variable:

```
pip install --quiet --target artifacts/tools/py imageio-ffmpeg
```

Render both cuts in parallel. It takes about 18 minutes on four cores. Wait on the logs' `exit` lines rather than
polling. Only `--render` writes the cuts. Any other or mistyped option refuses to run.

```
for p in ios android; do (node store/scripts/render-video.mjs --render --platform $p > artifacts/preview-video/render-$p.log 2>&1; echo "exit $?" >> artifacts/preview-video/render-$p.log) & done; wait
```

Each render records its output's hash and every input's in `store/video/cut.json`. Then it compares the cut with the
one it replaced. The result is one of: byte for byte the same, the same picture, or the seconds where frames changed
with the lowest PSNR among them.

- **A change shows only where it was made.** That is the check that a refactor or a renderer fix didn't reach the
  picture.
- **The iPhone cut renders byte for byte the same** from the same source. The Android cut may not. A few pixels can
  land a level or two apart in a few frames. That is reported above 50 dB and can't be seen.
- **An interrupted render leaves the last cut in place.**
- **Don't edit a render input while a render runs**, or the record is stale on arrival.

Then run `--verify`. It reports every store rule, pass or fail, and whether each file still matches its record. It
also gives each sha256 and a contact sheet decoded from the MP4 itself.

- **Look at the encoded file**, because it is what ships, not the captures. Check the sheets, a frame from the fastest
  roll (about 3.1 s) and a dark frame (about 11.5 s).
- **Measure the sound.** It can't be heard here. Check it is near −16 LUFS with −3 dBFS peaks, and ask the owner to
  listen.

### Review and ship

- **Review page.** `--viewer` builds it and prints the files map. Republish to the URL in the ledger, so the owner's
  link stays the same. Read it first, then publish with `url` and the map.
- **Checks.** `npm test` includes `test/preview-reel.test.js`, which fails when a line's source no longer contains its
  `quote`. Before any PR, run the copy review in `.agents/skills/newsworthy-pr-copy-review/SKILL.md`.
- **Ledger.** Add a row and an entry to `store/video/ledger.md` from the template below, and new Lessons if the cut
  taught any. Record the gate too:
  `npm run ledger -- record --gate store.preview-video --summary … --evidence … --next …`.
- **Commit** the cuts, `cut.json` and the source that made them together, and push. Open a PR only when asked.

## Rules

**Keep the film true.** These are why the film is trusted, so treat each as a reason, not a box to tick.

- **No frame is a reading.** Scores are illustrative. The sentence is drawn as placeholder bars, as the introduction
  draws it. A real sentence dates the film, and an invented one is a fabricated reading, which the store rules in
  `store/README.md` forbid. The number settles low so the film doesn't imply the news usually reads high. The
  notification shows 8, the default threshold.
- **Only approved words.** Every line comes from `COPY` with its source. No AI, models, markets, urgency, rank
  ("best", "#1") or call to download; see `docs/product-messaging.md`. Don't describe what a score means: calibration
  is the prompt's business, not the film's. A change can leave the lines reading oddly together (one verb in the
  title, another in the tagline). Then tell the owner rather than reword approved copy.
- **Only what the app does.**
  - No banner over the open app, because it suppresses them.
  - Widgets aren't shown changing with a notification, because the system schedules them.
  - Each cut draws its own platform's UI and words ("Home Screen" on iOS, "home screen" on Android).
  - The clocks agree (9:41, checked 4 min ago, 9:37).
- **The store rules.**
  - Apple: 15–30 s, at most 30 fps, H.264 High at level 4.0 or lower, a stereo AAC track, 886×1920 for iPhone. Its
    guideline 2.3.4 limits previews to screen captures of the app, so say plainly that the iPhone cut may be refused.
  - Google: a YouTube link, most of the video showing the app early, no rank claims or calls to action.

## Report

Tell the owner what is theirs:

- uploading: App Store Connect's app preview slot, and YouTube for Google Play (ads off, not age-restricted);
- setting the poster frame by hand at `POSTER_SECONDS`;
- the guideline 2.3.4 decision;
- listening to the sound.

## Ledger

Add each cut to [the ledger](../../../store/video/ledger.md) with this template:

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
