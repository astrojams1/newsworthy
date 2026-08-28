# Prompt rules

Constraints on every prompt version in `src/prompts.js`. A test enforces each
one mechanically, so a version that breaks a rule fails rather than ships.

1. Four sections, in order: Summary, Sources, Scale, Output.
2. Ten rungs, numbered 1 to 10.
3. Each rung is 8 words or fewer.
4. Rung text is the author's verbatim. Never rephrase it.
5. Append-only. Never edit a published version — add the next one.
6. Under 2,000 characters.

Rationale lives in `CLAUDE.md`. Calibration evidence lives in `CALIBRATION.md`.
