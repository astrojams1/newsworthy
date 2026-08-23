# Newsworthy

The news anti-app. It does not give you the news. It gives you a number out of 10
and one sentence saying why.

A model checks the current top headlines every 15 minutes, rates how worthwhile it
is to look at the news right now on a deliberately harsh 1–10 scale, and writes one
line of justification. That is the entire product surface.

```
                              4
                             /10

           Major chipmaker halted a fab; expect
              hardware price moves within weeks.

                Rated 3 minutes ago · next in 12 min
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
| `/api/current` | `{ score, explanation, created_at, next_update_minutes }` |
| `/api/admin/history?hours=168` | Points, stats, recent attempts, prompt versions |
| `/api/admin/prompts` | Every prompt version, full text |
| `/api/cron` | The 15-minute job. Vercel Cron `GET`s it; admin "Rate now" `POST`s with `?force=1` |
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
| `slot` | The 15-minute window this reading claims — the dedup key (see Deploying) |

Storing the hash *and* the text means a historical reading stays traceable even if
`src/prompts.js` is later edited by mistake.

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

Then redeploy. Confirm with `/healthz`, and watch the job under
**Settings → Cron Jobs → View Logs**.

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
| `NEWSWORTHY_MODEL` | `claude-opus-5` | |
| `NEWSWORTHY_PROMPT_VERSION` | latest | Pin a prompt version |
| `NEWSWORTHY_INTERVAL_MINUTES` | `15` | |
| `NEWSWORTHY_NO_SCHEDULER` | — | `1` to serve without the in-process scheduler (automatic on Vercel) |
| `CRON_SECRET` | — | Required bearer token for `/api/cron`; set automatically by Vercel Cron |
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
