# Today

A 14-second vertical Short of the day's real reading: the app's own front
page, its number and its sentence, then the same reading in the Home Screen
widgets, then the name and the price. Rendered from code like the
[trailer](../trailer/README.md), by the same renderer
(`store/scripts/render-trailer.mjs --film today`), from a snapshot of the live
reading in `reading.json`. Cuts are logged in the
[preview reel ledger](../ledger.md); the post and its results in the
[growth ledger](../../../docs/growth/ledger.md).

## Why it exists

The trailer went up as a Short on 2026-10-21 and stalled: 29 impressions,
24 views in its first three hours and none after, about 0.1 hours watched in
all (roughly 15 of its 32 seconds a view), one subscriber, no downloads. What
it did that this one does not:

| The trailer | This Short |
|---|---|
| Five seconds of blank, dark feed cards before anything is said or shown | The question, the phone and the day's number in the first frame |
| Every sentence drawn as placeholder bars: nothing to read, learn or comment on | The day's real reading, word for word as the app shows it |
| 32 seconds, the app from 10 s, the price at 26 s | 14 seconds; the app throughout, the price at 10 s; it loops |
| One polished film, one upload, one chance with the algorithm | A format: a fetch and a render make a new one from any day's reading |

What the analytics cannot say yet: viewed versus swiped away, and retention by
second. Read both for this one at +2 days.

## Script

Every line the film writes that is not the app's own words or the reading is
here, and `film.js` quotes it from this table.

| Time | On screen | Picture | Sound |
|---|---|---|---|
| 0 s | How big is today's news? | The phone, already on the day's reading, in its level's colour | A low hit and the pad |
| 0.3 s | | The sentence set down word by word; the story and its age below | Soft ticks as it is set |
| 4 s | One number. | | A pluck |
| 5 s | One sentence. | | A pluck |
| 7 s | Also on your Home Screen | The Home Screen: the same reading in a medium and a small widget | A whoosh into a thump |
| 10 s | Newsworthy | The phone drops away into the brand's light; the icon, the name, the tagline | The chord |
| 11 s | $1 on the App Store | | A bell |

"Also on your Home Screen" is the app's own; the name and "World news, rated by
significance." are the core copy; the price is the one in
`docs/product-messaging.md`.

## A day's Short

```sh
node store/scripts/today-reading.mjs                                   # snapshot /api/current into reading.json
node store/scripts/render-trailer.mjs --film today --stills 0,1,3,5,8,12
node store/scripts/render-trailer.mjs --film today --render
node store/scripts/render-trailer.mjs --film today --verify
node store/scripts/render-trailer.mjs --film today --thumbnail
```

The output is `store/assets/youtube/today-1080x1920.mp4` with its thumbnail
beside it. Post it the same day: the story line's age ("9h ago") is the age at
the snapshot, and the title carries the date.

## Rules it keeps

- **Only what the app shows.** The reading is the front page's, fetched from
  `/api/current`, never written or edited for the film; the number, the
  sentence, the story line, the widgets' "9h ago" and "Checked at" are laid out
  as the app and the widget lay them out, at the snapshot's time. The trailer's
  "no frame is a reading" rule was there because a real sentence dates a store
  video that has to last a release; a day's Short is meant to be dated, and the
  store screenshots already carry live readings.
- **Nothing about how it is made.** No AI, models or markets, no rank, no
  urgency; the film does not say what a score means.
- **The Shorts frame.** Every word, number and screen inside the
  [youtube-shorts skill](../../../vendor/skills/skills/youtube-shorts/SKILL.md)'s
  safe box; the phone large, running off the bottom under YouTube's title.
  `test/today.test.js` checks both, frame by frame.
- **The price exception.** As for the trailer, the owner's brief of 2026-10-21
  allows the $1 price in the YouTube films; it ends on the core copy.
