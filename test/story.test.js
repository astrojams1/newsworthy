import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allJudgePrompts, groupDevelopments, judgeMessage, judgeReading, judgeVersion,
  mockJudgement, renderJudgePrompt, similarity,
} from '../src/story.js';
import { ADMIN_TOKEN, CALLER_TOKEN, PORTS, withServer } from './with-server.js';

const HOUR = 3600_000;
const at = (h) => new Date(Date.now() - h * HOUR).toISOString();

const row = (id, explanation, extra = {}) => ({
  id, explanation, score: 5, created_at: at(48 - id), judge_version: 1, ...extra,
});

test('prior readings are grouped into the developments they reported', () => {
  const groups = groupDevelopments([
    row(1, 'Strikes resume on Larak Island', { development_of: null, story: 'iran-war' }),
    row(2, 'Larak Island strikes continue overnight', { development_of: 1 }),
    row(3, 'Glacier collapse floods Nepal', { development_of: null, story: 'nepal-floods' }),
    row(4, 'Larak strikes draw missile reply', { development_of: 1 }),
  ]);
  assert.deepEqual(groups.map((g) => g.id), [1, 3]);
  assert.equal(groups[0].readings, 3);
  assert.equal(groups[0].first, 'Strikes resume on Larak Island');
  assert.equal(groups[0].latest, 'Larak strikes draw missile reply', 'and how far it has run');
  assert.equal(groups[0].story, 'iran-war', 'the slug survives on the group');
});

test('an unjudged prior joins the reading before it rather than opening a development', () => {
  // A judge outage must not read, later, as a story breaking afresh every hour.
  const groups = groupDevelopments([
    row(1, 'Strikes resume', { development_of: null }),
    { id: 2, explanation: 'Strikes continue', score: 5, created_at: at(3) }, // no judge_version
    { id: 3, explanation: 'Strikes continue still', score: 5, created_at: at(2) },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].id, 1);
  assert.equal(groups[0].readings, 3);
});

test('the message shows the developments, the new sentence, and nothing else', () => {
  const message = judgeMessage({
    score: 6,
    explanation: 'Iran strikes Kuwait for a second night',
    created_at: at(0),
    priors: [
      row(1, 'Strikes resume on Larak Island', { development_of: null, story: 'iran-war' }),
      row(2, 'Larak strikes continue', { development_of: 1 }),
    ],
  });
  assert.match(message, /\[1\]/, 'the id the answer may name');
  assert.match(message, /iran-war/);
  assert.match(message, /Iran strikes Kuwait for a second night/);
  assert.match(message, /scored 6/);
  assert.doesNotMatch(message, /\[2\]/, 'a restatement is not an id the judge may pick');
});

test('the judge prompt is a specification, not a set of orders', () => {
  // Same constraint the caller instructions carry, for the same reason: a
  // summarising fetch tool reads a page of "you must" as orders to itself. A
  // prompt is not fetched by a tool, but the rule is cheap and the failure it
  // prevents is expensive, so the whole prompt surface keeps one voice.
  const { text } = renderJudgePrompt();
  assert.doesNotMatch(text, /\byou (must|should|will|need)\b/i);
  assert.ok(text.length < 2000, `judge prompt is ${text.length} characters`);
  assert.match(text, /development_of/, 'and it names the field it wants back');
});

test('judge prompts are append-only, pinned by hash', () => {
  // A stored judgement names the version that produced it. Editing a published
  // version would reinterpret readings already recorded, silently.
  const pins = { 1: '7b2971d31e2b3a2b', 2: '6b3fab61e669b659' };
  const prompts = allJudgePrompts();
  assert.deepEqual(prompts.map((p) => p.version), Object.keys(pins).map(Number),
    'every published version is pinned here');
  for (const prompt of prompts) {
    assert.equal(prompt.hash, pins[prompt.version],
      `judge prompt v${prompt.version} changed: add the next version, never edit a published one`);
  }
});

