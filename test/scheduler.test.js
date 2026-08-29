process.env.NEWSWORTHY_MOCK = '1';

import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { ensureSchema, insertRating } = await import('../src/db.js');
const { sql } = await import('../src/sql.js');
const { tick } = await import('../src/scheduler.js');
const { updateConfig } = await import('../src/config.js');

const base = { prompt_version: 1, prompt_hash: 'h', prompt_text: 'p', model: 'claude-opus-5' };
const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();
const reading = (over) => insertRating({ ...base, slot: null, status: 'ok', score: 5, explanation: 'x', ...over });

before(async () => {
  await ensureSchema();
  await updateConfig({ intervalMinutes: 240 });
});

// Each case states its own precondition; the gate is about what is in the table.
beforeEach(async () => {
  await sql`DELETE FROM ratings`;
});

test('runs when there is nothing at all', async () => {
  const result = await tick('test');
  assert.ok(!result.skipped);
  assert.equal(result.status, 'ok');
});

test('skips when a reading arrived within the interval', async () => {
  await reading({ created_at: minutesAgo(30), explanation: 'recent' });
  const result = await tick('test');
  assert.equal(result.skipped, true);
  assert.equal(result.age_minutes, 30);
  assert.match(result.reason, /within the interval/);
});

test('an external reading suppresses the cron exactly as our own does', async () => {
  await reading({ created_at: minutesAgo(10), source: 'external', caller: 'cowork-mbp', score: 8 });
  const result = await tick('test');
  assert.equal(result.skipped, true);
  assert.equal(result.source, 'external', 'and reports which kind of reading suppressed it');
});

test('runs once the newest reading is older than the interval', async () => {
  // 300 minutes old against a 240-minute window: due.
  await reading({ created_at: minutesAgo(300), explanation: 'stale' });
  const result = await tick('test');
  assert.ok(!result.skipped, 'a stale reading does not suppress');
  assert.equal(result.status, 'ok');
});

test('the boundary is the configured interval, not the slot', async () => {
  // 239 minutes: inside a 240-minute window even though it is a different slot.
  await reading({ created_at: minutesAgo(239) });
  assert.equal((await tick('test')).skipped, true);

  await sql`DELETE FROM ratings`;
  await reading({ created_at: minutesAgo(241) });
  assert.ok(!(await tick('test')).skipped);
});

test('force overrides the gate, so the admin button always runs', async () => {
  await reading({ explanation: 'seconds old' });
  const result = await tick('manual', { force: true });
  assert.ok(!result.skipped);
  assert.equal(result.status, 'ok');
});

test('a manual run is stored as manual, not cron', async () => {
  // "Rate now" was landing in the runs table labelled cron. tick() took a
  // reason but only logged it, so nothing overrode the column default and every
  // run this app made claimed to be scheduled.
  const { tick } = await import('../src/scheduler.js');
  const { latestRating } = await import('../src/db.js');
  const { sql } = await import('../src/sql.js');

  await sql`DELETE FROM ratings`;
  await tick('manual', { force: true });
  assert.equal((await latestRating()).source, 'manual', 'a button press is manual');

  await sql`DELETE FROM ratings`;
  await tick('vercel-cron', { force: true });
  assert.equal((await latestRating()).source, 'cron', 'a scheduled run is cron');
});

test('the in-process scheduler is this app\'s schedule, so its runs are cron', async () => {
  // The mapping was written around Vercel Cron and treated it as the only
  // producer of a 'cron' reading, so on a self-hosted deployment — where
  // start() below is the schedule — every 'scheduled' and 'startup' run was
  // stored as a person pressing "Rate now".
  const { tick } = await import('../src/scheduler.js');
  const { latestRating } = await import('../src/db.js');
  const { sql } = await import('../src/sql.js');

  for (const reason of ['scheduled', 'startup']) {
    await sql`DELETE FROM ratings`;
    await tick(reason, { force: true });
    assert.equal((await latestRating()).source, 'cron', `${reason} is this app's schedule`);
  }
});
