import { test, before } from 'node:test';
import assert from 'node:assert/strict';

// Runs against PGlite — real Postgres in-process — so the SQL is exercised,
// not mocked. See src/sql.js.
const { insertRating, latestRating, history, stats, recentAttempts, ensureSchema } =
  await import('../src/db.js');

const base = { prompt_version: 1, prompt_hash: 'abc123', prompt_text: 'p', model: 'claude-opus-5' };

before(() => ensureSchema());

test('logs successes and errors, and only surfaces successes', async () => {
  await insertRating({ ...base, status: 'ok', score: 4, explanation: 'older', created_at: '2026-08-23T00:00:00.000Z' });
  await insertRating({ ...base, status: 'ok', score: 8, explanation: 'newest', created_at: '2026-08-23T00:15:00.000Z' });
  await insertRating({ ...base, status: 'error', error: 'boom', created_at: '2026-08-23T00:30:00.000Z' });

  const latest = await latestRating();
  assert.equal(latest.score, 8);
  assert.equal(latest.explanation, 'newest');
  assert.equal(typeof latest.created_at, 'string', 'timestamps serialise as ISO strings');

  const s = await stats({ hours: 24 * 365 });
  assert.equal(s.ok, 2);
  assert.equal(s.errors, 1);
  assert.equal(s.avg_score, 6);
  assert.equal(s.max_score, 8);
  assert.equal((await recentAttempts(10)).length, 3);
});

test('history is ascending, excludes failures, and honours the window', async () => {
  const points = await history({ hours: 24 * 365 });
  assert.equal(points.length, 2);
  assert.ok(points[0].created_at < points[1].created_at);
  assert.ok(points.every((p) => p.score != null));

  await insertRating({ ...base, status: 'ok', score: 9, explanation: 'recent' });
  assert.equal((await history({ hours: 1 })).length, 1);
});

test('a slot holds at most one successful reading (duplicate cron delivery)', async () => {
  const slot = '2026-08-23T04:00:00.000Z';
  const first = await insertRating({ ...base, slot, status: 'ok', score: 5, explanation: 'first' });
  assert.equal(first.score, 5);
  assert.ok(!first.deduped);

  const second = await insertRating({ ...base, slot, status: 'ok', score: 9, explanation: 'duplicate' });
  assert.equal(second.deduped, true, 'second write for the slot is swallowed');
  assert.equal(second.score, 5, 'and returns the reading that already stood');
  assert.equal(second.explanation, 'first');
});

test('failures do not occupy a slot, so the slot can still be filled', async () => {
  const slot = '2026-08-23T05:00:00.000Z';
  await insertRating({ ...base, slot: null, status: 'error', error: 'timeout' });
  await insertRating({ ...base, slot: null, status: 'error', error: 'timeout again' });
  const ok = await insertRating({ ...base, slot, status: 'ok', score: 7, explanation: 'recovered' });
  assert.equal(ok.score, 7);
  assert.ok(!ok.deduped);
});

test('manual runs carry no slot and never collide', async () => {
  const a = await insertRating({ ...base, slot: null, status: 'ok', score: 2, explanation: 'manual one' });
  const b = await insertRating({ ...base, slot: null, status: 'ok', score: 3, explanation: 'manual two' });
  assert.ok(!a.deduped && !b.deduped);
  assert.notEqual(a.id, b.id);
});

test('settings round-trip and validation', async () => {
  const { effectiveConfig, updateConfig } = await import('../src/config.js');
  const before = await effectiveConfig();
  assert.equal(before.intervalMinutes, 240, 'defaults to four-hourly');

  await updateConfig({ model: 'claude-haiku-4-5', intervalMinutes: 60 });
  const after = await effectiveConfig();
  assert.equal(after.model, 'claude-haiku-4-5');
  assert.equal(after.intervalMinutes, 60);

  await assert.rejects(() => updateConfig({ model: 'not-a-model' }), /Unknown model/);
  await assert.rejects(() => updateConfig({ intervalMinutes: 7 }), /Interval must be one of/);

  const unchanged = await effectiveConfig();
  assert.equal(unchanged.model, 'claude-haiku-4-5', 'a rejected write changes nothing');
});

test('cost and token usage survive a round-trip', async () => {
  const row = await insertRating({
    ...base, slot: null, status: 'ok', score: 6, explanation: 'costed',
    input_tokens: 40163, output_tokens: 863, web_search_requests: 4, cost_usd: 0.2624,
  });
  assert.equal(row.input_tokens, 40163);
  assert.equal(row.web_search_requests, 4);
  assert.equal(row.cost_usd, 0.2624, 'NUMERIC comes back as a number, not a string');

  const s = await stats({ hours: 1 });
  assert.ok(s.spend_usd > 0);
  assert.ok(s.avg_cost_usd > 0);
});

test('usage baseline averages real runs and reports when there are none', async () => {
  const { usageBaseline } = await import('../src/db.js');
  const before = await usageBaseline();
  assert.equal(typeof before.observed, 'boolean');

  await insertRating({ ...base, slot: null, status: 'ok', score: 5, explanation: 'a',
    input_tokens: 60_000, output_tokens: 1000, web_search_requests: 8, cost_usd: 0.4 });
  await insertRating({ ...base, slot: null, status: 'ok', score: 5, explanation: 'b',
    input_tokens: 70_000, output_tokens: 1200, web_search_requests: 8, cost_usd: 0.5 });

  const after = await usageBaseline({ limit: 2 });
  assert.equal(after.observed, true);
  assert.equal(after.runs, 2);
  assert.equal(after.inputTokens, 65_000, 'averages the two runs');
  assert.equal(after.outputTokens, 1100);
  assert.equal(after.webSearchRequests, 8);
});
