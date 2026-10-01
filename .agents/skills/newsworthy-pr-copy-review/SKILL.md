---
name: newsworthy-pr-copy-review
description: Before creating any Newsworthy PR, check that README, product and marketing copy, help, caller instructions and release claims remain accurate for the proposed change. Repeat when PR scope changes.
---

# Newsworthy PR copy review

Review the final change against its target branch before opening every PR, even
when the change appears internal. Repeat the affected checks if its scope changes
before merge. This is a repository accuracy review, not authorization to publish
store listings, send messages, or change product positioning.

Read the diff and describe the resulting user-visible behavior and any changed
API, configuration, availability or release boundary. Read `README.md` and
`docs/product-messaging.md`, then use the latter's “Where copy lives” map to
inspect affected surfaces. Search for the old behavior, wording and related
claims; a filename-only check misses copy that describes the same behavior in
different words.

Check the relevant claims against implementation and evidence:

- README examples and setup instructions; `AGENTS.md` workflow.
- Shared app metadata, visible copy, help/privacy pages and `public/llms.txt`.
- Store listing source, screenshots/captions and release ledgers when the change
  affects mobile behavior or availability. Source support, deployed web behavior,
  installed native builds and public store availability are separate claims.
- The store preview video: `node store/scripts/render-video.mjs --stale` names
  any scene or on-screen line the change reaches. Re-render it with
  `.agents/skills/newsworthy-preview-reel/SKILL.md`, or say in the note that the
  video is now out of date.
- Caller prose, OpenAPI and rating skills when the contract changes. Preserve
  published prompt bytes and the rating/provenance rules; use the prompt-update
  skill for prompt edits.

The score is market risk internally and news significance externally, by the
owner's decision (see "What the score measures, internally" in
`docs/product-messaging.md`). A difference between the two is intended, not a
contradiction to correct; external copy must not describe the score as market
risk.

Correct contradictions introduced or exposed by the change in the same PR. Keep
still-accurate copy; do not force edits to every document or add promotional
claims merely because a feature exists. Use existing product decisions as the
source of truth. If a material claim cannot be verified, qualify it and record
the outstanding check; do not invent release or native verification evidence.
Generated copy should be changed at its source and regenerated where applicable.

Include a short “Copy accuracy” note in the PR description naming the surfaces
reviewed, corrections made, and material remaining limits. An internal change
may say no copy changes were needed, with a concrete reason. This note records
an actual review; a checked box alone is not evidence.

Read the [copy review ledger](../../../docs/copy-reviews/ledger.md) before
reviewing: its Lessons are claims that were wrong before, and its open limits
are checks still owed. Add the PR's row in the same PR, and a dated Lesson when
the review corrects a claim that could recur.
