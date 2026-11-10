---
name: newsworthy-growth
description: Plan, run and measure activities that grow Newsworthy's downloads and attention, and log each in docs/growth/ledger.md. Covers every App Store surface Apple offers (featuring nominations, product page and keywords, promotional text, app previews, custom product pages, product page optimization, in-app events, promo codes, pricing moves, Apple Ads, campaign links, Smart App Banners, marketing tools, platform features editors showcase) and everything outside it (YouTube Shorts, TikTok, Reels, Reddit, Hacker News, Product Hunt, press, creators, a daily number to post). Use whenever the owner wants the app to go viral, more downloads or users, a launch, a post, a pitch, ads, or a better listing, even if they only ask what to do next.
---

# Newsworthy growth

**Grow downloads, and attention that turns into downloads.** Be bold, fast and founder-led outside the app. Keep the
app itself calm.

Done means: the activity is live or handed to the owner as exact steps, and it is logged the same day with its
campaign token. Its results follow at +2, +7 and +28 days.

## Where things are

| What | Where |
|---|---|
| New activity (since 2026-11-05) | [astrojams1/app-sites](https://github.com/astrojams1/app-sites) `marketing/` (`ledger.jsonl`, `apps/newsworthy.json`, generated `LEDGER.md`), logged by the app-marketing skill |
| Earlier history and Lessons | [the growth ledger](../../../docs/growth/ledger.md) |
| Every App Store surface and outside channel | [references/channels.md](references/channels.md) |
| Release state per store | `store/ledger.md` |
| The listing as it stands | `store/store.json` |
| Claims public copy may make | `docs/product-messaging.md` |

Work from the repository root on a branch from a freshly fetched `origin/main`.

## A run

1. **Read the ledgers.** Read and log new activity in app-sites `marketing/`. Read [the growth
   ledger](../../../docs/growth/ledger.md) for the earlier history: the Scoreboard, the newest entry's Next list and
   any open owner decisions.
2. **Check what changed.**
   - `git log` since the last entry, for anything shipped. Every user-visible feature is three activities: a
     featuring nomination, an in-app event and a post.
   - `store/ledger.md` for release state per store (live, price, version), and `store/store.json` for the listing.
   - Numbers from App Store Connect: product page views, downloads, conversion, proceeds and campaign rows. The owner
     reads them, or use `asc.mjs` from the app-release skill where it can.
3. **Pick** the highest-leverage open item. Apple-native and cheap come first, then whatever a shipped feature or a
   news day makes timely. See [references/channels.md](references/channels.md).
4. **Prepare** the copy (checked against product messaging), the assets, the campaign link and any promo codes.
5. **Do it.** When it needs the owner's account (App Store Connect's web pages, Apple Ads, social accounts), give the
   owner exact steps.
6. **Log it the same day:** what, where, token, copy, assets and status.
7. **Measure** at +2, +7 and +28 days. Update the Scoreboard. Write a lesson when a result surprised you.

Repository changes this needs (listing copy, website, native features) follow `AGENTS.md`: a branch, `npm test`, the
copy review and a PR.

## Measure every activity

- **One campaign link per activity.** Generate it in App Store Connect → Analytics → Acquisition → Campaigns. The
  owner's provider token (`pt`) is the same on every link. The campaign token (`ct`) names the activity:
  `<channel>-<what>-<yyyymm>`, for example `yt-trailer-202610`.
  `https://apps.apple.com/app/apple-store/id6812519450?pt=<PT>&ct=<token>&mt=8`. A campaign shows in Analytics once
  five people have downloaded through it.
- **Where links don't click** (YouTube Shorts descriptions and comments), give a search phrase ("Newsworthy: Calm
  News"). Put the link where it does click: the channel's links, a TikTok or Instagram bio, the website.
- **Record at +2, +7 and +28 days.** First the channel's own numbers (views, viewed-vs-swiped, likes, comments). Then
  product page views, downloads and conversion for the token. Add them to the entry and the Scoreboard.

## Rules

- **The product constraints are about the product, not its marketing.** `AGENTS.md` rules out a feed, ads,
  subscriptions, in-app purchases, and engagement or growth-hacking mechanics in the app. A loud trailer, a founder
  story, a price stunt or an ad are all fair game.
- **Claims are true, everywhere.** That never changes.
- **Public copy follows `docs/product-messaging.md`.** No AI in user-facing copy, no rank claims, and the score is
  "significance", not markets.
- **Ask to lift a copy rule; don't trim the idea.** When an idea needs a rule lifted, put it to the owner with the
  rule quoted, and log the answer. The trailer's doomscroll framing is the precedent. Propose each idea at full
  strength and let the owner decide.

## Ledger

Log new activity in app-sites `marketing/`. [The growth ledger](../../../docs/growth/ledger.md) holds the earlier
history and its Lessons. An entry in it uses this template:

```
| YYYY-MM-DD | <activity> | <channel> | <ct token or —> | planned / live / done / dropped | <result so far> |

## YYYY-MM-DD: <activity>

**What and why.** The activity, the audience and why now.

**Assets.** Copy, files, links and campaign token.

**Status.** Planned, live (with the URL) or done; what the owner still has to do.

**Results.** +2, +7, +28 days, from the channel and App Store Connect. "Not yet" is an answer.

**Next.** What this suggests doing next.
```
