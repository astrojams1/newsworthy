---
name: newsworthy-caller-trial
description: Trial a new model as the hourly caller, end to end — a sibling Routine on the same schedule and instructions, its readings stored apart and never shown, a measured cost, a daily comparison against the live caller, and a recorded decision to promote or stop. Use when a new Claude model is available, or when asked to test, compare or replace the caller's model. The owner makes the decision; the skill gathers the evidence and carries it out.
---

# Newsworthy caller trial

**Run a candidate model beside the live caller, on the same news, hour by hour, before the live caller changes.** A
model is only worth switching to if it reads the news as well as the one it replaces.

Done means: the owner decided on a full window's evidence, the decision is carried out, and the ledger has the
closing entry.

The server keeps a trial's readings off the page by its token.

## Where things are

| What | Where |
|---|---|
| Ledger | [the caller trial ledger](../../../docs/caller-trials/ledger.md) |
| How trials work, and the first two (Haiku 5.5 and Sonnet 5.5, October 2026) | [caller trials](../../../docs/caller-trials.md) |
| Background and the admin-token rule | [AGENTS.md](../../../AGENTS.md), "The caller is the judge" |
| The comparison | `scripts/trial-compare.mjs` |
| Live Routine's trigger id | the ledger table and `docs/caller-trials.md` |

Work from the repository root, on a branch from the fetched `origin/main`.

## A run

1. **Read** `docs/caller-trials.md` and the "caller is the judge" and admin-token sections of `AGENTS.md`.
2. **Start from the ledger.** Its lessons are what earlier trials got wrong. Its table says which trials are running,
   so a new one doesn't reuse a cohort name or token still in `TRIAL_CALLERS`. Read the live Routine with
   `get_trigger`. The trial copies its model, schedule, prompt and connectors, except the model and token.
