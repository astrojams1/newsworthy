# The trailer and the day's Short

Two more films live beside the preview reel. They follow the same principles. Log their cuts in the same ledger.

## The trailer

`store/video/trailer` is a 32-second vertical trailer for YouTube Shorts. It tells why the app exists, from the
owner's brief in its [README](../../../../store/video/trailer/README.md), which also holds its script.

- **Its own renderer.** `store/scripts/render-trailer.mjs` takes `--stills`, `--segment`, `--audio`, `--render`,
  `--encode` and `--verify`. It renders one 1080×1920 cut at `store/assets/youtube/` and records itself in
  `store/video/trailer/cut.json`. It is held to YouTube's upload settings rather than Apple's.
- **Its lines.** They quote the script table, the app or the core copy. `test/trailer.test.js` checks them.
- **Frame for the phone.** On YouTube the trailer plays under the status bar, back, search and menu, the action rail
  and the title stack. A tall phone crops its sides. Follow the
  [YouTube Shorts skill](../../../../vendor/skills/skills/youtube-shorts/SKILL.md): every line, number and phone screen
  sits inside its safe box (x 96–864, y 288–1440). Check it with the skill's `safe-zone.mjs` contact sheet before
  upload. The film reads the zones from the skill's `zones.json`, and `test/trailer.test.js` fails any placement
  outside them. The first cut was framed to the whole frame, and the owner found its supers under YouTube's buttons
  (2026-10-21).
- **Look first.** `--stills` with times across all seven scenes takes seconds.
- **Sound by measurement.** `--audio` writes the score alone. It reports each bus's loudness per scene, the limiter's
  work and the groove's octave bands. The film's own hush (bar 5) should measure well below the groove. The
  notifications and the clock should not sink under the pulse in bars 1–4.
- **Render once.** `--render` runs four browsers in parallel and keeps the frames. So a change to the sound alone is
  an `--encode`.
- **It is not a reading either.** The same rules hold: placeholder bars for every sentence and headline, no AI, no
  rank. The price and "On the App Store" are true only once the listing is live at that price.

## The day's Short

`store/video/today` is a 14-second film made to be remade daily. It shows the day's real front page, then the same
reading in the widgets, then the name and the price. `node store/scripts/today-reading.mjs` snapshots `/api/current`
into `reading.json`.

- **How it renders.** Use the trailer's renderer with `--film today`. Rendering every frame takes about two minutes. It records
  itself in `store/video/today/cut.json`. `test/today.test.js` checks its quotes, first frame and framing. Its README
  says why it replaced the trailer as the Short to post.
- **It is a reading, on purpose.** The reel and trailer rule ("no frame is a reading") keeps store videos from dating.
  A day's Short is meant to be dated. Never write or edit the reading for the film. Post it the day it was fetched.
- **A long sentence can reach the safe box's bottom.** The reading block is centred, so a fifth line moves the last
  one lower. The safe-zone test fails rather than let it pass under YouTube's title. Re-run it after each fetch.
