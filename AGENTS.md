# Working on Newsworthy

Read `CLAUDE.md` for repository workflow and technical constraints, and
`docs/product-messaging.md` for product positioning and accurate release claims.

- Before starting any new feature, run `git fetch origin` and inspect the latest
  target branch. Start from the fetched `origin/main`, preserving existing local
  work; never assume the local `main` is current.
- Branch off `main`, open a PR into `main`, and run `npm test` before pushing.
  Do not push directly to `main`. Vercel preview builds are currently skipped.
- Preserve the calm indicator: a number out of 10 and one sentence explaining why.
  No doomscrolling, subscriptions, in-app purchases, ads, or engagement,
  addiction or growth-hacking tactics.
- Keep admin views web-only. Preserve the web app alongside the mobile apps.
- The shared interface uses Expo / React Native in `apps/client`. A browser view is not an iOS
  preview. Do not claim native builds or widgets are verified until tested.
- Follow `PROMPT-RULES.md`; never edit a published rating prompt in place or
  alter the scale to fit marketing copy.
- Public AI-reader facts live in `public/llms.txt`. Authorized rating instructions
  live in `src/caller.js`; keep the rating and provenance contract intact.
