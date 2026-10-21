---
name: newsworthy-growth
description: Plan, run and measure activities that grow Newsworthy's downloads and attention, and log each in docs/growth/ledger.md. Covers every App Store surface Apple offers (featuring nominations, product page and keywords, promotional text, app previews, custom product pages, product page optimization, in-app events, promo codes, pricing moves, Apple Ads, campaign links, Smart App Banners, marketing tools, platform features editors showcase) and everything outside it (YouTube Shorts, TikTok, Reels, Reddit, Hacker News, Product Hunt, press, creators, a daily number to post). Use whenever the owner wants the app to go viral, more downloads or users, a launch, a post, a pitch, ads, or a better listing, even if they only ask what to do next.
---

# Newsworthy growth

The goal is downloads, and attention that turns into downloads. Be bold, fast
and founder-led outside the app; keep the app itself calm. AGENTS.md's product
constraints (no feed, ads, subscriptions, in-app purchases, engagement or
growth-hacking mechanics) are about the product, not its marketing: a loud
trailer, a founder story, a price stunt or an ad are all fair game. What stays
fixed everywhere is that claims are true.

Public copy follows `docs/product-messaging.md` (no AI in user-facing copy, no
rank claims, the score is "significance", not markets). When a growth idea
needs one of those lifted, put it to the owner with the rule quoted, and log
the answer; the trailer's doomscroll framing is the precedent. Do not trim an
idea down pre-emptively: propose it at full strength and let the owner decide.

Work from the repository root on a branch from a freshly fetched `origin/main`.

## Start from the ledger

Read [the growth ledger](../../../docs/growth/ledger.md): the Scoreboard, the
newest entry's Next list and any open owner decisions. Then check what changed:

- `git log` since the last entry, for anything shipped. Every user-visible
  feature is three activities: a featuring nomination, an in-app event and a
  post.
- `store/ledger.md` for release state per store (live, price, version), and
  `store/store.json` for the listing as it stands.
- Numbers from App Store Connect (the owner reads them, or `asc.mjs` from the
  app-release skill where it can): product page views, downloads, conversion,
  proceeds, campaign rows.

## Measure every activity

- **One campaign link per activity.** App Store Connect → Analytics →
  Acquisition → Campaigns generates it; the owner's provider token (`pt`) is
  the same on every link, the campaign token (`ct`) names the activity:
  `<channel>-<what>-<yyyymm>`, e.g. `yt-trailer-202610`.
  `https://apps.apple.com/app/apple-store/id6812519450?pt=<PT>&ct=<token>&mt=8`.
  A campaign shows in Analytics once five people have downloaded through it.
- **Where links do not click** (YouTube Shorts descriptions and comments), give
  a search phrase ("Newsworthy: Calm News") and put the link where it does
  click: the channel's links, a TikTok or Instagram bio, the website.
- **Record at +2, +7 and +28 days**: the channel's own numbers (views,
  viewed-vs-swiped, likes, comments), then product page views, downloads and
  conversion for the token. Add them to the entry and the Scoreboard.

## Use everything Apple offers

