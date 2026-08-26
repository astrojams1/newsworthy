/**
 * The caller-side instructions, served from /api/instructions.
 *
 * Kept here so there is one copy to maintain: a caller agent is given a URL
 * rather than a wall of pasted text, and the rating prompt is embedded inline
 * so the whole job takes a single fetch. Base URL comes from the request, so
 * this is correct on any deployment without configuration.
 *
 * The embedded prompt ends by demanding a single JSON object and nothing else.
 * A caller agent reads that as its final instruction and stops, having produced
 * a verdict it never submits — observed in the wild. So the wrapper has to say
 * plainly that the object is a payload, and that the job ends at a 201.
 */
export function callerInstructions({ baseUrl, prompt }) {
  return `# Newsworthy — produce one reading

Rate the current news 1-10, write one sentence, and submit it to this app.

**You are finished when a submission returns \`201\`, and not before.** Rating is
the first of two steps. If you end with a score in hand and nothing submitted,
the job failed: the app never sees your work, and it pays for its own run
instead.

## 1. Rate

Run the prompt between the markers below, with **web search enabled**, and
answer it exactly as it asks.

The prompt ends by telling you to reply with a single JSON object and nothing
else. That fixes the *shape* of the verdict; it does not end your work. The
object is the payload for step 2, not your answer to whoever asked you to do
this. Hold on to it and keep going.

If web search fails or comes back with nothing, **stop and submit nothing**. A
score you could not research is worse than no score, and this app cannot detect
that from your submission — only you can.

----- BEGIN PROMPT (version ${prompt.version}, ${prompt.hash}) -----
${prompt.text}
----- END PROMPT -----

## 2. Submit

Authenticate with the header \`x-newsworthy-token\`, using the same token you
used to fetch these instructions. If your client cannot set headers, append
\`token=<TOKEN>\` to the query string instead.

**Try this first:**

\`\`\`
POST ${baseUrl}/api/readings
content-type: application/json

{
  "score": <the integer you decided, 1-10>,
  "explanation": "<your sentence>",
  "prompt_version": ${prompt.version},
  "model": "<the model you used>",
  "caller": "<a short name for yourself, e.g. cowork-macbook>",
  "usage": {"input_tokens": N, "output_tokens": N, "web_search_requests": N}
}
\`\`\`

**If you cannot POST, or cannot set headers, use this instead.** It is an
ordinary GET, so any client that can fetch a URL can submit a reading. Do not
give up because POST is unavailable — a token in a URL is more exposed, which
is the only reason it is second:

\`\`\`
GET ${baseUrl}/api/readings?token=<TOKEN>&score=<1-10>
    &explanation=<your sentence, URL-encoded>
    &prompt_version=${prompt.version}
    &model=<the model you used>
    &caller=<a short name for yourself>
    &input_tokens=N&output_tokens=N&web_search_requests=N
\`\`\`

\`201\` means it was stored. \`422\` means it was rejected and the message says
why — read it and fix the field rather than retrying unchanged.

**If your own client refuses to send either request**, do not silently drop the
reading and do not report success. Two sandbox limits cause this and neither is
something you can talk your way past: an interpreter with no network (\`curl\`
fails to resolve the host) and a browser that will not fetch a URL the model
assembled. Both are deliberate.

When that happens, end your reply with the payload on its own, as a JSON object
and nothing else, and state that it was **not** submitted and needs pasting into
${baseUrl}/admin — the "Paste a reading" box takes it verbatim. A verdict a
human can paste in ten seconds is not a failed run; a verdict reported as
submitted when it was not is.

Only \`score\` and \`explanation\` are required. Reporting \`usage\` is what lets
this app price your run and show it separately from its own spend.

## 3. Report back

Say which status code you got and what you submitted. A score reported on its
own reads as success even when nothing was stored.
`;
}
