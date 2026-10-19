# Caller trial ledger

Trials of candidate models as the hourly caller. Run the
[repository skill](../../.agents/skills/newsworthy-caller-trial/SKILL.md) to start
or review one. Entries are append-only: a later entry that corrects an earlier
one says so in its own text. How a trial is kept off the page is in
[caller trials](../caller-trials.md). Tokens never appear here.

The live caller is the Routine `trig_016SyC1SeVmdenHGg9gPRymC` "Update
newsworthy", on `claude-opus-5-5`, with no connectors.

| Trial | Model | Cohort | Routine | Window (UTC) | State | Outcome |
|---|---|---|---|---|---|---|
| [haiku-5-5](#2026-10-12-haiku-5-5) | `claude-haiku-5-5` | `haiku-5-5` | `trig_01JHFRYP3budVuZZKfZb3zVr` | 2026-10-12 → 10-13 14:03 | disabled | Not promoted: missed the lead story |
| [sonnet-5-5](#2026-10-12-sonnet-5-5) | `claude-sonnet-5-5` | `sonnet-5-5` | `trig_01Xiqc8TrBSALzeRWD8s8Me9` | 2026-10-12 → 10-15 16:19 | disabled | Not promoted: uneven story agreement, a missed shock |

Both cohorts are still in `TRIAL_CALLERS` on Vercel; their tokens authenticate
until the entries are removed.

## Lessons

- **2026-10-15: measure cost, don't estimate it.** The Sonnet estimate was
  $0.61 a run and the measured cost $0.22–0.23: its cache reads cost half what
  the estimate assumed. Take `cost_usd` from several sessions of each Routine.
- **2026-10-15: read the result by day.** Sonnet's story agreement was 22 of
  24 hours one day and 7 of 16 the next; the aggregate hid it.
- **2026-10-15: one missed shock outweighs the averages.** Sonnet was within
  a point of Opus 90% of the time and still missed the 8% fall in the Korean
  index the live caller led with.
- **2026-10-13: connectors are context.** The live Routine's two unused
  connectors carried 80K–86K tokens into every request where a bare Routine
  carries ~44K. Removing them cut the live caller's cost from $0.76–0.96 to
  $0.60–0.61 a run. Compare a trial against a connector-free live Routine.
- **2026-10-12: the harness context is most of the cost.** About three
  quarters of an Opus run is the harness's own context, cached and re-read
  every turn, so splitting a run's steps across cheaper models saves little.

## 2026-10-12 haiku-5-5

Recorded after the fact from [caller trials](../caller-trials.md#trial-1-haiku-55-2026-10-12-to-2026-10-13),
before this skill existed. Started 2026-10-12 beside the old live task
`trig_01LSi4KHmBYFTYYENJB2diXg`, which carried two connectors; no pass bar was
written down. First run $0.031; later runs $0.02–0.03.

**Closed 2026-10-13 14:03 UTC by the owner.** Haiku often missed the hour's
lead story: on 13 October it reported the one the live caller led with in 1
of 11 hours. Its sentences were stale or vague. The Routine is disabled.

## 2026-10-12 sonnet-5-5

Recorded after the fact from [caller trials](../caller-trials.md#trial-2-sonnet-55-2026-10-12-to-2026-10-15),
before this skill existed. Started 2026-10-12; no pass bar was written down.
The live caller moved to the connector-free Routine on 2026-10-13, mid-trial.

**Closed 2026-10-15 16:19 UTC by the owner.**
- 81 readings over 12–15 October. Score within one point of the live caller
  90% of the time, exact 37%, averaging 0.46 higher.
- Story agreement 22 of 24 paired hours on 14 October and 7 of 16 on 15
  October.
- On 15 October it missed the 8% fall in the Korean index that the live
  caller led with.
- Measured $0.22–0.23 a run against $0.60–0.61 for the live caller.

Opus 5.5 kept. The Routine is disabled.
