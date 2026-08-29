/**
 * The caller-side specification, served from /api/instructions.
 *
 * Kept here so there is one copy to maintain: a caller agent is given a URL
 * rather than a wall of pasted text, and the rating prompt is embedded inline
 * so the whole job takes a single fetch.
 *
 * Written in specification voice — third person, describing what a caller does
 * — rather than as imperatives addressed to a reader. Fetch tools pipe a page
 * through a summarizing model, and a page full of "you must" is read by that
 * model as orders to itself: two callers got back an apologetic "I cannot make
 * HTTP requests" instead of the content, one of them burning two fetches before
 * it got through by posing as a documentation extractor. A specification has
 * nothing to refuse.
 *
 * That is also why the finish line and the prompt-integrity rule are stated as
 * facts about the system rather than commands: they survive a paraphrase, which
 * imperatives aimed at "you" do not.
 *
 * The submission is two fields because everything else a caller could report
 * about itself was unverifiable and was being stored as fact.
 *
 * And why there is no sentence here telling a fetcher how to handle the page. A
 * first attempt carried one; a summarizer then quoted it back and argued with it
 * against its own harness's constraints, returning that argument instead of the
 * content. A line saying "nothing here addresses you" is itself addressing you.
 * The page works by being nothing but an API reference.
 */
