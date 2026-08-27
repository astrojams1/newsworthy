# Newsworthy

The news anti-app: a number out of 10 and one sentence, no headlines. Claude
rates the current top news on a harsh scale; the front page shows only the
score and the reason.

## Workflow

- **Branch off `main`, open a PR into `main`, merge there.** Do not push
  directly to `main`. `main` is both the GitHub default branch and Vercel's
  production branch.
- A push to `main` deploys to production. Every other branch deploys as a
  Vercel preview.
- Run `npm test` before pushing. No cloud database is needed — see Testing.

## Layout

| Path | |
|---|---|
| `src/server.js` | The whole HTTP surface. Also the Vercel entrypoint. |
| `src/rate.js` | Calls Claude, parses the verdict, writes the row. |
| `src/prompts.js` | Append-only prompt registry. |
| `src/pricing.js` | Model rate card and cost estimation. |
| `src/config.js` | Effective model/cadence: database settings over env. |
| `src/db.js`, `src/sql.js` | Postgres access and schema. |
| `public/` | Two static pages, no build step. |

## Things that are not obvious

**The entrypoint must have no exports.** Vercel's Node runtime validates
`src/server.js`'s exports and captures its `listen()` call. A named-only export
is rejected (`The default export must be a function or server`); exporting the
`Server` instance as default fails at boot. Both were tried. Leave it as a
side-effect-only module.

**Readings can come from elsewhere.** An external agent can rate the news with
its own model and `POST /api/readings`; the row is stored with `source =
'external'` and nothing about the caller. Its prompt
hash and text always come from our registry, never from the request, so a
reading stays traceable. `/api/instructions` serves the whole caller workflow with the
prompt embedded, so a caller agent is configured with a URL rather than pasted
text — `src/caller.js` is the single copy. `CALLER_TOKEN` gates it.

Not every agent can submit, and the ones that cannot are blocked by design.
ChatGPT's interpreter has no network (`curl` cannot resolve the host) and its
browser refuses to fetch a URL the model assembled — a model-built URL carrying
a token is the exfiltration shape that guard exists to stop, so no wording gets
around it. Two routes exist for those: `/api/openapi.json` describes the caller
API for a ChatGPT Custom GPT Action, which sends real headers; and `/admin` has
a paste box for a verdict that could not be transmitted at all. The schema is
served unauthenticated — it describes a gated API without containing a token,
and a schema importer cannot present one.
Serve it as `text/plain`: an agent's fetch tool rejected `text/markdown` before
exposing the body.

Write that page as a specification, never as imperatives. A fetch tool
summarizes through a small model, and a page of "you must" is read by that model
as orders to itself — two callers got back "I cannot make HTTP requests" instead
of the content. Third-person description gives it nothing to refuse, and rules
stated as facts about the system survive the paraphrase that commands do not.

**A submission is two fields: score and explanation.** Model,
caller name and token counts were all asked for once and all self-reported, so
all of it was stored as fact without being checkable. An agent inside a harness
has no token counter and will estimate if asked — a guessed 85k input tokens is
$0.48 of invented spend at Opus rates. Model, usage and cost are recorded only
for runs this app makes itself. `source` is set server-side and is `cron`,
`manual` or `external`; a caller cannot name itself. `runRating` takes that
source as an argument — the column defaults to `cron`, so a run that does not
pass one is silently recorded as scheduled, which is how every "Rate now" click
came to be labelled a cron run.

The prompt version is stamped server-side too, and for a sharper reason: a
caller that can name a version can name the wrong one. Two readings arrived
stamped v3 in the hours after v4 went live, each carrying an explicit
`prompt_version` — a submission that omitted the field would have defaulted to
the current version, so the caller was sending it — while `/api/instructions` had
been serving v4 the whole time. A caller reading fresh instructions on Opus 5,
with no stored copy to be pinned to, still reported a version that did not match
what it had just been served. Why is not established — a remembered value from
an earlier run is the likeliest candidate, but nothing here proves it. The point
does not depend on the cause: what a caller reports about the prompt version is
not evidence about the prompt it ran, however capable the caller. The prompt a
caller fetches and the version stamped on its reading now come from the same
place.

Note the two effects compound: external readings suppress the cron by being
recent, so a prompt change reaches nothing until a caller picks it up. No cron
run has executed v4.

**The runs table becomes cards below 720px.** Nine columns on a phone is a
horizontal scroll showing three words at a time. Each row reflows to timestamp
and score, then the explanation, then the small fields as one dotted line — and
absent values leave that line entirely rather than printing five dashes, which
is why every cell carries a class and an `absent` marker. The separator is a
`::before` on each field but the first, so a hidden field takes its separator
with it.

