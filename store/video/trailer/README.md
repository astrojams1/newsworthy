# Trailer

A 32-second vertical trailer for YouTube Shorts, rendered frame by frame from
code like the [store preview reel](../README.md): `composition.js` draws the
picture as a pure function of time, `score.mjs` synthesises the sound from the
same clock (`timeline.js`), and `store/scripts/render-trailer.mjs` captures,
blurs and encodes both. `film.js` lists the scenes, every line on screen with
the file it quotes, and the output with the rules it meets. Cuts are logged in
the [preview reel ledger](../ledger.md).

## The brief

The owner, 2026-10-21, once Apple had approved the app: a trailer of about 30
seconds for YouTube Shorts that tells why the app exists. Many stories come and
go through the day; the app shows only what breaks through to the top, so you
can stay focused on what matters instead of doomscrolling through what will not
affect you. Say that it is $1, with no ads, no subscription and no in-app
purchases; show the widgets, the notifications and the design's colour
gradients. Tell the story with motion graphics, and treat the sound as part of
the storytelling.

That brief is an owner-requested exception to two lines of
`docs/product-messaging.md`, which otherwise keeps doomscrolling framing and
lists of absent features out of copy. The trailer still keeps the core copy as
its tagline, says nothing about how ratings are made, and draws no real or
invented reading: scores are illustrative, every sentence is placeholder bars,
and the feed it opens on is drawn the same way.

## Script

Every line the film writes that is not the app's own words is here, and
`film.js` quotes it from this table, so a line changed in one place and not the
other fails `npm test`.

| Bar | On screen | Picture | Sound |
|---|---|---|---|
| 1 | Every day, | A dark, endless feed of cards scrolls past at an angle | Clock ticks; a low pulse in A minor |
| 1 | thousands of stories | Notifications from other apps start to pile up | One blip per notification |
| 2 | come and go. | The feed lurches and scatters | A whoosh across the stereo field |
| 3 | You could doomscroll | The feed speeds up; a clock races through the day | Ticks double, the pulse opens up |
| 3 | all day… | Faster, into a blur | A riser; blips pile into a swarm |
| 5 | …or see only | Everything stops and drains grey; the feed sinks away | Silence, then a sub drop |
| 5 | what breaks through. | One card stays and rises, glowing warm | A single bell; a shockwave on the beat |
| 6 | World news, | The card becomes an iPhone showing Newsworthy | The drop: the groove arrives in A major |
| 6 | rated 1 to 10. | The number rolls up the scale, the whole frame warming from fog blue to ember | One rising note per digit |
| 8 | One number. | The number springs back down to a quiet 2 | Falling notes |
| 8 | One sentence. | The sentence is set down as placeholder lines | Four soft clicks |
| 9 | Also on your Home Screen | The reading closes into a medium widget; a small one joins it | A whoosh into a thump |
| 11 | Optional notifications | Dark lock screen, warmed by an 8 | A filter dip |
| 11 | at the score you choose. | "Newsworthy · 8/10" arrives | The two-note chime |
| 13 | $1 | The phone drops away; the light spreads | An impact |
| 13 | once | | |
| 13 | No ads. | | A stab |
| 13 | No subscription. | | A stab |
| 14 | No in-app purchases. | | A stab, then a build |
| 15 | Stay focused | Calm light, the drums fall away | Pad and a slow melody |
| 15 | on what matters. | | |
| 16 | Newsworthy | The icon, the name and the tagline | The sound-logo chord, ringing out |
| 16 | On the App Store | | |

"Also on your Home Screen", "Optional notifications", "at the score you
choose." and the notification's title are the app's own words; the name and
"World news, rated by significance." are the core copy; the price is the one in
`docs/product-messaging.md` and what it includes is the listing's own Review
Notes in `store/store.json`.

## Render

```sh
pip install --quiet --target artifacts/tools/py imageio-ffmpeg               # once: an ffmpeg with H.264 and AAC
node store/scripts/render-trailer.mjs --stills 2,7,9.2,12.8,15.5,18.5,22.5,25,28.6,31.5
node store/scripts/render-trailer.mjs --segment 7.4,8.1                     # finished, blurred frames of a span
node store/scripts/render-trailer.mjs --audio                              # the score alone, with loudness and a spectrogram
node store/scripts/render-trailer.mjs --render                             # every frame in parallel, then the MP4
node store/scripts/render-trailer.mjs --encode                             # re-encode the last frames with the current score
node store/scripts/render-trailer.mjs --verify                             # the MP4 against YouTube's settings and cut.json
node store/scripts/render-trailer.mjs --thumbnail                          # the custom thumbnail, a still JPEG
```

`--render` splits the frames between four browser processes (`--workers N`)
and keeps them in `artifacts/trailer/frames/`, so a change to the sound alone
needs only `--encode`, seconds rather than minutes. Each frame averages up to
twenty renders across a 180-degree shutter in linear light, as the reel does;
`timeline.js` says where the fast moments are. The render writes its output's
hash and every input's into `cut.json`.

Every word, number and screen sits inside the Shorts safe zone, read from the
shared [youtube-shorts skill](../../../vendor/skills/skills/youtube-shorts/SKILL.md)'s
`zones.json`: on a phone YouTube's controls cover the top, the right edge and
the bottom of the video, and a tall phone crops its sides. In the phone
scenes the phone is the subject: large, a little left of centre to clear the
action rail, its body running off the bottom of the frame under YouTube's
title, with a one-line headline above it. What its screen shows sits in the
safe box; the muted story line under the sentence sits just below it, above
the title. Elsewhere a line starts below the top controls and is set smaller
rather than run under the rail. `test/trailer.test.js` checks every placement
through the film, and that the phone runs off the frame and clears the rail.
Backgrounds still fill the frame. Check a render with the skill's
`safe-zone.mjs` contact sheet before uploading.

The phone is drawn as an iPhone because the app is approved only there; Google
Play is in closed testing. The typefaces stand in for Apple's as in the reel:
Inter for SF Pro and Roboto Mono Light for SF Mono.

## Before it goes up

- **The listing must be live.** The end card says "On the App Store" and the
  price is $1. Publish once the App Store page is public at that price
  (`apple.release` in the [release ledger](../../ledger.md)).
- **Listen.** The sound is synthesised and was checked by loudness, peaks and
  spectrogram, not by ear.
- **Thumbnail.** `store/assets/youtube/trailer-thumbnail-1080x1920.jpg` is a
  custom one (`--thumbnail`): the 12.9 s reading with its line set twice as
  large, since a thumbnail is seen small in the Shorts shelf, search and the
  channel's grid. Custom Shorts thumbnails upload in Studio on desktop, for
  Partner Program channels first (rolling out since July 2026); without one,
  pick the 12.9 s frame in the mobile app.