3. **Plan**, then wait for the owner's go-ahead ([1. Plan](#1-plan)).
4. **Set up** and verify ([2. Set up](#2-set-up)).
5. **Measure cost** ([3. Cost](#3-cost)).
6. **Review** at each check-in ([4. Review](#4-review)).
7. **Carry out the owner's decision** ([5. Decide](#5-decide)).

### 1. Plan

- **Model.** Confirm the exact model id and its rate card with the `claude-api` skill, never from memory. Note any
  prompt-length price step. Haiku 5.5 doubled its rates above 100K tokens.
- **Cohort name.** `<family>-<version>`, for example `sonnet-5-5`. Lower case, matching `^[a-z0-9][a-z0-9.-]*$`. A
  malformed entry authorizes nothing.
- **Window.** At least three full days, covering a US trading session and a weekend. One day is not a result. Sonnet
  agreed on the story 22 of 24 hours on one day and 7 of 16 the next.
- **Pass bar.** Write it in the ledger entry before the first reading. These defaults came from the first two
  trials. The owner may set others.
  - Score within one point of the live caller on at least 90% of paired hours.
  - The same development as the live caller on most paired hours **every day**, not just on average.
  - No missed shock. That is no hour where the live caller scored 6 or more and the trial reported a different
    development or scored two or more lower. The exception is when reading both sentences against the news shows
    the live caller was wrong.
  - Prompt verified and judgement accepted at the live caller's rate. No more sentence-contract flags than the live
    caller.
  - Then cost. A cheaper model that fails the bars above is not a saving.
- **Ask.** Tell the owner the plan, the pass bar and the estimated added spend while both run (see Cost). Wait for
  their go-ahead before creating anything.

### 2. Set up

1. **Token.** `echo "trial-$(openssl rand -hex 16)"`. It goes into two places only: the Vercel variable and the
   Routine prompt. Never put it in a file, commit, log, PR or ledger.
2. **Server.** Add `<cohort>=<token>` to the production `TRIAL_CALLERS` variable on Vercel, comma-separated beside any
   running trial. Use the Vercel connector's environment tools without decrypting or printing other variables, or ask
   the owner to add it. Then redeploy production, because a running deployment doesn't see a changed variable. A push
   to `main` also redeploys.
3. **Check the token.** `curl -s -o /dev/null -w '%{http_code}' -H
   "x-newsworthy-token: $TOKEN" https://newsworthy-indol.vercel.app/api/instructions` answers 200. Then
   `/api/admin/history` lists that read under `trial:<cohort>` in `caller_fetches`. A 401 means the entry is malformed
   or the deployment predates it.
4. **Routine.** `create_trigger` with:
   - the name "Update newsworthy (<Model> trial)";
   - the live Routine's cron;
   - the live Routine's prompt, unchanged except for the token;
   - `create_new_session_on_fire: true`;
   - `connectors: []`;
   - `notifications: {}`;
   - the live Routine's environment (the Cowork cloud environment; find its id with `list_environments`).

   `create_trigger` takes no model, so set it straight after with `update_trigger` and `model`. No Routine sets an
   effort level. Don't add one, or the trial measures a different setup from the live caller. If a permission check
   blocks the create, ask the owner rather than work around it.
5. **Verify.**
   - **Configuration.** `get_trigger` shows the model, the cron, no connectors, push off and the prompt with the trial
     token.
   - **One run end to end.** Run it once with `fire_trigger`. When it finishes:
     - `node scripts/trial-compare.mjs --cohort <cohort> --hours 2` shows a verified, judged trial reading and a
       linked run report;
     - `/api/current` is unchanged;
     - `get_session` on the run's `last_run.session_id` gives `usage.cost_usd`.
6. **Check-ins.** Schedule a first review a day out and the final review at the end of the window. Use `send_later`,
   or a one-shot `create_trigger` that runs this skill in a fresh session.
7. **Record.** Append the trial's opening entry to the ledger: model id, cohort, trigger id, start time, window, pass
   bar and first-run cost. Ship it as a PR, as `AGENTS.md` says.

### 3. Cost

Measure cost. An estimate is only for the plan. `get_session` on a run's session reports `usage.cost_usd` at list
prices. Take it from at least five runs of each Routine across the window, not one. Take the live caller's from runs
in the same hours.

- **Most of a run's cost is the harness's own context.** It is written to cache once and read back every turn, about
  three quarters of an Opus 5.5 run. A cheaper model lowers that part only as far as its cache prices fall.
- **Price cache reads and writes from the rate card**, not as a fixed multiple of another model's. The Sonnet
  estimate was $0.61 and the measured cost $0.22–0.23, because its cache reads cost half what the estimate assumed.
- **Connectors are context.** The live caller's two unused connectors cost a fifth to a third of every run until they
  were removed. The trial has none. Compare it against a connector-free live Routine, or say the comparison is
  unequal.
- **Report** per run, per month (730 runs), and the added daily spend while both run. The figures are list prices.
  How a Routine is billed depends on the account.

### 4. Review

Read the admin token as `AGENTS.md` says. Pass it only through the environment:

```
ADMIN_TOKEN=$(op read "op://API Tokens/Newsworthy admin/password") \
  node scripts/trial-compare.mjs --cohort <cohort> --hours <since start>
```

It prints the summary, a line per UTC day and the largest disagreements. Then it prints every hour side by side with
the caller review's sentence flags. For each review:

- **Day by day.** Check each day against the pass bar. A good total over a bad day is a bad day.
- **Largest disagreements.** For each one, read both sentences against that hour's news. Say which caller had it
  right, or that it can't be told. Agreement measures likeness to the live caller, not correctness.
- **Run reports.** Read the trial's: what it searched, what refused, why it chose its story. A trial that skips steps
  the live caller takes is a finding, even when its score agrees.
- **Cost.** Add the sessions measured since the last review.
- **Observations apart from hypotheses**, as the caller-review skill does. A cause the stored evidence doesn't
  establish is "unknown".

Append a review entry to the ledger after each review. Tell the owner the figures and what they suggest. Don't decide
for them.

### 5. Decide

The owner decides, on the final review. Then:

- **Stop.** Disable the trial Routine with `update_trigger`, `enabled: false`. Disable it, don't delete it, so its run
  history stays. Remove its entry from `TRIAL_CALLERS` (the variable itself when no trial is left) and redeploy.
  Until then its token still authenticates. The trial tables stay as the record.
- **Promote.** Change the live Routine's model with `update_trigger` and `model`. It keeps its id, schedule, prompt,
  token and push. Then stop the trial as above. Then wait for the first live run on the new model to be
  stored and verified. Check README, `AGENTS.md`, `docs/caller-trials.md` and `public/llms.txt` for the old model
  named as the caller's.
  Correct them in the closing PR with the copy-review skill. The pricing table describes this app's own runs, not the
  caller's, so it doesn't change.

## Rules

- **The owner decides.** The skill gathers the evidence and carries out the decision.
- **The token stays secret.** It lives only in the Vercel variable and the Routine prompt.
- **Measure, don't estimate.** Cost comes from measured sessions.

## Ledger

[The ledger](../../../docs/caller-trials/ledger.md) is append-only. Each trial has an opening entry, one per review
and a closing one. The closing entry records:

- the decision and who made it;
- the measured cost on both sides;
- what was disabled and removed;
- any lesson for the next trial.

Update the trial's row in the table. When a trial shows a step of this skill to be wrong, add a dated lesson, then
correct the step. Ship each ledger change as a PR, as `AGENTS.md` says.
