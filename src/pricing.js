/**
 * Model catalogue and cost estimation.
 *
 * Rates are USD per million tokens, from Anthropic's published pricing.
 * Web search is billed on top of tokens at $10 per 1,000 searches.
 *
 * Costs are computed and stored at write time, so a historical row keeps the
 * price that actually applied even after these numbers change. Treat them as
 * estimates: your invoice is the source of truth.
 */

// Rates current as of 2026-08-24. Sonnet 5 has promotional pricing
// ($2.00/$10.00) through 2026-08-31; the standard rate is used here so
// estimates do not understate cost once the promotion ends.
export const MODELS = {
  'claude-opus-5': { label: 'Opus 5', input: 5, output: 25, note: 'Most capable. The default.' },
  'claude-opus-4-8': { label: 'Opus 4.8', input: 5, output: 25, note: 'Previous Opus generation.' },
  'claude-sonnet-5': { label: 'Sonnet 5', input: 3, output: 15, note: 'Cheaper, still strong.' },
  'claude-sonnet-4-6': { label: 'Sonnet 4.6', input: 3, output: 15, note: 'Previous Sonnet generation.' },
  'claude-haiku-4-5': { label: 'Haiku 4.5', input: 1, output: 5, note: 'Cheapest. Coarser judgement.' },
};

export const WEB_SEARCH_USD_PER_SEARCH = 10 / 1000;

// Standard prompt-caching multipliers against the base input rate. Newsworthy
// sends a single-shot request with no cache_control, so these are normally
// zero — they are here so the estimate stays correct if caching is added.
const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;

export function isKnownModel(model) {
  return Object.hasOwn(MODELS, model);
}

/** USD for one run. Returns null for a model we have no rate card for. */
export function estimateCostUsd({
  model,
  inputTokens = 0,
  outputTokens = 0,
  cacheReadTokens = 0,
  cacheWriteTokens = 0,
  webSearchRequests = 0,
} = {}) {
  const rate = MODELS[model];
  if (!rate) return null;
  const perToken = (tokens, usdPerMillion) => (tokens / 1_000_000) * usdPerMillion;
  return (
    perToken(inputTokens, rate.input) +
    perToken(outputTokens, rate.output) +
    perToken(cacheWriteTokens, rate.input * CACHE_WRITE_MULTIPLIER) +
    perToken(cacheReadTokens, rate.input * CACHE_READ_MULTIPLIER) +
    webSearchRequests * WEB_SEARCH_USD_PER_SEARCH
  );
}

/** What this cadence costs to run continuously, given an average run cost. */
export function projectMonthlyUsd(avgCostUsd, intervalMinutes) {
  if (!avgCostUsd || !intervalMinutes) return null;
  const runsPerMonth = (60 / intervalMinutes) * 24 * 365.25 / 12;
  return avgCostUsd * runsPerMonth;
}

/**
 * Fallback usage profile, used only until real runs exist. Deliberately set
 * from a measured production run rather than a guess: the first estimate here
 * assumed 40k/900/4 and understated the real cost by ~40%.
 */
export const ASSUMED_USAGE = { inputTokens: 65_000, outputTokens: 1_300, webSearchRequests: 8 };

/** Model list for the admin picker, with a per-run estimate at the given usage. */
export function modelCatalogue({
  inputTokens = ASSUMED_USAGE.inputTokens,
  outputTokens = ASSUMED_USAGE.outputTokens,
  webSearchRequests = ASSUMED_USAGE.webSearchRequests,
} = {}) {
  return Object.entries(MODELS).map(([id, m]) => ({
    id,
    label: m.label,
    note: m.note,
    input_usd_per_mtok: m.input,
    output_usd_per_mtok: m.output,
    typical_run_usd: estimateCostUsd({ model: id, inputTokens, outputTokens, webSearchRequests }),
  }));
}
