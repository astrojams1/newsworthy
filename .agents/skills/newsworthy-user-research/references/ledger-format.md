# Research records

Keep the ledgers in `docs/user-research/`, not inside the skill. Use ordinary
Markdown so the evidence and decisions stay reviewable without a service.

## Run ledger and run files

`runs.md` is an append-only index with run ID/link, date, scope, status, verified
observations/discussion clusters/source families, opportunity changes and method
lesson. Status is `complete`, `partial`, or `blocked`; complete means the scoped
research finished, not that the market has been exhaustively researched.

Create `runs/YYYY-MM-DD-NN.md`, choosing the next unused daily suffix. Record:

- **Provenance:** date/time zone, repository base commit, skill version (commit or
  hash; for a first uncommitted version identify that explicitly), tools, scope,
  time/query budget, status and actual stop reason.
- **Repository reconciliation:** previous run's base, fetched-main commit and
  comparison range; relevant commits/diffs and inspected implementation, tests
  and release evidence; effects on existing opportunity IDs, coverage, status
  and priority (or explicitly no relevant changes). Separate implementation from
  deployment, native verification and availability. Record an unresolved baseline
  and any intervening main changes checked before finalizing.
- **Search log:** exact queries, source/date/language filters, inspected candidates,
  admitted evidence IDs, inaccessible/excluded leads and pivot rationale. Do not
  invent total-result denominators or count uninspected search hits as reviewed.
- **Evidence:** stable `E-YYYYMMDD-NN-01` IDs; canonical source-item URL/key;
  discussion/incident cluster key; source family and app; publication date and
  its basis (unknown if unavailable); retrieval date; access status; locale,
  platform and version when stated; brief quote/paraphrase and locator; observed
  problem, consequence, workaround, requested outcome and researcher inference.
  Use unknown for absent facts. Include limits, counterevidence and linked
  opportunity IDs. Repeated evidence links to its original run rather than
  acquiring a new independent vote.
- **Synthesis:** needs, current implementation/availability comparison, evidence
  strength, counterexamples and gaps. Distinguish observed demand from inferred
  feature solutions. Link opportunities changed and explain why.
- **Retrospective:** productive and unproductive tactics, deduplication decisions,
  changes to skill/references (or none and why), proposed next search experiment
  and how its yield would be assessed. Compare against the previous experiment
  when applicable; log failed hypotheses as well as improvements.

Corrections append a dated note with the original evidence ID and effect on
counts/priorities. Retractions remain visible. Do not copy entire threads.

## Opportunity ledger

`opportunities.md` contains a ranked table for the next decisions, followed by
stable `OPP-001` entries and dated history. Each entry includes:

- Unmet need, affected context and desired outcome.
- Action: `add`, `remove`, `change`, or `preserve`; concrete proposed behavior.
- Current coverage: `already served`, `partly served`, `gap`, `unknown`, or
  `outside scope`, supported by repository paths and release status.
- Status: `candidate`, `validate`, `planned`, `implemented`, `declined`, or
  `superseded`. Only explicit product decisions justify `planned`; only actual
  implementation evidence justifies `implemented`. Preserve superseded IDs and
  point to the surviving entry. Research alone does not authorize development.
- Supporting and conflicting evidence IDs linked to run sections; unique
  observations and independent discussion/source-family counts, including
  limitations. Never count a second run of the same source as corroboration.
- Confidence in **problem** and **solution**, separately (`low`, `medium`, `high`),
  each explained. Confidence is not a population estimate.
- Priority reasoning: consequence/severity, recurrence/recency, fit, existing
  coverage, approximate effort/unknowns and risk. Avoid numerical precision that
  the sample cannot support.
- Smallest useful experiment, success criterion and disconfirming result.
- First/last reviewed run and dated rank/status/reason history. Record material
  evidence additions even when the rank is unchanged.

An empty add/remove/change category is valid. Record why no evidence supports
it. Keep existing value and declined requests visible without inflating the
ranked implementation list. Do not turn absent ads into an instruction to remove
ads, or a desire for local emergency information into a global-score promise.
