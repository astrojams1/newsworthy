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
cp .env.example .env      # add your ANTHROPIC_API_KEY
npm start                 # http://localhost:3000
```

The server rates once on startup (if the last reading is stale), then on the wall
clock at :00, :15, :30 and :45. Readings land in SQLite at `./data/newsworthy.db`.

No API key handy? `npm run rate:mock` writes a fake reading so you can see the
plumbing work, and `NEWSWORTHY_MOCK=1 npm start` runs the whole app on fake data.

## What it looks like

| Route | What's there |
|---|---|
| `/` | The number, the sentence, nothing else |
| `/admin` | Timeseries of the score, run log, prompt versions, "rate now" |
| `/api/current` | `{ score, explanation, created_at, next_update_minutes }` |
| `/api/admin/history?hours=168` | Points, stats, recent attempts, prompt versions |
| `/api/admin/prompts` | Every prompt version, full text |
| `/healthz` | Liveness |

Set `ADMIN_TOKEN` to lock the admin routes. Pass it as `?token=…` once (the page
remembers it) or as an `x-admin-token` header. **Unset, the admin view is open to
anyone** — the server warns about this on boot.

## What gets logged

Every attempt writes a row, including failures, so gaps in the chart are visible
rather than silent. Each row carries:

| Column | Why it's there |
|---|---|
| `score`, `explanation` | The reading |
| `prompt_version`, `prompt_hash`, `prompt_text` | Which prompt produced it — version, a SHA-256 of the exact text sent, and that text |
| `model`, `served_by` | The model requested, and the model that actually answered |
| `raw_output` | The model's verbatim final text, before parsing |
| `status`, `error`, `latency_ms`, `input_tokens`, `output_tokens` | Run health |

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

## Deploying

Two shapes, both fine:

- **Long-running process** — `npm start` on Fly / Render / a VPS. The scheduler
  lives in-process. Persist `./data` on a volume.
- **Cron** — run the server with `NEWSWORTHY_NO_SCHEDULER=1` and call
  `npm run rate` from cron every 15 minutes (`*/15 * * * *`). Same database,
  same logging.

## Configuration

| Variable | Default | |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required for live ratings |
| `PORT` | `3000` | |
| `NEWSWORTHY_DB` | `./data/newsworthy.db` | |
| `NEWSWORTHY_MODEL` | `claude-opus-5` | |
| `NEWSWORTHY_PROMPT_VERSION` | latest | Pin a prompt version |
| `NEWSWORTHY_INTERVAL_MINUTES` | `15` | |
| `NEWSWORTHY_NO_SCHEDULER` | — | `1` to serve without rating (cron mode) |
| `NEWSWORTHY_MOCK` | — | `1` to fake readings without calling the API |
| `ADMIN_TOKEN` | — | Locks `/admin` and `/api/admin/*` |

## Tests

```bash
npm test
```

Covers score parsing (JSON, fenced, bare `N/10`, out-of-range, missing
explanation), prompt versioning and hash stability, and the logging layer.
