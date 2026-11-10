---
name: newsworthy-prompt-update
description: Update and evaluate Newsworthy's versioned rating prompt, synchronize caller contracts, and verify an authorized release. Use for changes to the generated status sentence, rating instructions, or prompt-version workflow, not for submitting a routine news reading.
---

# Newsworthy prompt update

**Ship a new prompt version that is tested, frozen and delivered to callers.** A published prompt is the scale every
reading was made on, so it never changes in place.

Done means: version N+1 is merged, production serves it with a matching digest, and the evaluation record and ledger
row exist. Caller adoption is confirmed, or reported as pending.

## Where things are

| What | Where |
|---|---|
| Rules every prompt follows | [PROMPT-RULES.md](../../../PROMPT-RULES.md) |
| Prompt registry | `src/prompts.js` (`latestVersion()`, `renderPrompt()`) |
| Frozen hashes | `test/prompt-rules.test.js` |
| App-made run pin | `NEWSWORTHY_PROMPT_VERSION` in `src/rate.js` |
| Caller contracts | `src/caller.js`, `skills/newsworthy-rating/SKILL.md` |
| Evaluation records | `docs/prompt-evaluations/v<N>.md`; [the v12 evaluation](../../../docs/prompt-evaluations/v12.md) shows the format |
| Ledger | [the prompt update ledger](../../../docs/prompt-evaluations/ledger.md) |
| Shared claims | [product messaging](../../../docs/product-messaging.md) |

Work from the repository root. Read [AGENTS.md](../../../AGENTS.md), `PROMPT-RULES.md` and product messaging first.

## Authority

A request to make a prompt change authorizes publishing it: merge once checks pass, then verify production, as
`AGENTS.md` says. Only a request for a proposal or an evaluation alone stops before the merge.

Repository rules and approval holds outrank this skill.

## A run

1. **Establish the change** ([details](#establish-the-change)). Read the ledger's newest rows and Lessons before
   drafting.
2. **Test generated behavior** on identical inputs, old against new ([details](#test-generated-behavior)).
3. **Version and synchronize** the registry, hashes and caller contracts ([details](#version-and-synchronize)).
4. **Validate and release** ([details](#validate-and-release)).
5. **Record** the evaluation and the ledger row (see [Ledger](#ledger)).

### Establish the change

- **Start from main.** Fetch `origin` and inspect `origin/main` before you build anything. Preserve local work. Use the
  checkout's `.worktrees/<task-name>/` policy when you isolate work.
- **Read the current state.** Inspect `latestVersion()` and `renderPrompt()` in `src/prompts.js`, the frozen hashes in
  `test/prompt-rules.test.js`, and the live prompt when you can reach it. Take the next version from the registry,
  never from memory.
- **Look for a pin.** App-made runs can be pinned by `NEWSWORTHY_PROMPT_VERSION` in `src/rate.js`, even while caller
  endpoints serve the latest version. Check and report any such override when you verify adoption. Preserve a pin
  someone asked for on purpose.
- **Keep wording apart from calibration.** For a writing-only change, keep everything before Output byte for byte.
  Change Scale or Examples only when asked. Calibration examples must come from the author.
- **Read recent stored sentences**, with authorized, read-only history access. Check `prompt_verified`: a
  server-stamped version alone doesn't prove which prompt a caller received. Missing or false proof is not evidence
  that the published wording failed. Keep credentials out of files, logs and commits.
- **Make room rather than drop the improvement**, if the change needs more characters than rule 7 allows. Write the
  addition as tersely as it will go. Then tighten existing wording without changing what it asks for (never Scale or
  Examples). Propose a raise to the owner only if that can't make room, as `PROMPT-RULES.md` describes.
- **Characters are not words.** Characters include spaces and punctuation. Use the unit the user means, and measure
  real examples before you choose a limit.

### Test generated behavior

- **Compare old and new** sentence instructions on identical source notes, with repeated fresh generations. A
  length-only control can separate the value of the writing guidance from the new limit.
- **Use the production model and workflow** when available. Otherwise label the substitute and the untested parts.
- **Keep everything** under `docs/prompt-evaluations/`: the exact tested instructions, inputs, all outputs, model and
  settings, mechanical counts and the review findings. Reconstructed notes are fixtures, not independently verified
  reporting.
- **Check** factual fidelity, attribution, uncertainty, clear grammar, useful detail, length and punctuation.
- **Don't fix the results.** Never truncate or repair outputs to make them pass.
- **Retest a revision.** If the prompt changes after testing, test the revision and identify exploratory iterations.
- **A unit suite is not a quality test.** Neither is a prompt-size check.

The v12 evaluation shows the record format and its limits. Its good outputs are not universal wording rules or
calibration examples.

### Version and synchronize

1. **Append** version N+1 in `src/prompts.js` with its label, date, instructions and output contract. Never edit a
   published version or the constants it references. Keep unchanged sections shared with their existing constants
   where practical.
2. **Freeze it.** Calculate the new hash with `renderPrompt(N+1)`. Add its 16-character hash to the frozen table in
   `test/prompt-rules.test.js`. Keep every old pin unchanged. A mismatched old pin is a regression to investigate, not
   a pin to refresh.
3. **Check every caller-facing description** for contradictory instructions, especially `src/caller.js` and
   `skills/newsworthy-rating/SKILL.md`. The rating skill should fetch the current prompt afresh rather than carry a
   copy.
4. **Preserve provenance.** The caller hashes the decoded `text` value from `/api/prompt` with a code tool. The server
   stamps the version. Don't publish the full expected digest for a caller to echo, and don't accept its claimed
   version.
5. **Keep generation guidance apart from API validation.** Changing sentence length does not authorize a new
   rejection rule or truncation policy. The four rejection rules and the existing 400-character ingestion behavior
   stay, unless changing them is explicitly part of the task.
6. **Record the change and evidence** in repository documentation. Describe what was tested accurately. Don't turn a
   substitute-model writing test into a claim about the production rater, score calibration or native UI parity.

### Validate and release

- **Extend regression cases** for the new contract: immutable old versions, unchanged calibration for writing-only
  changes, caller agreement, and current-version delivery and digest checks. Follow every prompt rule, including the
  complete prompt's character budget.
- **Test.** Run `npm test` before pushing. For real UI changes, also follow the design and native verification rules
  in `AGENTS.md`. Prompt-only work is not a native build verification. Review the diff for credentials and unrelated
  files.
- **Merge.** Open a PR into `main`. Never push directly to it. Merge once required checks pass and review comments are
  answered. Don't stop at the open PR to ask. Preview builds are skipped, so an absent preview is not production
  verification.
- **Verify production.** After merge, check the production deployment. Fetch `/api/prompt` and `/api/instructions`
  with curl and the caller token header. Compare the decoded prompt text, version and computed digest with the merged
  registry. Check that the caller descriptions agree. Don't submit a fake reading or trigger a paid rating just to
  verify delivery.
- **Delivery is not adoption.** A reading that arrives on its own with the new version and `prompt_verified: true`
  establishes adoption. Report it as pending if none has arrived. Don't claim output quality from version metadata
  alone. If deployment or authentication blocks a check, report that specific check as outstanding rather than
  claiming success.
- **Clean up.** Remove only this task's finished worktree. First confirm its commits are merged and no active process
  uses it. Save useful uncommitted or ignored files. Never force cleanup of unfinished work.

## Ledger

Read the newest rows and Lessons of [the prompt update ledger](../../../docs/prompt-evaluations/ledger.md) before
drafting. The record is `docs/prompt-evaluations/v<N>.md`. Add its row to the ledger, and a dated Lesson when the
version teaches something.
