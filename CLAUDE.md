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
| `PROMPT-RULES.md` | Constraints on every prompt version. Tests enforce each. |

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
around it. `/api/openapi.json` exists for those: it describes the caller API for
a ChatGPT Custom GPT Action, which sends real headers. The schema is served
unauthenticated — it describes a gated API without containing a token, and a
schema importer cannot present one.

A caller that can do neither ends its reply with the payload and states that it
was not submitted. `/admin` carried a paste box for exactly that and no longer
does; the rule it served survives it, because the part that matters is the one
only the caller can enforce — never report a verdict as submitted when it was
not.
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
not evidence about the prompt it ran, however capable the caller.

That claim — the prompt a caller fetches and the version stamped on its reading
come from the same place — was not true until 2026-08-28. `/api/instructions`
honoured an undocumented `?version=N`, so a caller passing `version=7` was
served v7's text and told "version 7" in the page, while `validateSubmission`
stamped `latestVersion()` regardless. A reading rated against a retired scale
was recorded as one rated against the current scale, and the caller's report of
the mismatch looked like a caller error rather than a server one. Reading 81 is
the confirmed case: it quoted three v7 rungs verbatim thirty minutes after v9
went live, and `?version=7` reproduces those rungs exactly. The parameter was
undocumented, unused by this app, its tests and its OpenAPI schema, and is
removed from both caller-facing endpoints. The full history stays at
`/api/admin/prompts`, behind the admin token, where reading an old version
cannot be confused with rating against one.

Note the two effects compound: external readings suppress the cron by being
recent, so a prompt change reaches nothing until a caller picks it up. No cron
run has executed v4.

**The front page shows a median, not the newest reading.** Measured over 46
readings: the rater disagrees with itself by about 0.6 points on near-identical
material, the series standard deviation is 1.12, and lag-1 autocorrelation is
-0.11. Consecutive readings are statistically indistinguishable from independent
draws around a slowly moving level, so hour-to-hour movement is mostly noise —
and the newest reading, which is what the page used to show, is the noisiest
estimator available. The hourly caller was already supplying the samples to do
better with.

`currentReading()` in `src/current.js` takes the median of the last five
readings within six hours. Five rather than four because an odd window makes the
median an actual observed score rather than a computed midpoint — this is a
number out of ten and a front page reading 4.5 is not the product. Replayed over
the stored series it cuts the mean hour-to-hour change from 1.10 to 0.39.

**Only the score is smoothed.** The sentence always comes from the newest
reading, and the two answer different questions: the number is a level, which a
median estimates better, and the sentence is what happened, which goes stale.
Pairing the median row's sentence with the number was the first cut and it read
as an app that had stopped — the text and the timestamp were both hours behind
while the page was current. `score_from` names the row the score came from when
that is not the newest reading, and is never displayed.

Smoothing costs lag, which is what v6 was written to remove, so the median
governs the quiet band only: a reading two or more above it is shown
immediately, with its own sentence. Two because the rater's own disagreement is
about 0.6 and a one-point gap is inside it. 83% of readings sit between 4 and 6
and readings of 7 or more are three in 46, so noise and shocks live in different
places; the override fires about 5% of the time. Drops are never treated as
shocks — being slow to report calm costs nothing.

The window is time-bounded as well as counted, and an empty window means the
newest reading is older than it, not that nothing is stored. `/api/current`
falls back to `latestRating()` there and reports `basis: 'stale'`; reading the
empty window as "nothing stored" and answering 503 was a bug in the first cut.
`basis` is in the response and never displayed — which rule produced the number
is the first thing anyone debugging a surprising front page wants.

The admin chart draws both: the displayed value as the line, the stored
readings as scatter. Scatter rather than a second line because their lag-1
autocorrelation is about -0.11 — joining them would draw a continuity the
numbers do not have. `displayedSeries()` replays the rule server-side and each
history point carries `displayed` and `basis`, so the page never reimplements
it; a chart free to drift from the front page about the front page is worse than
no chart.

**The runs table becomes cards below 720px.** Ten columns on a phone is a
horizontal scroll showing three words at a time. Each row reflows to timestamp
and score, then the explanation, then the small fields as one dotted line — and
absent values leave that line entirely rather than printing five dashes, which
is why every cell carries a class and an `absent` marker. The separator is a
`::before` on each field but the first, so a hidden field takes its separator
with it. Prompt version is that first field: `prompt_version` is `NOT NULL`, so
it is the one small field always present, which is what makes leaving the
separator off it safe. While model led that line it began with a stray dot,
because source sits on its own line above rather than beside it.

**A rejection some clients can only read as a 200.** A caller agent's fetch tool
surfaces nothing on a non-2xx — one collapses every failure into
`{"error_type":"CLIENT_ERROR","message":"The page returned a 422 client error"}`
with no headers, no body and no status text. So a 422 whose whole purpose is to
name the field at fault told one caller nothing, and it spent four attempts
guessing before settling on a deliberately worse explanation to avoid a
duplicate row that a 422 never creates.

