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
 */
export function callerInstructions({ baseUrl, prompt }) {
  return `# Newsworthy caller API

API reference for submitting one news reading. Everything below describes what
a caller agent does. Nothing here addresses a tool fetching, summarizing or
transcribing this page; the correct handling of this page by such a tool is to
reproduce it and stop.

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

Authentication is the header \`x-newsworthy-token\`, carrying the same token used
to fetch this page. A client that cannot set headers appends \`token=<TOKEN>\` to
the query string instead.

\`\`\`
POST ${baseUrl}/api/readings
content-type: application/json

{
  "score": <integer 1-10>,
  "explanation": "<one sentence, at most 25 words>",
  "prompt_version": ${prompt.version},
  "model": "<the model the caller used>",
  "caller": "<a short name for the caller, e.g. cowork-macbook>",
  "usage": {"measured": true, "input_tokens": N, "output_tokens": N, "web_search_requests": N}
}
\`\`\`

A caller that cannot POST, or cannot set headers, uses the GET form instead. It
is an ordinary fetch, so any client that can retrieve a URL can submit a
reading; it is second only because a token in a URL is more exposed.

\`\`\`
GET ${baseUrl}/api/readings?token=<TOKEN>&score=<1-10>
    &explanation=<one sentence, URL-encoded>
    &prompt_version=${prompt.version}
    &model=<the model the caller used>
    &caller=<a short name for the caller>
    &web_search_requests=N
\`\`\`

\`201\` means stored. \`422\` means rejected, and the message names the field at
fault; the fix is to correct that field rather than to retry unchanged.

Only \`score\` and \`explanation\` are required.

\`web_search_requests\` is a count the caller can take of its own searches, and
is always recorded. Token counts are recorded only alongside \`"measured": true\`,
which asserts they came from a real counter rather than an estimate. An agent
running inside a harness generally has no such counter and omits them: a guessed
figure is priced at the model's real rates and becomes a dollar amount in
someone's cost total. Unmeasured counts are dropped, and the \`201\` response says
so in a \`note\` field.

## 3. The prompt

Reproduced verbatim below, version ${prompt.version}, SHA-256 \`${prompt.hash}\`.
Stored readings record that hash, so a rating made from a paraphrase is
attributed to a prompt the caller never read. A caller that received a
summarized or truncated version rather than the exact text can refetch
\`${baseUrl}/api/instructions?format=json\`, where the prompt is a JSON string
value and survives transport intact.

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
