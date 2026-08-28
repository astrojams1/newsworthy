import { latestVersion, renderPrompt } from './prompts.js';

/**
 * Validation for readings submitted by an external caller agent.
 *
 * A submission carries a score and a sentence. Nothing else. The prompt version,
 * hash and text are stamped here from our own registry, so a stored reading
 * stays traceable to a prompt we can reproduce.
 *
 * The version is not a field a caller can set, because a caller that can name a
 * version can pin one: after v4 shipped, every submission kept arriving as v3,
 * so the new prompt was live and inert at the same time. The prompt a caller
 * fetches and the version stamped on its reading now come from the same place.
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

/**
 * Whether the caller received the prompt we served, byte for byte.
 *
 * Five rewordings of "do not justify the score" produced the same rate of
 * score-justifying sentences, which is what a rule that never arrives looks
 * like. Nothing distinguished "the prompt is wrong" from "the prompt is not
 * being read", so every prompt edit was unfalsifiable.
 *
 * A returned digest settles it. Compared against the text this server sent,
 * never against anything the caller says about itself — so unlike the model
 * and token counts that were removed, this is a proof rather than a claim. A
 * fabricated digest fails with certainty; guessing one is not a thing that
 * happens. False negatives are possible, false positives are not.
 */
function verifyDigest(supplied, prompt) {
  if (supplied === undefined || supplied === null || supplied === '') return null;
  if (typeof supplied !== 'string') return false;
  return supplied.trim().toLowerCase() === prompt.digest;
}

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
  for (const field of ['score', 'explanation', 'prompt_sha256']) {
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

  // Always the current prompt. Never the caller's claim about it.
  const prompt = renderPrompt(latestVersion());

  // Usage is accepted nested or flat. The GET fallback documents flat query
  // parameters (&web_search_requests=N) while the POST body documents a nested
  // usage object, so a caller reading both and posting flat is following a
  // shape this app itself publishes. It was silently dropped before, which cost
  // a real reading its search count and quietly understated external spend.
  // Anything else a caller sends is ignored rather than stored. Saying so
  // beats dropping it silently: a caller following an older copy of the spec
  // should learn its model and token counts went nowhere.
  const prompt_verified = verifyDigest(body.prompt_sha256, prompt);

  const ignored = ['prompt_version', 'model', 'caller', 'usage', 'input_tokens',
    'output_tokens', 'web_search_requests', 'measured', 'meta']
    .filter((f) => body[f] !== undefined);
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
    // Never a rejection. A rejected reading tells us nothing about the delivery
    // path; a stored reading carrying a false flag tells us everything, and the
    // four rejection rules stay four.
    prompt_verified,
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
