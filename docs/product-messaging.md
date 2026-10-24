# Product messaging

Use this positioning across the website, search/share metadata, store copy,
README and agent documentation. Keep descriptions of availability accurate.

## Core copy

**World news, rated by significance.**

Newsworthy assesses the significance of world news. Each reading has a
score from 1 to 10, a brief explanation and an update time.

The share image contains only the dash and wordmark on a flat background in the brand colour.
The link title is “Newsworthy”; its description is the core copy above.

Describe the product directly. Avoid emotional framing about anxiety, switching
off, breathing room or getting on with your day. Do not use “no doomscrolling”
or a list of absent features as a tagline. Subscription, purchase and advertising
facts belong in relevant help and policy sections.

One exception, by the owner's brief of 2026-10-21: the YouTube trailer
(`store/video/trailer`) tells why the app exists, so it sets the endless feed
against what breaks through, says "doomscroll", and names the $1 price with
no ads, subscription or in-app purchases. It still ends on the core copy and
follows every other rule here.

Product constraints remain: no feed, subscriptions, in-app purchases, ads, or
engagement, addiction or growth-hacking tactics.

The widget picker description, on iOS and Android alike, is:

> The current news rating and when it was updated.

It says what the widget shows. The picker already names the app, so it does not
repeat a tagline or explain the scale.

## What the score measures, internally

