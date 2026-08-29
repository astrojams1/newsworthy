# Newsworthy

The news anti-app. It does not give you the news. It gives you a number out of 10
and one sentence saying why.

A model checks the current top headlines every four hours by default, rates how
worthwhile it is to look at the news right now on a deliberately harsh 1–10 scale,
and writes one line of justification. That is the entire product surface.

```
                              4
                             /10

           Major chipmaker halted a fab; expect
              hardware price moves within weeks.

                    Updated 3 minutes ago
```

## Run it

```bash
npm install
cp .env.example .env      # add ANTHROPIC_API_KEY and DATABASE_URL
npm start                 # http://localhost:3000
```

Readings live in Postgres. Locally, point `DATABASE_URL` at any Postgres — or run
`vercel env pull .env` to borrow the deployed one. The schema creates itself on
first use; `npm run migrate` does it explicitly.

Run as an ordinary server and it rates once on startup (if the last reading is
stale), then on the wall clock at :00, :15, :30 and :45. On Vercel there is no
long-lived process, so Vercel Cron calls `/api/cron` instead — see below.

`/healthz` reports whether the database, the API key and the cron secret are
actually wired up. Start there when a deploy misbehaves.

## What it looks like

| Route | What's there |
|---|---|
| `/` | The number, the sentence, nothing else |
| `/admin` | Timeseries of the score, run log, prompt versions, "rate now" |
| `/api/current` | `{ score, explanation, created_at, source, basis, window }`, plus `score_from` when the score is not the newest reading's. No countdown: an external caller can post at any moment, so the next update is not predictable |
| `/api/admin/history?hours=168` | Points, stats, recent attempts, refused submissions, prompt versions |
| `/api/admin/prompts` | Every prompt version, full text |
| `/api/admin/settings` | `GET` the model/cadence and the priced options; `POST` to change them |
| `/api/admin/readings/:id/void` | `POST` to retire a reading — status becomes `error`, the slot is released, and `?reason=` is recorded |
| `/api/admin/readings/:id/usage` | `POST` corrected token counts to reprice a reading whose rating is sound but whose usage was not; omitted fields are cleared and the cost is recomputed from what survives |
| `/api/instructions` | The whole caller workflow, rating prompt embedded — hand an agent this URL |
| `/api/prompt` | Just the current versioned prompt, as JSON |
| `/api/readings` | `POST` a reading from an external caller agent |
| `/api/openapi.json` | The two caller endpoints as an OpenAPI schema, for a ChatGPT Custom GPT Action. Unauthenticated on purpose — it describes a token-gated API without containing a token, and a schema importer cannot present one |
| `/api/cron` | The scheduled job — runs only if nothing arrived within the interval. Vercel Cron `GET`s it; admin "Rate now" `POST`s with `?force=1` |
| `/healthz` | Liveness, plus whether the database, API key and cron secret are wired up |

Set `ADMIN_TOKEN` to lock the admin routes. Pass it as `?token=…` once (the page
remembers it) or as an `x-admin-token` header. **Unset, the admin view is open to
anyone** — the server warns about this on boot.

## What gets logged

Every attempt writes a Postgres row, including failures, so gaps in the chart are
visible rather than silent. Each row carries:

| Column | Why it's there |
|---|---|
| `score`, `explanation` | The reading |
| `prompt_version`, `prompt_hash`, `prompt_text` | Which prompt produced it — version, a SHA-256 of the exact text sent, and that text |
| `model`, `served_by` | The model requested, and the model that actually answered |
| `raw_output` | The model's verbatim final text, before parsing |
| `status`, `error`, `latency_ms`, `input_tokens`, `output_tokens` | Run health |
| `slot` | The interval window this reading claims — the dedup key (see Deploying) |
| `cost_usd` | Estimated cost, priced at write time from this run's own usage |
| `cache_read_tokens`, `cache_write_tokens`, `web_search_requests` | The rest of the billable usage |

Storing the hash *and* the text means a historical reading stays traceable even if
`src/prompts.js` is later edited by mistake.

## What a run costs

Every run is priced from its own token usage and stored on the row, so a
historical reading keeps the price that actually applied. Web search is billed
on top of tokens at **$10 per 1,000 searches**; a typical run does 2–6.

A measured production run on Opus 5 — 40,163 input tokens, 863 output, 4
searches — cost **$0.2624**. Roughly:

| Model | Per run | Every 15 min | Every 4 hours |
|---|---|---|---|
| Opus 5 | ~$0.26 | ~$767/mo | **~$48/mo** |
| Sonnet 5 | ~$0.17 | ~$507/mo | ~$32/mo |
| Haiku 4.5 | ~$0.08 | ~$247/mo | ~$15/mo |

