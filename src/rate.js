import Anthropic from '@anthropic-ai/sdk';
import { insertRating, ratingForSlot } from './db.js';
import { effectiveConfig } from './config.js';
import { estimateCostUsd } from './pricing.js';
import { latestVersion, renderPrompt } from './prompts.js';

export const DEFAULT_MODEL = process.env.NEWSWORTHY_MODEL || 'claude-opus-5';
export const INTERVAL_MINUTES = Number(process.env.NEWSWORTHY_INTERVAL_MINUTES) || 15;

/** Usage counters, defaulted — a field absent from the response means zero. */
export function readUsage(usage = {}) {
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    webSearchRequests: usage.server_tool_use?.web_search_requests ?? 0,
  };
}

/** The scheduled slot a moment belongs to, floored to the interval. */
export function slotFor(date = new Date(), minutes = INTERVAL_MINUTES) {
  const ms = minutes * 60_000;
  return new Date(Math.floor(date.getTime() / ms) * ms).toISOString();
}

/**
 * Pull the {score, explanation} out of the model's final text.
 * Tolerant on purpose: a stray fence or a bare "7/10" should not cost us a tick.
 */
export function parseVerdict(text) {
  if (!text || !text.trim()) throw new Error('Empty response from model');

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const score = clampScore(parsed.score);
      if (score !== null) {
        return { score, explanation: cleanExplanation(parsed.explanation) };
      }
    } catch {
      // fall through to the loose parse
    }
  }

  // Loose fallback: "7/10", "Score: 7", or a leading bare number.
  const loose =
    text.match(/(\b(?:10|[1-9])\s*\/\s*10\b)/)?.[1] ??
    text.match(/\bscore\D{0,10}(10|[1-9])\b/i)?.[1] ??
    text.match(/^\s*(10|[1-9])\b/)?.[1];
  const score = clampScore(loose && String(loose).split('/')[0]);
  if (score === null) throw new Error(`Could not parse a score from: ${text.slice(0, 300)}`);

  const explanation = cleanExplanation(
    text
      .replace(/\{[\s\S]*\}/, '')
      .replace(/(\b(?:10|[1-9])\s*\/\s*10\b)/, '')
      .trim(),
  );
  return { score, explanation };
}

function clampScore(value) {
  const n = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isFinite(n) || n < 1 || n > 10) return null;
  return n;
}

function cleanExplanation(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return 'No explanation given.';
  return text.length > 400 ? `${text.slice(0, 397)}...` : text;
}

/**
 * A rating is only meaningful if the model actually read some news.
 *
 * When web search is unavailable the API still returns HTTP 200: the
 * web_search_tool_result block carries an error object instead of a list, and
 * the model answers anyway — in practice with a low score and an explanation
 * describing its own tooling ("News search was unavailable, so no current top
 * story could be retrieved"). That is not a reading, and must not be stored as
 * one, so inspect the search blocks rather than trusting the prose.
 */
export function assessSearch(content = []) {
  let productive = 0;
  const errors = [];
  for (const block of content) {
    if (block?.type !== 'web_search_tool_result') continue;
    const result = block.content;
    if (Array.isArray(result)) {
      if (result.length > 0) productive += 1; // a search returning nothing is not news
    } else if (result?.error_code) {
      errors.push(result.error_code);
    } else if (result?.type === 'web_search_tool_result_error') {
      errors.push(result.error_code ?? 'unknown');
    }
  }
  return { productive, errors };
}

function finalText(content) {
  return content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

async function callClaude({ model, prompt }) {
  const client = new Anthropic();
  const request = {
    model,
    max_tokens: 4096,
    // Adaptive thinking is the default on Opus 5; keep the effort modest — this
    // is a search-and-judge task, not a reasoning marathon.
    output_config: { effort: 'medium' },
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 8 }],
    messages: [{ role: 'user', content: prompt }],
  };

  // Server-side fallbacks: if a safety classifier declines the request, the API
  // re-runs it on a fallback model inside the same call instead of returning
  // nothing. Degrades gracefully if the beta is unavailable on this account.
  try {
    return await client.beta.messages.create({
      ...request,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
  } catch (err) {
    const retryable = err?.status === 400 || err?.status === 404;
    if (!retryable) throw err;
    return client.messages.create(request);
  }
}

function mockResponse() {
  const score = 1 + Math.floor(Math.random() * 10);
  return {
    model: 'mock-model',
    stop_reason: 'end_turn',
    usage: {
      input_tokens: 40_000,
      output_tokens: 900,
      server_tool_use: { web_search_requests: 4 },
    },
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          score,
          explanation: 'Mock run — no live news was checked and no model was called.',
        }),
      },
    ],
  };
}

/**
 * Run one rating: ask the model, parse it, log it. Always writes a row —
 * failures are logged as status='error' so gaps in the timeseries are visible.
 */
export async function runRating({
  model,
  promptVersion = Number(process.env.NEWSWORTHY_PROMPT_VERSION) || latestVersion(),
  mock = process.env.NEWSWORTHY_MOCK === '1',
  slot = null,
} = {}) {
  model ??= (await effectiveConfig()).model;
  const prompt = renderPrompt(promptVersion);
  const base = {
    slot,
    prompt_version: prompt.version,
    prompt_hash: prompt.hash,
    prompt_text: prompt.text,
    model: mock ? 'mock-model' : model,
  };
  const startedAt = Date.now();

  // Cheap pre-check: if this slot already has a reading, don't spend an API
  // call on a duplicate cron delivery. The unique index is the real guarantee.
  if (slot) {
    const existing = await ratingForSlot(slot);
    if (existing) return { ...existing, deduped: true };
  }

  try {
    const response = mock ? mockResponse() : await callClaude({ model, prompt: prompt.text });

    if (response.stop_reason === 'refusal') {
      throw new Error(`Model refused: ${response.stop_details?.category ?? 'unknown'}`);
    }

    const search = assessSearch(response.content);
    if (!mock && search.productive === 0) {
      throw new Error(
        search.errors.length
          ? `Web search failed (${[...new Set(search.errors)].join(', ')}) — no news to rate`
          : 'No web search results returned — no news to rate',
      );
    }

    const raw = finalText(response.content);
    const { score, explanation } = parseVerdict(raw);

    const usage = readUsage(response.usage);
    return insertRating({
      ...base,
      status: 'ok',
      score,
      explanation,
      served_by: response.model,
      raw_output: raw,
      latency_ms: Date.now() - startedAt,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cache_read_tokens: usage.cacheReadTokens,
      cache_write_tokens: usage.cacheWriteTokens,
      web_search_requests: usage.webSearchRequests,
      // Price against the model that actually answered — it can differ from the
      // one requested when a refusal fallback kicks in. If the served name is
      // not in the rate card (a dated variant, an unlisted fallback), fall back
      // to the requested model rather than silently dropping the cost.
      cost_usd:
        estimateCostUsd({ model: response.model, ...usage }) ??
        estimateCostUsd({ model: base.model, ...usage }),
    });
  } catch (err) {
    return insertRating({
      ...base,
      slot: null, // failures never occupy a slot, so the next delivery can retry it
      status: 'error',
      error: String(err?.message ?? err).slice(0, 1000),
      latency_ms: Date.now() - startedAt,
    });
  }
}

// `npm run rate` — one-shot, useful for cron-based deployments.
if (import.meta.url === `file://${process.argv[1]}`) {
  const row = await runRating({ slot: slotFor(new Date(), (await effectiveConfig()).intervalMinutes) });
  console.log(JSON.stringify(row, null, 2));
  process.exit(row.status === 'ok' ? 0 : 1);
}
