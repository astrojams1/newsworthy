# Age of the sentence’s development

A reading can say **31 hours ago: The Fed raised rates a quarter point.** The age
means time since Newsworthy first covered that development. It is not a verified
event date or the age of a broader story such as inflation. The separate update
time remains the time the reading was saved.

The score still follows the existing smoothing and decay rules. Its winning
development can differ from the newest sentence’s development. Sentence age
therefore follows the newest row’s stored `development_of` root, never the score’s
`since` anchor. Roots can predate the 48-hour judge window. Unjudged readings and
missing roots have unknown age and no prefix. A reading that opens a new
development has no prefix either: its first coverage is the reading itself, and
the update time already dates it, so `explanation_since` is null. The prefix
appears when a later reading re-reports that development. Historical judgements
and stored sentences are not rewritten.

## Caller sequence

1. Fetch current instructions and compute their prompt digest.
2. Research current reporting, choose the score using the unchanged scale and
   draft the sentence independently of historical readings.
3. Send the draft and score to authenticated `/api/readings/prepare`. Newsworthy
   performs the existing development match and returns first coverage, a sample
   prefix, the character budget and an opaque preparation reference.
4. Finalize the same development’s sentence without changing its facts or score.
   Prompt v14 allows 120 characters for the body and reserves 20 for the app’s
   prefix. The complete displayed sentence remains within 140 characters,
   including spaces and punctuation. No prefix is submitted as prose.
5. Submit score, final sentence, preparation reference and computed prompt digest.
   Confirm the 201/stored response. Preparation alone never saves a reading or
   suppresses a scheduled run.

The match is saved once and reused, so shortening cannot accidentally reset its
age. References are server-backed, score/version-bound, single use and expire
in 30 minutes. A missing, invalid or expired reference falls back to ordinary
judging; the existing four rejection rules and 400-character ingestion handling
are unchanged. A stored sentence always ends in punctuation: one arriving without
an end is finished with a full stop, which can take a 120-character body to 121. The original draft is retained alongside the final text for audit.
A caller changing the event must prepare again. A new development starts its
coverage clock when the final reading is stored. Unsubmitted drafts are removed
after a day on subsequent preparations. Their judge calls can incur cost but are
not included in saved-reading spend totals.

App-made ratings use the same v14 body budget and the existing generation-then-
judge path; the body already reserves the prefix before that judgement. An
intentional `NEWSWORTHY_PROMPT_VERSION` pin remains respected.

## Display and compatibility

`/api/current` sends a complete `explanation` for existing clients, plus raw
`explanation_text` and nullable `explanation_since`. Updated clients recompute
from those fields as time passes. Old caches with no metadata retain their
existing explanation without adding a second prefix. Existing installed clients
receive the prefix on their next successful refresh but need a replacement native
build to advance it locally while offline.

Formatting uses whole minutes, whole hours below 48 hours, whole days below a
year, then years. Less than a minute is “Just now:”. Invalid or future timestamps
have no prefix. Overlong legacy sentences are shortened with an ellipsis only for
display; storage is unchanged. Counting uses Unicode code points consistently.

The active app advances its display clock every 30 seconds. The iOS widget
schedules local timeline entries for a day; Android renders cached age on its
periodic worker even without connectivity. Actual widget timing remains subject
to the operating system; neither widget promises a continuous offline clock.

## Verification boundary

The writing comparison and its limitations are in
[prompt evaluation v14](prompt-evaluations/v14.md). Tests cover age boundaries,
Unicode budgets, root lookup, preparation lifecycle, independent score/sentence
origins, API normalization and rendered app props on all three platforms. The
production Swift store and formatter are compiled and exercised separately.
Native visual parity, Android execution and a full replacement mobile release
are not established by these checks; see `store/story-age-verification.json`.

The PR copy review covers README, product messaging, support, public AI-reader
facts, caller/API/skill contracts, metadata and store sources. Existing metadata
and store descriptions remain valid without promising the new offline behavior
in installed builds. Historical screenshots and build-specific review notes are
retained as release evidence, not relabeled as current source verification.
