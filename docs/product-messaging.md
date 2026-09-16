# Product messaging

Use this positioning across the website, search/share metadata, store copy,
README and agent documentation. Keep descriptions of availability accurate.

## Core copy

**Newsworthy is a calm global status indicator: a number out of 10 and one
sentence explaining why.**

Constant news can leave us anxious. Switching off entirely can leave us out of
touch. Newsworthy offers a calmer middle ground. Check in, then get on with your day.

- No doomscrolling.
- No subscription.
- No in-app purchases.
- No ads.
- No engagement, addiction or growth-hacking tactics.

## Voice and claims

- Keep copy simple, calm and factual. Avoid urgency, guilt, streaks or prompts
  designed to keep people returning. Do not describe news as needing the user.
- Describe the score as an AI assessment of news consequence. It is not a
  measurement of personal safety, a complete briefing or an emergency alert.
- Ratings update periodically and can be wrong. Higher means more consequential;
  the displayed score fades as developments age.
- A saved reading keeps its original timestamp. Widgets can refresh later than
  the app, depending on the operating system. Do not promise real-time updates.
- The launcher icon is a white dash on near-black. The web favicon can show the
  score; planned home-screen widgets carry a rating and update time.
- The planned iOS and Android release is a one-time US$1 download to help offset
  the cost of running the service, with local store equivalents. Pricing must be
  configured and verified in each store before it is described as live.
- Do not claim that hosting processes no technical information.
- Brand positioning must never soften, inflate or otherwise alter the rating
  scale. Published prompts are append-only; see `PROMPT-RULES.md`.

## Availability and preview wording

The web app, privacy policy and support page are live at
https://newsworthy-indol.vercel.app/. Contact: astrojams1@gmail.com.

The shared public UI uses Expo / React Native for web, iOS and Android. Admin
remains web-only. Native widgets are integrated through Expo prebuild; they need
custom-build verification. EAS account setup, signing and store setup are release
gates. Do not claim store availability before release.

The Codex browser panel shows the web renderer. The installed iPhone simulator
can run the native UI through Expo Go. Custom EAS builds are needed to verify
widgets and the complete app package without updating local Xcode.

## Where copy lives

- `apps/client/app/`: shared screens, About copy, search metadata, social tags and WebSite data.
- `public/privacy.html`, `public/support.html`: policy and help; each has its own metadata.
- `public/social-card.svg`: editable source for the evergreen social preview PNG.
- `public/robots.txt`, `public/sitemap.xml`: crawler access and public page discovery.
- `public/llms.txt`: public facts for AI readers; a voluntary reference, not a
  guaranteed discovery or ranking mechanism.
- `src/caller.js`, `src/openapi.js`, `skills/newsworthy-rating/SKILL.md`: authorized
  rating-agent contract. A reading is score/explanation; a complete submission
  also carries the computed `prompt_sha256` provenance proof.
- `README.md`, `CLAUDE.md`, `AGENTS.md`: developer and coding-agent guidance.
- `store/`: canonical mobile listing copy, native captures, artwork, upload scripts,
  release evidence and account-owner steps; `docs/store-listing.md` points there.

If the production domain or release status changes, update all applicable
surfaces above, plus `mobile.release.json`. Search engines and social platforms
control when they refresh cached metadata. Admin and operational API routes
carry `noindex`; this is indexing guidance, not an access-control mechanism.
