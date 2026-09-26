# Newsworthy

World news, rated by significance.

Newsworthy uses AI to assess world news with a score from 1 to 10, a brief
explanation and an update time.

Product constraints: no feed, subscriptions, in-app purchases, ads, or engagement,
addiction or growth-hacking tactics.

See `docs/product-messaging.md` for shared claims and `README.md` for current
release status. Calm presentation must not change the rating calibration.

## Workflow

- Before starting any new feature, run `git fetch origin` and inspect the latest
  target branch. Start from the fetched `origin/main`, preserving existing local
  work; never assume the local `main` is current.
- Before creating every PR, use `.agents/skills/newsworthy-pr-copy-review/SKILL.md`
  to check README, product/marketing copy, help, caller contracts and release
  claims against the change, and record the copy accuracy review in the PR
  description. Repeat affected checks if PR scope changes.
- Branch off `main`, open a PR into `main`, and run `npm test` before pushing.
  Do not push directly to `main`. Vercel preview builds are currently skipped.
- Keep extra development workspaces inside the primary Newsworthy checkout at
  `.worktrees/<task-name>/`. Do not create sibling `newsworthy-*` folders in
  `~/code` or elsewhere in the home directory. When already in a worktree, use
  the primary checkout's `.worktrees` directory rather than nesting another one.
- Exclude `/.worktrees/` through the repository's local `.git/info/exclude`
  before creating workspaces; never commit or upload workspace copies. Use
  `git worktree add`, `move`, and `remove` to keep Git's records consistent.
- Remove completed workspaces once their changes are safely merged. Before
  cleanup, check for unmerged commits, uncommitted changes, and local-only files
  (including ignored files); preserve unfinished work and useful artifacts first.
  Do not move or remove a workspace that an active task or process is using.
- Preserve the calm indicator: a number out of 10 and one sentence explaining why.
  No doomscrolling, subscriptions, in-app purchases, ads, or engagement,
  addiction or growth-hacking tactics.
- Keep admin views web-only. Preserve the web app alongside the mobile apps.
- The shared interface uses Expo / React Native in `apps/client`. A browser view is not an iOS
  preview. Do not claim native builds or widgets are verified until tested.
- For UI changes, run `npm run test:design` and extend its regression cases for
  the reported defect. Follow `design/surfaces.json` and `design/README.md` across
  web, iOS, Android and both widgets. Passing builds, shared palette generation,
  or rendered-prop tests alone do not establish native visual parity; record
  actual native verification and any untested states in the release ledger
  with `npm run ledger -- record --gate <id> --summary … [--state …]
  [--evidence …] [--next …]` (`store/scripts/ledger.mjs`). It updates
  `store/ledger.json` and regenerates `store/ledger.md`; never edit the
  Markdown by hand.
- Follow `PROMPT-RULES.md`; never edit a published rating prompt in place or
  alter the scale to fit marketing copy. For prompt changes, use the repository
  skill at `.agents/skills/newsworthy-prompt-update/SKILL.md`.
- Public AI-reader facts live in `public/llms.txt`. Authorized rating instructions
  live in `src/caller.js`; keep the rating and provenance contract intact.
- For public news-app complaint research and product discovery, use
  `.agents/skills/newsworthy-user-research/SKILL.md`; retain evidence and search
  lessons in `docs/user-research/runs.md` and decisions in
  `docs/user-research/opportunities.md`.
- To check the hourly caller's runs, use
  `.agents/skills/newsworthy-caller-review/SKILL.md`; findings go in
  `docs/caller-reviews/ledger.md`, observations kept apart from hypotheses.
- A push to `main` deploys to production. `main` is both the GitHub default
  branch and Vercel's production branch. Preview builds are skipped by
  `vercel.json`’s `ignoreCommand`; verify production after merge.
- `npm test` needs no cloud database — see Testing.
- The production admin token (`ADMIN_TOKEN`) is kept in the owner's 1Password
  vault. Stored readings, rejections and every prompt version sit behind it at
  `/api/admin/history` and `/api/admin/prompts`. When a task needs production
  history, such as measuring a prompt change, read the token before starting
  rather than settling for the repository's fixtures or public endpoints:
  `op read "op://API Tokens/Newsworthy admin/password"`. Cloud sessions have no
  `op`: download the Linux CLI from 1Password into the scratchpad and run it
  with `OP_SERVICE_ACCOUNT_TOKEN="$OP_KEY"`; a service account must name the
  vault, as above. Ask the owner only if that fails. Pass it in the
  `x-admin-token` header, never in a file, commit, log or PR.

