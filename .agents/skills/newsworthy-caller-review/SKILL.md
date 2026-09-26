---
name: newsworthy-caller-review
description: Review the hourly caller's recent runs against what the server recorded — readings, judgements, run reports, rejections, merges — and log findings in the caller-review ledger. Use when asked to check caller runs, run logs or the Routine's health. Reports observations and labelled hypotheses; it does not change the Routine or the caller contract on its own.
---

# Newsworthy caller review

The hourly caller (the "Update newsworthy" Routine) researches, scores, judges
and submits a reading, then posts a run report. Its transcripts cannot be read
from a session, so a review works from what the server stored. The goal is to
find runs that went wrong and to say exactly how far the evidence goes.

Work from the repository root. Read [AGENTS.md](../../../AGENTS.md) — especially
"The caller is the judge for its own readings" and the admin-token rule — and
the live caller contract in [src/caller.js](../../../src/caller.js).

## Start from the ledger

Read the [ledger](../../../docs/caller-reviews/ledger.md). The newest entry's
window end is where this review begins; its open questions are checked first.
Fetch `origin` and note what merged since that entry: a change to the caller
contract can explain a change in caller behaviour, and the ledger records the
production commit each review ran against (`/healthz` reports it).

## Gather the facts

Read the admin token as AGENTS.md says and pass it only through the
environment:

```
ADMIN_TOKEN=$(op read "op://API Tokens/Newsworthy admin/password") \
  node scripts/caller-review.mjs --since <end of last ledger window>
```

The script prints, for the window, each caller reading with its flags (prompt
not verified, unjudged and why, no run report linked), every run report,
every rejection including authenticated calls to endpoints that do not exist
and to the removed prepare step (410), every merge and undo, hours with neither
a reading nor a report, and one timeline per hour that also shows each
authenticated read of the instructions, prompt and record. Reads made with the
admin token are marked — those are reviewers, not the caller. It prints facts
only. Read every run report in full.

## Check each run

- **Stored as described.** A report's claims — the reading's score and story,
  the judgement, "nothing failed" — match the server's row.
- **Contract followed.** Prompt verified; judgement present and accepted; the
  sentence final before `/api/developments` was fetched (reports sometimes say
  otherwise — record it); one report per run, linked to its reading.
- **Judgement sound.** `same` or `new` is defensible against the record the
  reading was judged with; a proposed `same_story` joins one story coined twice,
  never related stories. A doubtful merge is raised with the owner, who can undo
  it at `/admin` — the review does not undo it.
- **Failures and friction.** Sources that refused, searches that found nothing,
  steps a run skipped, retries, rejections near a run's timestamp.
- **Patterns across runs.** The same failing source every run, the same wasted
  search, a score stuck on one rung while the news changes.

## Make no assumptions

A review is only as good as the line it draws between what was observed and
what is supposed.

- **Separate observations from hypotheses, in the ledger and in the report to
  the owner.** An observation cites a server record or a quoted line from a run
  report. A hypothesis is labelled as one, with the evidence for it and the
  evidence it has not yet met.
- **"Unknown" is a finding.** When the stored evidence does not establish a
  cause, say so and name what would establish it.
- **One run's report is not evidence about another run.** A symptom described at
  20:04 does not explain what happened at 19:03.
- **Check a hypothesis against every fact, not just the one that suggested it.**
  A cached-instructions theory must also explain the clean run an hour earlier
  and a second request 0.3 s after the first.
- **Timestamps and ordering are evidence.** Put a failed run's rows, rejections
  and reports on one timeline, to the millisecond, before interpreting any.
- **Do not propose a fix for an unconfirmed cause.** Propose the cheapest way to
  confirm it — often a record the server does not yet keep — and a fix only once
  the cause is established.
- **Report claims are the caller's account, never checked.** Where a claim can be
  compared with a server record, compare it; where it cannot, say it is
  unverified.

## Record and report

Append one entry to the ledger — never edit an earlier one. If a later review
overturns an earlier finding, the new entry says so and why. Each entry records:
the window and production commit; readings, run reports and rejections counted;
each flagged run with its observations; hypotheses, each labelled with its
evidence and status (open, confirmed, withdrawn); actions taken or proposed;
open questions for the next review. Update the ledger table's row for the entry.

Ship the ledger change as a PR per AGENTS.md. Report to the owner in the same
shape: what was observed, what is supposed and how sure, what is proposed. A
clean window is a short entry, not a skipped one.

The review does not change the Routine, the caller instructions or stored
judgements by itself. It proposes; the owner decides.
