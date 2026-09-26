# Caller reviews

Reviews of the hourly caller's runs against what the server recorded. Run the
[repository skill](../../.agents/skills/newsworthy-caller-review/SKILL.md) to add
one. Entries are append-only: a later review that overturns an earlier finding
says so in its own entry. Each window starts where the previous one ended.

| Review | Window (UTC) | Prod commit | Readings / reports / rejections | Flagged runs | Open questions |
|---|---|---|---|---|---|
| [2026-09-25-01](#2026-09-25-01) | 2026-09-25 18:00 → 22:40 | 7259df4 | 5 / 4 / 1 | 19:03 (reading 758) | Cause of the 19:03 run |
| [2026-09-26-01](#2026-09-26-01) | 2026-09-25 22:40 → 2026-09-26 02:13 | 4833e57 | 4 / 2 / 3 | 00:03 (763), 02:03 (765) | Where the pre-#144 workflow comes from |

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

## 2026-09-26-01

**Window** 2026-09-25 22:40 → 2026-09-26 02:13 UTC. Production at `4833e57`
(#146) throughout: authenticated calls to missing endpoints are now recorded.
Nothing else merged since the last entry.

**Counts.** 4 caller readings (762–765), 2 run reports, 3 rejections (one is
this reviewer's probe, below), 0 hours without a reading. No merges.

**Clean runs.** 762 (23:04) and 764 (01:04): prompt verified, judged v3 onto
742 (the seven-day Hormuz offer), report linked. Both reports' claims match the
stored rows.

**Flagged: 00:03 (reading 763) and 02:03 (reading 765).** Observations, one
timeline:
- 00:03:54.566 — `POST /api/readings/prepare` → 404 (authenticated).
- 00:03:58.521 — reading 763 stored: score 3, prompt verified, US-China trade
  sentence, unjudged ("no judgement sent"). No run report.
- 02:03:21.475 — `POST /api/readings/prepare` → 404 (authenticated).
- 02:03:26.013 — reading 765 stored: score 4, prompt verified, Xi-visit
  sentence, unjudged. No run report.

`/api/readings/prepare` and the prepare-then-submit order exist only in the
caller instructions served before #144 deployed (2026-09-25 17:50). Both runs
called it about four seconds before submitting, sent no judgement and posted no
run report — neither of which the old instructions described. **Established:**
these two runs followed the pre-#144 workflow.

Not established: where that workflow came from. Production serves only the
current instructions, so a run following the old ones did not get them from
this server at the time. Candidates, none tested: a cached copy in the caller's
fetch tool; notes or memory the caller environment carries between runs; a
summarizing fetch reconstructing the page wrongly (run 2's report, 2026-09-25,
says one "described a nonexistent /api/readings/prepare step"). Clean and stale
runs alternate within the same hours, so whatever it is, it is not every run.

**Revisiting 2026-09-25-01.** The 19:03 run (reading 758: unjudged, no report)
matches this pattern, but 404s were not recorded then, so it cannot be
confirmed. The withdrawn cache hypothesis stays withdrawn as stated — it named
one source for the stale workflow without evidence for that source — while the
stale workflow itself is now established for 00:03 and 02:03.

**Probe.** The 404 at 2026-09-25 22:57:07.382 was this reviewer verifying the
#146 deploy, not the caller.

**Effect on the page.** An unjudged reading inherits the previous reading's
development, so 763 and 765 — US-China trade — were grouped with the Iran
development 742: the grouping is wrong. Whether it changed the displayed
number was not measured.

**Proposed.**
1. Record each authenticated fetch of `/api/instructions` and `/api/prompt`
   (time and path, no query). A stale run that never fetched the instructions
   points at the caller's side (cache or memory); one that fetched them and
   still followed the old workflow points at how the page was read.
2. Answer `POST /api/readings/prepare` with a 410 naming the current workflow,
   so a run on the old one learns within the run. This addresses the observed
   symptom whatever its source.

**Open questions.** The source of the pre-#144 workflow (proposal 1 is meant to
answer it). Whether the source notes and "final before fetching" wording
raised on 2026-09-25 should change: not revisited this window.