**`shape()` in `src/db.js` converts only the columns a query selected.** Emitting
a key for an unselected column yields a null that reads as "nothing recorded"
rather than "not asked for"; `history()` selects no usage columns, and that null
was misread as data loss.

**The cron only fires if nothing arrived within the interval.** A rolling
window from the newest reading, not the slot boundary — an external reading at
03:59 must suppress an 04:00 run, which slot alignment alone would not do. That
is what keeps this cheap: a reading submitted elsewhere is a reading this app
does not pay for.

**Cadence is enforced by the slot, not the cron schedule.** `vercel.json` ticks
every 15 minutes. Each reading claims a `slot` floored to the configured
interval, guarded by a partial unique index (`ratings (slot) WHERE status =
'ok'`). Ticks inside an interval find the slot filled and return without calling
the model. So cadence is changeable from `/admin` with no redeploy — but it
cannot go finer than the cron tick, and intervals must be multiples of it.
Failures, manual runs and external readings carry `slot = NULL` so they neither
block nor collide; external readings suppress the cron by being recent, not by
claiming a slot.

**Environment variables are baked in at build time.** Adding a variable, or
connecting a storage integration, changes nothing until you redeploy. `/healthz`
reports what the *running* function can see — database reachability, key and
secret presence, the Postgres variable names found, and the serving branch and
commit. Check it before debugging anything else.

**Vercel's production branch lives under Settings → Environments → Production →
Branch Tracking**, not Settings → Git.

**`vercel.json` takes no comments.** The schema sets `additionalProperties:
false`, so a `"//"` key fails the deploy outright — `should NOT have additional
property //` — before any build runs. Rationale for anything in that file
belongs here instead.

**Preview builds are skipped** via `ignoreCommand`. Every branch push produced a
preview that failed in about a second with `BUILD_FAILED` / "Resource
provisioning failed" and no build logs, while production built fine from the
same commit; each one emailed. Exit 0 skips and exit 1 builds, and the test
matches `preview` rather than negating `production` so an unset `VERCEL_ENV`
still builds. Nothing here reads a preview URL — work is verified against
production after merge.

**Avoid native dependencies.** `better-sqlite3` broke the first deploy: npm
skipped its install script, so the binding was missing and the import threw at
cold start. Prefer pure-JS or HTTP-based drivers.

**v5 changed what is measured, not just the wording.** v1 through v4 asked
whether the news was worth the reader's attention across money, career,
technology, safety, travel and daily life. Every rung of v5 is market risk, so a
development with no market confirmation has no route above roughly 4. Scores sit
lower by design. Comparing a v5 reading against a v4 one is comparing two
instruments.

**v6 rates the event, not the tape.** v5's rungs asked what markets had
confirmed, and markets confirm late and are closed roughly two thirds of the
hours in a week — so a shock that broke overnight scored as if it had not
happened. v6 keeps v5's scale and shifts the rungs to describe the development
itself, with one sentence in Sources saying market silence is not evidence
against an event. Every rung is eight words or fewer, and a test enforces that
mechanically rather than pinning the ten strings.

**v7 is v6 with the ten rungs tightened.** Everything above Scale is
byte-identical; only the wording of the rungs changed, so the two are the same
instrument and their readings are comparable. The rung text is the author's
verbatim — a test pins all ten strings, because a prompt that quietly rephrases
the scale measures something nobody wrote.

**Prompts are append-only.** Never edit a published version in `src/prompts.js`
— add the next one. Rows store the version, a SHA-256 of the exact text sent,
and that text, so a reading stays traceable.

## Cost

A search is the marginal cost, not the model. Measured across this deployment's
own runs, going from 7 to 8 searches added ~19k input tokens and ~$0.12 — the
$0.01 search fee is a twelfth of that, the rest is results landing in the context
window. Adding a source to the prompt is a cost decision, not just a wording one.

Roughly **$0.26 per run** on Opus 5: ~40k input tokens (search results land in
the context window) plus web search at $10/1,000 searches. That is ~$767/month
at 15-minute cadence, so **the default is every 4 hours (~$48/month)**. Model
and cadence are both adjustable at `/admin`. Every row stores the cost computed
at write time, so history keeps the price that applied.

Models are an allowlist in `src/pricing.js` — adding one requires its rates.

## Testing

```bash
npm test        # 22 tests; database tests run against PGlite, real Postgres
                # in-process, so the SQL is exercised rather than mocked
npm start       # needs DATABASE_URL; NEWSWORTHY_MOCK=1 avoids API calls
```
