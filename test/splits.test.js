import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSplits, splitProblem } from '../src/splits.js';
import { ADMIN_TOKEN, CALLER_TOKEN, PORTS, caller, withServer } from './with-server.js';

const row = (id, minute, development_of, judge_version = 7) =>
  ({ id, created_at: new Date(Date.UTC(2026, 10, 5, 0, minute)).toISOString(), development_of, judge_version });

test('a split opens a development at the reading and moves the later ones filed under the same development', () => {
  // 1740 opened in Seoul; 1751 was the US selloff, filed under it, and 1752
  // followed. 1749 is another story, and 1745 a Seoul re-report before the cut.
  const rows = [row(1740, 0, null), row(1745, 10, 1740), row(1749, 20, null), row(1751, 30, 1740),
    row(1752, 40, 1740), row(1753, 45, 1749), row(1754, 50, null, null)];
  const split = { reading_id: 1751, reading_at: rows[3].created_at, from_root: 1740, created_at: new Date(Date.UTC(2026, 10, 5, 1)).toISOString() };
  const out = new Map(resolveSplits(rows, [split]).map((r) => [r.id, r.development_of]));
  assert.equal(out.get(1751), null, 'the reading opens its own development');
  assert.equal(out.get(1752), 1751, 'a later re-report of the same development follows it');
  assert.equal(out.get(1745), 1740, 'an earlier re-report stays');
  assert.equal(out.get(1753), 1749, 'another development is untouched');
  assert.equal(out.get(1754), null, 'an unjudged reading is left to the replay');
  assert.equal(rows[3].development_of, 1740, 'the stored rows are not rewritten');
});

test('a split covers only readings stored before it, and splits apply in order', () => {
  const made = new Date(Date.UTC(2026, 10, 5, 0, 35)).toISOString();
  const rows = [row(1, 0, null), row(2, 10, 1), row(3, 20, 1), row(4, 40, 1), row(5, 50, 2)];
  const first = { reading_id: 2, reading_at: rows[1].created_at, from_root: 1, created_at: made };
  const out = new Map(resolveSplits(rows, [first]).map((r) => [r.id, r.development_of]));
  assert.equal(out.get(3), 2, 'filed before the split: follows it');
  assert.equal(out.get(4), 1, 'judged after the split, against the corrected record: kept');
  assert.equal(out.get(5), 2, 'filed under the split reading itself: unchanged');

  const second = { reading_id: 3, reading_at: rows[2].created_at, from_root: 2, created_at: made };
  const chained = new Map(resolveSplits(rows, [first, second]).map((r) => [r.id, r.development_of]));
  assert.equal(chained.get(3), null, 'a later split cuts the development an earlier one made');
  assert.equal(chained.get(2), null);
  assert.deepEqual(resolveSplits(rows, []), rows, 'no splits, no change');
});

test('an undone split sends readings filed under it back, leaving no phantom development', () => {
  const made = new Date(Date.UTC(2026, 10, 5, 0, 35)).toISOString();
  const rows = [row(1, 0, null), row(2, 10, 1), row(3, 20, 1), row(4, 40, 2)];
  const split = { reading_id: 2, reading_at: rows[1].created_at, from_root: 1, created_at: made };
  const undone = new Map(resolveSplits(rows, [{ ...split, undone: true }]).map((r) => [r.id, r.development_of]));
  assert.equal(undone.get(2), 1, 'the split reading rejoins its development');
  assert.equal(undone.get(3), 1);
  assert.equal(undone.get(4), 1, 'a reading judged against the split development follows it back');
});

test('only a judged re-report can be split off', () => {
  assert.match(splitProblem(undefined, 9), /no reading 9/);
  assert.match(splitProblem({ id: 1, status: 'error' }), /not a stored reading/);
  assert.match(splitProblem({ id: 1, status: 'ok', judge_version: null, development_of: null }), /no judgement/);
  assert.match(splitProblem({ id: 1, status: 'ok', judge_version: 7, development_of: null }), /already opens/);
  assert.equal(splitProblem({ id: 2, status: 'ok', judge_version: 7, development_of: 1 }), null);
});

test('the admin splits a misfiled development: the page, the record and the board follow, and an undo restores them', async () => {
  await withServer({ port: PORTS.developmentSplits, env: { ADMIN_TOKEN, NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    const submit = caller(base);
    const admin = (path, init = {}) => fetch(`${base}${path}`, {
      ...init, headers: { 'content-type': 'application/json', 'x-admin-token': ADMIN_TOKEN, ...init.headers },
    }).then(async (r) => ({ status: r.status, body: await r.json() }));
    const current = async () => (await fetch(`${base}/api/current`)).json();
    const record = async () => (await (await fetch(`${base}/api/developments`, { headers: { 'x-newsworthy-token': CALLER_TOKEN } })).json()).record;

    // The 2026-11-05 shape: a Seoul pause, then the US selloff filed under it.
    const seoul = await submit(5, "South Korea's stock market briefly paused trading as chip shares fell.", { story: 'ai-stocks' });
    const us = await submit(8, 'US chip stocks fell 11% on fears of curbs on AI data centers.', { answer: seoul.body.id, story: 'ai-stocks' });
    await submit(8, 'Investors sold chip stocks and the Nasdaq fell 5%.', { answer: seoul.body.id, story: 'ai-stocks' });
    assert.match((await current()).explanation, /South Korea/, 'the misfiling shows the Seoul sentence');

    assert.equal((await admin('/api/admin/splits', { method: 'POST', body: JSON.stringify({ reading: seoul.body.id }) })).status, 422,
      'a reading that opened its development cannot be split off');
    const made = await admin('/api/admin/splits', { method: 'POST', body: JSON.stringify({ reading: us.body.id, note: 'another market' }) });
    assert.equal(made.status, 201);
    assert.equal(made.body.split.from_root, seoul.body.id);
    assert.equal((await admin('/api/admin/splits', { method: 'POST', body: JSON.stringify({ reading: us.body.id }) })).status, 422,
      'a split is made once');

    const shown = await current();
    assert.match(shown.explanation, /US chip stocks fell 11%/, "the page shows the US development's first report");
    assert.match(await record(), new RegExp(`^\\[${us.body.id}\\]`, 'm'), 'the judge is offered it as a development');

    const history = await admin('/api/admin/history?hours=24');
    const [split] = history.body.splits;
    assert.equal(split.active, true);
    const own = history.body.attempts.find((r) => r.id === us.body.id);
    assert.equal(own.development_of, seoul.body.id, 'the stored judgement is not rewritten');
    const developments = history.body.stories.flatMap((s) => s.developments);
    assert.ok(developments.some((d) => d.root === us.body.id && d.leading), 'the board lists it, leading');

    // A reading judged against the split development while it stands.
    await submit(8, 'The Nasdaq closed down 5%.', { answer: us.body.id, story: 'ai-stocks' });

    const undone = await admin(`/api/admin/splits/${split.id}/undo`, { method: 'POST', body: '{}' });
    assert.equal(undone.status, 201);
    assert.equal(undone.body.undo.undoes, split.id);
    assert.match((await current()).explanation, /South Korea/, 'an undo restores what was shown');
    assert.doesNotMatch(await record(), new RegExp(`^\\[${us.body.id}\\]`, 'm'), 'and leaves no phantom development');
    assert.equal((await admin(`/api/admin/splits/${split.id}/undo`, { method: 'POST' })).status, 422, 'an undo is made once');
  });
});
