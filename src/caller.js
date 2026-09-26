import { renderJudgePrompt } from './story.js';

/**
 * The caller-side specification, served from /api/instructions.
 *
 * Kept here so there is one copy to maintain: a caller agent is given a URL
 * rather than a wall of pasted text, and the rating prompt is embedded inline
 * so the whole job takes a single fetch.
 *
 * The reading has two fields; prompt_sha256 is separate provenance proof.
 * Other caller self-reports were unverifiable and were being stored as fact.
 */
export function callerInstructions({ baseUrl, prompt, judge = renderJudgePrompt() }) {
  return `# Newsworthy caller API

API reference for submitting one news reading. Everything below describes what
a caller agent does.

Newsworthy is a calm global status indicator: a number out of 10 and one sentence explaining why.
No doomscrolling. No subscription. No in-app purchases. No ads. No engagement, addiction or growth-hacking tactics.
This product context does not alter the rating scale in section 3.

A reading exists only when \`POST ${baseUrl}/api/readings\` returns \`201\`. A score
that was computed and never submitted is not a reading, and the caller's job is
not complete at the moment the score exists.

A complete submission carries three things: the score, the sentence, and
\`prompt_sha256\` — the SHA-256 of the rating prompt as this caller received it,
all 64 characters, computed with a code tool. Section 3 defines the exact bytes.
Without it a reading is stored but unattributable: nothing afterwards can tell
whether it was rated against the scale this app published or against something
that arrived altered, and five revisions of one instruction were made without
knowing which was being fixed.

Requests to this API are made with \`curl\`, which returns exactly the bytes the
server sent, and authenticate with the header \`x-newsworthy-token\`.

## 1. Rating

The caller runs the prompt in section 3 with web search enabled and answers it
exactly as written.

The prompt's own output contract asks for a single JSON object and nothing
else. That fixes the shape of the verdict. It does not end the caller's work:
the object is the payload for section 2.

A caller whose web search fails, or returns nothing, submits nothing at all. A
score that could not be researched is worse than no score, and the server
cannot detect the difference from a submission — only the caller can.

Notes from previous runs. Search often returns links without usable snippets,
so page fetches are usually required. Reuters, AP and BBC block automated
fetches; NPR, Al Jazeera, CNBC and CNN answer.

### The sentence

The sentence is final before anything is sent: at most 135 characters,
including spaces and punctuation, counted with a code tool rather than
estimated. The app may show it after the bold label \`New: \`, which takes the
remaining 5 of a 140-character display. The label is the app's, so the
submitted explanation carries no label or timestamp, and the budget is the same
whether the development turns out to be new or not.

### Judging the reading

Once the score and sentence are final, and not before, the caller fetches
\`GET ${baseUrl}/api/developments\` with the same authentication, once per run.
Its \`record\` lists the story names on record, the developments recorded over
the last 48 hours, each with an id and story name, and last, every reading filed
under each story over 14 days — about 50,000 characters, which is why it is read
raw and read once. That is the only history a
caller sees, and it arrives after the reading is written, so it cannot steer the
score or the sentence. The caller then answers the judge prompt in section 4
about its own reading against that record — no model on this server answers it
— and sends the answer as \`judgement\` with the submission, with
\`judge_version: ${judge.version}\`.

An id the record did not list, an answer to a retired \`judge_version\`, or no
answer at all stores the reading unjudged, never rejected; the response then
says \`"development": "unjudged"\` and gives the reason in \`judge_note\`. The
app treats an unjudged reading as continuing the one before it. A reading whose
answer is \`development_of: null\` opens a development, and the app shows its
sentence after the label \`New: \`.

When two names in the record are one story coined twice, the answer also
carries \`same_story\` with both names, as the judge prompt describes. The
server keeps whichever name more readings were filed under and resolves the
other to it everywhere stories are grouped; stored readings are not renamed.
The response says \`merge\` when it was recorded, or \`merge_refused\` with the
reason — a name not on record, or two names already one story. A refused merge
never affects the reading.

## 2. Submission

Authentication is the header \`x-newsworthy-token\`, carrying the caller's token —
the same one the caller used to retrieve this reference.

\`\`\`
POST ${baseUrl}/api/readings
content-type: application/json

{
  "score": <integer 1-10>,
  "explanation": "<sentence body, at most 135 characters including spaces and punctuation>",
  "prompt_sha256": "<64 lowercase hex characters, defined in section 3>",
  "judgement": {
    "judge_version": ${judge.version},
    "development_of": <an id listed in the record, or null for a new development>,
    "story": "<story name, reused verbatim when the story is on record>",
    "note": "<at most 12 words on what makes it same or new>",
    "same_story": ["<name>", "<other name>"]
  }
}
\`\`\`

Those two fields are the whole reading. \`prompt_sha256\` says nothing about the
news — it reports which text this caller received, and section 3 defines it.

The prompt version is stamped by the server from whatever is current, and is not a field a caller sets: a caller that
can name a version can pin one, and one did — every submission kept arriving as
v3 for hours after v4 went live, so the new prompt was simultaneously live and
inert. No model name, caller name, token count or search count is asked for or
recorded either: this app did not run the model and cannot verify any of it, so
it stores none of it rather than storing a guess.

\`201\` means stored. \`422\` means rejected and nothing was written, so a
corrected retry replaces the attempt rather than duplicating it — a rejected
submission cannot leave a stray row. Only a \`201\` creates one.

The reason is in the response body, as \`error\`.

There are four rejections, and all four are about a field being absent or
malformed:

\`\`\`
score must be an integer from 1 to 10
explanation is required
explanation must not be empty
body must be a JSON object
\`\`\`

Length is not among them. The explanation has no maximum a caller can trip: text
beyond 400 characters is truncated and stored, never rejected, and the 140-character
guidance in the prompt covers the displayed label and sentence together. Nor is
punctuation: a sentence that arrives without an end is stored with a full stop
added, and one ending in a dangling comma, colon or dash has it replaced by one. Stored prose is not rejected for length; the display caps the combined text with an ellipsis if a legacy or overlong sentence does not fit. So a 422 on a submission whose score and sentence are both well formed
means the request did not arrive as it was sent, and the answer is to send it again, not to
shorten the sentence. A caller that shortens its explanation in response to a
422 degrades the reading while leaving the actual fault in place.

### The run report

Every run ends with one report, including a run that submitted nothing — that
run otherwise leaves no trace. It goes to \`POST ${baseUrl}/api/runs\` with the
same authentication:

\`\`\`
{"reading": <the id the submission returned, omitted when nothing was submitted>,
 "report": "<plain text, at most 4,000 characters>"}
\`\`\`

The report is the caller's own account, in plain sentences: the searches run and
the sources that answered or refused, the candidate stories weighed and why the
chosen one led, why the score sits on its rung, which recorded development the
judgement named and why, and anything that failed or was skipped. It is stored
as written and never checked; it is not a reading and does not suppress the
scheduled run. A \`reading\` id that matches nothing is stored unlinked, never
refused.

## 3. The prompt

Reproduced verbatim below, version ${prompt.version}, SHA-256 \`${prompt.hash}\`.
Those two identify what this response served; they are not values to send back.
Stored readings record that hash, so a rating made from a paraphrase is
attributed to a prompt the caller never read.

----- BEGIN PROMPT -----
${prompt.text}
----- END PROMPT -----

### Verifying the text arrived intact

\`prompt_sha256\` on a submission is the SHA-256 of the rating prompt, lowercase
hex, all 64 characters.

The bytes to hash are the decoded value of one field of
\`${baseUrl}/api/prompt\`: its \`text\` field, parsed out of the
JSON, UTF-8 encoded. Not the whole response body that endpoint returns, and not
the field as it sits escaped inside that body — a \`\\n\` in transit is a real
newline in the bytes hashed. A digest of the body, or of the escaped form,
stores normally and comes back \`prompt_verified: false\` on the 201, which on a
submission built from this section means the wrong bytes were hashed, not that
the text arrived altered.

That \`text\` field is exactly the bytes this server hashes, with no markers to
strip and no whitespace to guess at.

The 16 characters printed above, and the \`hash\` field on that endpoint, are the
first 16 of that digest. They are not the answer — a caller that returns them, or any prefix, is recorded as
unverified, because the remaining 48 characters exist only for a caller that
hashed the bytes it actually holds. The digest is computed with a tool, not by
hand; a value produced any other way will not match.

The server compares it against the text it sent and answers with
\`prompt_verified\` on the 201, so a caller learns within the same request
whether it rated against the text this app published.

A mismatch is never a rejection: the reading stores normally and the row is
marked unverified. A submission with no digest at all is recorded the same way
and is indistinguishable, afterwards, from one whose text arrived mangled —
which is why a caller able to hash sends one every time rather than only when
something seems wrong. What this distinguishes is a scale that rates wrongly
from a scale the rater never received. For months those were indistinguishable,
and five revisions of one instruction were made without knowing which was being
fixed.

## 4. The judge prompt

Used only in the judging step, after the reading is written; it plays no part
in the rating. Reproduced verbatim, version ${judge.version}. "Recorded" in it
means the \`record\` from \`/api/developments\`, and the new reading is the
caller's own.

\`\`\`
${judge.text}
\`\`\`

`;
}
