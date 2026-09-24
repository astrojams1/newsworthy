# Prompt rules

Constraints on every prompt version in `src/prompts.js`. A test enforces each
one, so a version that breaks a rule fails rather than ships.

1. Five sections, in order: Summary, Sources, Scale, Examples, Output.
2. Ten rungs, numbered 1 to 10. Each 8 words or fewer.
3. Each example is a score and a headline of 8 words or fewer.
4. Only Scale and Examples say how to rate.
5. Examples are the author's own calibration, never invented.
6. Append-only. Never edit a published version — add the next one.
7. Under the approved character limit: 2,300.

## Raising the character limit

Rule 7 keeps prompts short, and short is the default. The limit rises only with
the owner's explicit approval. Before any version goes past the limit, the
agent proposes the raise to the owner, stating:

- what the extra characters carry, quoted, and why it cannot fit in the
  current limit;
- the new prompt's length and the new limit.

A raise that has not been approved is not built into a published version. When
one is approved, the number in rule 7 changes and a row is added below. The test
for rule 7 reads the limit from this file, so the number in rule 7 is the one
enforced.

| Limit | Date | Approved for |
| --- | --- | --- |
| 2,000 | original | the first rule 7 |
| 2,300 | 2026-09-24 | v17: one-figure exceptions and a house style line (2,292 characters) |
