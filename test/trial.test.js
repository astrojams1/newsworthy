import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_TOKEN, CALLER_TOKEN, PORTS, caller, withServer } from './with-server.js';
import { judgeVersion } from '../src/story.js';
import { disagreements, pairTrials, summarizeByDay, summarizeTrial } from '../src/trial.js';

const HAIKU_TOKEN = 'test-trial-token';
const SONNET_TOKEN = 'test-sonnet-token';
// Two trials side by side, and an entry with an invalid name that must
// authorize nothing.
const TRIAL_CALLERS = `haiku-5-5=${HAIKU_TOKEN}, sonnet-5-5=${SONNET_TOKEN}, Bad Name=test-bad-token`;

// A candidate caller runs beside the live one and must not reach anything a
// reader sees: the page, the chart, push, merges, the run log.
test('a trial reading is stored apart and changes nothing the app shows', async () => {
  const env = { ADMIN_TOKEN, TRIAL_CALLERS, NEWSWORTHY_NO_SCHEDULER: '1' };
  await withServer({ port: PORTS.trialCaller, env }, async (base) => {
    const send = (path, body, token = HAIKU_TOKEN) => fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-newsworthy-token': token },
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, body: await r.json() }));
    const admin = (path) => fetch(`${base}${path}`, { headers: { 'x-admin-token': ADMIN_TOKEN } }).then((r) => r.json());

    const live = await caller(base)(4, 'Houthi rebels hit Riyadh airport again.', { story: 'iran-war' });
    assert.equal(live.status, 201);
    // A "Rate now" reading in the same half hour is not the live caller's and
    // must not be what the trial is compared with.
    const manual = await fetch(`${base}/api/cron?force=1`, { method: 'POST', headers: { 'x-admin-token': ADMIN_TOKEN } });
    assert.equal(manual.status, 200);
    const before = await (await fetch(`${base}/api/current`)).json();

    // The trial reads the same instructions and record with its own token.
    const instructions = await fetch(`${base}/api/instructions`, { headers: { 'x-newsworthy-token': HAIKU_TOKEN } });
    assert.equal(instructions.status, 200);
    const developments = await fetch(`${base}/api/developments`, { headers: { 'x-newsworthy-token': HAIKU_TOKEN } });
    assert.equal(developments.status, 200);

    const trial = await send('/api/readings', {
      score: 9,
      explanation: 'A trial sentence that must never reach the page',
      judgement: { judge_version: judgeVersion(), development_of: live.body.id, story: 'iran-war', note: 'same airport strikes', same_story: ['iran-war', 'fixture'] },
    });
    assert.equal(trial.status, 201);
    assert.equal(trial.body.trial, true);
    assert.equal(trial.body.cohort, 'haiku-5-5', 'filed under the trial its token names');
    assert.equal(trial.body.development, 'same', 'judged against the live record like any caller');
    const report = await send('/api/runs', { reading: trial.body.id, report: 'Trial run: searched three sources.' });
    assert.equal(report.status, 201);
    assert.equal(report.body.trial, true);
    assert.equal(report.body.reading, trial.body.id);

    // A second trial in the same hour is filed under its own name, and cannot
    // link a report to the other trial's reading.
    const sonnet = await send('/api/readings', { score: 6, explanation: 'A second trial sentence.' }, SONNET_TOKEN);
    assert.equal(sonnet.body.cohort, 'sonnet-5-5');
    const crossed = await send('/api/runs', { reading: trial.body.id, report: 'Sonnet run.' }, SONNET_TOKEN);
    assert.equal(crossed.body.reading, null, 'another trial\'s reading id links nothing');
    assert.equal((await send('/api/readings', { score: 3, explanation: 'x' }, 'test-bad-token')).status, 401,
      'a malformed entry authorizes nothing');

    const after = await (await fetch(`${base}/api/current`)).json();
    assert.equal(after.score, before.score, 'the front page number is untouched');
    assert.equal(after.explanation_text, before.explanation_text, 'and so is its sentence');

    const history = await admin('/api/admin/history?hours=24');
    assert.ok(history.attempts.every((r) => !/trial sentence/.test(r.explanation ?? '')), 'not in the run log');
    // By sentence, not score: the mock "Rate now" reading scores at random.
    assert.ok(history.points.some((p) => /Riyadh airport/.test(p.explanation ?? '')), 'the chart carries sentences');
    assert.ok(history.points.every((p) => !/trial sentence/.test(p.explanation ?? '')), 'not in the chart');
    assert.ok(history.caller_runs.every((r) => !/Trial run/.test(r.report)), 'its report is not the live caller\'s');
    assert.equal(history.merges.length, 0, 'its proposed merge is never applied');
    assert.ok(history.caller_fetches.some((f) => f.token === 'trial:haiku-5-5'), 'its reads are logged under its trial');

    const trials = await admin('/api/admin/trials?hours=24');
    assert.deepEqual(trials.cohorts.map((c) => c.cohort), ['haiku-5-5', 'sonnet-5-5']);
    const [haiku, sonnetTrial] = trials.cohorts;
    assert.equal(haiku.pairs.length, 1);
    assert.equal(sonnetTrial.pairs[0].trial.score, 6);
    assert.equal(sonnetTrial.runs.length, 1);
    const [pair] = haiku.pairs;
    assert.equal(pair.live.id, live.body.id, 'paired with the live caller\'s reading, not the nearer manual run');
    assert.equal(pair.score_diff, 5);
    assert.equal(pair.judgement_agrees, true, 'naming the live reading\'s new development agrees with "new"');
    assert.deepEqual(pair.trial.same_story, ['iran-war', 'fixture'], 'the proposal is kept as data');
    assert.equal(haiku.summary.paired, 1);
    assert.equal(haiku.runs[0].reading_id, trial.body.id);
    const one = await admin('/api/admin/trials?hours=24&cohort=sonnet-5-5');
    assert.deepEqual(one.cohorts.map((c) => c.cohort), ['sonnet-5-5'], '?cohort= narrows to one trial');

    // The live token still writes where it always did.
    const second = await send('/api/readings', { score: 3, explanation: 'Live sentence.' }, CALLER_TOKEN);
    assert.equal(second.body.trial, undefined);
    assert.equal(second.body.source, 'external');
    assert.equal((await send('/api/readings', { score: 3, explanation: 'x' }, 'wrong')).status, 401);
  });
});