| Surface | What it gets | How | Notes |
|---|---|---|---|
| Featuring nominations | Editorial consideration: Today stories, collections, the Apps tab | App Store Connect → app → Featuring → Nominations (+). Types: App Launch, App Enhancements, New Content | At least three weeks before the date, up to three months. Say what is new, why now, which regions. Nominate every meaningful update; indie apps are eligible |
| Promotional text | The line above the description, changeable any time without review | `store/store.json` `promotionalText`, pushed with the app-release skill's `asc.mjs` | 170 characters. Use it for what is timely: a launch, a feature, a news moment the app covered |
| Name, subtitle, keywords | Search ranking | `store/store.json`; needs a new version for name and subtitle, keywords ride the next submission | Keywords: 100 characters, commas without spaces, no words already in the name or subtitle, no plurals of them |
| Screenshots and app preview | Conversion: the first three screenshots and the preview autoplay in search | `store/` renderers; the 15 s preview reel exists in `store/video` | A preview must show the app itself (guideline 2.3.4); up to three per locale |
| Custom product pages | A page per audience with its own screenshots, preview, promotional text and URL; since July 2025 its own keywords | App Store Connect → app → Custom Product Pages | Up to 70. One per channel: YouTube viewers land on a page that opens with the trailer's look |
| Product page optimization | A/B tests of icon, screenshots and preview against the default page | App Store Connect → app → Product Page Optimization | Needs steady traffic; run it between spikes, not during one |
| In-app events | Event cards in search, Today and the product page, for up to 31 days | App Store Connect → app → In-App Events. Badges include Major Update, Special Event, Live Event | Must be real in the app. Every major update is one. Not for news moments such as election night: the owner declined that on 2026-10-21 |
| Promo codes | Free downloads to give press, creators and giveaways | App Store Connect → app → Promo Codes | Download codes still exist; In-App Purchase promo codes ended 26 March 2026. A limited number per version |
| Pricing | A free weekend gets a paid app onto deal sites and deal communities | App Store Connect → Pricing → schedule a temporary price | Proceeds pause; the spike in downloads and ranking is the point. Owner decides |
| Small Business Program | 15% commission instead of 30% under $1M proceeds | Apple Developer → App Store Small Business Program | Money, not reach; enrol if not already |
| Apple Ads | Paid placement in search results (Basic, per install, capped) or search, Today, Search tab and product pages (Advanced, per tap, keywords) | ads.apple.com | $100 credit for eligible new accounts. At $1 a download, ads buy ranking and reviews, not profit: cap the spend and measure |
| Marketing tools | App Store badge, QR code, short link, embed | toolbox.marketingtools.apple.com | For the website, posts, slides, stickers |
| Smart App Banner | An install banner on every iPhone visit to the website, shared links included | `<meta name="apple-itunes-app" content="app-id=6812519450">` in `apps/client/app/+html.tsx` | Add `affiliate-data` with the campaign token to measure it |
| Ratings and reviews | Social proof and ranking | Reply to every review (Expo MCP `appstore_reviews`, `appstore_reply_review`) | No in-app prompt: the owner declined StoreKit `requestReview` on 2026-10-21. Reviews come from people who choose to leave one |
| Platform features | What editors showcase: Lock Screen widgets, StandBy, Control Center controls, App Intents and Siri, Apple Watch complications | Native work in `apps/client`, with the app-release skill | Each one shipped is a nomination, an in-app event and a post. Not Live Activities: the owner declined them on 2026-10-21, for the calm product |

## Outside the App Store

- **Short video.** One 1080×1920 file serves YouTube Shorts, TikTok and
  Instagram Reels. On YouTube: about 40 title characters show, up to three
  hashtags appear by the title (more than 60 and all are ignored), links in a
  Short's description and comments do not click, custom Short thumbnails are
  for Partner Program channels on desktop (everyone can pick a frame on
  mobile), and the owner's own app with "I made" stated is not a paid
  promotion. Check Viewed vs. swiped away after two days; the first second
  decides it.
- **Communities.** Hacker News (Show HN): the engineering story in AGENTS.md
  is the hook, a rater measured for its own noise and stories that age. Reddit
  and Product Hunt: read each community's self-promotion rules first and post
  as the maker. A free weekend is its own post on deal communities.
- **Press and creators.** Apple-focused sites, newsletters and creators: one
  paragraph, the trailer, a promo code, the App Store link. Pitch on news days.
- **The number of the day.** The app makes a fresh, shareable reading every
  hour and the share card exists: a regular post of the day's number and
  sentence is a content engine, and big days post themselves.
- **AI readers.** `public/llms.txt` is what assistants read about the app; keep
  its availability and price current, or they recommend around it.

## Run

1. Pick the highest-leverage open item: Apple-native and cheap first, then
   whatever a shipped feature or a news day makes timely.
2. Prepare the copy (checked against product messaging), the assets, the
   campaign link and any promo codes.
3. Do it, or give the owner exact steps when it needs their account (App Store
   Connect's web pages, Apple Ads, social accounts).
4. Log it the same day: what, where, token, copy, assets, status.
5. Measure at +2, +7 and +28 days; update the Scoreboard; write a lesson when a
   result surprised you.

Repository changes this needs (listing copy, website, native features) follow
AGENTS.md: a branch, `npm test`, the copy review and a PR.

## Ledger entry template

```
| YYYY-MM-DD | <activity> | <channel> | <ct token or —> | planned / live / done / dropped | <result so far> |

## YYYY-MM-DD: <activity>

**What and why.** The activity, the audience and why now.

**Assets.** Copy, files, links and campaign token.

**Status.** Planned, live (with the URL) or done; what the owner still has to do.

**Results.** +2, +7, +28 days, from the channel and App Store Connect. "Not yet" is an answer.

**Next.** What this suggests doing next.
```
