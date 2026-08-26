/**
 * The caller-side instructions, served from /api/instructions.
 *
 * Kept here so there is one copy to maintain: a caller agent is given a URL
 * rather than a wall of pasted text, and the rating prompt is embedded inline
 * so the whole job takes a single fetch. Base URL comes from the request, so
 * this is correct on any deployment without configuration.
 */
export function callerInstructions({ baseUrl, prompt }) {
  return `# Newsworthy — produce one reading

Your job: rate the current news 1-10, write one sentence, and submit it.

## 1. Rate

Run the prompt between the markers below, with **web search enabled**, and
answer it exactly as it asks.

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

**Only if you cannot send a body or set headers**, submit the same reading as a
plain GET — a token in a URL is exposed in logs and history, so this is a
fallback, not a preference:

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

Only \`score\` and \`explanation\` are required. Reporting \`usage\` is what lets
this app price your run and show it separately from its own spend.
`;
}
