# Prompt rules

Constraints on every prompt version in `src/prompts.js`. A test enforces each
one, so a version that breaks a rule fails rather than ships.

1. Five sections, in order: Summary, Sources, Scale, Examples, Output.
2. Ten rungs, numbered 1 to 10. Each 8 words or fewer.
3. Each example is a score and a headline of 8 words or fewer.
4. Only Scale and Examples say how to rate.
5. Examples are the author's own calibration, never invented.
6. Append-only. Never edit a published version — add the next one.
7. Under 2,000 characters.
