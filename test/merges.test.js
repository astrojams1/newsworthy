import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aliasMap, canonicalStory, mergeProblem, survivor } from '../src/merges.js';
import { ADMIN_TOKEN, CALLER_TOKEN, PORTS, caller, withServer } from './with-server.js';

test('a name resolves through the merges in force, following a chain and stopping on a cycle', () => {
  const map = aliasMap([
    { alias: 'hormuz-conflict', canonical: 'iran-war' },
    { alias: 'iran-war', canonical: 'gulf-war' },
  ]);
  assert.equal(canonicalStory(map, 'hormuz-conflict'), 'gulf-war', 'merged on into a later name');
  assert.equal(canonicalStory(map, 'fed-policy'), 'fed-policy', 'an unmerged name is itself');
  assert.equal(canonicalStory(map, null), null);
  const loop = aliasMap([{ alias: 'a', canonical: 'b' }, { alias: 'b', canonical: 'a' }]);
  assert.ok(['a', 'b'].includes(canonicalStory(loop, 'a')), 'a cycle ends rather than hangs');
});

test('a merge needs two names on record that are not already one story', () => {
  const map = aliasMap([{ alias: 'hormuz-conflict', canonical: 'iran-war' }]);
  const known = new Set(['iran-war', 'fed-policy']);
  assert.equal(mergeProblem(['Iran War', 'fed-policy'], { map, known }), null, 'names are compared as stored slugs');
  assert.match(mergeProblem(['hormuz-conflict', 'iran-war'], { map, known }), /already one story/);
  assert.match(mergeProblem(['iran-war', 'volcano'], { map, known }), /volcano is not a story on record/);
  assert.match(mergeProblem(['iran-war'], { map, known }), /two story names/);
  assert.match(mergeProblem('iran-war', { map, known }), /two story names/);
});

test('the name kept is the one more readings were filed under, the older on a tie', () => {
  const stats = new Map([
    ['iran-war', { readings: 351, first: '2026-08-30' }],
    ['hormuz-threat', { readings: 40, first: '2026-08-24' }],
    ['a', { readings: 2, first: '2026-09-02' }],
    ['b', { readings: 2, first: '2026-09-01' }],
  ]);
  assert.equal(survivor('hormuz-threat', 'iran-war', stats), 'iran-war', 'established, not merely older');
  assert.equal(survivor('a', 'b', stats), 'b');
});

