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
  const pins = { 1: '7b2971d31e2b3a2b' };
  const prompts = allJudgePrompts();
  assert.deepEqual(prompts.map((p) => p.version), Object.keys(pins).map(Number),
    'every published version is pinned here');
  for (const prompt of prompts) {
    assert.equal(prompt.hash, pins[prompt.version],
      `judge prompt v${prompt.version} changed: add the next version, never edit a published one`);
  }
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
