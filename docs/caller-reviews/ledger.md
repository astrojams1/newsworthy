# Caller reviews

Reviews of the hourly caller's runs against what the server recorded. Run the
[repository skill](../../.agents/skills/newsworthy-caller-review/SKILL.md) to add
one. Entries are append-only: a later review that overturns an earlier finding
says so in its own entry. Each window starts where the previous one ended.

| Review | Window (UTC) | Prod commit | Readings / reports / rejections | Flagged runs | Open questions |
|---|---|---|---|---|---|
| [2026-09-25-01](#2026-09-25-01) | 2026-09-25 18:00 → 22:40 | 7259df4 | 5 / 4 / 1 | 19:03 (reading 758) | Cause of the 19:03 run |
| [2026-09-26-01](#2026-09-26-01) | 2026-09-25 22:40 → 2026-09-26 02:13 | 4833e57 | 4 / 2 / 3 | 00:03 (763), 02:03 (765) | Where the pre-#144 workflow comes from |
| [2026-09-26-02](#2026-09-26-02) | 2026-09-26 02:13 → 08:08 | 3861907, then fae4cc6 | 6 / 6 / 5 | 06:03 (769), 07:03 (770), 08:03 (771) | Caller-side cache of the Routine URL: confirm |

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

## 2026-09-26-02

**Window** 2026-09-26 02:13 → 08:08 UTC. Production at `399fd40` (#148: caller
fetches recorded, prepare answers 410) at the start, then `3861907` (#149:
rejections record the token used) from 02:40. `fae4cc6` (#150, #152, #153) was
serving by 08:08; none of those three touch the caller surface.

**Counts.** 6 caller readings (766–771), 6 run reports (one linked to each), 5
rejections, 0 hours without a reading. No merges. Every reading's prompt was
verified.

**Probes.** Three records in the window were this reviewer's: the 410 at
02:30:03.097 (made before #149, so no token is recorded on it), the
`/api/developments` fetch at 02:30:04 (admin token) and the 410 at 02:41:05
(admin token). The other three 410s carry no marker, which means they were made
with the caller token.

**Clean runs.** 03:03 (766), 04:03 (767), 05:03 (768). Each first fetched
`/api/instructions`, then `/api/prompt` and `/api/developments`, then submitted
a judged reading and posted a report. The reports' scores, stories and
judgements match the rows. Judgements: 766 opened a new development (Trump's
reported rejection of Iran's 7-day Hormuz offer, where 742 is the offer
itself); 767 was placed on 742 because its sentence leads with the offer;
768–770 were placed on 766. All of these are defensible against the record
each run was shown.

**Flagged: 06:03 (769), 07:03 (770), 08:03 (771).** Observations, one timeline:
- 06:03:27.098 — fetched `/api/prompt`. No `/api/instructions` fetch before it
  in this run.
- 06:03:51.175 — `POST /api/readings/prepare` → 410, caller token.
- 06:03:53.905 onwards — fetched `/api/instructions` and `/api/developments`
  twice; reading 769 stored at 06:04:07, judged; report linked. The report
  says "the old /prepare step returned a removal notice; followed current
  instructions instead."
- 07:03:17.295 — fetched `/api/prompt`. No `/api/instructions` fetch before it.
- 07:03:44.805 — `POST /api/readings/prepare` → 410, caller token.
- 07:03:47.739 onwards — fetched `/api/instructions` and `/api/developments`;
  reading 770 stored at 07:03:53, judged. The report says "the first
  instructions fetch came via a summarizing tool and was stale. Re-fetched raw
  instructions and followed the current workflow."
- 08:03:13.431 — fetched `/api/prompt`. No `/api/instructions` fetch before it.
- 08:03:33.093 — `POST /api/readings/prepare` → 410, caller token.
- 08:03:33.402 — reading 771 stored 309 ms later, unjudged ("no judgement
  sent"), with no `/api/developments` fetch in the run.
- 08:03:37.575 and 08:03:40.912 — two fetches of `/api/instructions`, then a
  report at 08:03:47. It says the run "first followed a summarized copy of the
  instructions that described a now-removed prepare step and omitted judging."

**Established:** in all three flagged runs, the pre-#144 workflow was being
followed before any request for `/api/instructions` reached this server. The
Routine's prompt (read in its trigger record) is one line: "Follow" the
instructions URL, with the caller token in the query and nothing about a
prepare step. Any request to that URL carries the token, so it would have been
recorded. So the stale copy did not come from this server during those runs.
In the three clean runs, the first recorded request of the run was an
`/api/instructions` fetch.

**Established:** the 410 worked partly. Runs 06:03 and 07:03 recovered within
the run and submitted judged readings. Run 08:03 had already submitted without
a judgement 0.3 s after the 410.

**Hypothesis (open, supported):** the caller's fetch tool served a cached
pre-#144 copy of the Routine's fixed instructions URL, without a request
reaching this server. Evidence for it: the missing fetch records above; two
reports describing a stale "summarized copy"; and the same tool serving other
sites' pages from old copies in this window (run 7: "CNN homepage (served stale
Feb cache)", run 9: "NPR section page returned a stale April cache"). Evidence
it has not met: nothing on the caller's side can be seen from here. It also has
not explained why the clean runs 03:03–05:03 fetched from the origin while the
three runs after them did not. Other candidates that stay open: memory carried
between runs, or a copy held by the Routine environment. The withdrawn
2026-09-25 hypothesis named the same mechanism without evidence; this entry
has records it did not have, and the status stays open until the test below.

**Effect on the page.** Reading 771's history point reports development 766, by
the inheritance rule, so this time the unjudged reading was grouped correctly.
Observed without explanation: the history points for 765 and 771 (both
unjudged) carry `story` null while their root, 766, is `iran-war`.

**Friction (observations).** Every run searched a prediction market and found
no usable one-day move. The fetch tool served stale pages for CNN and NPR (runs
7 and 9). NPR, NBC and Detroit News refused by robots rules (run 7).
Wikipedia's current-events page was refused twice (runs 9 and 10).

**Proposed, for the owner.** The cheapest confirmation is to make the Routine's
URL unique per run, since a cache keyed on the URL cannot answer a URL it has
never seen. The prompt would say to fetch the instructions URL with
`&run=<current UTC time>` appended. If the stale runs stop, and every run's
first record is an instructions fetch, the hypothesis is confirmed. If a stale
run still has no instructions fetch before its first action, the cause is not
a URL cache. The review has not changed the Routine.

**Open questions.** Does a per-run URL end the stale runs? Why do unjudged
history points carry a null `story`?
