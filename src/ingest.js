import { latestVersion, renderPrompt } from './prompts.js';

/**
 * Validation for readings submitted by an external caller agent.
 *
 * A submission carries a score, a sentence, and which prompt version produced
 * them. Nothing else. The prompt's hash and text come from our own registry
 * rather than the request, so a stored reading stays traceable to a prompt we
 * can reproduce.
 *
 * Everything a caller could once report about itself — model, name, token
 * counts — is gone, because none of it was verifiable and all of it was
 * treated as fact. A caller with no counter estimated 85,000 input tokens,
 * which priced at Opus rates put $0.48 of invented spend in a real total, and a
 * self-chosen name meant the source column read 'unnamed-agent' one run and
 * 'cowork-cloud-scheduled' the next. Model, usage and cost are recorded only
 * for runs this app made itself, where they are measured. Source is set here,
 * never sent.
 */
const MAX_EXPLANATION = 400;

class SubmissionError extends Error {}

const fail = (message) => {
  throw new SubmissionError(message);
};

function cleanString(value, { field, max, required = false }) {
  if (value === undefined || value === null) {
    if (required) fail(`${field} is required`);
    return null;
  }
  if (typeof value !== 'string') fail(`${field} must be a string`);
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) {
    if (required) fail(`${field} must not be empty`);
    return null;
  }
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Some agents have only a plain GET fetch — no custom headers, no request
 * body. Their submission arrives as query parameters instead, which this maps
 * onto the same shape so it goes through exactly the same validation.
 */
export function submissionFromQuery(params) {
  const body = {};
  for (const field of ['score', 'explanation', 'prompt_version']) {
    const value = params.get(field);
    if (value !== null) body[field] = value;
  }
  return body;
}

export function validateSubmission(body = {}) {
  if (typeof body !== 'object' || Array.isArray(body)) fail('body must be a JSON object');

  const score = Number(body.score);
  if (!Number.isInteger(score) || score < 1 || score > 10) {
    fail('score must be an integer from 1 to 10');
  }

  const explanation = cleanString(body.explanation, {
    field: 'explanation',
    max: MAX_EXPLANATION,
    required: true,
  });

  // Default to the version the caller would get from /api/prompt.
  const promptVersion = body.prompt_version === undefined ? latestVersion() : Number(body.prompt_version);
  let prompt;
  try {
    prompt = renderPrompt(promptVersion);
  } catch {
    fail(`prompt_version ${body.prompt_version} is not a version this app knows`);
  }

  // Usage is accepted nested or flat. The GET fallback documents flat query
  // parameters (&web_search_requests=N) while the POST body documents a nested
  // usage object, so a caller reading both and posting flat is following a
  // shape this app itself publishes. It was silently dropped before, which cost
  // a real reading its search count and quietly understated external spend.
  // Anything else a caller sends is ignored rather than stored. Saying so
  // beats dropping it silently: a caller following an older copy of the spec
  // should learn its model and token counts went nowhere.
  const ignored = ['model', 'caller', 'usage', 'input_tokens', 'output_tokens',
    'web_search_requests', 'measured', 'meta'].filter((f) => body[f] !== undefined);
  const note = ignored.length
    ? `ignored (not recorded for external readings): ${ignored.join(', ')}`
    : undefined;

  return {
    note,

    status: 'ok',
    source: 'external',
    score,
    explanation,
    prompt_version: prompt.version,
    prompt_hash: prompt.hash,
    prompt_text: prompt.text,
    // Model, usage and cost stay null. This app did not run the model and
    // cannot measure what the caller spent, so it records nothing rather than
    // recording a guess.
    model: null,
    served_by: null,
    input_tokens: null,
    output_tokens: null,
    web_search_requests: null,
    cost_usd: null,
    caller: null,
    caller_meta: null,
  };
}

export { SubmissionError };
