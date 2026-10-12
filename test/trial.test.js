import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_TOKEN, CALLER_TOKEN, PORTS, caller, withServer } from './with-server.js';
import { judgeVersion } from '../src/story.js';
import { pairTrials, summarizeTrial } from '../src/trial.js';

const TRIAL_CALLER_TOKEN = 'test-trial-token';

// A candidate caller runs beside the live one and must not reach anything a
// reader sees: the page, the chart, push, merges, the run log.
test('a trial reading is stored apart and changes nothing the app shows', async () => {
  const env = { ADMIN_TOKEN, TRIAL_CALLER_TOKEN, NEWSWORTHY_NO_SCHEDULER: '1' };
  await withServer({ port: PORTS.trialCaller, env }, async (base) => {
    const send = (path, body, token = TRIAL_CALLER_TOKEN) => fetch(`${base}${path}`, {
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
    const instructions = await fetch(`${base}/api/instructions`, { headers: { 'x-newsworthy-token': TRIAL_CALLER_TOKEN } });
    assert.equal(instructions.status, 200);
    const developments = await fetch(`${base}/api/developments`, { headers: { 'x-newsworthy-token': TRIAL_CALLER_TOKEN } });
    assert.equal(developments.status, 200);

    const trial = await send('/api/readings', {
      score: 9,
      explanation: 'A trial sentence that must never reach the page',
      judgement: { judge_version: judgeVersion(), development_of: live.body.id, story: 'iran-war', note: 'same airport strikes', same_story: ['iran-war', 'fixture'] },
    });
    assert.equal(trial.status, 201);
    assert.equal(trial.body.trial, true);
    assert.equal(trial.body.development, 'same', 'judged against the live record like any caller');
    const report = await send('/api/runs', { reading: trial.body.id, report: 'Trial run: searched three sources.' });
    assert.equal(report.status, 201);
    assert.equal(report.body.trial, true);
    assert.equal(report.body.reading, trial.body.id);

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

    const trials = await admin('/api/admin/trials?hours=24');
    assert.equal(trials.pairs.length, 1);
    const [pair] = trials.pairs;
    assert.equal(pair.live.id, live.body.id, 'paired with the live caller\'s reading, not the nearer manual run');
    assert.equal(pair.score_diff, 5);
    assert.equal(pair.judgement_agrees, true, 'naming the live reading\'s new development agrees with "new"');
    assert.deepEqual(pair.trial.same_story, ['iran-war', 'fixture'], 'the proposal is kept as data');
    assert.equal(trials.summary.paired, 1);
    assert.equal(trials.runs[0].reading_id, trial.body.id);

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
