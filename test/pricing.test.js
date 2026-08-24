import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODELS, estimateCostUsd, isKnownModel, projectMonthlyUsd, modelCatalogue } from '../src/pricing.js';
import { INTERVAL_CHOICES, intervalLabel } from '../src/config.js';
import { readUsage } from '../src/rate.js';

test('prices tokens and web searches together', () => {
  // 1M input @ $5 + 1M output @ $25 + 1000 searches @ $10/1k
  const cost = estimateCostUsd({
    model: 'claude-opus-5', inputTokens: 1_000_000, outputTokens: 1_000_000, webSearchRequests: 1000,
  });
  assert.equal(cost, 5 + 25 + 10);
});

test('matches the observed first production run', () => {
  const cost = estimateCostUsd({
    model: 'claude-opus-5', inputTokens: 40_163, outputTokens: 863, webSearchRequests: 4,
  });
  assert.ok(cost > 0.26 && cost < 0.27, `expected ~$0.262, got ${cost}`);
});

test('cheaper models cost strictly less for identical usage', () => {
  const usage = { inputTokens: 40_000, outputTokens: 900, webSearchRequests: 4 };
  const opus = estimateCostUsd({ model: 'claude-opus-5', ...usage });
  const sonnet = estimateCostUsd({ model: 'claude-sonnet-5', ...usage });
  const haiku = estimateCostUsd({ model: 'claude-haiku-4-5', ...usage });
  assert.ok(haiku < sonnet && sonnet < opus);
});

test('unknown models price as null rather than zero', () => {
  assert.equal(estimateCostUsd({ model: 'gpt-nope', inputTokens: 1000 }), null);
  assert.equal(isKnownModel('gpt-nope'), false);
  assert.equal(isKnownModel('claude-opus-5'), true);
});

test('monthly projection scales inversely with the interval', () => {
  const perRun = 0.26;
  const quarterHourly = projectMonthlyUsd(perRun, 15);
  const fourHourly = projectMonthlyUsd(perRun, 240);
  assert.ok(Math.abs(quarterHourly / fourHourly - 16) < 0.001, 'four-hourly is 1/16th of quarter-hourly');
  assert.ok(fourHourly > 45 && fourHourly < 50, `expected ~$48/mo, got ${fourHourly}`);
});

test('usage reader defaults every counter and finds nested web searches', () => {
  assert.deepEqual(readUsage(), {
    inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, webSearchRequests: 0,
  });
  const u = readUsage({ input_tokens: 10, output_tokens: 2, server_tool_use: { web_search_requests: 3 } });
  assert.equal(u.inputTokens, 10);
  assert.equal(u.webSearchRequests, 3);
});

test('every catalogue model has a rate and a run estimate', () => {
  for (const m of modelCatalogue()) {
    assert.ok(MODELS[m.id], `${m.id} in catalogue`);
    assert.ok(m.typical_run_usd > 0);
  }
});

test('interval choices divide evenly into the 15-minute cron tick', () => {
  assert.ok(INTERVAL_CHOICES.includes(240), '4 hours is offered');
  for (const m of INTERVAL_CHOICES) assert.equal(m % 15, 0, `${m} aligns to the tick`);
  assert.equal(intervalLabel(240), '4 hours');
  assert.equal(intervalLabel(60), 'hour');
  assert.equal(intervalLabel(15), '15 minutes');
});

test('prompt v2 reports instead of justifying, and keeps v1 rating scale intact', async () => {
  const { renderPrompt, latestVersion, allPrompts } = await import('../src/prompts.js');
  const v1 = renderPrompt(1);
  const v2 = renderPrompt(2);

  assert.equal(latestVersion(), 2, 'new runs use v2');
  assert.equal(allPrompts().length, 2, 'v1 is retained, not replaced');
  assert.notEqual(v1.hash, v2.hash);

  const scaleOf = (p) => p.text.split('Output format')[0];
  assert.equal(scaleOf(v1), scaleOf(v2), 'the rating instructions are byte-identical');

  // The phrasings that prompted the change must be named as prohibited.
  for (const banned of ['not yet an event', 'everything else is minor', 'incremental', 'routine']) {
    assert.ok(v2.text.includes(banned), `v2 forbids "${banned}"`);
  }
  assert.ok(/reports what happened/.test(v2.text));
  assert.ok(!/that drove the score/.test(v2.text), 'v2 drops the score-justifying framing');
});

test('cost estimates fall back to a measured profile, not an optimistic guess', async () => {
  const { ASSUMED_USAGE, estimateCostUsd, modelCatalogue } = await import('../src/pricing.js');
  // The real first run: 65,358 in / 1,303 out / 8 searches -> $0.4394.
  assert.ok(ASSUMED_USAGE.inputTokens >= 60_000, 'fallback reflects observed input volume');
  assert.ok(ASSUMED_USAGE.webSearchRequests >= 8, 'fallback reflects the max_uses cap being hit');

  const fallback = modelCatalogue().find((m) => m.id === 'claude-opus-5');
  assert.ok(fallback.typical_run_usd > 0.4, `fallback should be ~$0.44, got ${fallback.typical_run_usd}`);

  // An explicit baseline overrides the fallback.
  const lean = modelCatalogue({ inputTokens: 20_000, outputTokens: 500, webSearchRequests: 2 })
    .find((m) => m.id === 'claude-opus-5');
  assert.ok(lean.typical_run_usd < fallback.typical_run_usd);
  assert.equal(
    lean.typical_run_usd,
    estimateCostUsd({ model: 'claude-opus-5', inputTokens: 20_000, outputTokens: 500, webSearchRequests: 2 }),
  );
});
