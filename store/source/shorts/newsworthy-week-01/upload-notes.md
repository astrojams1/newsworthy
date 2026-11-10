# newsworthy-week-01: upload notes

File: `newsworthy-week-01.mp4` (1080x1920, 15.10 s, H.264, 30 fps, AAC 48 kHz stereo)
Cover: `newsworthy-week-01-cover.jpg` (10.8 s, the end of the timeline). On mobile, pick the frame at about 10.8 s.

Made to stay true for two weeks: it is about how the app reads (a number, a sentence, one week of stories, an end),
not about the day's news. The reading it shows is dated on screen.

## Title (27 characters)

This news app has an ending

## Description

Newsworthy shows one number and one sentence: when this was recorded on Nov 10, 2026, the news was rated 6 out of 10. Below that is a timeline of the past week's developments. Scroll to the bottom and it stops, about a week back.

Recorded on Nov 10, 2026 in Newsworthy's web version at a phone-sized window, showing that day's real reading. The scroll is sped up.

I made Newsworthy: Calm News. World news, rated by significance: a score from 1 to 10, a brief explanation and an update time. A one-time US$1 download for iPhone and iPad.
Search 'Newsworthy: Calm News' on the App Store.

#news #worldnews #iosapp

## Pinned comment

Would you read the news this way? One number, one sentence, a week of stories, then an end. Search 'Newsworthy: Calm News' on the App Store.

## Music

Seed `newsworthy-week-01-it-ends`, signature `124-B-p1-m0-f1` (soundtrack.mjs). Record this as the episode's `music`.

## Settings

- Made for kids: no (adults who read the news)
- Category: 28 (Science & Technology); tags: newsworthy, calm news, news app
- Paid promotion: no
- Altered or synthetic (AI use): no (a real recording of the app; synthesised sound effects and bed)
- Captions: burned in; do not upload an `.srt`
- Format: "It ends" (the reading, the week's timeline, its end). Series episode 1
- Schedule: fine for any slot from 2026-11-15 to 2026-11-21; nothing in it claims to be today's news

## What the take shows

Take t4 (`work/takes/t4/take.mov`, 780x1688, 31.8 s), recorded 2026-11-10 15:24:16 UTC by
`store/source/shorts/record-timeline-take.mjs` (astrojams1/newsworthy) from the live web app at
https://newsworthy-indol.vercel.app/ (production, commit b79673e; `apps/client` unchanged since d7b7199, "Add Send
Feedback and set version 1.0.1", the App Store's 1.0.1) in Playwright's headless Chromium at a 390x844 viewport.
Nothing was mocked or edited: the page's own data, the app's own scrolling. `work/takes/t4/state.jsonl` holds what
the page said at each mark; `current.json` and `timeline.json` hold the public API's answers when the take began.

| Take time | What happens | What the page shows |
|---|---|---|
| 0-3.0 s | The reading | 6 /10; "US prices excluding food and energy rose 0.3% in Oct, the level Fed governor Waller said could justify a larger Dec rate hike."; "Fed Rates · 1h ago" |
| 3.03 s | Tap on the chevron ("Earlier developments"); the app scrolls itself to the timeline | By 5.0 s: first entry "Fed Rates · 5h ago", then "Iran War · 19h ago", "1d ago", "Nvidia Spy", "Iran War · 2d ago" |
| 5.0-25.4 s | Touch swipes down the timeline at 450 px/s | Tags run from "5h ago" through "2d ago", "3d ago", "4d ago", "5d ago" to "6d ago" |
| 25.66 s | The end: scroll position 4878 of 4878 | Last tag "US Midterms · 6d ago"; last entry "US midterm results will settle who controls Congress, and Democrats flipped a Senate seat in North Carolina, networks projected." |
| 25.7-29.0 s | Two more swipes | Nothing moves: still 4878 of 4878 |
| 29.03 s | Tap on the wordmark ("Newsworthy, back to the reading") | The app scrolls back to the reading: 6 /10, same sentence |

The oldest entry was first reported 2026-11-04 02:05 UTC (`timeline.json`), 6 days 13 hours before the take; the app's
timeline reaches back one week by first coverage and ends there (`docs/story-timeline.md`).

## Captions, verbatim, and the take time each rests on

| Video time | Caption | Take time |
|---|---|---|
| 0-1.95 s | "A news app" / "that ends?" | 0.2-1.7 s (the reading; the claim is shown at 25.4-28.4 s) |
| 2.1-3.95 s | "Nov 10, 2026: rated 6/10" | 1.7-3.0 s (score 6, "/10"; recorded 2026-11-10 UTC) |
| 4.35-5.95 s | "Below: one week of stories" | 3.0-5.0 s (the chevron tap and the timeline's top) |
| 6.1-9.3 s | "Keep scrolling…" | 5.0-25.4 s, played at 6x |
| 9.95-12.35 s | "That’s it. It ends." | 25.4-28.4 s (the timeline's end, "6d ago", nothing below it) |
| 13.3-15.1 s | "Would you read news this way?" | 29.0-31.7 s (back at the reading) |
| 13.6-15.1 s | "Search ‘Newsworthy: Calm News’" / "on the App Store" | 29.0-31.7 s |

Edit: the two reading clips are played at 0.75x and 0.65x (a still screen), the scroll at 6x; a 1.06x punch-in on
the number; the phone pulls back to 0.84x and lifts for the end so the last four entries and the frame's bottom edge
sit inside the Shorts safe box. The phone frame is drawn by the renderer around a browser recording.

## Checks

- `safe-zone.mjs --every 0.5` (`work/safe-zone-sheet.png`): every caption is inside the safe box; the reading's
  number and sentence are inside it; the story line ("Fed Rates · 1h ago") sits just below it at y 1470, above the
  title stack at 1534. The timeline's lower lines run under YouTube's title while scrolling, as a phone running off
  the frame is meant to.
- Hook (0.5 s), payoff (10.8 s) and end (14.6 s) frames looked at full size.
- Product messaging: no AI, no rank or coverage claim, no health or time-saving claim, not described as an alert
  service, no tragedy as the hook, the full name in the search prompt. The price appears only in the description
  (allowed in video by the owner's briefs). "A news app that ends" contrasts the endless feed, which the video
  briefs allow; it is not used on the website or store.
- Not yet reviewed by an independent reviewer; the orchestrator does that before upload.