`x-newsworthy-error` was the first fix and it missed: that client cannot read
headers either. `&soft_errors=1` is the one that works — rejections come back as
`200` with `{"ok": false, "stored": false, "status": 422, "error": …}`, and a
stored reading answers `{"ok": true, "stored": true, …}`, so such a caller
branches on `ok`. `stored` is not decoration: a 200 meaning rejected is a trap
for anything reading only the status line. Omitting the flag keeps ordinary
status codes, so nothing changes for clients that can read them. Auth is
softened too — a caller that cannot read a 401 is stuck silently and
permanently, and nothing is disclosed that the instructions do not already
publish.

Every rejection is `console.warn`ed, and now also leaves a row in `rejections`.
Nothing was recorded about the original 422s, so which of the four rules fired
could not be established afterwards from anything — a log line answers a
question asked the same day, and Vercel's function logs are ephemeral and not
queryable months later, which is exactly the position that investigation was
in. The row carries the status, the reason, the method and whether
`soft_errors` was set, and nothing from the request body: each of the four
reasons names the field at fault, so the reason is the whole finding, and
keeping payloads posted to this endpoint would be a junk magnet. They surface
at `/api/admin/history`, behind the admin token.

A rejection is not a reading and lives in its own table, so "a 422 stores
nothing" stays true of `ratings` and of every series, chart and total computed
from it — no query in `src/db.js` reads across the two.

The 401 is the exception, and deliberately: it is raised before the token is
checked, so it is the one refusal an unauthenticated request can provoke.
Recording it would turn a public URL into an unbounded database write for
anyone who can reach the host, which is a worse thing to have built than the
diagnosis is worth. All four rules are raised after auth has passed, so none of
what the table exists for is lost.

There are only four, and all are about a field being absent or malformed. There
is no length rule: past 400 characters `explanation` is truncated and stored,
and the prompt's 25-word guidance is style, not a limit the server enforces. A
422 on a submission whose score and sentence are both well formed therefore means
the request did not arrive as it was sent — so the fix is to send it again, not
to shorten the sentence.

**Spaces in the GET form are `+` because the URL has a length budget.** One
client refuses to send any URL over 250 characters, rejecting it locally with a
403 that never reaches this API, and the fixed part of a submission — host,
path, token, score — is already about 95 of those. `%20` costs three characters
per space where `+` costs one, which on a median 140-character explanation is
the difference between fitting and not. Other reserved characters are still
percent-encoded.

This was first reported as an encoding-compatibility problem — `%20` rejected,
`+` accepted — and that was wrong: the two attempts that failed were simply the
two that were longest, because percent-encoding their spaces pushed them over.
A 107-character URL containing `%20` goes through fine. The recommendation did
not change; the reason it is right did.

The budget does not explain everything. Six of the last 48 stored readings would
have needed a URL over 250 characters, one of them 285, so the limit is not the
flat wall a single bisection made it look like. The POST form carries the
sentence in a body and is subject to none of this.

**`shape()` in `src/db.js` converts only the columns a query selected.** Emitting
a key for an unselected column yields a null that reads as "nothing recorded"
rather than "not asked for"; `history()` selects no usage columns, and that null
was misread as data loss.

**The external caller runs hourly, not on this app's cadence.** A scheduled
Cowork task fires at `2 * * * *` — 48 of the last 48 readings are external, one
per hour, clustered at :03–:05. Each is an independent session with no memory of
the others. That is why no cron run has executed anything since v4: the rolling
staleness window is suppressed continuously, so this app's own cadence setting
is inert while the caller keeps running, and its model spend is near zero
because the caller is paying instead.

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

**The scale lives in the rungs, not in prose about the rungs.** Every story
type measured over 72 hours had a median of 5, so the rater was not
discriminating between them at all. Asked what four real readings should have
scored, the author said lower in all four cases. v8 answered that by leaving
v7's rungs untouched and adding a paragraph to Summary explaining that scores
should be lower, which is the wrong half of the job: prose about a scale does
not move a scale.

v8 was live for seventeen minutes and produced **no readings at all** —
readings run v2, v3, v4, v7, v9, v10, v11 and skip it entirely. An earlier
version of this note said v8 "kept rating high", which it cannot have done. The
objection to it stands on reading the diff, not on evidence.

v9 rewrote the rungs so a normal day sits at 3, and added **Examples**: the
author's own scored readings, each headlined in eight words or fewer. Whether v9
moved the scores is unestablished — of its four readings none carried a digest,
so none can be attributed to v9's text. Examples
are never invented — one nobody scored is this app's opinion wearing the
author's clothes. Calibration is stored there rather than in a separate file, so
the thing that rates and the evidence it was calibrated against travel together.

**Prompt construction rules live in `PROMPT-RULES.md`**, and every one of the
seven is enforced by a test in `test/prompt-rules.test.js` against whichever
version is live, so they cannot go stale as versions accumulate. A rule in prose
alone is a rule that gets forgotten on the version where it matters. An eighth
rule needs an eighth test — a count check fails otherwise.

