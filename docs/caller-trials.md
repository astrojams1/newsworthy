# Caller trials

A trial runs a candidate caller beside the live one, and several can run at
once. It uses the same API and
the same instructions, and its readings are never shown. The goal is to compare
the two on the same news, hour by hour, before replacing the live caller.

No trial is running. Two ran from 2026-10-12 and both were stopped; the live
caller stays on Opus 5.5 (see [Decision](#decision)). Run a new trial with the
[caller trial skill](../.agents/skills/newsworthy-caller-trial/SKILL.md); each
trial from now on is recorded in its [ledger](caller-trials/ledger.md), not
here.

## How a trial reading is kept off the page

The server decides by token, not by anything the caller sends. Each trial has
its own token, configured in `TRIAL_CALLERS` as comma-separated `name=token`
pairs (`haiku-5-5=…,sonnet-5-5=…`). A request carrying one reads
`/api/instructions`, `/api/prompt` and `/api/developments` like the live
caller. Its `POST /api/readings` and `POST /api/runs` are stored in
`trial_readings` and `trial_runs`, not `ratings` and `caller_runs`, under the
trial's name (`cohort`). A run report links only to its own trial's reading. A trial reading is validated and judged exactly as a live
one, against the live record. It proposes no merge, sends no push, does not
suppress the cron and is in no history, chart or board. Its proposed
`same_story` is kept as data. The response says `"trial": true` and names the trial.

Separate tables rather than a flag on `ratings`: some twenty queries read
`ratings`, and one that forgot the flag would put the candidate on the front
page. Authenticated reads with a trial token are logged as `trial:<name>`, so the
caller review can tell them from the live caller's. Rows stored before trials
had names all came from the Haiku trial and are filed under `haiku-5-5`.

## Review

```
ADMIN_TOKEN=… node scripts/trial-compare.mjs --hours 72
```

It reads `GET /api/admin/trials` and prints, for each trial (`--cohort` picks
one), the agreement summary and each hour side by side, with the caller review's flags (unverified prompt,
unjudged, over 135 characters, outlet named, market forecast, agentless
passive). Each trial reading is paired with the live reading nearest in time
within 30 minutes; an hour with no live reading is left unpaired. Judgements
agree when both name the same development. A trial that names the live
reading's newly opened development counts as agreeing with "new", because the
trial usually reads the record after that hour's live reading is stored.

Agreement measures similarity to the live caller, not correctness. Where the
two disagree, read both sentences against the news. Read the trial's run
reports too: they say what it searched and why it chose its story.

Cost comes from the Routine sessions themselves, not from this app, which
records no usage for external readings. `get_session` on a run's session (the
trigger's `last_run.session_id`) reports `usage.cost_usd` at list prices.

## The live caller

| | |
|---|---|
| Routine | `trig_016SyC1SeVmdenHGg9gPRymC` "Update newsworthy" |
| Model | `claude-opus-5-5` |
| Schedule | `2 * * * *` |
| Token | `CALLER_TOKEN` |
| Connectors | none; the workflow uses only curl |
| Notifications | push |

It replaced the scheduled task `trig_01LSi4KHmBYFTYYENJB2diXg` on 2026-10-13,
which was deleted. The prompt is unchanged. The old task carried the Vercel
and Claude Code Remote connectors, whose tool definitions rode in every
request without being used: its runs started at 80K–86K tokens of context and
cost $0.76–0.96. Without them the Routine starts at about 44K and costs
$0.60–0.61 a run, roughly $450 a month against ~$650. Add no connector to it.

Most of what remains is the harness's own context, written to cache once and
read back on every turn: about three quarters of a run's cost, whatever the
model. That is why splitting a run's steps across cheaper models saves little.

The trial tables below name the old task as the live Routine, as it was when
each trial started.

## Trial 1: Haiku 5.5 (2026-10-12 to 2026-10-13)

| | Live | Trial |
|---|---|---|
| Routine | `trig_01LSi4KHmBYFTYYENJB2diXg` "Update newsworthy" | `trig_01JHFRYP3budVuZZKfZb3zVr` "Update newsworthy (Haiku 5.5 trial)" |
| Model | `claude-opus-5-5` | `claude-haiku-5-5` |
| Schedule | `2 * * * *` | `2 * * * *` |
| Token | `CALLER_TOKEN` | `haiku-5-5` in `TRIAL_CALLERS` |
| Connectors | Vercel, Claude Code Remote | none; the workflow uses only curl |
| Notifications | push | off |

The prompts are identical except for the token. Both Routines run in the
Cowork cloud environment.

### Cost estimate

Measured on one live run (2026-10-12 04:02 UTC, session
`cse_01NBDaaAjzE4aBgx6diHhzy3`): 18 turns, 1,713 uncached input tokens,
54,113 one-hour cache writes, 1,665,753 cache reads, 5,536 output tokens, no
web-search tool calls (pages are read with curl). That run cost **$0.88** at
list price. Cache writes were 49% of that, cache reads 38% and output 13%.
Each request carried the harness's ~84K-token context before any news; the
last carried ~128K.

Haiku 5.5 has two rate cards, split at a 100K-token prompt: $0.10 / $0.50 per
MTok input / output below it and $0.50 / $2.50 above. Cache reads cost 0.1×
input and one-hour writes 2×. On the same token profile:

| | Per run | Per month (730 runs) |
|---|---|---|
| Opus 5.5, measured | $0.88 | ~$645 |
| Haiku 5.5, every request ≤100K | $0.03 | ~$22 |
| Haiku 5.5, this run's shape (~2/3 of tokens >100K) | $0.11 | ~$81 |
| Haiku 5.5, every request >100K | $0.15 | ~$111 |

That is roughly **$530–$620 a month saved, 83–97%**, about 87% at the central
estimate. Running both during the trial adds about $2.70 a day.

Assumptions: Haiku uses the same tokens and turns as Opus. A weaker model may
take more turns, and token counts differ by tokenizer. Without connectors the
trial's context starts slightly smaller, which favours Haiku a little. The
figures are list prices. How a Routine is actually paid for (plan usage or
dollars) depends on the account. One Opus run is a thin baseline, so the review
should take `cost_usd` from several sessions of each Routine.

The first Haiku run (2026-10-12 05:15 UTC) measured **$0.031**: its requests
ran ~69K–92K tokens, under the 100K step, largely because it carries no
connectors. Later runs measured $0.02–0.03.

### Outcome

Stopped on 2026-10-13 at 14:03 UTC and the Routine disabled. Haiku often
missed the hour's lead story (on 13 October it reported the one the live
caller led with in 1 of 11 hours) and wrote stale or vague sentences.
Its cost was never the question.

