# Growth channels

Every App Store surface Apple offers, and the channels outside it. Read the row for the activity you pick.

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

- **Short video.** One 1080×1920 file serves YouTube Shorts, TikTok and Instagram Reels. On YouTube:
  - about 40 title characters show;
  - up to three hashtags appear by the title, and more than 60 means all are ignored;
  - links in a Short's description and comments don't click;
  - custom Short thumbnails are for Partner Program channels on desktop, and everyone can pick a frame on mobile;
  - the owner's own app with "I made" stated is not a paid promotion.

  Check Viewed vs. swiped away after two days. The first second decides it. Frame and check every Short with the
  [YouTube Shorts skill](../../../../vendor/skills/skills/youtube-shorts/SKILL.md). YouTube's controls cover the top,
  the right edge and the bottom of the video, and the phone crops the sides.
- **Communities.** Hacker News (Show HN): the hook is the engineering story in `AGENTS.md`, a rater measured for its
  own noise and stories that age. Reddit and Product Hunt: read each community's self-promotion rules first and post
  as the maker. A free weekend is its own post on deal communities.
- **Press and creators.** Apple-focused sites, newsletters and creators get one paragraph, the trailer, a promo code
  and the App Store link. Pitch on news days.
- **The number of the day.** The app makes a fresh, shareable reading every hour, and the share card exists. A
  regular post of the day's number and sentence is a content engine, and big days post themselves.
- **AI readers.** `public/llms.txt` is what assistants read about the app. Keep its availability and price current,
  or they recommend around it.
