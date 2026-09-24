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

## When an improvement does not fit

The limit is not a reason to drop an improvement, and not by itself a reason
to ask for a bigger one. When an addition does not fit, make room:

- write the addition as tersely as it will go;
- tighten existing wording without changing what it asks for. Scale and
  Examples are the author's and stay verbatim.

Only when that cannot make room does the agent propose a raise to the owner,
quoting what the extra characters carry and stating the new length and limit.
A raise is built only after approval. The number in rule 7 then changes and a
row is added below. The rule 7 test reads the limit from this file.

| Limit | Date | Approved for |
| --- | --- | --- |
| 2,000 | original | the first rule 7 |
| 2,300 | 2026-09-24 | v17: one-figure exceptions and a house style line |
