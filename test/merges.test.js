import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { aliasMap, canonicalStory, mergeProblem, renameProblem, storyStats, survivor, usedNames } from '../src/merges.js';
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

test('a rename covers the readings stored before it and leaves the old name free after', () => {
  // korea-stocks was coined for a fall in Seoul and held three weeks of
  // AI-spending news. Renamed, those readings read as the new name; a Seoul
  // story coined under the old name afterwards is a story of its own.
  const at = Date.parse('2026-10-30T12:00:00Z');
  const map = aliasMap([{ alias: 'korea-stocks', canonical: 'ai-stocks', kind: 'rename', created_at: '2026-10-30T12:00:00Z' }]);
  assert.equal(canonicalStory(map, 'korea-stocks', at - 1), 'ai-stocks', 'a reading filed before the rename');
  assert.equal(canonicalStory(map, 'korea-stocks', at + 1), 'korea-stocks', 'a story coined under the old name later');
  assert.equal(canonicalStory(map, 'korea-stocks'), 'korea-stocks', 'the name as it is used now');

  const chain = aliasMap([
    { alias: 'korea-stocks', canonical: 'ai-stocks', kind: 'rename', created_at: '2026-10-30T12:00:00Z' },
    { alias: 'korea-stocks', canonical: 'seoul-tariffs', kind: 'rename', created_at: '2026-11-05T12:00:00Z' },
    { alias: 'ai-stocks', canonical: 'tech-selloff' },
  ]);
  assert.equal(canonicalStory(chain, 'korea-stocks', at - 1), 'tech-selloff', 'the first rename after it, then on through a merge');
  assert.equal(canonicalStory(chain, 'korea-stocks', at + 1), 'seoul-tariffs', 'a second coinage takes the second rename');

  const stats = storyStats([
    { story: 'korea-stocks', created_at: '2026-10-12T10:00:00.000Z' },
    { story: 'korea-stocks', created_at: '2026-10-29T10:00:00.000Z' },
    { story: 'korea-stocks', created_at: '2026-10-31T10:00:00.000Z' },
  ], map);
  assert.deepEqual(Object.fromEntries(stats), {
    'ai-stocks': { readings: 2, first: '2026-10-12T10:00:00.000Z' },
    'korea-stocks': { readings: 1, first: '2026-10-31T10:00:00.000Z' },
  }, 'readings count under the name each goes by');
});

test('renames and merges resolve every reading of one story to one name, whatever their order', () => {
  // Codex review on #247: renamed korea-stocks -> ai-stocks, then a later Seoul
  // story under korea-stocks merged with ai-stocks, and the readings from
  // before the rename came back round to korea-stocks, were taken for a cycle,
  // and stayed apart under ai-stocks.
  const t = (day) => Date.parse(`2026-${day}T00:00:00Z`);
  const renamed = { alias: 'korea-stocks', canonical: 'ai-stocks', kind: 'rename', created_at: '2026-10-30T12:00:00Z' };
  const names = (map) => ['korea-stocks@10-20', 'ai-stocks@11-01', 'korea-stocks@11-05'].map((r) => {
    const [story, day] = r.split('@');
    return canonicalStory(map, story, t(day));
  });
  const intoOld = aliasMap([renamed, { alias: 'ai-stocks', canonical: 'korea-stocks', kind: 'merge', created_at: '2026-11-10T12:00:00Z' }]);
  assert.deepEqual(names(intoOld), ['korea-stocks', 'korea-stocks', 'korea-stocks'], 'merged into the reused name');
  const intoNew = aliasMap([renamed, { alias: 'korea-stocks', canonical: 'ai-stocks', kind: 'merge', created_at: '2026-11-10T12:00:00Z' }]);
  assert.deepEqual(names(intoNew), ['ai-stocks', 'ai-stocks', 'ai-stocks'], 'merged into the new name');

  // A rename reaches what was merged in before it, not what was merged in after.
  const map = aliasMap([
    { alias: 'hormuz-conflict', canonical: 'iran-war', kind: 'merge', created_at: '2026-10-01T00:00:00Z' },
    { alias: 'iran-war', canonical: 'us-iran-war', kind: 'rename', created_at: '2026-10-15T00:00:00Z' },
    { alias: 'gulf-shipping', canonical: 'iran-war', kind: 'merge', created_at: '2026-10-20T00:00:00Z' },
  ]);
  assert.equal(canonicalStory(map, 'hormuz-conflict', t('09-20')), 'us-iran-war', 'merged in before the rename');
  assert.equal(canonicalStory(map, 'iran-war', t('10-10')), 'us-iran-war');
  assert.equal(canonicalStory(map, 'iran-war', t('10-18')), 'iran-war', 'the name reused after the rename');
  assert.equal(canonicalStory(map, 'gulf-shipping', t('10-10')), 'iran-war', 'merged in after the rename');
});

