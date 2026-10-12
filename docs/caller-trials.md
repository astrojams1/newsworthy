# Caller trials

A trial runs a candidate caller beside the live one. It uses the same API and
the same instructions, and its readings are never shown. The goal is to compare
the two on the same news, hour by hour, before replacing the live caller.

## How a trial reading is kept off the page

The server decides by token, not by anything the caller sends. A request
carrying `TRIAL_CALLER_TOKEN` reads `/api/instructions`, `/api/prompt` and
`/api/developments` like the live caller. Its `POST /api/readings` and
`POST /api/runs` are stored in `trial_readings` and `trial_runs`, not `ratings`
and `caller_runs`. A trial reading is validated and judged exactly as a live
one, against the live record. It proposes no merge, sends no push, does not
suppress the cron and is in no history, chart or board. Its proposed
`same_story` is kept as data. The response says `"trial": true`.

Separate tables rather than a flag on `ratings`: some twenty queries read
`ratings`, and one that forgot the flag would put the candidate on the front
page. Authenticated reads with the trial token are logged as `trial`, so the
caller review can tell them from the live caller's.

## Review

```
ADMIN_TOKEN=… node scripts/trial-compare.mjs --hours 72
```

It reads `GET /api/admin/trials` and prints the agreement summary and each
hour side by side, with the caller review's flags (unverified prompt,
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

## Trial 1: Haiku 5.5 (from 2026-10-12)

| | Live | Trial |
|---|---|---|
| Routine | `trig_01LSi4KHmBYFTYYENJB2diXg` "Update newsworthy" | `trig_01JHFRYP3budVuZZKfZb3zVr` "Update newsworthy (Haiku 5.5 trial)" |
| Model | `claude-opus-5-5` | `claude-haiku-5-5` |
| Schedule | `2 * * * *` | `2 * * * *` |
| Token | `CALLER_TOKEN` | `TRIAL_CALLER_TOKEN` |
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

### Decision

If Haiku is good enough: disable `trig_01LSi4KHmBYFTYYENJB2diXg`, then put
`CALLER_TOKEN` in place of the trial token in the Haiku Routine's prompt and
re-enable push. From then on its readings are live. Delete
`TRIAL_CALLER_TOKEN` from Vercel when no trial is running; the tables stay as
the record of the trial. If Haiku is not good enough, disable the trial
Routine and leave the live one alone.
