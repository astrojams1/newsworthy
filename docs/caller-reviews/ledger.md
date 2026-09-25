# Caller reviews

Reviews of the hourly caller's runs against what the server recorded. Run the
[repository skill](../../.agents/skills/newsworthy-caller-review/SKILL.md) to add
one. Entries are append-only: a later review that overturns an earlier finding
says so in its own entry. Each window starts where the previous one ended.

| Review | Window (UTC) | Prod commit | Readings / reports / rejections | Flagged runs | Open questions |
|---|---|---|---|---|---|
| [2026-09-25-01](#2026-09-25-01) | 2026-09-25 18:00 → 22:40 | 7259df4 | 5 / 4 / 1 | 19:03 (reading 758) | Cause of the 19:03 run |

## 2026-09-25-01

**Window** 2026-09-25 18:00 → 22:40 UTC, the first five runs on the caller-judge
contract (#144, deployed 17:50) and Opus 5.5. Production at `7259df4` (#145) from
18:17.

**Counts.** 5 caller readings (757–761), 4 run reports, 1 rejection, 0 hours
without a reading. Merges in the window: 3, all by hand (`hormuz-conflict`,
`hormuz-threat`, `iran-nuclear` → `iran-war`), none proposed by the caller.

**Clean runs.** 757, 759, 760, 761: prompt verified, judgement accepted, report
linked. 759–761 file the seven-day Hormuz offer under `iran-war` ← 742; 757, before
the merge and backfill, filed it under `hormuz-conflict` ← 687.

**Flagged: 19:03, reading 758.** Observations:
- 19:03:51.473 — reading 758 stored: score 4, prompt verified, a bond-yield
  sentence, `judge_note` "no judgement sent".
- 19:03:51.762 — 289 ms later, a GET to `/api/readings` rejected 422, "score
  must be an integer from 1 to 10".
- No run report for the hour.

Hypotheses:
- *Withdrawn:* the caller's fetch tool served cached instructions from before
  #144. Suggested by run 2 (20:04) reporting that "a summarizing fetch of the
  instructions described a nonexistent /api/readings/prepare step". Withdrawn
  because it rests on another run's report and does not explain the clean 18:03
  run an hour earlier or the second request 0.3 s after the first. The fix it
  implied — a timestamp on the Routine's URL — was not made.
- *Open, unsupported:* one submission sent twice, the second without its score.
  Fits the 0.3 s gap; nothing else tests it.

Cause: unknown.

**Friction across runs (observations).** Washington Post and CNBC answer 403 in
every run, while the instructions' notes still list CNBC as answering. Every run
spends a prediction-market search and finds no usable move. Runs 3 and 4 say the
sentence was finalized after `/api/developments` was fetched (run 4: 141 → 133
characters, "for length only").

**Actions.** Authenticated calls to missing endpoints are now recorded as 404
rejections (method and path, never the query), so a caller working from stale
instructions leaves evidence next time.

**Open questions.** Does the 19:03 pattern recur, and do the new 404 records
show a call to a removed endpoint when it does? Should the source notes and the
"final before fetching" wording in the instructions change?
