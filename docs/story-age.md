# The “New:” label

A reading can say **New:** The Fed raised rates a quarter point. The label, in
bold, means this reading is Newsworthy’s first coverage of that development. It
stays for two hours after the reading was saved and then comes off. It is not a
verified event date or a claim that the broader story, such as inflation, is new.
After that the sentence leads with how long ago it was first reported, in the
muted colour: **5h —**, then **1d —** from a day. The time below it, “Checked 3
min ago”, says when Newsworthy last looked at the news.

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

Since 2026-09-27 a judged re-report does not show its own rewording: the page
shows the sentence of the reading that started its development's current clock,
word for word (`sentenceFor()` in `src/current.js`). The label still follows the
newest reading's judgement, so a re-report carries none, as before.

Since 2026-09-27 that age is back, as a quiet prefix. A development can hold the
page for a day or more with the same sentence, and with nothing after “New:” an
hour-old sentence and a day-old one looked the same. The owner chose the form
from prototypes: a short muted age leading the sentence, no badge or extra line.
“Updated” became “Checked” at the same time, because the time printed is when the
news was last checked, not when the sentence changed.

## Caller sequence

1. Fetch current instructions and compute their prompt digest.
2. Research current reporting, choose the score using the unchanged scale and
   write the final sentence, all without any stored history. Prompts v16 and
   later allow 135 characters for the body and reserve 5 for the label, so the
   budget does not depend on whether the development turns out to be new.
3. Fetch `/api/developments`: the story names on record and the developments
   recorded over 48 hours. It is read-only, and it is the only history the
   caller sees.
4. Answer the judge prompt, printed in the instructions after the rating prompt,
   about the reading against that record: `development_of` (a listed id, or null for a new
   development), `story`, `note`, and the judge prompt's `judge_version`.
5. Submit score, sentence, prompt digest and that `judgement` together to
   `/api/readings`. The reading is stored already judged; a null answer shows
   its sentence with `New: ` at once. Newsworthy calls no model.
6. Post a run report to `/api/runs`, as every run does, submitted or not.

The id is checked against the developments on record when the reading arrives,
and the version stamped is the server's own; an answer to a retired version is
refused. A refused or missing answer stores the reading unjudged, with the
reason in `judge_note`, which the page reads as continuing the reading before it
— never as new. The four rejection rules and 400-character ingestion handling
are unchanged. A stored sentence always ends in punctuation: one arriving
without an end is finished with a full stop, which can take a 135-character body
to 136.

App-made ratings use the v16 body budget, unchanged since, and the existing generation-then-
judge path. An intentional `NEWSWORTHY_PROMPT_VERSION` pin remains respected.

## Display and compatibility

`/api/current` sends `explanation_text`, `explanation_new` and `explanation_at`. Clients show a bold
“New:” before `explanation_text` while `explanation_new` is true and fewer than two
hours have passed since `created_at`, recomputing as time passes. `explanation`
carries the same sentence unlabelled, so a client that shows it as-is never keeps
a stale label. `explanation_since` is no longer sent: installed builds that read
it find it missing and show no age, which is the new behaviour for re-reports;
they cannot show the label until they are replaced. `explanation_at` is a new
name for that reason: reusing `explanation_since` would have brought the old
“31 hours ago:” prefix back on those builds.

`explanation_at` is when the shown sentence's reading was saved: for a re-report,
the reading that started its development's current clock, whose sentence
`sentenceFor()` shows. It is not `since`, which dates the development the number
is about. Once “New:” is off, clients lead the sentence with its age, floored:
nothing under an hour, where “Checked” says as much, then “1h —” to “23h —”, then
“1d —” and on. A response or cache without `explanation_at` shows no age.

Only the label’s weight changes: it keeps the sentence’s colour and size, so it
reads as part of the sentence rather than a badge. The age changes only colour,
to the muted text colour the timestamp uses. Share text carries either as plain
text. Overlong legacy sentences are shortened with an ellipsis only for display,
within 140 characters including the prefix; storage is unchanged. “23h — ” is six
characters, one over the five prompts reserve, so a 135-character body loses its
last word to an ellipsis for those hours.

Android cannot tint part of a widget sentence with a colour span: the span keeps
the old theme's colour after a theme switch. It stacks a second TextView,
`widget_explanation_age`, on the sentence with identical text and settings. Each
layer hides the other's part with a transparent span, and both take their colours
from theme resources. Counting uses
Unicode code points consistently.

The app advances its display clock every 30 seconds. The iOS widget adds a
timeline entry at the label’s two-hour mark and at each of the next twelve hours
of the sentence's age; Android redraws on its 30-minute periodic worker, so there
the label, or an hour of age, can lag by up to 30 minutes. Actual
widget timing remains subject to the operating system.

## Verification boundary

The writing comparison and its limitations are in
[prompt evaluation v16](prompt-evaluations/v16.md). Tests cover the two-hour
boundary, Unicode budgets, the judged/new rule, the caller's judgement, API fields and
rendered app props (a bold label nested in the sentence) on all three platforms.
The age adds tests for its boundaries, budget, API field and rendered props (a
muted age nested in the sentence) on all three platforms; the web export was
checked in Chromium in light and dark (`store/source/story-age/web-sentence-age.png`).
The Swift formatter cases were updated but not compiled here (no Swift toolchain).
The Android widget sources compile and link, but the stacked age layer has not
been seen on a device. Native visual parity and a replacement mobile release are
not established by these checks; see `store/story-age-verification.json`.
