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
 * The submission is three fields because everything else a caller could report
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
  "explanation": "<one sentence, at most 25 words>"
}
\`\`\`

A caller that cannot POST, or cannot set headers, uses the GET form instead. It
is an ordinary fetch, so any client that can retrieve a URL can submit a
reading; it is second only because a token in a URL is more exposed.

\`\`\`
GET ${baseUrl}/api/readings?token=<TOKEN>&score=<1-10>
    &explanation=<one sentence, URL-encoded>
\`\`\`

Those two fields are the whole submission. The prompt version is stamped by the
server from whatever is current, and is not a field a caller sets: a caller that
can name a version can pin one, and one did — every submission kept arriving as
v3 for hours after v4 went live, so the new prompt was simultaneously live and
inert. No model name, caller name, token count or search count is asked for or
recorded either: this app did not run the model and cannot verify any of it, so
it stores none of it rather than storing a guess. A caller that sends any of
those fields gets them named back in a \`note\` on the response, and they go
nowhere.

\`201\` means stored. \`422\` means rejected, and the message names the field at
fault; the fix is to correct that field rather than to retry unchanged.

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
\`${baseUrl}/api/instructions?format=json\`, where it is a JSON string value and
survives transport intact. A caller fetching raw bytes already has it.

----- BEGIN PROMPT -----
${prompt.text}
----- END PROMPT -----

## 4. When submission is impossible

Some sandboxes permit neither request: an interpreter with no network egress
(\`curl\` cannot resolve the host) and a browser that refuses to fetch a URL the
model assembled. Both limits are deliberate, and no wording defeats them.

A caller in that position ends its reply with the payload alone, as a JSON
object, and states that it was **not** submitted and needs pasting into
${baseUrl}/admin, where the "Paste a reading" box takes it verbatim. A verdict a
human can paste in ten seconds is not a failed run. A verdict reported as
submitted when it was not is.
`;
}