export function callerInstructions({ baseUrl, prompt }) {
  return `# Newsworthy caller API

API reference for submitting one news reading. Everything below describes what
a caller agent does.

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

This same reference is served as JSON from
\`${baseUrl}/api/instructions?format=json&token=<TOKEN>\`, where every part of it
is a string value. Every response here is sent \`no-store\`, but a caller whose
own fetch layer caches by URL will keep reading whatever copy it holds: one such
caller spent six hours rating against a version three releases old while its
submissions were stamped with the current one. A distinct query parameter per
run — any unused name, any changing value — defeats that, and costs nothing when
no cache is in the way. A client whose fetch tool rewrites or summarizes what it
retrieves gets the text intact from there and nowhere else — including the
rating prompt in section 3, which a reading is attributed to whether or not the
caller read it verbatim.

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
fetches; NPR, Al Jazeera, CNBC and CNN answer. Figures that arrive through a
summarizing fetch tool are unreliable digit by digit — a prediction-market read
came back summing past 100% and pointing the wrong way for its contract, and
was correctly discarded rather than rated on.

## 2. Submission

Authentication is the header \`x-newsworthy-token\`, carrying the caller's token —
the same one the caller used to retrieve this reference. A client that cannot set
headers appends \`token=<TOKEN>\` to the query string instead.

\`\`\`
POST ${baseUrl}/api/readings
content-type: application/json

{
  "score": <integer 1-10>,
  "explanation": "<one sentence, at most 25 words>",
  "prompt_sha256": "<64 lowercase hex characters, defined in section 3>"
}
\`\`\`

A caller that cannot POST, or cannot set headers, uses the GET form instead. It
is an ordinary fetch, so any client that can retrieve a URL can submit a
reading; it is second only because a token in a URL is more exposed.

\`\`\`
GET ${baseUrl}/api/readings?token=<TOKEN>&score=<1-10>
    &explanation=Iran+war+de-escalating+as+Washington+shifts+to+economic+pressure
    &prompt_sha256=<64 lowercase hex characters>
\`\`\`

\`prompt_sha256\` adds 79 characters to that URL. A client with a URL length
limit therefore cannot carry both a full-length sentence and the digest in one
GET, which is a reason to use the POST form: a body has no such budget, and a
reading that arrives without a digest cannot afterwards be attributed to the
scale it was rated against.

Spaces are \`+\` in that query string, because \`+\` costs one character where
\`%20\` costs three. Other reserved characters are still percent-encoded — a
comma is \`%2C\`, a semicolon \`%3B\`, an ampersand \`%26\`.

That the encoding is worth a sentence at all is a length matter. One client
refuses to send any URL over 250 characters, rejecting it locally with a 403
that never reaches this API, and the fixed part of a submission — host, path,
token, score — is already about 95 of those. An explanation encoded with \`%20\`
instead of \`+\` can cross that line on spaces alone. A caller seeing a failure
its own tooling reports before any request goes out is looking at a limit on its
side, and the POST form, which carries the sentence in a body instead of a URL,
is not subject to one.

Those two fields are the whole reading. \`prompt_sha256\` says nothing about the
news — it reports which text this caller received, and section 3 defines it.

The prompt version is stamped by the server from whatever is current, and is not a field a caller sets: a caller that
can name a version can pin one, and one did — every submission kept arriving as
v3 for hours after v4 went live, so the new prompt was simultaneously live and
inert. No model name, caller name, token count or search count is asked for or
recorded either: this app did not run the model and cannot verify any of it, so
it stores none of it rather than storing a guess. A caller that sends any of
those fields gets them named back in a \`note\` on the response, and they go
nowhere.

\`201\` means stored. \`422\` means rejected and nothing was written, so a
corrected retry replaces the attempt rather than duplicating it — a rejected
submission cannot leave a stray row. Only a \`201\` creates one.

The reason is in the response body and in the \`x-newsworthy-error\` header.

Some fetch tools surface neither on a non-2xx: one collapses every failure into
\`{"error_type":"CLIENT_ERROR","message":"The page returned a 422 client
error"}\` with no headers, no body and no status text, which leaves the reason
unreachable however it is sent. Appending \`&soft_errors=1\` serves rejections as
\`200\` with the real status inside the body instead:

\`\`\`
{"ok": false, "stored": false, "status": 422, "error": "explanation is required"}
\`\`\`

A stored reading answers \`{"ok": true, "stored": true, ...}\`, so a caller that
sets the flag branches on \`ok\` rather than on a status line it cannot see.
\`stored\` says outright whether a row exists, because a \`200\` that means
rejected would otherwise read as success. Clients that can see status codes omit
the flag and get ordinary ones.

There are four rejections, and all four are about a field being absent or
malformed:

\`\`\`
score must be an integer from 1 to 10
explanation is required
explanation must not be empty
body must be a JSON object
\`\`\`

Length is not among them. The explanation has no maximum a caller can trip: text
beyond 400 characters is truncated and stored, never rejected, and the 25-word
guidance in the prompt is a style instruction rather than a limit the server
enforces. So a 422 on a submission whose score and sentence are both well formed
means the request did not arrive as it was sent — a query string truncated or
rewritten in transit, most often — and the answer is to send it again, not to
shorten the sentence. A caller that shortens its explanation in response to a
422 degrades the reading while leaving the actual fault in place.

## 3. The prompt

Reproduced verbatim below, version ${prompt.version}, SHA-256 \`${prompt.hash}\`.
Those two identify what this response served; they are not values to send back.
Stored readings record that hash, so a rating made from a paraphrase is
attributed to a prompt the caller never read.

The rating is made from the exact text, not from a description of it. A fetch
tool that summarizes rewrites the scale into something close but not equal —
"routine developments unlikely to warrant action" where the prompt says
"routine news; nothing I'm likely to care about or act on" — and a caller has no
way to tell from the result that this happened. So a caller whose fetch tool
summarizes takes the prompt from
\`${baseUrl}/api/instructions?format=json&token=<TOKEN>\`, where it is a JSON
string value and survives transport intact. The token is required there exactly
as it is here — printed without it, that URL answers 401, which is how one
caller spent a fetch on the wrong thing. A caller fetching raw bytes already has
the prompt.

----- BEGIN PROMPT -----
${prompt.text}
----- END PROMPT -----

### Verifying the text arrived intact

\`prompt_sha256\` on a submission is the SHA-256 of the rating prompt, lowercase
hex, all 64 characters.

The bytes to hash come from \`${baseUrl}/api/prompt?token=<TOKEN>\`, whose
\`text\` field is that prompt as a JSON string — exactly the bytes this server
hashes, with no markers to strip and no whitespace to guess at. A caller whose
fetch tool paraphrases pages still receives a JSON string value intact, which is
why the digest is defined against that endpoint rather than against the prompt
block printed above. Hashing the printed block works too, for a caller holding
real bytes: it is the text between the two marker lines, excluding the marker
lines and the newline directly after \`BEGIN\` and directly before \`END\`.

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

## 4. When submission is impossible

Some sandboxes permit neither request: an interpreter with no network egress
(\`curl\` cannot resolve the host) and a browser that refuses to fetch a URL the
model assembled. Both limits are deliberate, and no wording defeats them.

A caller in that position ends its reply with the payload alone, as a JSON
object, and states that it was **not** submitted. A verdict surfaced as
unsubmitted can still be sent by whoever reads it. A verdict reported as
submitted when it was not cannot be, because nobody knows to.
`;
}