Input dominates, because search results land in the context window. **The
default is four-hourly** for that reason. The admin page shows spend for the
selected range, cost per run, and a projected monthly figure; these are
estimates, and your invoice is the source of truth.

## Letting another agent do the rating

A run costs real money, and the work is not specific to this app. Any agent can
do the rating with its own model and post the result. Hand it one URL:

```
Follow https://your-deployment.vercel.app/api/instructions?token=$CALLER_TOKEN
```

`/api/instructions` returns the whole workflow as plain text with the current
rating prompt embedded, so there is nothing to paste into the agent and nothing
to keep in sync. It is generated from the live prompt registry, so a new prompt
version updates every caller automatically.

Deliberately `text/plain`, not `text/markdown` — an agent's fetch tool rejected
the markdown MIME type before exposing the body, and then, never having read the
instructions, could not discover the submission path it was capable of.
`?format=json` returns the same text in a JSON envelope.

Submission is `POST /api/readings`, or the same fields as a query string on a
plain `GET` for a client that cannot send a body or set headers.


A submission is two fields: score and explanation. `source` is set server-side
to `external`; a caller cannot name itself, and neither model, caller name nor
token counts are stored. All of those were asked for once and all were
self-reported, so all of it was recorded as fact without being checkable — an
agent inside a harness has no token counter and will estimate if asked, and a
guessed 85,000 input tokens is $0.48 of invented spend at Opus rates. Model,
usage and cost are recorded only for runs this app makes itself. Anything else
the request carries is ignored, and the response names the fields that went
nowhere.

`/admin` still separates the two: `stats()` sums `spend_usd` over this app's own
runs only, and counts external readings alongside it as `external_runs`, shown
as a count marked *unpriced* rather than a second spend figure — there is no
external spend to report, by the same design.

**And it suppresses the next cron run.** The scheduler only rates when nothing
has arrived within the configured interval, so a reading posted by an agent is
one this app does not pay for. `skills/newsworthy-rating/SKILL.md` is the
caller-side skill, ready to install in another agent.

Both endpoints also accept `?token=`, and a reading can be submitted by `GET`
with query parameters, for agents whose HTTP client cannot set headers or send
a body. Validation is identical either way.

Nothing in the request is trusted: the score is range-checked, strings are
trimmed and capped, and the prompt hash and text are taken from this app's own
registry rather than the payload.

## Changing the model and cadence

`/admin` → **Settings**. Both are stored in the database and take effect on the
next tick — no redeploy. The picker shows the cost of each pairing before you
commit to it.

Vercel Cron ticks every 15 minutes (`vercel.json`); the configured interval is
enforced by the slot, so ticks inside an interval find the slot already rated
and return without calling the model. Intervals are therefore multiples of 15
minutes, from 15 up to a day. To rate *more* often than every 15 minutes,
change the cron schedule itself.

Only models in `src/pricing.js` are selectable — an allowlist, so a typo in a
request body cannot point the job at an arbitrary or unpriced model.

## Changing the prompt

Prompts are append-only. Never edit a published version in place — add the next one:

```js
// src/prompts.js
const REGISTRY = {
  1: { version: 1, label: 'harsh-calibration-v1', added: '2026-08-23', instructions: …, outputContract: … },
  2: { version: 2, label: 'harsher-v2',           added: '2026-09-01', instructions: …, outputContract: … },
};
```

New readings use the highest version automatically; pin one with
`NEWSWORTHY_PROMPT_VERSION=1`. Old rows keep pointing at the prompt that made them,
so the admin chart can be read across a prompt change without lying to you.

### The v1 output contract

The rating instructions you supply end with *"output only the number and /10."*
Newsworthy also shows one line of reasoning, so each version pairs its instructions
with a short output contract that overrides that last sentence and asks for
`{"score", "explanation"}`. The contract is versioned and hashed alongside the
instructions — it is part of the prompt, not something bolted on at call time.

## Model

`claude-opus-5` with the server-side `web_search` tool, adaptive thinking, and
`effort: medium`. Server-side refusal fallbacks are on, and the call degrades to
the non-beta endpoint if that beta isn't enabled for the account. Override with
`NEWSWORTHY_MODEL`. The response parser is deliberately forgiving: it takes the
JSON contract, a fenced block, or a bare `7/10`.

## Deploying to Vercel

The app runs as a normal Node HTTP server; Vercel's Node runtime captures the
`listen()` call and serves `src/server.js` as the entrypoint. `vercel.json`
already sets the cron schedule, the function timeout and the static-file
bundling.

Set four environment variables in **Settings → Environment Variables**:

| Variable | |
|---|---|
| `ANTHROPIC_API_KEY` | Your key. Without it every rating fails. |
| `DATABASE_URL` | Added for you by **Storage → Neon Postgres**. Nothing to type. |
| `CRON_SECRET` | Any random string ≥16 chars. Vercel sends it as `Authorization: Bearer …` on every cron call, and `/api/cron` rejects anything else. **Required on Vercel** — with neither this nor `ADMIN_TOKEN` set, `/api/cron` refuses to run rather than leave an unauthenticated endpoint spending your API budget. |
| `ADMIN_TOKEN` | Locks `/admin`. |

`DATABASE_URL` is not an ordinary variable you type — it comes from
**Storage → Create Database → Neon**. On its *Connect a Project* page:

| Field | Value | Why |
|---|---|---|
| Environments | Production ✓, Preview ✓, Development ✗ | Production runs the cron. Development would point a laptop at the live timeseries. |
| Create database branch → Production | unchecked | Production belongs on the main branch. |
| Create database branch → Preview | checked | Preview deploys get an isolated copy and cannot write junk scores into the real chart. |
| Custom Prefix | **leave empty** | Empty yields `DATABASE_URL`. Typing the placeholder `STORAGE` yields `STORAGE_URL`, which nothing reads. |
| Sensitive | on | Runtime is unaffected; it only stops `vercel env pull` from fetching the value. |

**Every one of these only takes effect on a deployment built after it is set.**
Environment variables are baked in at build time, not read live, so adding a
variable or connecting a store to a project that is already deployed changes
nothing until you redeploy.

### Which branch deploys

Vercel picks the production branch when the project is imported: `main` first,
then `master`, then the repository default. A repo whose only branch is a
feature branch gets that one, and it does not follow along when `main` appears
later. Change it under **Settings → Environments → Production → Branch
Tracking** — not Settings → Git, where it used to live. Every other branch
still builds, as a preview deployment.

`/healthz` reports `git_branch` and `git_commit`, so you can see which commit
is actually serving rather than inferring it from the deployment list.

Then confirm with `/healthz` — it names anything still missing, and lists the
Postgres variable names it can see, which distinguishes "no database" from
"database under a name we don't read". Watch the job under **Settings → Cron
Jobs → View Logs**.

### Why the cron endpoint, and not a timer

A serverless function is frozen between requests, so an in-process
`setInterval` would never fire. `vercel.json` schedules `*/15 * * * *` against
`/api/cron` instead. Per-minute schedules need a Pro plan — Hobby rejects
anything more frequent than daily *at deploy time*.

Vercel documents cron delivery as best-effort: a run can be **missed, or
delivered twice**. So each reading claims a 15-minute `slot`, and a partial
unique index (`ratings (slot) WHERE status = 'ok'`) lets the database — not
optimism — enforce one reading per slot. A duplicate delivery short-circuits
before it spends an API call. Failures are written with `slot = NULL`, so a
failed run never blocks a retry of the same slot, and manual "Rate now" runs
also carry no slot and never collide.

### Self-hosting instead

`npm start` on Fly / Render / a VPS needs none of the above: the in-process
scheduler runs, and only `ANTHROPIC_API_KEY` and `DATABASE_URL` are required.

## Configuration

| Variable | Default | |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required for live ratings |
| `PORT` | `3000` | |
| `DATABASE_URL` | — | Postgres connection string (`POSTGRES_URL` also accepted) |
| `NEWSWORTHY_MODEL` | `claude-opus-5` | Fallback only — the admin setting wins |
| `NEWSWORTHY_PROMPT_VERSION` | latest | Pin a prompt version |
| `NEWSWORTHY_INTERVAL_MINUTES` | `240` | Fallback only — the admin setting wins |
| `NEWSWORTHY_NO_SCHEDULER` | — | `1` to serve without the in-process scheduler (automatic on Vercel) |
| `CRON_SECRET` | — | Required bearer token for `/api/cron`; set automatically by Vercel Cron |
| `CALLER_TOKEN` | — | Lets an external agent use `/api/instructions`, `/api/prompt` and `/api/readings` without the admin token |
| `NEWSWORTHY_MOCK` | — | `1` to fake readings without calling the API |
| `ADMIN_TOKEN` | — | Locks `/admin` and `/api/admin/*` |

## Tests

```bash
npm test
```

Covers score parsing (JSON, fenced, bare `N/10`, out-of-range, missing
explanation), prompt versioning and hash stability, slot arithmetic, and the
logging layer — including the duplicate-delivery guarantee. Database tests run
against PGlite, real Postgres in-process, so the SQL is exercised rather than
mocked. No cloud database needed to run them.