## Trial 2: Sonnet 5.5 (2026-10-12 to 2026-10-15)

| | Live | Trial |
|---|---|---|
| Routine | `trig_01LSi4KHmBYFTYYENJB2diXg` | `trig_01Xiqc8TrBSALzeRWD8s8Me9` "Update newsworthy (Sonnet 5.5 trial)" |
| Model | `claude-opus-5-5` | `claude-sonnet-5-5` |
| Schedule | `2 * * * *` | `2 * * * *` |
| Token | `CALLER_TOKEN` | `sonnet-5-5` in `TRIAL_CALLERS` |
| Connectors | Vercel, Claude Code Remote | none |
| Notifications | push | off |

The prompt is the live one but for the token, as with Haiku. No Routine sets
an effort level, and none is recorded in the run logs. At the API, Sonnet 5.5
defaults to `high` where Opus 5.5 and Haiku 5.5 default to `medium`; if the
harness keeps those defaults, Sonnet thinks harder per turn than either.

### Cost

The estimate made at the start was $0.61 a run, about $450 a month. It
assumed Sonnet's cache reads cost the same $0.20 per MTok as Opus's. They do
not: the sessions' `cost_usd` bills them at about $0.10. Measured runs cost
**$0.22–0.23**, about $165 a month, against $0.60–0.61 for the connector-free
Opus Routine: roughly 60% less.

### Outcome

Stopped on 2026-10-15 at 16:19 UTC and the Routine disabled. Over 81 readings
from 12 to 15 October, Sonnet's score was within one point of the live
caller's 90% of the time and the same 37% of the time, averaging 0.46 points
higher. It named the same story far less consistently: 22 of 24 paired hours
on 14 October, 7 of 16 on 15 October. On 15 October it missed the 8% fall in
the Korean stock index that the live caller led with.

## Decision

Opus 5.5 stays the live caller. Haiku was not good enough at finding the
lead story; Sonnet scored close to Opus but missed a market shock and agreed
on the story too unevenly to be trusted with the page. The cheaper lever
turned out to be the live Routine's own connectors (see
[The live caller](#the-live-caller)). Both trial Routines are disabled, not
deleted, and the trial tables stay as the record. `TRIAL_CALLERS` is still
set on Vercel, so the two trial tokens still authenticate; remove it to retire
them.

To promote a candidate in a future trial, change the live Routine's model
rather than switching Routines: it keeps its id, schedule, token and push.
Then disable the trial Routines and remove their entries from `TRIAL_CALLERS`
(the variable itself when no trial is running). If no candidate is good
enough, disable the trial Routines and leave the live one alone. The
[caller trial skill](../.agents/skills/newsworthy-caller-trial/SKILL.md) has
each step.
