# Working on Newsworthy

Read `CLAUDE.md` for repository workflow and technical constraints, and
`docs/product-messaging.md` for product positioning and accurate release claims.

- Before starting any new feature, run `git fetch origin` and inspect the latest
  target branch. Start from the fetched `origin/main`, preserving existing local
  work; never assume the local `main` is current.
- Branch off `main`, open a PR into `main`, and run `npm test` before pushing.
  Do not push directly to `main`. Vercel preview builds are currently skipped.
- Keep extra development workspaces inside the primary Newsworthy checkout at
  `.worktrees/<task-name>/`. Do not create sibling `newsworthy-*` folders in
  `~/code` or elsewhere in the home directory. When already in a worktree, use
  the primary checkout's `.worktrees` directory rather than nesting another one.
- Exclude `/.worktrees/` through the repository's local `.git/info/exclude`
  before creating workspaces; never commit or upload workspace copies. Use
  `git worktree add`, `move`, and `remove` to keep Git's records consistent.
- Remove completed workspaces once their changes are safely merged. Before
  cleanup, check for unmerged commits, uncommitted changes, and local-only files
  (including ignored files); preserve unfinished work and useful artifacts first.
  Do not move or remove a workspace that an active task or process is using.
- Preserve the calm indicator: a number out of 10 and one sentence explaining why.
  No doomscrolling, subscriptions, in-app purchases, ads, or engagement,
  addiction or growth-hacking tactics.
- Keep admin views web-only. Preserve the web app alongside the mobile apps.
- The shared interface uses Expo / React Native in `apps/client`. A browser view is not an iOS
  preview. Do not claim native builds or widgets are verified until tested.
- For UI changes, run `npm run test:design` and extend its regression cases for
  the reported defect. Follow `design/surfaces.json` and `design/README.md` across
  web, iOS, Android and both widgets. Passing builds, shared palette generation,
  or rendered-prop tests alone do not establish native visual parity; record
  actual native verification and any untested states in the release ledger.
- Follow `PROMPT-RULES.md`; never edit a published rating prompt in place or
  alter the scale to fit marketing copy.
- Public AI-reader facts live in `public/llms.txt`. Authorized rating instructions
  live in `src/caller.js`; keep the rating and provenance contract intact.
