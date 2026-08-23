import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.NEWSWORTHY_DB = join(mkdtempSync(join(tmpdir(), 'nw-')), 'test.db');
const { insertRating, latestRating, history, stats, recentAttempts } = await import('../src/db.js');

const base = {
  prompt_version: 1, prompt_hash: 'abc123', prompt_text: 'p', model: 'claude-opus-5',
};

test('logs successes and errors, and only surfaces successes', () => {
  insertRating({ ...base, status: 'ok', score: 4, explanation: 'older', created_at: '2026-08-23T00:00:00.000Z' });
  insertRating({ ...base, status: 'ok', score: 8, explanation: 'newest', created_at: '2026-08-23T00:15:00.000Z' });
  insertRating({ ...base, status: 'error', error: 'boom', created_at: '2026-08-23T00:30:00.000Z' });

  const latest = latestRating();
  assert.equal(latest.score, 8);
  assert.equal(latest.explanation, 'newest');

  const s = stats({ hours: 24 * 365 });
  assert.equal(s.ok, 2);
  assert.equal(s.errors, 1);
  assert.equal(s.avg_score, 6);

  assert.equal(recentAttempts(10).length, 3);
});

test('history is ascending and excludes failures', () => {
  const points = history({ hours: 24 * 365 });
  assert.equal(points.length, 2);
  assert.ok(points[0].created_at < points[1].created_at);
  assert.ok(points.every((p) => p.score != null));
});

test('history honours the time window', () => {
  insertRating({ ...base, status: 'ok', score: 9, explanation: 'recent' });
  assert.equal(history({ hours: 1 }).length, 1);
});
