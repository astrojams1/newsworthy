# Copy review ledger

Every copy accuracy review made with the
[PR copy review skill](../../.agents/skills/newsworthy-pr-copy-review/SKILL.md),
one row per PR, newest last. The full note stays in the PR description; this
is the index across PRs, so a claim corrected once is not reintroduced and a
limit left open is not forgotten. Entries are append-only. Read the Lessons
and the open limits before reviewing; add a row in the PR being reviewed.
Reviews before 2026-10-01 were recorded only in their PR descriptions.

| PR | Date | Surfaces reviewed | Corrected | Open limits |
|---|---|---|---|---|
| #155 | 2026-10-01 | README, product messaging, store listing, mobile release, design README, AGENTS.md | Mobile release: hiding the app name does not enlarge the rating; Appearance is a String parameter | Widget fix not yet seen on a device; Android unverified |

## Lessons

Claims that were wrong once. Check for them again; date each item.

- **"Enlarges the rating"** (2026-10-01, #155). Hiding the widget's app name
  gives its row to the rating and sentence at the same size; the numeral is a
  fixed 69 pt. `docs/mobile-release.md` had said otherwise.
- **Simulator is not device** (2026-10-01, #155). A widget verified on iOS
  simulators is described as such; claim a device only once one has shown it.
