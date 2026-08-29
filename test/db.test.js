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

test('failures are queryable for the chart, separately from readings', async () => {
  const { failures, history } = await import('../src/db.js');
  const at = (iso) => ({ ...base, slot: null, created_at: iso });

  await insertRating({ ...at('2026-08-24T16:01:05.000Z'), status: 'error', error: '503 overloaded_error' });
  await insertRating({ ...at('2026-08-24T16:16:02.000Z'), status: 'ok', score: 5, explanation: 'recovered' });

  const failed = await failures({ hours: 24 * 365 });
  assert.ok(failed.length >= 1);
  const one = failed.find((f) => f.created_at.startsWith('2026-08-24T16:01'));
  assert.ok(one, 'the failed run is returned');
  assert.match(one.error, /overloaded_error/, 'with its error text, for the tooltip');

  // And it stays out of the plotted series, which is readings only.
  const plotted = await history({ hours: 24 * 365 });
  assert.ok(!plotted.some((p) => p.created_at.startsWith('2026-08-24T16:01')));
  assert.ok(plotted.every((p) => p.score != null));
});

test('failures keeps the newest ones when its limit bites, still ascending', async () => {
  // The same defect history() had, and worse on this query: failures cluster,
  // so a bad key on a 15-minute cron writes ~96 rows a day and the window fills
  // with the beginning of an outage. Ordering ascending before the limit would
  // have marked stale failures on the chart and omitted every recent one —
  // exactly when an operator is looking for the current edge of a problem.
  const { failures } = await import('../src/db.js');
  const at = (h) => `2027-02-0${h}T00:00:00.000Z`; // past every other row in this file
  for (const h of [1, 2, 3, 4, 5]) {
    await insertRating({ ...base, slot: null, status: 'error', error: `outage-${h}`, created_at: at(h) });
  }

  const recent = await failures({ hours: 24 * 365 * 10, limit: 3 });
  assert.deepEqual(recent.map((f) => f.error), ['outage-3', 'outage-4', 'outage-5'],
    'the three newest, not the three oldest');
  assert.ok(recent[0].created_at < recent[1].created_at, 'and still oldest-first for the chart');
  assert.ok(recent[1].created_at < recent[2].created_at);
});

test('voiding a reading retires it without erasing the record', async () => {
  const { voidRating, latestRating } = await import('../src/db.js');
  const bad = await insertRating({ ...base, slot: null, status: 'ok', score: 3, explanation: 'header-less probe' });
  assert.equal((await latestRating()).id, bad.id, 'it is the current reading');

  const voided = await voidRating(bad.id, 'test probe');
  assert.equal(voided.status, 'error');
  assert.match(voided.error, /voided: test probe/);
  assert.equal(voided.slot, null);
  assert.equal(voided.explanation, 'header-less probe', 'the record survives');

  assert.notEqual((await latestRating())?.id, bad.id, 'no longer the current reading');
  assert.ok(!(await history({ hours: 24 * 365 })).some((p) => p.id === bad.id), 'and out of the chart');

  assert.equal(await voidRating(999_999, 'nope'), undefined, 'unknown id is a no-op');
});

test('usage can be corrected without discarding the reading', async () => {
  // A reading can be sound while its usage is not: a caller with no token
  // counter reported 85,000 input tokens and later said the figure was a
  // guess. Voiding would have thrown away a good rating to remove a bad
  // number, so usage is correctable in place.
  const { correctUsage, insertRating } = await import('../src/db.js');
  const saved = await insertRating({
    status: 'ok', score: 7, explanation: 'A thing happened.',
    prompt_version: 3, prompt_hash: 'h', prompt_text: 't', model: 'claude-opus-5',
    slot: null, source: 'external', caller: 'guesser',
    input_tokens: 85_000, output_tokens: 1_500, web_search_requests: 2, cost_usd: 0.4825,
  });
  assert.equal(saved.cost_usd, 0.4825);

  const fixed = await correctUsage(saved.id, {
    input_tokens: null, output_tokens: null, web_search_requests: 2, cost_usd: 0.02,
  });
  assert.equal(fixed.input_tokens, null, 'the guessed count is gone');
  assert.equal(fixed.output_tokens, null);
  assert.equal(fixed.web_search_requests, 2, 'a count the caller could actually take survives');
  assert.equal(fixed.cost_usd, 0.02, 'and the price no longer reflects the guess');
  assert.equal(fixed.score, 7, 'the reading itself is untouched');
  assert.equal(fixed.status, 'ok', 'and it stays in the series');
});

test('voided readings drop out of the counts and the spend', async () => {
  // A voided row is one that should never have counted. Leaving it in reported
  // two test probes as real external runs and their cost as real spend.
  const { insertRating, stats, voidRating } = await import('../src/db.js');
  const before = await stats({ hours: 24 });
  const probe = await insertRating({
    status: 'ok', score: 5, explanation: 'probe', prompt_version: 3,
    prompt_hash: 'h', prompt_text: 't', model: 'claude-opus-5', slot: null,
    source: 'external', caller: 'probe', cost_usd: 0.5,
  });
  const during = await stats({ hours: 24 });
  assert.equal(during.external_runs, before.external_runs + 1);

  await voidRating(probe.id, 'accidental probe');
  const after = await stats({ hours: 24 });
  assert.equal(after.external_runs, before.external_runs, 'the probe stops being a run');
  assert.ok(
    Math.abs(after.external_spend_usd - before.external_spend_usd) < 1e-9,
    'and its cost stops being spend',
  );
  assert.equal(after.errors, before.errors, 'a void is not a failure either');
});

test('history keeps the newest readings when the limit bites, still ascending', async () => {
  // `ORDER BY created_at ASC LIMIT n` kept the OLDEST n rows and discarded the
  // newest, so a full window would have drawn a chart whose right edge — and
  // the admin page's "Now" tile and favicon, both `points.at(-1)` — were stale
  // while looking current. Timestamps sit past every other row in this file so
  // the assertion holds whatever those tests left behind.
  const at = (iso, explanation, score) => ({
    ...base, slot: null, status: 'ok', score, explanation, created_at: iso,
  });
  await insertRating(at('2027-01-01T00:00:00.000Z', 'window-oldest', 1));
  await insertRating(at('2027-01-01T01:00:00.000Z', 'window-second', 2));
  await insertRating(at('2027-01-01T02:00:00.000Z', 'window-third', 3));
  await insertRating(at('2027-01-01T03:00:00.000Z', 'window-fourth', 4));
  await insertRating(at('2027-01-01T04:00:00.000Z', 'window-newest', 5));

  const points = await history({ hours: 24 * 365 * 10, limit: 3 });
  assert.equal(points.length, 3);
  assert.deepEqual(
    points.map((p) => p.explanation),
    ['window-third', 'window-fourth', 'window-newest'],
    'the three newest rows in the window, oldest-first',
  );
  assert.ok(
    points[0].created_at < points[1].created_at && points[1].created_at < points[2].created_at,
    'ascending order survives the limit',
  );
});