- This file is capped at 58,500 characters, enforced by
  `test/agents-md.test.js`. An addition that does not fit is written tersely
  and makes room by tightening or removing stale text here. Propose a raise to
  the owner only when that cannot make room, stating what the addition says and
  the new length and limit, and change this number only after approval.

## Layout

| Path | |
|---|---|
| `src/server.js` | The whole HTTP surface. Also the Vercel entrypoint. |
| `src/rate.js` | Calls Claude, parses the verdict, writes the row. |
| `src/prompts.js` | Append-only prompt registry. |
| `src/pricing.js` | Model rate card and cost estimation. |
| `src/config.js` | Effective model/cadence/half-life: database settings over env. |
| `src/story.js` | Judges which development a reading reports. Append-only prompts. |
| `src/db.js`, `src/sql.js` | Postgres access and schema. |
| `public/` | Web-only admin, privacy/support pages and discovery assets; Expo owns the public rating UI. |
| `apps/client/` | Shared Expo UI, native widgets and EAS build configuration. |
| `docs/product-messaging.md` | Shared positioning and limits on product claims. |
| `docs/mobile-release.md` | Expo cloud-build preparation and remaining release gates. |
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

**A reading is two fields: score and explanation.** A complete caller submission
also carries `prompt_sha256`, computed with a code tool from the exact received
prompt. It is provenance, not a third reading field. The API still accepts a
missing digest for compatibility, but that reading is unattributable. Model,
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

**The front page shows a development's level, aged.** Two rules, in order.

The level rule is unchanged and answers "how newsworthy is it". Measured over
46 readings: the rater disagrees with itself by about 0.6 points on
near-identical material, the series standard deviation is 1.12, and lag-1
autocorrelation is -0.11. Consecutive readings are statistically
indistinguishable from independent draws around a slowly moving level, so
hour-to-hour movement is mostly noise, and the newest reading is the noisiest
estimator available. `currentReading()` in `src/current.js` takes the median of
the last five readings within six hours; a median of five cuts the standard
deviation to 0.43, and five rather than four because an odd window makes the
median an observed score. A reading two or more above that median is a break
rather than noise and passes straight through, because smoothing costs lag and
lag is what v6 was written to remove.

The level alone could not age anything. Every run is independent and rates the
current top news, so a story that dominates for days is re-rated at about the
same number hour after hour: the median of five 5s is 5 forever. The renewed
US-Iran strikes held the page between 4 and 6 for four days. So each development
carries its own level, decaying from when it was first reported — halving every
12 hours by default, floored at 1 — and the page shows **the loudest
development still live**.

**The loudest, not the one this hour's reading named.** Reading only the named
development was the first cut, and the judged series made its failure obvious:
on 2026-09-03 the rater mentioned a seven-day-old Nepal flood once and the page
fell from 4 to 1 and back to 3 within two hours, on no news at all. Across the
series that shape accounted for 57 of 74 two-point jumps and left the front page
moving more hour to hour (1.10) than the raw readings it was meant to smooth
(1.02). Taking the loudest instead: 0.43, with 7 such jumps, and the escalations
still land the hour they arrive.

The number cannot rise without news: a development's value only decays, so the
maximum across them moves up only when one re-anchors or a new one opens, and
both are events rather than arithmetic. The cost is that in the hour where the
loudest development and the newest reading disagree, the number describes one
story and the sentence names another. That is accepted: the alternative is
pairing the number with an older story's sentence, which reads as an app that
has stopped.

**Two doctrines ended there, and both were load-bearing.** The displayed number
is no longer always an observed reading: it is an integer, never a computed 4.5,
but it can be a number no run produced. And a shock passes through only when it
reports a *new* development — a 7 on a story the judge says has been running
since morning is that story's noise, not a break. Drops are still never treated
as shocks, and being slow to report calm still costs nothing.