test('the judge is shown the names already in use, and told to reuse them', () => {
  // v1 mentioned the rule once, at the end, and left the names scattered inline
  // one per development. Over 231 real readings that produced four names for
  // one story — hormuz-threat, iran-war, iran-nuclear, hormuz-conflict — and
  // the reading that coined the second had the first in front of it at the
  // time, so a name seen in passing is not enough to get it reused.
  const message = judgeMessage({
    score: 5,
    explanation: 'Iran struck Kuwait overnight',
    created_at: at(0),
    stories: [{ story: 'iran-war', latest: 'Strikes resume on Larak Island' }],
    priors: [row(1, 'Strikes resume on Larak Island', { development_of: null, story: 'iran-war' })],
  });
  assert.match(message, /Stories on record:/);
  assert.match(message, /iran-war — Strikes resume on Larak Island/);
  assert.match(renderJudgePrompt().text, /verbatim/, 'and the rule sits with the list');

  const empty = judgeMessage({ score: 5, explanation: 'x', created_at: at(0) });
  assert.match(empty, /Stories on record: none yet/, 'an empty vocabulary says so');
});

test('v2 changed the naming and nothing about the developments', () => {
  // Which development a reading reports is judged by the same text in both, so
  // readings judged under either version stay comparable.
  const [v1, v2] = allJudgePrompts();
  const upTo = (text) => text.slice(0, text.indexOf('The id is one of the ids'));
  assert.equal(upTo(v2.text), upTo(v1.text));
  assert.notEqual(v1.text, v2.text);
  assert.equal(judgeVersion(), 2, 'and v2 is what new readings are judged by');
});

test('a new development still takes an existing story name', () => {
  // The failure this fixes is not about which development a reading reports: it
  // is a genuinely new development handed a brand-new name for a story already
  // on record.
  const answer = mockJudgement({
    explanation: 'Iran strikes in Kuwait widen the Iran conflict',
    priors: [],
    stories: [{ story: 'iran-war', latest: 'US strikes Larak Island in Iran' }],
  });
  assert.equal(answer.development_of, null, 'a new development');
  assert.equal(answer.story, 'iran-war', 'under the name already in use');
  assert.match(answer.note, /iran-war/);
});

test('the mock judge groups by shared words, and says so', async () => {
  const priors = [
    row(1, 'Strikes resume on Larak Island in Iran', { development_of: null, story: 'iran-war' }),
  ];
  const same = mockJudgement({ explanation: 'Larak Island strikes in Iran resume overnight', priors });
  assert.equal(same.development_of, 1);
  assert.match(same.note, /overlap/);

  const fresh = mockJudgement({ explanation: 'A volcano erupted in Iceland', priors });
  assert.equal(fresh.development_of, null, 'nothing in common is a new development');
});

test('a judgement is stored with its version, or the reading is stored unjudged', async () => {
  const judged = await judgeReading({
    score: 5, explanation: 'Larak Island strikes resume', created_at: at(0), mock: true,
    priors: [row(1, 'Strikes on Larak Island', { development_of: null, story: 'iran-war' })],
  });
  assert.equal(judged.development_of, 1);
  assert.equal(judged.judge_version, judgeVersion());
  assert.equal(judged.judge_model, 'mock-judge');

  // No API key and no mock: the call fails, and the reading is still storable.
  // A judge outage is never a rejection and never a lost reading.
  const failed = await judgeReading({
    score: 5, explanation: 'Something happened', created_at: at(0), priors: [],
    mock: false, model: 'claude-opus-5',
  });
  assert.equal(failed.judge_version, null, 'unjudged, not guessed');
  assert.equal(failed.development_of, null);
  assert.match(failed.judge_note, /judge/);
});

test('similarity is symmetric and bounded', () => {
  assert.equal(similarity('a flood in nepal', 'a flood in nepal'), 1);
  assert.equal(similarity('flood in nepal', 'tariffs on steel'), 0);
  assert.equal(similarity('flood in nepal', 'nepal flood toll rises'),
    similarity('nepal flood toll rises', 'flood in nepal'));
});

test('an arriving reading is judged, and the caller is told what it reported', async () => {
  await withServer({ port: PORTS.storyIngest }, async (base) => {
    const submit = (score, explanation) =>
      fetch(`${base}/api/readings?token=${CALLER_TOKEN}&score=${score}&explanation=${explanation}`)
        .then((r) => r.json());

    const first = await submit(5, 'Tariff+round+opens+on+steel+imports');
    assert.equal(first.stored, true);
    assert.equal(first.development, 'new', 'nothing like it was on record');
    assert.ok(first.story, 'and it is filed under a story');

    const same = await submit(5, 'Tariff+round+on+steel+imports+widens');
    assert.equal(same.development, 'same');
  });
});

