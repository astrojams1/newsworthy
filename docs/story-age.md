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
outage, or a reading still awaiting its caller's answer, must not masquerade
as a fresh story. Historical judgements and stored
sentences are not rewritten.

## Caller sequence

1. Fetch current instructions and compute their prompt digest.
2. Research current reporting, choose the score using the unchanged scale and
   write the final sentence, all without any stored history. Prompts v16 and
   later allow 135 characters for the body and reserve 5 for the label, so the
   budget does not depend on whether the development turns out to be new.
3. Submit score, sentence and prompt digest to `/api/readings`. The reading is
   stored at once, before any history is shown, so history cannot steer it. The
   201 carries `development: "pending"`, `judge_task` (the judge prompt with the
   developments recorded before this reading, the story names and the reading)
   and `judge_version`.
4. Answer `judge_task` at `/api/readings/judgement`: `reading`, `judge_version`,
   `development_of` (a listed id, or null for a new development), `story` and
   `note`. Newsworthy calls no model. A null answer shows the sentence with
   `New: `.

An answer is taken once, for the newest reading, within 30 minutes. It is checked
against the ids the task listed, recomputed from the rows stored before the
reading, and the version stamped is the server's own; an echoed retired version
is refused. A refused answer stores nothing and can be corrected in the window.
A reading never answered stays stored and unjudged, which the page reads as
continuing the reading before it — never as new. It is announced to devices when
its answer lands, or when a newer reading supersedes it. The four rejection rules
and 400-character ingestion handling are unchanged. A stored sentence always ends
in punctuation: one arriving without an end is finished with a full stop, which
can take a 135-character body to 136.

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
boundary, Unicode budgets, the judged/new rule, the judgement window, API fields and
rendered app props (a bold label nested in the sentence) on all three platforms.
The Swift formatter cases were updated but not compiled here, and the Android
source was not compiled. Native visual parity and a replacement mobile release are
not established by these checks; see `store/story-age-verification.json`.
