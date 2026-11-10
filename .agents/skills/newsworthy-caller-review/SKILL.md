---
name: newsworthy-caller-review
description: Review the hourly caller's recent runs against what the server recorded — readings, judgements, run reports, rejections, merges — and log findings in the caller-review ledger. Use when asked to check caller runs, run logs or the Routine's health. Reports observations and labelled hypotheses; it does not change the Routine or the caller contract on its own.
---

# Newsworthy caller review

**Find the caller runs that went wrong, and say exactly how far the evidence goes.** The caller's transcripts can't
be read from a session, so a review works only from what the server stored.

Done means: a new ledger entry covers the window, observations are kept apart from hypotheses, and the owner has the
report.

The hourly caller is the "Update newsworthy" Routine. Each hour it researches, scores, judges and submits a reading,
then posts a run report.

## Where things are

| What | Where |
|---|---|
| Ledger | [the caller review ledger](../../../docs/caller-reviews/ledger.md) |
| Live caller contract | [src/caller.js](../../../src/caller.js) |
| Background and the admin-token rule | [AGENTS.md](../../../AGENTS.md), "The caller is the judge for its own readings" |
| The facts for a window | `scripts/caller-review.mjs` |
| Production commit | `/healthz` |

Work from the repository root.

## A run

1. **Read** `AGENTS.md`, especially "The caller is the judge for its own readings" and the admin-token rule. Read the
   live contract in `src/caller.js`.
2. **Start from the ledger.** The newest entry's window end is where this review begins. Check its open questions
   first. Fetch `origin` and note what merged since that entry. A change to the caller contract can explain a change
   in caller behavior. The ledger records the production commit each review ran against.
3. **Gather the facts.** Read the admin token as `AGENTS.md` says. Pass it only through the environment:

   ```
   ADMIN_TOKEN=$(op read "op://API Tokens/Newsworthy admin/password") \
     node scripts/caller-review.mjs --since <end of last ledger window>
   ```

   See [What the script prints](#what-the-script-prints). Read every run report in full.
4. **Check each run** against [the checks](#check-each-run).
5. **Record** one ledger entry and ship it (see [Ledger](#ledger)).
6. **Report** to the owner (see [Report](#report)).

## What the script prints

It prints facts only, for the window:

- each caller reading with its flags: prompt not verified, unjudged and why, no run report linked;
- every run report;
- every rejection, including authenticated calls to endpoints that don't exist (the removed prepare step is now
  among them);
- every merge and undo;
- hours with neither a reading nor a report;
- one timeline per hour, which also shows each authenticated read of the instructions, prompt and record.

Reads and rejections made with the admin token are marked. Those are reviewers, not the caller. Rejections recorded
before the token was kept are marked as such. A sentence that names a listed news outlet, predicts a market move or
hides its actor in a passive is flagged.

## Check each run

- **Stored as described.** A report's claims match the server's row: the reading's score and story, the judgement,
  and "nothing failed".
- **Contract followed.** The prompt is verified. The judgement is present and accepted. The sentence was final before
  `/api/developments` was fetched. Reports sometimes say otherwise, so record it. There is one report per run,
  linked to its reading.
- **No news outlet named.** From prompt v19 (rule 8 in `PROMPT-RULES.md`) the sentence never names a news outlet,
  even as the source or the subject. A report is attributed with "reportedly" or the people it cites. The script
  flags names from `scripts/news-outlets.mjs`, but that list is not every outlet, so read every sentence. Record each
  case with its prompt version. On v19 or later it is a contract breach. Before v19 it is expected, not a finding.
- **No market forecast.** From prompt v21 the sentence never predicts a market move ("…, which could lift oil
  prices"). A move that happened may be reported. `scripts/market-forecast.mjs` flags a hedge and a market word in one
  clause. Read every sentence anyway. On v21 or later a forecast is a contract breach. Before v21 it is expected.
- **Active voice.** From prompt v22 the sentence says who acted, or who claims it when unconfirmed. Write "Iran's
  Revolutionary Guards said they hit two tankers", not "two tankers were reportedly hit".
  `scripts/passive-voice.mjs` flags a passive with no actor. A state ("is expected", "is due") is fine.
- **A preview says what it will settle.** From prompt v23 this covers a scheduled release not yet out (a data
  report, a speech, minutes). The sentence says what the release will settle ("will show whether…"), not only that
  it is due. On
  v23 or later a bare announcement is a contract breach. Before v23 it is expected.
- **Dates, not relative days.** From prompt v24 the sentence gives a date ("due Oct 14"). It never says "today",
  "tonight", "tomorrow" or "yesterday", because it is shown for hours, under an age, in every time zone. On v24 or
  later a relative day is a contract breach.
- **Judgement sound.** `same` or `new` holds up against the record the reading was judged with. A proposed
  `same_story` joins one story coined twice, never related stories. Raise a doubtful merge with the owner, who can
  undo it at `/admin`. The review does not undo it.
- **Failures and friction.** Sources that refused, searches that found nothing, steps a run skipped, retries, and
  rejections near a run's timestamp.
- **Patterns across runs.** The same failing source every run, the same wasted search, or a score stuck on one rung
  while the news changes.

## Rules

- **Propose, never change.** The review does not change the Routine, the caller instructions or stored judgements by
  itself. It proposes. The owner decides.

**Make no assumptions.** A review is only as good as the line it draws between what was seen and what is supposed.

- **Separate observations from hypotheses**, in the ledger and in the report. An observation cites a server record or
  a quoted line from a run report. Label a hypothesis as one, with the evidence for it and the evidence it has not
  yet met.
- **"Unknown" is a finding.** When the stored evidence doesn't establish a cause, say so and name what would.
- **One run's report is not evidence about another run.** A symptom described at 20:04 does not explain what
  happened at 19:03.
- **Check a hypothesis against every fact**, not just the one that suggested it. A cached-instructions theory must
  also explain the clean run an hour earlier and a second request 0.3 s after the first.
- **Timestamps and ordering are evidence.** Put a failed run's rows, rejections and reports on one timeline, to the
  millisecond, before you interpret any of them.
- **Don't propose a fix for an unconfirmed cause.** Propose the cheapest way to confirm it, often a record the server
  doesn't keep yet. Propose a fix only once the cause is established.
- **Report claims are the caller's account, never checked.** Compare a claim with a server record where you can.
  Where you can't, say it is unverified.

## Report

Tell the owner, in the same shape as the ledger entry:

- what was observed;
- what is supposed, and how sure;
- what is proposed.

## Ledger

Append one entry to [the ledger](../../../docs/caller-reviews/ledger.md). Never edit an earlier one. If a later review
overturns an earlier finding, the new entry says so and why. A clean window gets a short entry, not a skipped one.

Each entry records:

- the window and the production commit;
- readings, run reports and rejections counted;
- each flagged run with its observations;
- hypotheses, each labelled with its evidence and status (open, confirmed, withdrawn);
- actions taken or proposed;
- open questions for the next review.

Update the ledger table's row for the entry. Ship the ledger change as a PR, as `AGENTS.md` says.
