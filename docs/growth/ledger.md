# Growth ledger

Every activity meant to grow Newsworthy's downloads, what it cost and what it
did. Use the [growth skill](../../.agents/skills/newsworthy-growth/SKILL.md) to
pick and run the next one. Entries are append-only, oldest first: a later entry
that overturns an earlier one says so in its own words, and results arrive as
dated additions to the entry they measure. The newest entry's Next list and the
open owner decisions are where a run starts.

## Scoreboard

Cumulative figures from App Store Connect, added at each measurement.

| Date | Stores live | Price | Downloads | Product page views | Conversion | Rating | Note |
|---|---|---|---|---|---|---|---|
| 2026-10-21 | App Store (US and others) | $1 | not yet read | not yet read | not yet read | none yet | Launch day: version 1.0.0 released 10:58 UTC. Google Play in closed testing |

## Activities

| Date | Activity | Channel | Campaign token | Status | Result |
|---|---|---|---|---|---|
| [2026-10-21](#2026-10-21-launch-audit) | Audit of what Apple offers against what is used | App Store | — | done | 10 surfaces unused, keywords half wasted, `llms.txt` stale; quick wins listed |
| [2026-10-21](#2026-10-21-youtube-short-trailer) | Trailer as a YouTube Short, from the owner's personal channel | YouTube Shorts | `yt-trailer-202610` (channel link) | live | Posted 2026-10-21; frames poorly under YouTube's controls (see entry) |

## Owner decisions

Open:

- A free weekend (scheduled temporary price) for deal sites and communities.
- Apple Ads: whether to spend, and a monthly cap.
- The trailer Short: re-frame it to the safe zone and re-upload (a new video,
  starting from zero views), or leave it as posted.

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

