// Story updates end to end against the real server: the "New:"/"Update:"
// label in /api/current, POST /api/updates and its checks, and the update on
// each timeline entry, shown until a newer development in its story takes
// over. See src/updates.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, PORTS, CALLER_TOKEN, caller } from './with-server.js';

const TRIAL_TOKEN = 'test-trial-token';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('labels, updates and the timeline agree from first report to the story moving on', async () => {
  const env = { NEWSWORTHY_NO_SCHEDULER: '1', TRIAL_CALLERS: `haiku-5-5=${TRIAL_TOKEN}` };
  await withServer({ port: PORTS.storyUpdates, env }, async (base) => {
    const submit = caller(base);
    const current = async () => (await fetch(`${base}/api/current`)).json();
    const timeline = async () => (await (await fetch(`${base}/api/timeline`)).json()).developments;
    const post = async (body, token = CALLER_TOKEN) => {
      const res = await fetch(`${base}/api/updates`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { 'x-newsworthy-token': token } : {}) },
        body: JSON.stringify(body),
      });
      return { status: res.status, body: await res.json() };
    };

    // A story's first development is "New".
    const halt = await submit(6, 'The FAA halted all US flight departures after a communication failure', { story: 'faa-outage' });
    assert.equal(halt.status, 201);
    let now = await current();
    assert.equal(now.explanation_new, true);
    assert.equal(now.explanation_label, 'New', 'nothing was on record for faa-outage');

    // Another story takes the page; the halt moves to the timeline, as yet without an update.
    await submit(5, 'Chip stocks fell after Nvidia CEO Jensen Huang resigned', { story: 'nvidia-spy' });
    now = await current();
    assert.equal(now.explanation_label, 'New');
    let entries = await timeline();
    let faa = entries.find((d) => d.story === 'faa-outage');
    assert.equal(faa.root, halt.body.id);
    assert.equal(faa.update, null);
    assert.equal(faa.activity, faa.since, 'an entry without an update is active from when it opened');

    // The update check finds the lift.
    await sleep(20);
    const at = new Date().toISOString();
    const lift = {
      follows: halt.body.id,
      story: 'faa-outage',
      explanation: 'The FAA lifted its halt on all US departures after more than four hours',
      at,
      kind: 'resolution',
      sources: [{ url: 'https://example.com/faa', published: '2026-11-13T22:56:00Z', modified: '2026-11-14T03:20:00Z' }],
    };
    assert.equal((await post(lift, null)).status, 401, 'a caller token is required');
    const trial = await post(lift, TRIAL_TOKEN);
    assert.equal(trial.status, 200);
    assert.equal(trial.body.stored, false, 'a trial caller\'s update is checked and kept apart');
    assert.equal((await timeline()).find((d) => d.story === 'faa-outage').update, null);

    const stored = await post(lift);
    assert.equal(stored.status, 201);
    assert.equal(stored.body.stored, true);
    assert.equal(stored.body.update.explanation, `${lift.explanation}.`, 'stored with its end, as readings are');
    assert.equal(stored.body.update.caller, 'caller');
    const again = await post(lift);
    assert.equal(again.status, 200, 'the same sentence for the same development is stored once');
    assert.equal(again.body.stored, false);
    assert.equal(again.body.update.id, stored.body.update.id);

    entries = await timeline();
    faa = entries.find((d) => d.story === 'faa-outage');
    assert.deepEqual(faa.update, { explanation: `${lift.explanation}.`, at, kind: 'resolution' });
    assert.equal(faa.activity, at, 'the entry is active from its update');
    assert.equal(faa.explanation, 'The FAA halted all US flight departures after a communication failure.',
      'the rated sentence is untouched');
    assert.equal(faa.score, 6, 'and so is its score');
    assert.equal((await current()).score, now.score, 'an update never touches the number');

    // Refusals, each with its reason.
    const refused = async (body, pattern) => {
      const res = await post(body);
      assert.equal(res.status, 422, JSON.stringify(body));
      assert.match(res.body.error, pattern);
    };
    await refused({ ...lift, follows: 999999 }, /not live on the timeline/);
    await refused({ ...lift, story: 'iran-war' }, /is in story "faa-outage"/);
    await refused({ ...lift, at: new Date(Date.parse(halt.body.created_at) - 60_000).toISOString() }, /after the development/);
    await refused({ ...lift, at: new Date(Date.now() + 3_600_000).toISOString() }, /future/);
    await refused({ ...lift, kind: 'rumour' }, /kind must be one of/);
    await refused({ ...lift, sources: [] }, /at least one page/);
    await refused({ ...lift, sources: [{ url: 'ftp://example.com' }] }, /http\(s\) url/);
    await refused({ ...lift, explanation: '  ' }, /explanation is required/);
    await refused([], /JSON object/);

    // A reading that opens a newer development in a known story is an "Update",
    // and it takes the story on: the halt's update is no longer shown.
    await sleep(20);
    const reimposed = await submit(5, 'The FAA halted departures again after lifting the stop', { story: 'faa-outage' });
    assert.equal(reimposed.status, 201);
    now = await current();
    assert.equal(now.explanation_new, true, 'installed builds still see a new development');
    assert.equal(now.explanation_label, 'Update', 'faa-outage was on record');
    faa = (await timeline()).find((d) => d.root === halt.body.id);
    assert.equal(faa.update, null, 'a newer development in the story replaces the update');
    assert.equal(faa.activity, faa.since);
    await refused({ ...lift, explanation: 'Another sentence' }, /not the newest in "faa-outage"; updates follow/);

    // A re-report carries no label at all.
    await submit(5, 'The FAA halt continued', { story: 'faa-outage', answer: 'same' });
    now = await current();
    assert.equal(now.explanation_new, false);
    assert.equal(now.explanation_label, null);
  });
});