**Which development a reading reports is judged once and stored.**
Text similarity was tried first, replayed over the stored series: it finds the
coarse story well enough (134 of 155 readings matched their neighbour's story)
but it cannot tell a re-report from a new development inside a running story. It
chained six days of Iran readings into one, so the resumption of strikes on 31
August — which the rater scored 4 to 7 — would have displayed as 1. That
distinction is a judgement about the news, not about the words, so a model makes
it: `src/story.js` shows the last 48 hours grouped into developments and asks
which one the new sentence reports, or none. The answer lands in `story`,
`development_of`, `judge_version`, `judge_model`, `judge_note` and
`judge_cost_usd`, and `src/current.js` replays it. The judgement is never
recomputed, so the front page and the chart cannot disagree, and re-reading
history cannot re-interpret it.

**One story, one name — v2.** The judge names the story as free text, and v1
let that drift: across 231 readings it coined four names for the US-Iran war —
`hormuz-threat` (40 readings), `iran-war` (87), `iran-nuclear`, then
`hormuz-conflict`. The reading that coined the second had `hormuz-threat`
developments in front of it at the time, so a name seen in passing beside a
development is demonstrably not enough to get it reused.

Developments group by **id**; fatigue and the board group by name.

v2 lifts the names out into a "Stories on record" list of their own, drawn from
fourteen days rather than the developments' 48 hours — a story quiet for two
days should keep its name when it returns rather than be renamed on the way back
in — and states the reuse rule where the list is. Everything above that in the
prompt is byte-identical to v1, so which development a reading reports is judged
by the same text and the two versions stay comparable; a test pins that.

History was not re-judged: a stored judgement is never recomputed.

**v3 lets a split be mended.** Under v2 two names for one story stayed two,
and a dormant one could return (`hormuz-conflict`, 18 September). v3 is v2 plus
one paragraph: an answer may add `same_story`, two names on record for one
story. A merge is a row in `story_merges`, resolved where `db.js` reads names,
so fatigue, the board and the judge's list see one story while readings keep
their own name. The name more readings used is kept. `/admin` can undo, by row.

**The caller is the judge for its own readings.** The judge prompt sits in the
caller instructions after the rating prompt. After scoring and writing, the
caller fetches `/api/developments` — story names and developments, data only —
and submits its answer as `judgement` with the reading, so a reading lands
judged. The server calls no model, checks the id against the developments on
record, and stamps its own version (an answer to a retired one is refused) and
`judge_model = 'caller'`; without a usable answer the reading stores unjudged.
Storing first and judging after was dropped: it showed readings unjudged. This
moved off the app's API account when credits ran out on 2026-09-24; the cron
and `/api/admin/judge` still spend `judge_spend_usd`. Each run ends with an
unchecked report to `/api/runs`, shown at `/admin`: Routine transcripts are
not reachable from a session. The judge cannot alter a score or reject a
submission — the four rejection rules stay four. Its prompts are append-only and
pinned by hash: a stored judgement names the version that made it.

**The case that shaped it: X, then Y, then X again.** X breaks at 08:00 scoring
7 and shows 7. Y takes the top slot at midday and shows its own score. X is top
again at 18:00 scoring 6 — and cannot come back as a 6, because X is ten hours
old: it contributes its aged level and nothing more. Without stored identity the
page had no way to know that, and either forgot the morning or never aged at
all. What the page shows that evening is whichever of X and Y is still louder.

**A development that escalates is news again, whatever the judge says.** The
level rule and the judge between them would leave one hole, and it is the worst
one: a story the judge keeps calling a single development sits at the floor
however far it escalates. Replayed over the stored series with story identity
stood in by keywords — the crudest judge there is — four days of intensifying
US-Iran strikes showed 1 on the day the rater said 7. So a development whose
level climbs two clear of its own recent low re-anchors there and its clock
restarts.

Two points, against the development's own low, and only on a level the median
confirms. Two because that is the margin the shock rule already uses and the
rater's self-disagreement is about 0.6. Against the low rather than the anchor,
because measuring against an all-time maximum lets one early peak lock a
development at the floor for as long as it runs — that was the first fix and it
changed nothing. Against the level rather than the decayed value, because a rise
the news did not make is a sawtooth: the number would fall for half a day and
spring back on unchanged readings. And not on shock levels: letting those anchor
doubled the upward steps over the stored series (23 rises against 12, 18 of them
two points or more) and took hour-to-hour movement back to 0.75 against the raw
0.88 — a page bouncing as much as the readings it was smoothing. The cost is
about an hour of lag on a sharp escalation, until the median confirms it, and a
sharp escalation is the judge's case rather than this one's.

**Stories have a half-life too.** A development's half-life says how fast one
event goes stale. It says nothing about the thread: a war in its sixth month
produces a development every day, each scored 5 by a rater with no memory of the
previous four hundred, and each opened at 5 on the page. None of them is worth a
reader's time, and the request was exactly that — "these developments happen
every day, and it's not worth my time."

So the page has the memory the rater lacks. A story's developments over the last
`STORY_MEMORY_DAYS` (28) give it an age and a routine level, the median of what
its developments have scored. A development opening within the shock margin of
that routine level is what the story does every day: it opens at its score times
`2^(-age / storyHalfLifeDays)`, seven days by default, so a fortnight-old story's
daily 5 opens at about 1. A story with nothing on record is fresh and pays
nothing; a reading with no story — a judge outage — cannot be attributed and
pays nothing either.

**Breakthroughs are the point, and they escape the discount by the same two-point
margin everything else here uses.** A development scoring two or more clear of
the story's routine level keeps its full score — a ceasefire in a war trading
strikes, a collapse in a market that has been drifting. Against the median
rather than the peak, so one bad day does not set the bar for every day after;
and the median moves with the story, so three 7s in a row in a story of 4s make
the fourth 7 routine. Replayed over the real series with the v1 slug drift
merged: Iran's daily churn — "Escorted convoys resumed", "Diesel hits a record"
— opens at 1 or 2 instead of 4, while every breakthrough survives whole: the
broadest strike wave 7→7, the hundred-target strike 6→6, the 3 September
escalation 7→7. The 4s and 5s thin out; the 7s and the 8 do not move.

The limit is the rater's score. A development the rater scores like the daily
churn is the daily churn as far as the page can tell — Iranian missiles at two US
warships scored 5 in a story whose routine was 4 to 5, and opened discounted. The
signal is the number the rater gave, and only the rater can give a different one.

An escalation inside a development is weighed the same way: two clear of the
story's routine level is a breakthrough at full value, anything less is churn.
`basis` gains a third value, `routine`: the clock started with this reading, but
the development opened at a fraction of its score because its story has been
doing this for weeks. `/api/current` reports `fatigue`, the fraction kept — 1 for
a fresh story or a breakthrough. The story half-life is a setting beside the
development half-life at `/admin` (`story_half_life_days`, one of 3, 7, 14, 30).
The replay reads four weeks of rows for it, where it read three days before;
developments themselves still compete for only three days.

**A judge outage is "inherit", not "new".** A reading with `judge_version` null
takes the previous reading's development rather than opening one, because an
outage that reset the clock hourly would look exactly like a story that never
ages. The score-only fallback still applies on top: a level two clear of the
development's own level starts one. History from before the judge existed reads
the same way until `/api/admin/judge` backfills it.

**The sentence comes from the newest reading.** When that reading opened a
development of its own, the sentence leads with a bold **New:** for two hours
after it was saved, independently of the score’s decay; any other sentence has
no prefix. That replaced an age prefix ("31 hours ago:") on re-reports, which
counted how old the rest was where the reader wanted to see what was new.
`opensDevelopment()` in `src/story.js` decides it from the stored
judgement — judged, and `development_of` null — so a judge outage is never
"new". Its wording comes from the
newest reading, and the two answer different questions: the number is a level,
and the sentence is what happened. Pairing the median row's sentence with the
number was an early cut and it read as an app that had stopped. So a story still
on top in the evening is still named in the evening, with a smaller number
beside it — never "nothing new". The score’s `since` anchor and the sentence’s
`explanation_new` flag answer separate questions.

`basis` is one of `new` (the newest reading opened or escalated the development
the number is about, at full value), `routine` (it did, but its story's age
discounted it), `aged` (a decayed level) or `stale`. The level
rule's own vocabulary — `latest`, `median`, `shock` — no longer appears there,
because it describes the level rather than the number; `level` carries it
instead. There is no `score_from`: the number comes from a development rather
than from a row, and `since` dates it.

`/api/current` reads four weeks of rows (`STORY_MEMORY_HOURS`) so a development
can be weighed against its story, but a development competes for the page only
for 72 hours (`LOOKBACK_HOURS`), three halvings at the longest half-life — past
that it is at the floor and its exact age stops mattering. A root whose first report is older than that is fetched by
id, so `since` is the real first report rather than the edge of the window. The
score is re-aged at request time, not at the last reading's timestamp: ten hours
of silence after an 8 is not an 8. An empty six-hour window means the newest
reading is older than it, not that nothing is stored — `basis` reports `stale`
there and the number still ages. Reading the empty window as "nothing stored"
and answering 503 was a bug in the first cut. `basis`, `level`, `story` and
`since` are all in the response and none are displayed; which rule produced the
number is the first thing anyone debugging a surprising front page wants.

**The half-life is a setting, not a constant.** It sits beside model and cadence
at `/admin` (`half_life_hours`, one of 4, 6, 8, 12, 24) because the right value
is a matter of taste about the front page, and the chart replays whatever is set
over readings already stored — so a change is visible against real history
immediately rather than after a week of new readings.

The admin chart draws both: the displayed value as the line, the stored readings
as scatter. Scatter rather than a second line because their lag-1
autocorrelation is about -0.11 — joining them would draw a continuity the
numbers do not have. `displayedSeries()` replays the rule server-side and each
history point carries `displayed`, `basis`, `level`, `story`, `root`, `since`
and `reports` — the last being the development that reading itself reported,
which is not always the one the number is about — so the page never
reimplements it; a chart free to drift from the front page about the
front page is worse than no chart. The range is fetched padded by the lookback
and trimmed after the replay, so a point at the left edge ages from the first
report the page actually used rather than from the edge of the range.

**The admin page carries the board the front page cannot.** The front page is
one number about one development, which is the product — but it explains nothing
about why an 8 from this morning now reads 4, or which of two running stories
the 4 belongs to. `activeStories()` in `src/current.js` returns every story
still live and the developments inside it: what each broke at, what that has
decayed to, when, how many readings reported it, and which one the page is
currently about. `/admin` renders it under "Live stories".

Each story's header carries where the *story* stands now, which its developments
cannot: the weight printed beside a development is the one it got when it
opened, and a story quiet since then has gone on ageing. So the header says how
long the story has been running, how many developments set its routine level,
what that level is, the weight a development opening this minute would get, and
the score that would clear the routine level by the shock margin and open whole.
It is asked of the same `storyState()` arithmetic that `fatigued()` uses at
open time, about now — a second implementation in the page would be free to
drift from the discount it describes. A story's first development is itself on
record, so a story is never without a routine level; only readings the judge
could not place have nothing to be weighed against, and the header says so.

It comes from the same replay as the chart and the page — `activeStories()` and
`displayedSeries()` both call `replay()`, and the route calls `rootTimes()` once
for both — so the board cannot disagree with the page about which development
leads, and a test pins that. Regrouping the raw rows in the page would have been
free to drift, which is the reason `displayedSeries()` lives on the server too.
The board is a fact about now rather than about the charted window, so the range
buttons do not change it, and a development past `LOOKBACK_HOURS` leaves it
rather than accumulating there.

`story` on a history point is the **loudest** development's slug, not the
reading's own — the replay spreads `loudestAt()` over each point. The reading's
own slug is on its row, which is what the runs table shows. That table's Story
column was empty for every row until `recentAttempts()` selected `story`,
`development_of`, `judge_version` and `judge_note`: `shape()` omits a column the
query did not ask for, so `judge_version` was absent rather than null, and the
cell read it as "not judged".

**The runs table becomes cards below 720px.** Ten columns on a phone is a
horizontal scroll showing three words at a time. Each row reflows to timestamp
and score, then the explanation, then the small fields as one dotted line — and
absent values leave that line entirely rather than printing five dashes, which
is why every cell carries a class and an `absent` marker. The separator is a
`::before` on each field but the first, so a hidden field takes its separator
with it. Prompt version is that first field: `prompt_version` is `NOT NULL`, so
it is the one small field always present, which is what makes leaving the
separator off it safe.

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

Every rejection is `console.warn`ed and leaves a row in `rejections`. Nothing
was recorded about the original 422s, so which of the four rules fired could
not be established afterwards — a log answers a question asked the same day,
and function logs are ephemeral. The row carries the status, reason, method,
`soft_errors` and the token used (`caller`, `admin`), and nothing from the request body: each reason
names the field at fault, so the reason is the whole finding. They surface at
`/api/admin/history`, behind the admin token, over the range that page asks
for — a fixed newest-25 would put an old incident's rows out of reach of every
endpoint as soon as 25 newer ones arrived.

A rejection is not a reading and lives in its own table, so "a 422 stores
nothing" stays true of `ratings` and everything computed from it.

The write is awaited, and the first cut was not. A serverless function may be
frozen the moment its response ends, so an unawaited insert races the freeze
and loses — the row would have existed everywhere except the deployment it was
built for. No test here can see that: a long-lived local server always drains
an in-flight insert, so both versions pass identically, and it is asserted
against the source the way `max_uses` already is.

The 401 is deliberately not recorded. It is raised before the token is checked,
so it is the one refusal an unauthenticated request can provoke, and a row for
it would turn a public URL into an unbounded database write. All four rules are
raised after auth has passed, so nothing the table exists for is lost.

**A sentence always ends in punctuation.** The prompt asks for one complete
sentence and most arrive as one, but a caller trimming to the character budget
trims the full stop with it, and a sentence with no end reads as cut off on a
page whose job is to look settled. `completeSentence()` in `src/ingest.js`
finishes it at storage on both paths — the caller route and the app's own
parser — adding a full stop to a sentence that has no end and putting one in
place of a dangling comma, colon or dash; an ellipsis, a question or exclamation
mark, or a closing quote after any of those already counts. `/api/current`
applies it again to `explanation_text`, so a row stored before the rule is
served finished to every client, native widgets included, with no rebuild. It
is not a fifth rejection rule, and the native formatters do not mirror it: they
only ever see text the server has already finished.

There are only four, and all are about a field being absent or malformed. There
is no length rule: past 400 characters `explanation` is truncated and stored,
and the prompt's 150-character guidance is style, not a limit the server enforces. A
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

It was first misread as `%20` being rejected; the failures were the longest URLs.

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

**Vercel environment changes need a new deployment.** The Node server reads
its deployment’s environment at runtime. Adding a variable or connecting a
storage integration changes nothing in an existing deployment until you redeploy. `/healthz`
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

**Settings are a sheet, and the theme is one of them.** `/settings` (the gear in
the header, beside share) rises over the reading as a sheet in the apps and is a
page on the web; it closes with an X and has its own stack, so
`/settings/appearance` chooses the appearance —
Follow device, Light or Dark, following the device by default — and, in the
native apps only, `/settings/notifications` turns on high-score alerts, with
`/settings/threshold` choosing the score they wait for. The routes are exported as `settings/index.html` and
`settings/<page>.html`, which is why `serveStatic` also tries a directory's
`index.html`. `apps/client/lib/preferences.js` owns
the shape and the defaults, `components/preferences-provider.tsx` persists it
in AsyncStorage, and `ReadingProvider` derives `dark` from the choice, so every
`useTheme()` caller follows it without knowing it exists. On web the choice is
written to `data-appearance` on the document, which `tokens.css` already
honoured for the static policy pages; on native it goes through
`Appearance.setColorScheme`, so the share sheet and alerts follow too. Widgets
follow the operating system regardless — they have no access to the app's
store — which the support page says and the screen does not: a line about
widgets under a choice that sets the app's appearance raised the question
it answered. Every row shares one minimum
height rather than a fixed one, so enlarged text grows the rows together.

**Push notifications are opt-in, off by default, and 8 when turned on.** The
app registers its Expo push token at `PUT /api/push/subscriptions` with the
lowest score it wants to hear about (`threshold`, 1–10; the app offers 5–10)
and deletes it with `DELETE` when the switch goes off. The token is the whole
identity — nothing else about the device is stored — and the row is keyed by
it, so a device can only ever hold one. The route is public, like
`/api/current`, which is why `src/push.js` bounds it: a token has to match
Expo's shape, and past `MAX_SUBSCRIPTIONS` the route answers 503 rather than
let a public URL grow a table without limit. Tokens Expo reports as
`DeviceNotRegistered` are deleted on the first send, so invented ones do not
stay. The score can be chosen before the switch is on, so turning it on means
something definite. Every request that touches the row runs through one
queue in `apps/client/lib/subscription.js` and re-reads the stored state when
its turn comes, because a threshold change overlapping a switch-off once
reached the server after the DELETE and registered the device again while the
app showed it as off. The queue is the provider's, not the settings screen's:
a screen owning its own queue was closed with a request in flight and reopened
with an empty one, and the old request finished after the new screen's DELETE.

**What is announced is the front page's number, not the reading's score.** The
page smooths and ages readings and weighs a development against its story, so
a raw 8 can display as a 4, and a notification saying 8 that opens on a 4 has
lied. After a reading is stored, `notifyReading` computes the display exactly
as `/api/current` does — same rows, same config, same `replay()`, the shared
`rootTimes()` — and a device hears when that number reaches its threshold. The
cost is the page's own lag: a lone 10 on a running 8 is inside the noise margin
until the median confirms it, and no device is told a 10 the page is not
showing. A new 8 while a 10 is still the loudest changes nothing on the page
and announces nothing, because the tap would have opened on the 10.

It is announced **once per development and threshold**: `push_deliveries` is
keyed on `(root, threshold)`, the root being the development the page's number
is about. That is what makes a judge outage quiet — the replay inherits an
unjudged reading into its predecessor's development, so four unjudged 8s are
one development, where a first cut that took the predecessor's *id* as the
root announced three of them. An escalation the page shows reaches the devices
waiting for the higher number and not, again, the ones that heard at the lower.

**A claim is a lock, not a record, and it carries progress.** The first cut
claimed the pair before calling Expo and never let go, so one 503 silenced a
development for every device at that threshold. A claim now carries
`claimed_at` and a null `sent_at` until every recipient is answered for; a
failed send marks its claims `released`, and a claim older than
`PUSH_CLAIM_STALE_MINUTES` with no send — a function frozen mid-way — is taken
over by the next reading. Two functions storing readings at once still send
once between them, because the insert is the arbiter. Expo takes a hundred
messages per request, so a send can fail part-way: releasing the whole claim
then sent the first batch's hundred devices the same development twice. The
claim keeps `delivered`, the tokens Expo has answered for, and a retry reaches
only the rest. Delivery is
an HTTP call to Expo's push service (`NEWSWORTHY_PUSH_URL` points a test at a
stand-in; `EXPO_ACCESS_TOKEN` is optional) and is awaited where the reading is
stored, in `runRating` and the external route, for the same reason the
rejection log is: a function may be frozen the moment its response ends. It
never throws — a push failure must not turn a stored reading into an error
row. The notification is the number and the sentence, nothing urgent, and it
does not banner while the app is open: the reading on screen refreshes instead.