test('a rename needs a story on record and a name nothing uses', () => {
  const map = aliasMap([{ alias: 'hormuz-conflict', canonical: 'iran-war' }]);
  const context = { map, known: new Set(['iran-war', 'korea-stocks']), used: new Set(['iran-war', 'hormuz-conflict', 'korea-stocks']) };
  assert.equal(renameProblem('Korea Stocks', 'AI stocks', context), null, 'names are compared as stored slugs');
  assert.equal(renameProblem('hormuz-conflict', 'gulf-war', context), null, 'a merged-away name names the story it joined');
  assert.match(renameProblem('volcano', 'eruption', context), /volcano is not a story on record/);
  assert.match(renameProblem('korea-stocks', 'Korea stocks', context), /already its name/);
  assert.match(renameProblem('korea-stocks', 'hormuz-conflict', context), /already a name on record: merge the two instead/);
  assert.match(renameProblem('korea-stocks', ' ', context), /needs a story and its new name/);
  assert.deepEqual(usedNames([{ story: 'a' }], [{ alias: 'b', canonical: 'c' }]), new Set(['a', 'b', 'c']));
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
    const merged = await record();
    assert.match(merged, /^ {2}iran-war · 4 readings/m, 'the merged story counts both names\' readings');
    assert.match(merged, /iran-war:\n {2}\S+ \S+ Iran struck two tankers near Hormuz\.\n(.*\n){2} {2}\S+ \S+ Talks on the strait resumed\./,
      'and lists them all under the name kept, oldest first');

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
  await withServer({ port: PORTS.storyBackfill, env: { ADMIN_TOKEN, NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
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

test('the admin renames a story: the page and the record read the new name, and an undo restores it', async () => {
  await withServer({ port: PORTS.storyRenames, env: { ADMIN_TOKEN, NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    const submit = caller(base);
    const admin = (path, init = {}) => fetch(`${base}${path}`, {
      ...init, headers: { 'content-type': 'application/json', 'x-admin-token': ADMIN_TOKEN, ...init.headers },
    }).then(async (r) => ({ status: r.status, body: await r.json() }));
    const record = async () => (await (await fetch(`${base}/api/developments`, { headers: { 'x-newsworthy-token': CALLER_TOKEN } })).json()).record;
    const current = async () => (await fetch(`${base}/api/current`)).json();
    const rename = (body) => admin('/api/admin/renames', { method: 'POST', body: JSON.stringify(body) });

    await submit(4, 'Iran struck a tanker near Hormuz.', { story: 'iran-war' });
    await submit(5, "South Korea's main stock index fell 4%.", { story: 'korea-stocks' });
    await submit(5, 'Amazon missed sales forecasts and its shares fell 8%.', { story: 'korea-stocks' });
    assert.equal((await current()).explanation_story, 'korea-stocks', 'the outgrown name, as the page showed it');

    assert.match((await rename({ story: 'volcano', name: 'eruption' })).body.error, /not a story on record/);
    assert.match((await rename({ story: 'korea-stocks', name: 'iran-war' })).body.error, /merge the two instead/);

    const made = await rename({ story: 'korea-stocks', name: 'AI stocks', note: 'outgrew its name' });
    assert.equal(made.status, 201);
    assert.deepEqual([made.body.rename.alias, made.body.rename.canonical, made.body.rename.kind], ['korea-stocks', 'ai-stocks', 'rename']);
    assert.equal((await current()).explanation_story, 'ai-stocks', 'the page reads the new name at once');
    const renamed = await record();
    assert.match(renamed, /^ {2}ai-stocks · 2 readings/m, 'and so does the judge\'s list');
    assert.doesNotMatch(renamed, /korea-stocks/, 'the old name is no longer offered');

    const history = await admin('/api/admin/history?hours=24');
    const [row] = history.body.merges;
    assert.deepEqual([row.kind, row.active], ['rename', true]);
    assert.deepEqual(history.body.attempts.filter((r) => /Amazon|Korea/.test(r.explanation)).map((r) => r.story),
      ['korea-stocks', 'korea-stocks'], 'readings keep the name they were judged with');
    assert.deepEqual(history.body.stories.map((s) => s.story).sort(), ['ai-stocks', 'iran-war'], 'the board reads the new name');

    // The old name is free again: a Seoul story coined under it later is its own.
    await submit(6, "South Korea's index fell 5% after a tariff threat.", { story: 'korea-stocks' });
    const later = await record();
    assert.match(later, /^ {2}korea-stocks · 1 reading,/m);
    assert.match(later, /^ {2}ai-stocks · 2 readings/m);

    const undone = await admin(`/api/admin/merges/${row.id}/undo`, { method: 'POST', body: '{}' });
    assert.equal(undone.status, 201);
    assert.equal(undone.body.undo.kind, 'rename');
    const restored = await record();
    assert.match(restored, /^ {2}korea-stocks · 3 readings/m, 'undone, every reading is under its own name again');
    assert.doesNotMatch(restored, /ai-stocks/);
  });
});

test('a merge or rename status sits under its fields on a phone, not beside them', { timeout: 60_000 }, async (t) => {
  // The form did not wrap, so a status beside the fields took their room: on
  // 2026-10-30, "volcano is not a story on record" left each field 33px wide.
  const executablePath = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium', '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean).find((path) => existsSync(path));
  if (!executablePath) {
    assert.ok(!process.env.CI, 'no Chrome or Chromium found; set CHROME_PATH');
    t.skip('no Chrome or Chromium on this machine; set CHROME_PATH to run it');
    return;
  }
  const browser = await chromium.launch({ executablePath });
  try {
    // The source page with its scripts off: the layout is the CSS's alone.
    const page = await browser.newPage({ viewport: { width: 390, height: 800 }, javaScriptEnabled: false });
    await page.setContent(await readFile(new URL('../public/admin.html', import.meta.url), 'utf8'));
    for (const form of ['merge', 'rename']) {
      const box = await page.evaluate((form) => {
        const status = document.getElementById(`${form}-status`);
        status.textContent = 'volcano is not a story on record';
        const field = document.querySelector(`#${form}-form input`).getBoundingClientRect();
        return { field: field.width, below: status.getBoundingClientRect().top >= field.bottom };
      }, form);
      assert.ok(box.field > 100, `${form} field is ${box.field}px wide with a status showing`);
      assert.ok(box.below, `${form} status sits under the fields`);
    }
  } finally {
    await browser.close();
  }
});
