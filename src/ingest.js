import { latestVersion, renderPrompt } from './prompts.js';
import { estimateCostUsd } from './pricing.js';

/**
 * Validation for readings submitted by an external caller agent.
 *
 * The body comes from outside this app, so nothing in it is trusted: the score
 * is range-checked, strings are trimmed and capped, and the prompt version has
 * to be one this app actually knows — its hash and text are then taken from
 * our own registry rather than from the caller, so a stored reading stays
 * traceable to a prompt we can reproduce.
 *
 * What the caller reports about itself (model, usage, arbitrary metadata) is
 * kept as self-reported context and marked source='external'. It is never
 * mistaken for a run this app made.
 */
const MAX_EXPLANATION = 400;
const MAX_CALLER = 120;
const MAX_META_BYTES = 4096;

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

  const usage = body.usage ?? {};
  if (typeof usage !== 'object' || Array.isArray(usage)) fail('usage must be an object');
  const counter = (value, field) => {
    if (value === undefined || value === null) return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 100_000_000) fail(`usage.${field} is out of range`);
    return Math.round(n);
  };

  const model = cleanString(body.model, { field: 'model', max: 120 });
  const inputTokens = counter(usage.input_tokens, 'input_tokens');
  const outputTokens = counter(usage.output_tokens, 'output_tokens');
  const webSearchRequests = counter(usage.web_search_requests, 'web_search_requests');

  let meta = null;
  if (body.meta !== undefined && body.meta !== null) {
    if (typeof body.meta !== 'object' || Array.isArray(body.meta)) fail('meta must be an object');
    const encoded = JSON.stringify(body.meta);
    if (Buffer.byteLength(encoded, 'utf8') > MAX_META_BYTES) {
      fail(`meta must be under ${MAX_META_BYTES} bytes`);
    }
    meta = body.meta;
  }

  return {
    status: 'ok',
    source: 'external',
    caller: cleanString(body.caller, { field: 'caller', max: MAX_CALLER }) ?? 'unnamed-agent',
    score,
    explanation,
    prompt_version: prompt.version,
    prompt_hash: prompt.hash,
    prompt_text: prompt.text,
    model: model ?? 'unreported',
    served_by: model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    web_search_requests: webSearchRequests,
    // Priced only when the caller names a model we hold rates for; their spend,
    // reported separately from ours in the admin.
    cost_usd: estimateCostUsd({
      model,
      inputTokens: inputTokens ?? 0,
      outputTokens: outputTokens ?? 0,
      webSearchRequests: webSearchRequests ?? 0,
    }),
    caller_meta: meta,
  };
}

export { SubmissionError };
