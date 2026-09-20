---
name: newsworthy-prompt-update
description: Update and evaluate Newsworthy's versioned rating prompt, synchronize caller contracts, and verify an authorized release. Use for changes to the generated status sentence, rating instructions, or prompt-version workflow, not for submitting a routine news reading.
---

# Newsworthy prompt update

Work from the repository root. Read [AGENTS.md](../../../AGENTS.md),
[CLAUDE.md](../../../CLAUDE.md), [PROMPT-RULES.md](../../../PROMPT-RULES.md),
and [product messaging](../../../docs/product-messaging.md) first.
This skill supports the user's requested scope: a proposal does not authorize
publication; an explicit request to merge already authorizes the merge.

## Establish the change

- Fetch `origin` and inspect `origin/main` before implementation. Preserve local
  work and use the checkout's `.worktrees/<task-name>/` policy when isolating work.
- Inspect `latestVersion()` and `renderPrompt()` in `src/prompts.js`, the frozen
  hashes in `test/prompt-rules.test.js`, and the live prompt when accessible.
  Determine the next version from the registry rather than remembering a number.
  App-made runs can be pinned by `NEWSWORTHY_PROMPT_VERSION` in `src/rate.js`
  even while caller endpoints serve the latest version. Check and report any
  such override when verifying adoption; preserve intentionally requested pins.
- Separate sentence wording from rating calibration. For a writing-only change,
  preserve everything before Output byte for byte. Change Scale or Examples only
  when requested; calibration examples must come from the author.
- Review recent stored sentences using authorized, read-only history access.
  Check `prompt_verified`: a server-stamped version alone does not prove which
  prompt a caller received. Missing or false proof is not evidence that the
  published wording failed. Keep credentials out of files, logs and commits.
- Distinguish characters (including spaces and punctuation) from words. Use the
  user's intended unit and measure actual examples before choosing a limit.

## Test generated behavior

Compare the old and proposed sentence instructions on identical source notes,
with repeated fresh generations. A length-only control can help distinguish the
value of writing guidance from the new limit. Use the production model and
workflow when available; otherwise label the substitute and the untested parts.

Retain exact tested instructions, inputs, all outputs, model/settings, mechanical
counts and the review findings under `docs/prompt-evaluations/`. Reconstructed
notes are fixtures, not independently verified reporting. Check factual fidelity,
attribution, uncertainty, clear grammar, useful detail, length and punctuation.
Do not truncate or repair outputs to make results pass. If the prompt changes
after testing, test the revision and identify exploratory iterations. A passing
unit suite or a prompt-size check is not a generation-quality test.

[The v12 evaluation](../../../docs/prompt-evaluations/v12.md) illustrates the
record format and its limitations; its favorable outputs are not universal
wording requirements or calibration examples.

## Version and synchronize

1. Append version N+1 in `src/prompts.js` with its label, date, instructions and
   output contract. Never edit a published version or the constants it references.
   Keep unchanged sections shared with their existing constants where practical.
2. Calculate the new hash with `renderPrompt(N+1)` and add its 16-character hash
   to the frozen table in `test/prompt-rules.test.js`. Keep every old pin unchanged.
   A mismatched old pin is a regression to investigate, not a pin to refresh.
3. Check all caller-facing descriptions, especially `src/caller.js`,
   `src/openapi.js`, and `skills/newsworthy-rating/SKILL.md`, for contradictory
   instructions. The rating skill should fetch the current prompt afresh rather
   than carry a copied version. Keep the caller reference in specification voice.
4. Preserve provenance: the caller hashes the decoded `text` value from
   `/api/prompt` with a code tool; the server stamps the version. Do not publish
   the full expected digest for a caller to echo or accept its claimed version.
5. Keep generation guidance separate from API validation. Changing sentence
   length does not implicitly authorize a new rejection rule or truncation
   policy. The four rejection rules and existing 400-character ingestion
   behavior remain unless changing them is explicitly part of the task.
6. Record the change and evidence in repository documentation. Describe what was
   tested accurately; do not turn a substitute-model writing test into a claim
   about the production rater, score calibration, or native UI parity.

## Validate and release

- Extend relevant regression cases for the new contract: immutable old versions,
  unchanged calibration for writing-only changes, caller/OpenAPI agreement, and
  current-version delivery and digest verification. Follow all prompt rules,
  including the complete prompt's character budget.
- Run `npm test` before pushing. For actual UI changes also follow the design and
  native verification requirements in AGENTS.md; prompt-only work is not a native
  build verification. Review the diff for credentials and unrelated artifacts.
- Open a PR into `main`; never push directly to it. Merge when authorized by the
  user and required checks pass. Preview builds are skipped, so an absent preview
  is not production verification.
- After merge, check the production deployment and fetch `/api/prompt` and
  `/api/instructions?format=json` with authorized headers and a fresh `cb` value.
  Compare the decoded prompt text, version and computed digest with the merged
  registry. Verify caller and OpenAPI descriptions agree. Do not submit a fake
  reading or trigger a paid rating merely to verify delivery.
- Distinguish deployed prompt delivery from caller adoption. A naturally arriving
  reading with the new version and `prompt_verified: true` establishes adoption;
  report it as pending if none has arrived. Do not claim output quality from
  version metadata alone. If deployment or authentication blocks verification,
  report that specific outstanding check rather than claiming release success.
- Remove only this task's completed worktree after confirming its commits are
  merged, no active process uses it, and uncommitted or ignored useful files have
  been preserved. Never force cleanup of unfinished work.