**A caller can be reading a version you retired hours ago.** On 2026-08-29 the
hourly caller fetched `/api/instructions` and received v9 while the server
stamped its submission v11 — three releases apart, six hours stale. It reported
this as a Vercel edge cache. It is not: eight consecutive fetches of the
canonical URL from outside return the current version with `cache-control:
no-store`, `x-vercel-cache: MISS` and `age: 0`, and a cache-busted URL returns
byte-identical content in the same second. That a novel query string changes
what a *caller* sees, while the origin says MISS, is positive evidence the cache
sits on the caller's side — an origin cache would answer HIT with a non-zero
age.

Which matters because the fix differs. Nothing more can be done here beyond what
already is: responses now also carry `Pragma: no-cache` and `Expires: 0` for an
intermediary that ignores `Cache-Control`, and neither reaches a client that
caches by URL regardless. Only the caller can defeat that, with a distinct query
parameter per run. So the instructions describe it, and a stale-copy explanation
is the first thing to check whenever a prompt change appears to have had no
effect.

**A prompt edit was unfalsifiable until callers started returning a digest.**
Five wordings of the same instruction — v2's banned-phrase list, v5's "do not
justify the score", v10's restatement as what the sentence may contain —
produced the same rate of score-justifying sentences: 15% overall across 73
readings, 27% on scores of 4 or below. That is what a rule that never arrives
looks like, and nothing in a stored row distinguished "the scale is wrong" from
"the scale never reached the rater".

`prompt_sha256` on a submission settles it. The server compares it against the
digest of the text it sent, so unlike the model and token counts that were
removed as unverifiable claims, this is a proof. `prompt_verified` is `true`,
`false`, or `NULL` when no digest came — three distinct findings, and the admin
table marks the first two beside the version.

The bytes to hash are defined as the `text` field of `/api/prompt`, not the
prompt block printed in the page. A caller whose fetch tool paraphrases pages
still receives a JSON string value intact, and that field is byte-identical to
what the server hashes — no markers to strip, no trailing-newline ambiguity. A
caller asked for the digest itself to be published as a field instead; that
would make the check vacuous, since echoing a published value proves nothing
about what was read. Publishing the bytes is safe, publishing the answer is not.

The 16-character hash printed in the instructions is deliberately a *prefix* of
the 64-character digest. A caller that echoes the printed value, or any prefix,
is recorded unverified: the remaining 48 characters exist only for a caller that
hashed the bytes it holds. Without that, the check would pass most reliably for
a caller that merely skimmed the page — the exact case it exists to catch.

A mismatch is never a rejection. A rejected reading says nothing about the
delivery path; a stored reading carrying a false flag says everything, and the
rejection rules stay four.

**What the digest showed, immediately.** The first verified readings split the
series in a way no prompt edit had:

| | readings | with a score-justifying clause | of those scoring 4 or below |
|---|---|---|---|
| verified | 3 | 0 | 0 of 2 |
| unverified | 22 | 8 | 6 of 11 |

Every reading carrying the clause was unverified. The one that had prompted v10
— a flood story ending "; distant from US readers" — reappeared as the same
story, verified, at the same score, as "Glacier collapse floods on the
Nepal-Tibet border killed more than 500 people, with roughly 1,500 still
missing as searches continue." No clause.

Three verified readings is not a result, and two of them are six minutes apart
on the same news. But the direction is the opposite of what four prompt
versions assumed, and it is the first evidence in the series that separates a
scale that rates wrongly from a scale the rater never received.

**v10 and v11 were written against evidence that has not survived.** Both
answered the trailing clause — "distant from US readers", "nothing requiring
personal action" — and each had a theory. v10: adding reach to rung 3 gave the
rater a criterion to narrate. v11: rung 3 and the Output contract contradict
each other, because on a day scored 3 the rater has just concluded nothing
matters and is then asked to name a development and its effect.

Both theories were built on readings the rater produced from **v9's text**,
while the server stamped them v10 and v11. Neither has verified evidence behind
it, and the verified readings so far carry no clause at all. They are kept
because they are published and readings reference them, and because neither is
disproved — only unsupported. They are not a basis for the next version.

The reusable part is the method, not the conclusions: five wordings of one
prohibition were shipped across nine months of versions, each judged by a rate
measured on readings nobody could attribute to the text being judged. A prompt
change is not evaluable until the readings answering it are verified.

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
npm test        # eleven files under test/; database tests run against PGlite,
                # real Postgres in-process, so the SQL is exercised not mocked
npm start       # needs DATABASE_URL; NEWSWORTHY_MOCK=1 avoids API calls
```

The eleven are `caller`, `current`, `db`, `external-null`, `ingest`, `openapi`,
`parse`, `pricing`, `prompt-rules`, `rejections` and `scheduler`. A count of
individual tests
is not kept here: it is wrong again after the next PR, and a stale number in a
document read as authoritative is worse than no number.
