# The “New:” label

A reading can say **New:** The Fed raised rates a quarter point. The label, in
bold, means this reading is Newsworthy’s first coverage of that development. It
stays for two hours after the reading was saved and then comes off. It is not a
verified event date or a claim that the broader story, such as inflation, is new.
Every other sentence has no prefix; the update time printed beside it dates the
reading.

Until 2026-09-24 the app printed an age instead: **31 hours ago:** before a
sentence re-reporting a development covered earlier, and nothing on a new one.
The user asked for the opposite emphasis — mark what is new rather than count how
old the rest is — and for the 15 characters the age had reserved to go back to
the sentence.

The score still follows the existing smoothing and decay rules. Its winning
development can differ from the newest sentence’s development, so the label
follows the newest row’s own judgement, never the score’s `since` anchor. A
reading is new when the judge placed it (`judge_version` set) and it opened a
development (`development_of` null). An unjudged reading is never new: a judge
outage must not masquerade as a fresh story. Historical judgements and stored
sentences are not rewritten.

## Caller sequence

1. Fetch current instructions and compute their prompt digest.
2. Research current reporting, choose the score using the unchanged scale and
   draft the sentence independently of historical readings.
3. Send the draft and score to authenticated `/api/readings/prepare`. Newsworthy
   calls no model: it returns `judge_task` (the judge prompt with the recorded
   developments, story names and the draft), `judge_version`, the character
   budget and an opaque preparation reference.
4. Answer `judge_task` as the judge would: `development_of` (an offered id, or
   null for a new development), `story` and `note`. A null answer means the
   sentence is shown with `New: `.
5. Finalize the same development’s sentence without changing its facts or score.
   Prompts v16 and later allow 135 characters for the body and reserve 5 for the label.
   The complete displayed sentence remains within 140 characters, including
   spaces and punctuation. No label is submitted as prose.
6. Submit score, final sentence, preparation reference, judgement and computed
   prompt digest.
   Confirm the 201/stored response. Preparation alone never saves a reading or
   suppresses a scheduled run.

The task's version and offered ids are saved with the reference, so the
answer is checked against what the caller was shown and the version is stamped
server-side. References are server-backed, score/version-bound, single use and
expire in 30 minutes. A missing, invalid or expired reference, no answer, or an
id the task did not offer stores the reading unjudged; the existing four rejection rules and 400-character
ingestion handling are unchanged. A stored sentence always ends in punctuation:
one arriving without an end is finished with a full stop, which can take a
135-character body to 136. The original draft is retained alongside the final text
for audit. A caller changing the event must prepare again. Unsubmitted drafts are
removed after a day on subsequent preparations. Preparation costs this app
nothing: the caller's own run answers the judge task.

App-made ratings use the v16 body budget, unchanged since, and the existing generation-then-
judge path. An intentional `NEWSWORTHY_PROMPT_VERSION` pin remains respected.

## Display and compatibility

`/api/current` sends `explanation_text` and `explanation_new`. Clients show a bold
“New:” before `explanation_text` while `explanation_new` is true and fewer than two
hours have passed since `created_at`, recomputing as time passes. `explanation`
carries the same sentence unlabelled, so a client that shows it as-is never keeps
a stale label. `explanation_since` is no longer sent: installed builds that read
it find it missing and show no age, which is the new behaviour for re-reports;
they cannot show the label until they are replaced.

Only the label’s weight changes: it keeps the sentence’s colour and size, so it
reads as part of the sentence rather than a badge. Share text carries it as plain
“New: ”. Overlong legacy sentences are shortened with an ellipsis only for display,
within 140 characters including the label; storage is unchanged. Counting uses
Unicode code points consistently.

The app advances its display clock every 30 seconds. The iOS widget adds a
timeline entry at the label’s two-hour mark; Android redraws on its 30-minute
periodic worker, so there the label can stay up to 30 minutes longer. Actual
widget timing remains subject to the operating system.

## Verification boundary

The writing comparison and its limitations are in
[prompt evaluation v16](prompt-evaluations/v16.md). Tests cover the two-hour
boundary, Unicode budgets, the judged/new rule, preparation, API fields and
rendered app props (a bold label nested in the sentence) on all three platforms.
The Swift formatter cases were updated but not compiled here, and the Android
source was not compiled. Native visual parity and a replacement mobile release are
not established by these checks; see `store/story-age-verification.json`.
