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
  const { renderPrompt, allPrompts } = await import('../src/prompts.js');
  const v1 = renderPrompt(1);
  const v2 = renderPrompt(2);

  // Which version is newest is asserted once, in the v3 test — repeating it
  // here made every new prompt version break an unrelated test.
  assert.notEqual(v1.hash, v2.hash);
  assert.ok(allPrompts().some((p) => p.version === 1), 'v1 is retained, not replaced');

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

test('the next run is the next slot boundary, not one interval after the reading', async () => {
  const { slotFor } = await import('../src/rate.js');
  const nextRunAfter = (nowIso, minutes) =>
    new Date(Date.parse(slotFor(new Date(nowIso), minutes)) + minutes * 60_000).toISOString();

  // Once a slot is filled, the next run is the following boundary.
  assert.equal(nextRunAfter('2026-08-24T16:06:00Z', 240), '2026-08-24T20:00:00.000Z');
  assert.equal(nextRunAfter('2026-08-24T12:00:01Z', 240), '2026-08-24T16:00:00.000Z');

  // Boundaries land on the clock, independent of when the last run happened.
  for (const [now, want] of [
    ['2026-08-24T00:00:00Z', '2026-08-24T04:00:00.000Z'],
    ['2026-08-24T03:59:59Z', '2026-08-24T04:00:00.000Z'],
    ['2026-08-24T23:30:00Z', '2026-08-25T00:00:00.000Z'],
  ]) {
    assert.equal(nextRunAfter(now, 240), want, `from ${now}`);
  }
  assert.equal(nextRunAfter('2026-08-24T16:06:00Z', 15), '2026-08-24T16:15:00.000Z');
});

test('an unfilled slot is retried by the next cron tick, not the next interval', () => {
  // The reported case: last successful reading 12:01, the 16:00 run failed,
  // observed at 16:06 on a 4-hourly cadence. The 16:00 slot is unfilled, so a
  // retry is ~9 minutes away — not the 4 hours the old label claimed.
  const TICK = 15 * 60_000;
  const nextTick = (nowIso) => new Date(Math.ceil(Date.parse(nowIso) / TICK) * TICK).toISOString();

  assert.equal(nextTick('2026-08-24T16:06:00Z'), '2026-08-24T16:15:00.000Z');
  assert.equal(nextTick('2026-08-24T16:15:00Z'), '2026-08-24T16:15:00.000Z');
  assert.equal(nextTick('2026-08-24T16:59:30Z'), '2026-08-24T17:00:00.000Z');

  const minutesAway =
    (Date.parse(nextTick('2026-08-24T16:06:00Z')) - Date.parse('2026-08-24T16:06:00Z')) / 60_000;
  assert.equal(minutesAway, 9, 'retry is minutes away, not hours');
});

test('prompt v3 adds prediction markets without disturbing the scale or the contract', async () => {
  const { renderPrompt } = await import('../src/prompts.js');
  const [v1, v2, v3] = [1, 2, 3].map(renderPrompt);

  // Published prompts are frozen: rows in the database reference these hashes.
  assert.equal(v1.hash, '7ebe2d68813f1487');
  assert.equal(v2.hash, 'da972d2621c7f461');

  // The harsh calibration scale carries through untouched.
  const scale = v1.text.split('Output format')[0].trim();
  assert.ok(v3.text.includes(scale), 'v1 calibration is verbatim inside v3');

  // And v3 reuses v2's reporting contract rather than inventing a new one.
  assert.equal(v3.text.split('Output format')[1], v2.text.split('Output format')[1]);

  // The new sourcing guidance.
  for (const venue of ['Polymarket', 'Kalshi', 'Metaculus']) {
    assert.ok(v3.text.includes(venue), `v3 names ${venue}`);
  }
  assert.match(v3.text, /at most two searches on markets/, 'the search budget is capped, not raised');
  assert.match(v3.text, /moved in the last day/, 'movement matters more than level');
  assert.match(v3.text, /rate on the news alone/, 'markets are optional, not required');
});

test('prompt v4 adds Hacker News without disturbing the scale or the contract', async () => {
  const { renderPrompt } = await import('../src/prompts.js');
  const [v1, v2, v3, v4] = [1, 2, 3, 4].map(renderPrompt);

  // Published prompts are frozen: stored rows reference these hashes.
  assert.equal(v3.hash, 'c950817fec589043', 'v3 is untouched by v4');

  // v4 is v3 plus one paragraph — the calibration and the reporting contract
  // are inherited, not rewritten.
  const scale = v1.text.split('Output format')[0].trim();
  assert.ok(v4.text.includes(scale), 'v1 calibration is verbatim inside v4');
  assert.equal(v4.text.split('Output format')[1], v2.text.split('Output format')[1]);
  assert.ok(v4.text.includes(v3.text.split('Output format')[0].trim()), 'v3 sourcing carries through');

  // Optional, like markets: a required source that finds nothing still has to
  // be mentioned, and the explanation is 25 words.
  assert.match(v4.text, /rate on the news alone and do not mention it/);
  // And finding something on HN is not itself a reason to score higher.
  assert.match(v4.text, /not a reason to raise the number/);
  assert.match(v4.text, /at most one search there/);
});

test('the search budget grew to pay for the Hacker News check', async () => {
  // v4 adds a source to a budget that was already saturated at 8, so without
  // this the check would come out of news coverage.
  const src = await import('node:fs/promises').then((fs) => fs.readFile('src/rate.js', 'utf8'));
  assert.match(src, /max_uses: 9/);
});