Native delivery needs credentials this repository cannot hold: an APNs key and
an FCM service account uploaded to EAS. Until they are, the switch registers a
token and nothing arrives — see `docs/mobile-release.md`.

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
readings run v2, v3, v4, v7, v9, v10, v11 and skip it entirely. The objection
to it stands on reading the diff, not on evidence.

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

Responses also carry `Pragma: no-cache` and `Expires: 0`; neither reaches a
client that caches by URL. Only the caller can defeat that, with a distinct query
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

The instructions' first wording of that definition opened with "the bytes to
hash come from `/api/prompt`", with the `text`-field qualifier trailing behind a
dash — readable as "hash the response body", and read that way: a caller
reported doing exactly that, storing a reading flagged `prompt_verified: false`
on an otherwise correct-looking 201 before hashing the field value and
resubmitting. The check worked — a wrong-input digest recorded as unverified is
the check working — but the page taught the wrong input, and a false flag from a
doc-following caller looked like a delivery failure rather than a docs bug. The
definition now leads with the field's decoded value, names the two wrong inputs
(the response body, the field's escaped form), and says what a false flag means
for a caller that followed it. A test pins all of that, including that the old
opening phrase stays gone.

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

**v12 changes sentence writing, not calibration.** Output now requests at most
150 characters including spaces and punctuation, one clear development, familiar
abbreviations and useful specifics, without em dashes or semicolons. Everything
before Output is byte-identical to v11. The caller reference and OpenAPI wording
match; ingestion still truncates only beyond 400 characters and has the same
four rejection rules. The [evaluation](docs/prompt-evaluations/v12.md) contains
72 actual generations on reconstructed notes with GPT-6 Astra, not production
Claude or the live search workflow. It supports the writing revision, not a
claim about production quality or scoring. The reusable update process is in
[the repository skill](.agents/skills/newsworthy-prompt-update/SKILL.md).

**v13 sets the widget sentence budget to 140 characters.** The user chose this
limit after rejecting the unpublished 100-character proposal as too aggressive.
Only the character budget changes from v12; writing guidance, rating instructions,
provenance and ingestion behavior remain. Caller and OpenAPI descriptions agree.
The [record](docs/prompt-evaluations/v13.md) separates the initial 100-character
writing experiment from the selected 140-character limit. Neither a measured
95% fit rate nor native widget verification is claimed.

**v15 makes the sentence calm and plain for a non-expert.** Live readings read
as dense and expert-facing: three figures and two terms of art in one sentence.
Only Output's writing guidance changes: a reader with no background, what the
development means for daily life, at most one number, jargon explained or
dropped. The 120/140-character budget and everything before Output are v14's.
The [record](docs/prompt-evaluations/v15.md) compares v14 and v15 on eight cards
with fresh Claude generations, not the production research workflow.

**v16 gives the age reserve back to the sentence.** The app's only prefix is now a
bold "New:" on a new development, five characters, so the body budget rises from
120 to 135 and the reserve falls from 20 to 5. Everything else, writing guidance
included, is v15's. The [record](docs/prompt-evaluations/v16.md) compares v15 and
v16 on the same eight cards: v16 spent the room keeping caveats v15 had cut.

**v17 fixes house style so two readings of the same kind of news read alike.**
Stored and evaluated sentences wrote the same thing several ways: "January 10"
beside "Jan 10", "United States" beside "US" and "American", "100 percent"
beside "100%", "the Federal Reserve" beside "the Fed", "Poland says" beside
"Saudi Arabia said", NATO spelled out in some runs. Output now ends with one
terse style line covering dates and months, short names, digits, other
currencies in dollars, `said` for claims, US spelling and straight
apostrophes. Dates, years and ordinals no longer count toward the one-figure
rule. A draft under the flat rule cut "first increase since 2023" to "first
time in years". The rest of Output is v16's verbatim.

The prompt is 2,253 characters. Rule 7's limit is now read from
`PROMPT-RULES.md`, which says what to do when an improvement does not fit:
write it tersely and tighten existing wording first, and propose a raise to
the owner only when that cannot make room. The owner approved 2,300 for a
looser first draft of v17. A style reference file served beside the prompt
was tried and dropped because it would grow without that check. The
[record](docs/prompt-evaluations/v17.md) holds the catalog.

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
npm test        # every test/*.test.js; database tests run against PGlite,
                # real Postgres in-process, so the SQL is exercised not mocked
                # test/with-server.js is the shared harness, not a suite
npm start       # needs DATABASE_URL; NEWSWORTHY_MOCK=1 avoids API calls
```

No count of files or tests is kept here: it is wrong again after the next PR,
and a stale number read as authoritative is worse than none.

**The story timeline** is off by default (`timeline` in `preferences.js`), one
entry per development ordered by `opened`, one week long. See
`docs/story-timeline.md` before changing it.

**The “New:” label.** It marks the first coverage of the sentence’s development,
for two hours from the reading’s `created_at`, not the score’s decay anchor or a
verified event date. It is bold and otherwise styled as the sentence, on the web,
in the apps and in both widgets. The 140-character display budget includes it;
prompts v16 and later reserve 5 characters for "New: " and ask for a body of at most 135.
See `docs/story-age.md` for the caller sequence, compatibility and verification limits.
