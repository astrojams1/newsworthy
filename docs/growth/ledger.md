# Growth ledger

Every activity meant to grow Newsworthy's downloads, what it cost and what it
did. Use the [growth skill](../../.agents/skills/newsworthy-growth/SKILL.md) to
pick and run the next one. Entries are append-only, oldest first: a later entry
that overturns an earlier one says so in its own words, and results arrive as
dated additions to the entry they measure. The newest entry's Next list and the
open owner decisions are where a run starts.

**Since 2026-11-05, new growth activity is logged in the app-marketing ledger** in
[astrojams1/app-sites](https://github.com/astrojams1/app-sites) under `marketing/`
(`ledger.jsonl`, `metrics.jsonl`, the `apps/newsworthy.json` profile, and the generated
`LEDGER.md`). This file keeps the history up to then and its Lessons.

## Scoreboard

Cumulative figures from App Store Connect, added at each measurement.

| Date | Stores live | Price | Downloads | Product page views | Conversion | Rating | Note |
|---|---|---|---|---|---|---|---|
| 2026-10-21 | App Store (US and others) | $1 | not yet read | not yet read | not yet read | none yet | Launch day: version 1.0.0 released 10:58 UTC. Google Play in closed testing |

## Activities

| Date | Activity | Channel | Campaign token | Status | Result |
|---|---|---|---|---|---|
| [2026-10-21](#2026-10-21-launch-audit) | Audit of what Apple offers against what is used | App Store | — | done | 10 surfaces unused, keywords half wasted, `llms.txt` stale; quick wins listed |
| [2026-10-21](#2026-10-21-youtube-short-trailer) | Trailer as a YouTube Short, from the owner's personal channel | YouTube Shorts | `yt-trailer-202610` (channel link) | done | +1 day: 29 impressions, 24 views (all in the first ~3 h), 0.1 h watched, 1 subscriber, no downloads. Stalled |
| [2026-10-22](#2026-10-21-launch-audit) | Website offers the iOS app: Smart App Banner, support page, `llms.txt` | Website | — | done | Copy says iOS is live at $1; no reading-screen badge (see the audit's addition) |
| [2026-10-22](#2026-10-22-youtube-short-todays-number) | "Today's number": the day's real reading as a 14 s Short, a repeatable format | YouTube Shorts | `yt-trailer-202610` (same channel link) | live | Published 2026-10-22, [9HA3NuvkzTU](https://youtube.com/shorts/9HA3NuvkzTU). 4 h: 20 views, 28.6% stayed. Missed the bar |

## Owner decisions

Open:

- A free weekend (scheduled temporary price) for deal sites and communities.
- Apple Ads: whether to spend, and a monthly cap.
- The trailer Short: superseded by the "today" format (2026-10-22). Leave the
  posted trailer up; do not re-upload the re-framed cut unless the format
  also stalls.
- Showing the day's real reading in a Short (2026-10-22): the trailer's rule
  was placeholder bars. The "today" Short shows `/api/current` word for word.
  Proposed as the format; the owner can veto before posting.
- Cadence for "today" Shorts: daily, or only on days the number moves.

Decided:

- An in-app ratings prompt (StoreKit `requestReview`): no (owner, 2026-10-21).
- Live Activities for a big development: no (owner, 2026-10-21).
- An in-app event for a news moment the app covers, such as election night:
  no (owner, 2026-10-21). In-app events stay for real app updates.

## Lessons

What a past activity cost to learn. Read before planning; date each item.

- **Shorts links do not click** (2026-10-21). Since 31 August 2023 links in a
  Short's description and comments are plain text. Put a search phrase in the
  description and the campaign link in the channel's links, which do click.
- **Stating the connection is the disclosure** (2026-10-21). YouTube's
  paid-promotion box is for paid placements, sponsorships and endorsements; an
  owner presenting their own app, with "I made" in the title, is none of them.

- **The same 30% on three openings** (2026-10-22). The trailer's two uploads
  and the "today" Short opened very differently and each kept 28–33% of
  viewers, then stalled at 20–66 views. When a creative change does not move
  the share that stays, test the audience (a channel or platform whose
  viewers care about the subject) before polishing the creative again.
- **One upload is one sample** (2026-10-22). The trailer's first Short got
  29 impressions and 24 views, nearly all in its first three hours, then
  nothing: YouTube tried it on a small seed audience and stopped. That says
  the opening did not hold strangers, and little else; 24 views cannot test a
  hook. A cheap, repeatable format gets many tries where a polished film gets one.
- **The first second lost seven in ten** (2026-10-22). Studio's "How viewers
  engaged": the trailer's two uploads kept 27.6% and 33.3% of viewers and lost
  the rest to a swipe. The trailer opened on blank feed cards with no words.
  Those who stayed watched it more than twice (222.9% average viewed on the
  second upload), so the film held people and the opening did not. An earlier
  estimate in this ledger, about 15 seconds a view from 0.1 hours over 24
  views, was wrong: read "How viewers engaged" and average percentage viewed,
  not watch time.

## 2026-10-21: launch audit

**What and why.** The app went live on the App Store at $1 on launch day. The
owner asked what Apple offers that the app is not using. Each surface below was
checked against `store/store.json`, the release ledger, the web app's source
and the native widget's source, and against Apple's current offer
(research sources in the skill's run, 2026-10-21).

| Surface | State on launch day |
|---|---|
| Featuring nominations | None recorded. The launch is past, but every update can be nominated as App Enhancements |
| Promotional text | Set: "World news, rated by significance. A score and one sentence, a week of developments, and Home Screen widgets in light or dark." Not launch-specific |
| Keywords | `news,world,headlines,widget,timeline,significance,notifications`: 63 of 100 characters, and "news" and "world" already sit in the name and subtitle, so about 50 characters do nothing |
| App preview video | None on the listing. The 15 s preview reel exists (`store/video`); guideline 2.3.4 was the reason held back |
| Custom product pages | None |
| Product page optimization | None |
| In-app events | None |
| Promo codes | None issued |
| Pricing | $1 paid download, localized. No price event scheduled |
| Small Business Program | Not recorded anywhere in the repository; check enrolment |
| Apple Ads | None |
| Marketing tools (badge, QR, short link) | Not used: the website has no App Store link at all |
| Smart App Banner | Missing from the web app's head (`apps/client/app/+html.tsx`) |
| `public/llms.txt` | Stale: says the iOS app is "in preparation" and store pricing "not yet confirmed" |
| Ratings and reviews | No in-app prompt (product decision); no reviews yet to reply to |
| Platform features | Home Screen widgets, small and medium. No Lock Screen widgets, Control Center control, App Intents or Siri, Apple Watch, or Live Activities |

**Status.** Done.

**Next.** In order of reach for the effort:

1. Website and AI readers: a Smart App Banner, an App Store badge on the
   reading page, `llms.txt`, README and product messaging saying the app is
   live at $1. One small PR.
2. Keywords: fill the 100 characters with words not in the name or subtitle
   (candidates: calm, headlines, digest, brief, current events, daily, score,
   rating, global, important), with the next submission.
3. Promotional text: a launch line now, changed with each moment.
4. Small Business Program: confirm or enrol.
5. Campaign links: generate `yt-trailer-202610` and `web-banner-202610` before
   anything is posted.
6. A custom product page for short-video viewers, leading with the trailer's
   look, and the preview reel as its app preview.
7. Lock Screen widgets (the accessory families) as the first platform feature:
   then a featuring nomination (App Enhancements), an in-app event (Major
   Update) and a post.
8. Promo codes for a press and creator round once the trailer is out.

**Addition, 2026-10-22.** Quick win 1 done in its own PR, without the badge:
the reading screen carries nothing but the reading, so the website offers the
app through iOS Safari's Smart App Banner and a support-page paragraph.
`llms.txt`, README and product messaging now say iOS is on the App Store at
$1 and Android is in closed testing. The banner's meta tag carries no
campaign token, so `web-banner-202610` stays unused.

## 2026-10-21: YouTube Short: trailer

**What and why.** The 32 s trailer (`store/assets/youtube/trailer-1080x1920.mp4`)
on the owner's personal channel, founder-led, to reach people tired of
scrolling news.

**Assets.**

- Title: `I made an app so I'd stop doomscrolling` (alternative: `I made a news
  app that rates the news 1 to 10`).
- Description:

  ```
  I made Newsworthy. Most stories come and go; it shows what breaks through: one number from 1 to 10 for the world's news, one sentence on the top story, and when it was last checked.

  • Home Screen widgets, light or dark
  • Optional notifications at the score you choose
  • $1 once. No ads, no subscription, no in-app purchases.

  On the App Store: search "Newsworthy: Calm News"
  apps.apple.com/app/id6812519450

  #NewsApp #iPhoneApps #Doomscrolling
  ```

- Pinned comment: "I made Newsworthy so I could check the news once and know
  whether anything big happened, without scrolling a feed. One number, one
  sentence, updated through the day. It's $1 on the iPhone App Store (search
  "Newsworthy: Calm News"). Questions and feedback welcome."
- Cover: the frame at 12.9 s ("World news, rated 1 to 10." over a 10).
- Settings: not made for kids; altered or synthetic content, no (animation);
  paid promotion, no (the owner's own app, stated in the title); Science &
  Technology; English; comments on. Optional sound-description captions.
- Channel: the App Store campaign link (`yt-trailer-202610`) first in the
  channel's links.

**Status.** Planned; the owner posts it. Suggested slot: a Thursday or Friday
afternoon, US time, with the first hour free to answer comments.

**Results.** Not yet.

**Next.** At +2 days read Viewed vs. swiped away and retention. Post the same
file to TikTok and Instagram Reels with the link in each bio. The preview reel
is the second Short, linked from this one as its Related video.

**2026-10-21, later.** The owner found the description stiff. It is now:

```
You shouldn't have to scroll all day to find out if anything big happened.

Newsworthy rates the world's news from 1 to 10 and tells you, in one sentence, what's on top. Glance at it and you know if the world is having a 2 or an 8.

No feed. No ads. No subscription. No in-app purchases. $1, once.
Home Screen widgets, plus an optional alert when the news hits the number you pick.

I made this. Would love to hear what you think.

Newsworthy: Calm News, on the App Store
apps.apple.com/app/id6812519450

#NewsApp #iPhoneApps #Doomscrolling
```

The post's files sit beside the video in `store/assets/youtube/`: the cover
(`trailer-cover-1080x1920.png`, the frame at 12.9 s of the render with sha256
`9896e699…`) and the sound-description captions (`trailer-sound.en.srt`, for
Studio → Subtitles → Upload file → With timing).

**2026-10-21, posted.** The owner posted it, titled "I made an app to stop
doomscrolling news" (40 characters, one line on an iPhone 16 Pro). Their
screenshot of it playing showed 1 view, 1 like and 1 comment, and showed the
trailer framed badly: its supers under YouTube's back, search and menu, the
notification card under the action rail, the phone under the title stack.
Measured and listed scene by scene in the
[video ledger](../../store/video/ledger.md#2026-10-21-trailer-framing-decision-no-cut);
the constraint is now the YouTube Shorts skill
(`vendor/skills/skills/youtube-shorts/SKILL.md`), which every Short goes
through before it is posted. Whether to re-frame and re-upload is open: a new
upload starts from zero views.

**2026-10-21, re-framed.** The owner asked for the fix. The second cut keeps
every line, number and screen inside the safe zone (supers lower, phone
smaller, long lines set smaller beside the rail) with the same script and
sound; details in the
[video ledger](../../store/video/ledger.md#2026-10-21-trailer-re-frame). Same
file names in `store/assets/youtube/`: the video, a new cover from the same
12.9 s, and the unchanged captions. Posting it is a new upload; the title,
description and settings above still apply.

**2026-10-21, restaged.** The owner found the re-frame shrunk rather than
designed: a tiny phone under oversized headlines. The third cut makes the
phone the subject, large and running off the bottom edge under YouTube's
title, with one-line headlines; details in the
[video ledger](../../store/video/ledger.md#2026-10-21-trailer-restage). Same
files in `store/assets/youtube/`, with a new cover from 12.9 s.

**2026-10-21, thumbnail.** A custom thumbnail,
`store/assets/youtube/trailer-thumbnail-1080x1920.jpg`: the 10 reading with
"World news, rated 1 to 10." set large enough to read in the shelf. Upload in
Studio on desktop (custom Shorts thumbnails reach Partner Program channels
first); without that option, pick the 12.9 s frame in the mobile app. Pinned
comment for the new post: "I made this because I kept doomscrolling just to
find out if anything big happened. Newsworthy gives the world's news one
number and one sentence. $1, no ads, no subscription. Search "Newsworthy: Calm
News" on the App Store."


**2026-10-22, +1 day.** The owner's YouTube Studio screenshot (Views by
Content, first 24 hours): 29 thumbnail impressions, 3.5% thumbnail
click-through, 24 views, 0.1 hours of watch time, 1 subscriber. Views climbed
to 20 within the first hour, reached 24 at about three hours and stayed there
to fifteen hours. No downloads that the owner could attribute. 0.1 hours over
24 views is roughly 15 seconds a view of a 32-second film, with rounding
anywhere from 8 to 22 seconds. Read by the agent in Studio on 2026-10-22: the
24-view upload (`54ZNifKYxtk`, title with hashtags) kept 33.3% and lost 66.7%
to a swipe, 222.9% average viewed, 2 likes; an earlier upload of the trailer
(`LhHSl8K5IyM`, "I made an app to stop doomscrolling news") has 66 views,
27.6% kept, 72.4% swiped, 3 likes, 0 subscribers. Retention by second: "not
enough data" on both. Read as: YouTube showed each to a small seed audience,
seven in ten swiped at the opening, and it stopped showing them. What did not hold them is in the next
entry; the follow-up is the "today" format rather than a re-upload of the
trailer.

## 2026-10-22: YouTube Short: today's number

**What and why.** The owner called the trailer Short a failure (above) and
asked for a new submission that learns from it. What the trailer did, and
what this one does instead:

| The trailer (posted 2026-10-21) | Today's number |
|---|---|
| Opens on five seconds of blank, dark feed cards; the first words arrive at 1 s, the app at 10 s | The question, the phone and the day's number are in the first frame, with a hit on the downbeat |
| Every sentence a placeholder bar: nothing to read, learn or comment on | The day's real front page, `/api/current`, word for word: something worth stopping for, and to argue with |
| 32 s; about 15 s watched a view | 14 s, built to finish and loop |
| An advert for the app, which a Shorts viewer swipes | The day's news, with the app as the way it is shown |
| One film, one try with the algorithm | A format: `today-reading.mjs` and one render (about two minutes) make the next |
| A generic title ("I made an app to stop doomscrolling news") | A dated, searchable one with the day's number in it |

What stays: the safe-zone framing (every word and widget inside the measured
box, phone large and running off the bottom), the founder voice in the
description and comment, the search phrase in the description, and the
campaign link in the channel's links.

**Assets.** In `store/assets/youtube/`: `today-1080x1920.mp4` and
`today-thumbnail-1080x1920.jpg`, from the reading fetched at 14:48 UTC on
2026-10-22 (5/10, Iran War, 9h old). Source and cut record in
`store/video/today/`; the cut in the
[video ledger](../../store/video/ledger.md#2026-10-22-today).

- Title (34 characters): `Today's world news: 5/10 (Oct 22)`
- Description:

  ```
  How big was the world's news on October 22? Newsworthy's reading: 5 out of 10.

  "The US and Israel reportedly plan new strikes on Iran after the US midterms, as the US prepares to pull some staff from Gulf embassies."

  I made Newsworthy: one number and one sentence for the world's news, checked through the day, also on your Home Screen. $1 once, no ads, no subscription.

  Newsworthy: Calm News, on the App Store
  apps.apple.com/app/id6812519450

  #news #worldnews #iPhone
  ```

- Pinned comment: "Would you have rated today higher or lower than a 5? I
  made Newsworthy and post the day's number here."
- Cover: the frame at 2.5 s, or the custom thumbnail where the channel can
  upload one.
- Settings as the trailer: not made for kids; altered or synthetic content,
  no; paid promotion, no (the owner's own app, stated in the description);
  News & Politics this time, since the video is the day's news; English;
  comments on. Related video: none.
- Post on the day it was fetched: its story line says "9h ago" as of the
  snapshot, and the title carries the date. A later day is a new fetch and a
  new render (`store/video/today/README.md`).

**Status.** Uploaded 2026-10-22 by the agent through the owner's Chrome, as a
private draft with the title, description, custom thumbnail, News & Politics,
not made for kids, no paid promotion, AI use no (code-drawn picture,
synthesised music: none of YouTube's four cases). Uploaded file:
`artifacts/today/upload.mp4`, 9.0 MB, sha256 `d67cf438…`, re-encoded at
4.8 Mb/s from the same frames because the browser upload tool takes at most
10 MB (48 dB PSNR against the 22.5 MB master). Published on the owner's
"publish and pin" at about 15:50 UTC, 2026-10-22:
https://youtube.com/shorts/9HA3NuvkzTU. The comment above was posted from
@astrojames and pinned.

**Success bar** (owner, 2026-10-22). The trailer got all its views within
about four hours, so this one has to do at least as well within four hours of
publishing (by about 19:50 UTC): at least 24 views, the screenshotted upload's
total, and a higher share stayed to watch than its 33.3%. The other trailer
upload's 66 views are the stretch mark; its first-four-hour count is to be
read alongside.

**Results.** +4 hours (read by the agent in Studio, 19:47 UTC): 20 views,
28.6% stayed to watch, 71.4% swiped away, 0 likes, 0 subscribers; 90% of views
from the Shorts feed, 5% direct, 5% YouTube search ("world news"); retention
by second "not enough data". **Missed the bar** on both counts: fewer views
than 24 and a lower share stayed than 33.3%.

Read as: three different openings (two trailer uploads and this) all kept
28–33% and all stalled near the same view count. Changing the creative did not
move the number, which points at least as much at who YouTube shows a new
Short to as at the Short. This channel's history is personal clips and
unrelated tests, so its seed audience has no reason to care about a news app.
That is a hypothesis, not established: one more sample on the same channel
cannot separate the two.

**Next.** At +2 days read viewed versus swiped away and average percentage
viewed, and compare with the trailer's. If it holds better, post one a day for
a week with the same title pattern, then judge the format on seven samples,
not one. If it holds no better, the next variable is the first frame (a bigger
number, a contrast with a louder headline), not the length.

## 2026-10-28: three social advertising films

**What and why.** Owner-commissioned three distinct finished vertical ads, intended to explain the finite news product and its one-time US$1 purchase. The current brief expressly authorizes anti-doomscrolling positioning, original campaign copy and a purchase CTA. Product claims were checked against source and released App Store evidence.

**Assets.** `marketing/video/`: three 1080×1920 MP4s (22/22/24s), complete Remotion source, original synthesized soundtracks, native historical captures with dates, exact copy/timelines, preview frames, rendering instructions and a local viewing page. See its `README.md`, `PRODUCT-EVIDENCE.md` and `qa/REVIEW.md`.

**Status.** Produced locally; not posted, uploaded, or used in paid campaigns. No messages sent and no advertising spend. A is the recommended launch creative; B tests purchase clarity, C tests the finite-week idea. No campaign provider token was invented.

**Results.** No audience results yet. Verification is production QA, not conversion evidence.

**Next.** On publication, use real campaign links where clickable and the on-screen search name elsewhere. Compare purchase conversion with comparable audiences/placements; collect +2, +7 and +28-day results. Publishing remains outside this production request.


## Follow-up: B reported as the strongest performer

**Evidence.** After delivery of the three social advertisements, the owner reported: “B performed best by far.” This is an owner-reported result. The metric, numerical results, channel, audience, spend and comparison conditions were not supplied; it is not recorded as a quantified purchase-conversion result.

**Decision.** B, “Pay with a dollar,” replaces A as the recommended lead creative and becomes the control for future comparisons. Updated `marketing/video/README.md` and `marketing/video/TIMELINES.md`; the original rendered videos and their production evidence remain unchanged.

**Interpretation.** The price-led concept warrants further testing. The comparison does not isolate the contribution of the $1 hook, one-time purchase framing, receipt, dark product shot or pacing.

**Next proposed test.** Compare an opening-copy variant against the original B while retaining its offer, product reveal and CTA. No variant was rendered or published in this follow-up.

## Follow-up: three B opening-copy variants produced

**Why.** The owner asked to create the opening variations proposed after reporting that B performed best by far.

**Assets.** Three finished 22-second films in `marketing/video/output/b-hooks/`: B1 “A news app. For one dollar.”, B2 “One dollar. No monthly bill.”, B3 “Buy the app. Keep your attention.” The comparison page is `marketing/video/b-hooks.html`; exact copy, test notes and rendering commands are in `marketing/video/B-HOOKS.md`.

**Controlled change.** Only the headline during 0–3 seconds changes. The large $1, supporting line, typography and timing are preserved. Each film reuses the winning B's encoded video from its 3-second keyframe onward and its complete AAC soundtrack. Verification requires all 570 subsequent decoded frames, the full decoded audio and AAC payload to match the control. The original MP4s are unchanged.

**Status.** Produced and checked locally; not published and no advertising spend. The new hooks have no performance results. The reported win for the original B remains the reason for using it as the control; no metric or numerical lift was supplied.

**Next.** Compare each new opening with the original B under comparable audiences, placement, copy, destination and attribution. Evaluate purchases for the purchase objective, with retention/click-through as supporting measures. Keep the original winner available throughout the test.
