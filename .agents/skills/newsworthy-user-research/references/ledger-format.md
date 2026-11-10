# Research records

Keep the ledgers in `docs/user-research/`, not inside the skill. Use plain Markdown, so the evidence and decisions
stay reviewable without a service.

## Run ledger and run files

`runs.md` is an append-only index. Each row gives the run ID and link, date, scope and status. It also gives verified
observations, discussion clusters and source families, opportunity changes, and the method lesson. Status is
`complete`, `partial` or `blocked`. Complete means the scoped research finished, not that the market has been fully
researched.

Create `runs/YYYY-MM-DD-NN.md`, with the next unused daily suffix. Record:

- **Provenance:**
  - date and time zone;
  - repository base commit;
  - skill version, as a commit or hash (for a first uncommitted version, say so explicitly);
  - tools, scope, and time and query budget;
  - status and the actual stop reason.
- **Repository reconciliation:**
  - the previous run's base, the fetched-main commit and the comparison range;
  - relevant commits and diffs, and the implementation, tests and release evidence you read;
  - effects on existing opportunity IDs, coverage, status and priority, or explicitly no relevant changes.

  Keep implementation apart from deployment, native verification and availability. Record an unresolved baseline,
  and any new main changes checked before finalizing.
- **Search log:**
  - exact queries, and source, date and language filters;
  - inspected candidates and admitted evidence IDs;
  - inaccessible and excluded leads;
  - why you pivoted.

  Don't invent total-result counts, or count search hits you didn't read as reviewed.
- **Evidence:**
  - a stable `E-YYYYMMDD-NN-01` ID;
  - the canonical source-item URL or key, and the discussion or incident cluster key;
  - source family and app;
  - publication date and its basis (unknown if unavailable), and retrieval date;
  - access status;
  - locale, platform and version when stated;
  - a brief quote or paraphrase, and its locator;
  - the observed problem, consequence, workaround and requested outcome, and the researcher's inference.

  Use unknown for absent facts. Include limits, counterevidence and linked opportunity IDs. Repeated evidence links
  to its original run rather than getting a new independent vote.
- **Synthesis:** needs, a comparison with what is built and available now, evidence strength, counterexamples and gaps.
  Keep observed demand apart from inferred feature solutions. Link the opportunities changed and explain why.
- **Retrospective:**
  - productive and unproductive tactics;
  - deduplication decisions;
  - changes to the skill or references, or none and why;
  - the proposed next search experiment, and how its yield would be judged.

  Compare against the previous experiment when it applies. Log failed hypotheses as well as improvements.

A correction appends a dated note with the original evidence ID and its effect on counts and priorities. Retractions
stay visible. Don't copy whole threads.

## Opportunity ledger

`opportunities.md` holds a ranked table for the next decisions. Then come stable `OPP-001` entries and dated history.
Each entry includes:

- **Need.** The unmet need, its context and the desired outcome.
- **Action.** `add`, `remove`, `change` or `preserve`, with the concrete proposed behavior.
- **Current coverage.** `already served`, `partly served`, `gap`, `unknown` or `outside scope`, backed by repository
  paths and release status.
- **Status.** `candidate`, `validate`, `planned`, `implemented`, `declined` or `superseded`. Only an explicit product
  decision justifies `planned`. Only real implementation evidence justifies `implemented`. Keep superseded IDs and
  point to the surviving entry. Research alone does not authorize development.
- **Evidence.** Supporting and conflicting evidence IDs, linked to run sections. Give unique observations and
  independent discussion and source-family counts, with their limits. Never count a second run of the same source as
  corroboration.
- **Confidence.** In the **problem** and in the **solution**, separately (`low`, `medium`, `high`), each explained.
  Confidence is not a population estimate.
- **Priority reasoning.** Consequence and severity, recurrence and recency, fit, existing coverage, rough effort and
  unknowns, and risk. Avoid numbers more precise than the sample can support.
- **Test.** The smallest useful experiment, its success criterion and the result that would disprove it.
- **History.** First and last reviewed run, and dated rank, status and reason history. Record material evidence
  additions even when the rank is unchanged.

An empty add, remove or change category is valid. Record why no evidence supports it. Keep existing value and
declined requests visible without inflating the ranked list to build. Don't turn absent ads into an instruction to
remove ads. Don't turn a wish for local emergency information into a promise about the global score.
