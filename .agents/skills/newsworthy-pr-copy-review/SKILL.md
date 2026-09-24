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
- Caller prose, OpenAPI and rating skills when the contract changes. Preserve
  published prompt bytes and the rating/provenance rules; use the prompt-update
  skill for prompt edits.

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