test('a caller merges two names, the page and the record read one story, and an undo restores both', async () => {
  await withServer({ port: PORTS.storyMerges, env: { ADMIN_TOKEN, NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    const submit = caller(base);
    const admin = (path, init = {}) => fetch(`${base}${path}`, {
      ...init, headers: { 'content-type': 'application/json', 'x-admin-token': ADMIN_TOKEN, ...init.headers },
    }).then(async (r) => ({ status: r.status, body: await r.json() }));
    const record = async () => (await (await fetch(`${base}/api/developments`, { headers: { 'x-newsworthy-token': CALLER_TOKEN } })).json()).record;

    await submit(5, 'Iran struck two tankers near Hormuz.', { story: 'iran-war' });
    await submit(5, 'Iran struck a third tanker.', { answer: 'same', story: 'iran-war' });
    await submit(4, 'Iran closed the strait to shipping.', { story: 'hormuz-conflict' });

    // The caller says the two names are one story.
    const merging = await submit(4, 'Talks on the strait resumed.', {
      story: 'iran-war', extra: { same_story: ['hormuz-conflict', 'iran-war'] },
    });
    assert.deepEqual(merging.body.merge, { story: 'hormuz-conflict', into: 'iran-war' }, 'the established name is kept');
    assert.doesNotMatch(await record(), /hormuz-conflict/, 'the merged-away name is no longer offered');

    const history = await admin('/api/admin/history?hours=24');
    assert.deepEqual(history.body.stories.map((s) => s.story), ['iran-war'], 'the board shows one story');
    const [merge] = history.body.merges;
    assert.equal(merge.source, 'caller');
    assert.equal(merge.active, true);
    const own = history.body.attempts.find((r) => /closed the strait/.test(r.explanation));
    assert.equal(own.story, 'hormuz-conflict', 'the reading keeps the name it was judged with');

    // Refusals leave the reading stored and say why.
    const again = await submit(4, 'Talks continue.', { answer: 'same', story: 'iran-war', extra: { same_story: ['hormuz-conflict', 'iran-war'] } });
    assert.equal(again.status, 201);
    assert.match(again.body.merge_refused, /already one story/);
    const unknown = await submit(4, 'Talks continue again.', { answer: 'same', story: 'iran-war', extra: { same_story: ['iran-war', 'volcano'] } });
    assert.match(unknown.body.merge_refused, /not a story on record/);

    // The admin undoes it: another row, and both names are back.
    const undone = await admin(`/api/admin/merges/${merge.id}/undo`, { method: 'POST', body: '{"note":"two stories"}' });
    assert.equal(undone.status, 201);
    assert.equal(undone.body.undo.undoes, merge.id);
    assert.match(await record(), /hormuz-conflict/, 'the name is offered again');
    assert.equal((await admin(`/api/admin/merges/${merge.id}/undo`, { method: 'POST' })).status, 422, 'an undo is made once');

    // And merges it again by hand.
    const byHand = await admin('/api/admin/merges', { method: 'POST', body: JSON.stringify({ stories: ['iran-war', 'hormuz-conflict'], note: 'one war' }) });
    assert.equal(byHand.status, 201);
    assert.equal(byHand.body.merge.canonical, 'iran-war');
    assert.equal((await admin('/api/admin/merges', { method: 'POST', body: '{"stories":["iran-war","nothing"]}' })).status, 422);
  });
});

test('the backfill judges unjudged readings oldest first, against the record as it stood', async () => {
  await withServer({ port: PORTS.storyMerges, env: { ADMIN_TOKEN, NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    const submit = caller(base);
    const admin = (path, init = {}) => fetch(`${base}${path}`, {
      ...init, headers: { 'content-type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
    }).then(async (r) => ({ status: r.status, body: await r.json() }));
    const plain = (score, explanation) => fetch(`${base}/api/readings`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-newsworthy-token': CALLER_TOKEN },
      body: JSON.stringify({ score, explanation }),
    }).then((r) => r.json());

    const judged = await submit(6, 'A dam failed upstream of the capital.', { story: 'dam-failure' });
    const first = await plain(6, 'Floodwater reached the capital.');
    const second = await plain(3, 'Markets were calm.');
    assert.equal(first.development, 'unjudged');

    const next = await admin('/api/admin/judgements/next');
    assert.equal(next.body.reading.id, first.id, 'oldest first');
    assert.match(next.body.record, new RegExp(`^\\[${judged.body.id}\\] dam-failure`, 'm'));
    assert.doesNotMatch(next.body.record, /Markets were calm/, 'nothing after the reading is in its record');
    assert.equal(next.body.remaining, 2);

    const outOfOrder = await admin('/api/admin/judgements', { method: 'POST', body: JSON.stringify({ reading: second.id, judge_version: next.body.judge_version, development_of: null, story: 'markets' }) });
    assert.equal(outOfOrder.status, 422);
    const bad = await admin('/api/admin/judgements', { method: 'POST', body: JSON.stringify({ reading: first.id, judge_version: next.body.judge_version, development_of: 99999 }) });
    assert.equal(bad.status, 422, 'checked exactly as a caller answer is');

    const done = await admin('/api/admin/judgements', { method: 'POST', body: JSON.stringify({ reading: first.id, judge_version: next.body.judge_version, development_of: judged.body.id, story: 'dam-failure', note: 'same flood' }) });
    assert.equal(done.status, 200);
    assert.equal(done.body.development, 'same');
    assert.equal(done.body.remaining, 1);
    const row = (await admin('/api/admin/history?hours=24')).body.attempts.find((r) => r.id === first.id);
    assert.equal(row.judge_version, next.body.judge_version);
    assert.equal((await admin('/api/admin/judgements/next')).body.reading.id, second.id);
  });
});