test('trial pairing takes the nearest live reading in the window and compares judgements', () => {
  const at = (minutes) => new Date(Date.UTC(2026, 9, 12, 4, minutes)).toISOString();
  const live = [
    { id: 10, created_at: at(3), score: 4, judge_version: 4, development_of: 7, explanation: 'Live one.', prompt_verified: true },
    { id: 11, created_at: at(63), score: 5, judge_version: 4, development_of: null, explanation: 'Live two.', prompt_verified: true },
  ];
  const trials = [
    { id: 1, created_at: at(6), score: 4, judge_version: 4, development_of: 7, explanation: 'Trial.', prompt_verified: true },
    { id: 2, created_at: at(66), score: 7, judge_version: 4, development_of: 7, explanation: 'Trial two.', prompt_verified: false },
    { id: 3, created_at: at(150), score: 2, judge_version: null, development_of: null, explanation: 'Alone.', prompt_verified: null },
  ];
  const pairs = pairTrials(trials, live);
  assert.equal(pairs[0].live.id, 10);
  assert.equal(pairs[0].judgement_agrees, true);
  assert.equal(pairs[1].live.id, 11);
  assert.equal(pairs[1].judgement_agrees, false, 'the live reading opened a development; the trial filed it under another');
  assert.equal(pairs[2].live, null, 'no live reading within the window: unpaired, not matched to another hour');

  const summary = summarizeTrial(pairs);
  assert.equal(summary.paired, 2);
  assert.equal(summary.score_exact, 0.5);
  assert.equal(summary.score_mean_diff, 1);
  assert.equal(summary.judgement_agreement, 0.5);
  assert.equal(summary.trial_prompt_verified, 0.33);
});