Internally, the score is the current risk of a sharp market move, up or down,
and the reading names the development most likely to cause one (prompt v18,
the owner's definition, 2026-09-26). That framing governs the rating prompt,
its evaluations, caller reviews and internal docs.

External copy stays framed around news by significance, by the owner's
decision: the tagline, descriptions, store listing, help pages, `llms.txt` and
metadata do not describe the score as market risk and do not mention markets,
prices, trading or investing as what the number measures. The reading's own
sentence may report a market move that happened; that is news, not a
description of the scale. Since prompt v21 (2026-10-05) it never predicts one. Internal work that changes the rating
does not by itself call for external copy changes.

The sentence never names a news outlet (the owner's convention, 2026-09-27,
from prompt v19). Copy must not promise sources or credit outlets in it.

## Voice and claims

- Keep copy simple, calm and factual. Avoid urgency, guilt, streaks or prompts
  designed to keep people returning. Do not describe news as needing the user.
- Describe the score as an assessment of news consequence. It is not a
  measurement of personal safety, a complete briefing or an emergency alert.
- User-facing copy never mentions AI, models, language models or the providers
  behind them: the app, widgets, website, help and privacy pages, `llms.txt`,
  metadata and the store listing's public fields. How ratings are produced is
  internal; say what Newsworthy does, not what does it. App Review notes, the
  admin page and developer docs are not user-facing and stay accurate.
- Ratings update periodically and can be wrong. Higher means more consequential;
  the displayed score fades as developments age.
- A bold “New:” before a sentence means that reading is Newsworthy’s first
  coverage of the development, for two hours after it was saved. It is not a
  verified event date or a claim that the broader story is new. Below the
  sentence, a fainter line names its story and says how long ago it was first
  reported (“US Iran War · 5h ago”). On opening, and when tapped, that line
  first says when Newsworthy last checked (“Checked 23m ago”), as Settings does
  (“Last checked 18m ago”). The widgets lead the sentence with the age (“5h
  ago:”) and give the clock time of the check (“Checked at 10:21”). Behind
  either prefix the sentence keeps its full 135-character budget.
- A saved reading keeps its original update timestamp. Widgets can drop the
  label later than the app, depending on the operating system. Do not promise
  real-time updates.
- The launcher icon is a white dash on near-black. The web favicon can show the
  score; home-screen widgets carry a rating and update time.
- The iOS app is a one-time US$1 download on the App Store, with local store
  equivalents, to help offset the cost of running the service. Android will be
  the same once released; until Google Play pricing is configured and the app
  is public there, do not describe Android as available or priced.
- Settings offer an appearance choice (Follow device, Light, Dark; following the
  device by default)
  and, in the mobile apps only, an optional notification for readings at or
  above a chosen score — off by default, 8 when turned on, one notification per
  development, about the number the front page shows rather than a raw reading. Describe it as optional and quiet; never as an alert service,
  and never as available until a build carrying it has been verified.
- The Privacy and Support links live in Settings, not on the reading screen.
  So does Publisher (Settings → Publisher): who publishes and edits, that readings are Newsworthy's own and not republished articles, and a contact email. It never mentions how ratings are produced and never names outlets.
- The introduction (`apps/client/lib/onboarding.js`) restates the core copy in
  a few plain sentences: a score of consequence. Like all
  user-facing copy it does not mention AI. By the owner's choice it does not
  warn that ratings can be wrong; the support page carries that. It adds that a widget exists and that
  notifications are optional and off by default. It says what the app does,
  not how the phone works or where Settings is, and never asks the reader to
  come back. Only the mobile apps have it: they show it once on first launch,
  and Settings replays it. The website has no introduction.
- Do not claim that hosting processes no technical information.
- Brand positioning must never soften, inflate or otherwise alter the rating
  scale. Published prompts are append-only; see `PROMPT-RULES.md`.

## Availability and preview wording

The web app, privacy policy and support page are live at
https://newsworthy-indol.vercel.app/. Contact: astrojams1@gmail.com.

The iOS app (iPhone and iPad, iOS 16.4 or later; widgets need iOS 17) has been
on the App Store since 21 October 2026, in all 175 territories:
https://apps.apple.com/app/id6812519450. Link to it with that country-neutral
URL; the store localizes it.

Android is not publicly available. Version 17 is on Google Play closed testing
for invited testers; production access has not been applied for. Closed testing
is not store availability: do not claim Android availability, a Play link or an
Android price until the release ledger's `google.release` gate is done.

Where the website offers the app, it does so plainly: iOS Safari's own Smart
App Banner (`apple-itunes-app` in `apps/client/app/+html.tsx`) and one factual
paragraph on the support page. The reading screen carries no badge or download
prompt.

The shared public UI uses Expo / React Native for web, iOS and Android. Admin
remains web-only. Native widgets are integrated through Expo prebuild.

The Codex browser panel shows the web renderer. An installed iPhone simulator
can run the native UI through Expo Go. Widgets and the complete package require
a custom native build: iOS on a Mac with a supported Xcode/runtime, Android
locally with Gradle. Native and physical-device verification scopes must be recorded separately.

## Where copy lives

- `apps/client/targets/widget/NewsworthyWidget.swift` (`.description`) and
  `apps/client/plugins/widget-android/res/values/widget.xml`
  (`widget_description`): widget picker copy.
- `apps/client/app/`: shared reading screen, settings screen, search metadata, social tags and WebSite data.
- `apps/client/lib/onboarding.js`: the introduction's slide copy.
- `public/privacy.html`, `public/support.html`: policy and help; each has its own metadata.
- `scripts/generate-brand.mjs`: evergreen share-art source; generates
  `public/social-card.svg`, `public/social-card.png` and `public/brand/share.png`.
- `public/robots.txt`, `public/sitemap.xml`: crawler access and public page discovery.
- `public/llms.txt`: public facts for AI readers; a voluntary reference, not a
  guaranteed discovery or ranking mechanism.
- `src/caller.js`, `skills/newsworthy-rating/SKILL.md`: authorized
  rating-agent contract. A reading is score/explanation; a complete submission
  also carries the computed `prompt_sha256` provenance proof. After scoring and
  writing, the caller fetches the recorded developments, answers the judge
  prompt from its instructions and submits that answer with the reading. Each
  run ends with a report of its own at `/api/runs`, which is never checked.
- `README.md`, `AGENTS.md`: developer and coding-agent guidance.
- `store/`: canonical mobile listing copy, native captures, artwork, upload scripts,
  release evidence and account-owner steps; `docs/store-listing.md` points there.
- `store/video/reel.js`: every line of the store preview video, each naming the
  file above it quotes; `render-video.mjs --stale` reports a line that has
  drifted, and the preview-reel skill re-renders it.
- `store/video/trailer/README.md`: the YouTube trailer's brief and script;
  `store/video/trailer/film.js` quotes it and the app, checked by
  `test/trailer.test.js`.

If the production domain or release status changes, update all applicable
surfaces above, plus `mobile.release.json`. Search engines and social platforms
control when they refresh cached metadata. Admin and operational API routes
carry `noindex`; this is indexing guidance, not an access-control mechanism.
