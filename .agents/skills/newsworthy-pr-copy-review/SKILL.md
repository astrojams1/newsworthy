---
name: newsworthy-pr-copy-review
description: Before creating any Newsworthy PR, check that README, product and marketing copy, help, caller instructions and release claims remain accurate for the proposed change. Repeat when PR scope changes.
---

# Newsworthy PR copy review

**Check that every claim the repository makes is still true after this change.** Copy that drifts from the
code tells users, reviewers and callers something false.

Done means: contradictions are fixed in the same PR. The PR description has a "Copy accuracy" note from a real
review, and the ledger has the PR's row.

Run it before opening every PR, even when the change looks internal. Repeat the affected checks if the scope changes
before merge. This is an accuracy review. It does not authorize publishing store listings, sending messages or
changing product positioning.

## Where things are

| What | Where |
|---|---|
| Ledger | [the copy review ledger](../../../docs/copy-reviews/ledger.md) |
| Shared claims and the "Where copy lives" map | `docs/product-messaging.md` |
| Setup and release status | `README.md` |

## A run

1. **Read the ledger.** Its Lessons are claims that were wrong before. Its open limits are checks still owed.
2. **Describe the change.** Read the final diff against the target branch. Write down the user-visible behavior and
   any changed API, configuration, availability or release boundary.
3. **Find the copy.** Read `README.md` and `docs/product-messaging.md`. Use its "Where copy lives" map to find the
   affected surfaces. Search for the old behavior, wording and related claims. A filename-only check misses copy
   that describes the same behavior in other words.
4. **Check each claim** against the code and the evidence (see [What to check](#what-to-check)).
5. **Correct** contradictions the change makes or exposes, in the same PR.
6. **Record.** Add the "Copy accuracy" note to the PR description and the PR's row to the ledger.

## What to check

- README examples and setup steps, and the `AGENTS.md` workflow.
- Shared app metadata, visible copy, help and privacy pages, and `public/llms.txt`.
- Store listing source, screenshots and captions, and release ledgers, when the change affects mobile behavior or
  availability. Source support, deployed web behavior, installed native builds and public store availability are
  separate claims.
- The store preview video. `node store/scripts/render-video.mjs --stale` names any scene or on-screen line the change
  reaches. Re-render it with `.agents/skills/newsworthy-preview-reel/SKILL.md`, or say in the note that the video is
  now out of date.
- Caller prose, OpenAPI and rating skills, when the contract changes. Preserve published prompt bytes and the
  rating and provenance rules. Use the prompt-update skill for prompt edits.

## Rules

- **The score has two names, on purpose.** It is market risk internally and news significance externally, by the
  owner's decision (see "What the score measures, internally" in `docs/product-messaging.md`). The difference is not a
  contradiction to correct. External copy must never call the score market risk.
- **Keep what is still true.** Don't force edits into every document. Don't add promotional claims just because a
  feature exists. Existing product decisions are the source of truth.
- **Never invent evidence.** If a material claim can't be verified, qualify it and record the outstanding check. Never
  invent release or native verification evidence.
- **Fix generated copy at its source**, then regenerate it where that applies.

## Report

The "Copy accuracy" note in the PR description names:

- the surfaces reviewed;
- the corrections made;
- material limits that remain.

An internal change may say no copy changes were needed, with a concrete reason. The note records a real review. A
checked box alone is not evidence.

## Ledger

Add the PR's row to [the copy review ledger](../../../docs/copy-reviews/ledger.md) in the same PR. Add a dated Lesson
when the review corrects a claim that could recur.