// The aggregate hid what decided the Sonnet trial: story agreement that held
// one day and halved the next, and one missed shock in eighty hours.
test('trial comparison splits by day and surfaces the hours that disagree most', () => {
  const at = (day, hour) => new Date(Date.UTC(2026, 9, day, hour, 3)).toISOString();
  const reading = (id, created_at, score, development_of) => ({ id, created_at, score, judge_version: 5, development_of, explanation: 'x', prompt_verified: true });
  const live = [
    reading(10, at(14, 4), 4, 7),
    reading(11, at(15, 4), 8, null),
    reading(12, at(15, 5), 5, 7),
  ];
  const trials = [
    reading(1, at(14, 4), 4, 7),
    reading(2, at(15, 4), 5, 7),
    reading(3, at(15, 5), 3, 7),
  ];
  const pairs = pairTrials(trials, live);

  const days = summarizeByDay(pairs);
  assert.deepEqual(days.map((d) => d.day), ['2026-10-14', '2026-10-15'], 'oldest first');
  assert.equal(days[0].judgement_agreement, 1);
  assert.equal(days[1].judgement_agreement, 0.5);
  assert.equal(days[1].score_mean_diff, -2.5);

  const apart = disagreements(pairs);
  assert.deepEqual(apart.map((p) => p.trial.id), [2, 3], 'the missed 8 first, then a two-point gap');
  assert.equal(disagreements(pairTrials([trials[0]], live)).length, 0, 'an hour that agrees is not listed');
});

// Rows stored before trials had names all came from the first trial, Haiku 5.5;
// rows written since always carry the name their token gives them.
test('trial rows from before cohorts existed are filed under the first trial', async () => {
  const { sql } = await import('../src/sql.js');
  await sql`CREATE TABLE trial_readings (
    id BIGSERIAL PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), score SMALLINT NOT NULL,
    explanation TEXT NOT NULL, prompt_version INTEGER NOT NULL, prompt_hash TEXT NOT NULL,
    prompt_verified BOOLEAN, story TEXT, development_of BIGINT, judge_version INTEGER,
    judge_note TEXT, same_story JSONB)`;
  await sql`CREATE TABLE trial_runs (
    id BIGSERIAL PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), reading_id BIGINT, report TEXT NOT NULL)`;
  await sql`INSERT INTO trial_readings (score, explanation, prompt_version, prompt_hash) VALUES (5, 'Before names.', 22, 'h')`;
  await sql`INSERT INTO trial_runs (reading_id, report) VALUES (1, 'Before names.')`;

  const { ensureSchema, insertTrialReading, trialCohorts, trialReadings, trialRuns } = await import('../src/db.js');
  await ensureSchema();
  const fresh = await insertTrialReading({ cohort: 'sonnet-5-5', score: 6, explanation: 'After.', prompt_version: 22, prompt_hash: 'h' });

  assert.deepEqual((await trialReadings({ cohort: 'haiku-5-5' })).map((r) => r.id), [1]);
  assert.deepEqual((await trialReadings({ cohort: 'sonnet-5-5' })).map((r) => r.id), [fresh.id]);
  assert.equal((await trialRuns({ cohort: 'haiku-5-5' }))[0].report, 'Before names.');
  assert.deepEqual(await trialCohorts(), ['haiku-5-5', 'sonnet-5-5']);

  // The limit is per trial: newer rows from a busier trial cannot push
  // another trial's rows out of its own window.
  for (let i = 0; i < 3; i += 1) {
    await insertTrialReading({ cohort: 'sonnet-5-5', score: 6, explanation: 'Busy.', prompt_version: 22, prompt_hash: 'h' });
  }
  assert.deepEqual((await trialReadings({ cohort: 'haiku-5-5', limit: 2 })).map((r) => r.id), [1]);
});