test('the backfill judges stored readings oldest first, and stops when done', async () => {
  await withServer({ port: PORTS.storyBackfill, env: { ADMIN_TOKEN } }, async (base) => {
    const admin = (path, init = {}) =>
      fetch(`${base}${path}`, { ...init, headers: { 'x-admin-token': ADMIN_TOKEN } });

    // The server seeds one mock reading at startup, so there is always at least
    // one row to judge even before these.
    for (const [score, text] of [[4, 'Ferry+strike+halts+crossings'], [5, 'Ferry+strike+enters+day+two']]) {
      await fetch(`${base}/api/readings?token=${CALLER_TOKEN}&score=${score}&explanation=${text}`);
    }

    let guard = 0;
    let body;
    do {
      body = await (await admin('/api/admin/judge?limit=50', { method: 'POST' })).json();
      guard += 1;
    } while (body.remaining && guard < 10);
    assert.equal(body.remaining, false, 'every stored reading has a judgement');

    const again = await (await admin('/api/admin/judge?limit=50', { method: 'POST' })).json();
    assert.equal(again.attempted, 0, 'and running it again judges nothing twice');
  });
});

test('the admin board carries the live stories, and the runs table their slugs', async () => {
  await withServer({ port: PORTS.storyBoard, env: { ADMIN_TOKEN, NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    for (const [score, text] of [
      [4, 'Tariff+round+opens+on+steel+imports'],
      [4, 'Tariff+round+on+steel+widens+again'],
      [8, 'Volcano+erupts+in+Iceland+closing+airspace'],
    ]) {
      await fetch(`${base}/api/readings?token=${CALLER_TOKEN}&score=${score}&explanation=${text}`);
    }
    const body = await (await fetch(`${base}/api/admin/history?hours=24`, {
      headers: { 'x-admin-token': ADMIN_TOKEN },
    })).json();

    assert.equal(body.stories.length, 2, 'two stories are live');
    const [loudest] = body.stories;
    assert.equal(loudest.displayed, 8);
    assert.equal(loudest.leading, true, 'and the loudest is the one on the front page');
    assert.equal(loudest.developments[0].readings, 1);
    assert.match(loudest.developments[0].latest, /Volcano/);
    assert.ok(loudest.developments[0].since, 'each development is dated');

    // The runs table reads its story from the reading's own row. It showed an
    // empty column until recentAttempts() selected the judge's columns.
    const row = body.attempts.find((r) => /Volcano/.test(r.explanation ?? ''));
    assert.ok('story' in row, 'the row carries its own slug');
    assert.equal(row.judge_version, judgeVersion(), 'judged by the live version');
    assert.equal(row.development_of, null, 'and says it opened a development');
  });
});

test('the half-life is a setting, and the chart replays whichever is set', async () => {
  await withServer({ port: PORTS.storySettings, env: { ADMIN_TOKEN } }, async (base) => {
    const admin = (path, init = {}) =>
      fetch(`${base}${path}`, {
        ...init,
        headers: { 'x-admin-token': ADMIN_TOKEN, 'content-type': 'application/json' },
      });

    const before = await (await admin('/api/admin/settings')).json();
    assert.equal(before.half_life_hours, 12, 'twelve hours by default');
    assert.ok(before.half_lives.some((h) => h.hours === 24));
    assert.ok(before.judge_model);

    const saved = await (await admin('/api/admin/settings', {
      method: 'POST', body: JSON.stringify({ halfLifeHours: 24, judgeModel: 'claude-sonnet-5' }),
    })).json();
    assert.equal(saved.half_life_hours, 24);
    assert.equal(saved.judge_model, 'claude-sonnet-5');

    const history = await (await admin('/api/admin/history?hours=24')).json();
    assert.equal(history.half_life_hours, 24, 'the chart draws what is set, not a constant');

    const bad = await admin('/api/admin/settings', {
      method: 'POST', body: JSON.stringify({ halfLifeHours: 5 }),
    });
    assert.equal(bad.status, 400);
    assert.match((await bad.json()).error, /Half-life must be one of/);
  });
});
