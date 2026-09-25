import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_TOKEN, CALLER_TOKEN, PORTS, caller, withServer } from './with-server.js';

// The caller's run report: one per run, the only trace a run that submitted
// nothing leaves, and the only account of a run readable from here.
test('a run report is stored as written, linked to its reading, and shown to the admin', async () => {
  await withServer({ port: PORTS.callerRuns, env: { ADMIN_TOKEN, NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    const post = (body, token = CALLER_TOKEN) => fetch(`${base}/api/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-newsworthy-token': token },
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, body: await r.json() }));

    const reading = await caller(base)(5, 'Iran hit a third tanker near Hormuz.', { story: 'iran-war' });
    const linked = await post({ reading: reading.body.id, report: 'Searched NPR and CNBC; Reuters refused. Scored 5: routine escalation.' });
    assert.equal(linked.status, 201);
    assert.equal(linked.body.reading, reading.body.id);

    const nothing = await post({ report: 'Web search returned nothing; no reading submitted.' });
    assert.equal(nothing.body.reading, null, 'a run that submitted nothing still leaves a report');

    const stray = await post({ reading: 99999, report: 'Wrong id.' });
    assert.equal(stray.status, 201, 'a wrong id never costs the report');
    assert.equal(stray.body.reading, null);
    assert.match(stray.body.note, /no reading 99999/);

    const long = await post({ report: 'x'.repeat(5000) });
    assert.match(long.body.note, /truncated to 4000/);

    assert.equal((await post({ report: '  ' })).status, 422, 'a report needs text');
    assert.equal((await post({ report: 'hi' }, 'wrong')).status, 401);

    const history = await (await fetch(`${base}/api/admin/history?hours=24`, { headers: { 'x-admin-token': ADMIN_TOKEN } })).json();
    const shown = history.caller_runs.find((r) => r.id === linked.body.id);
    assert.equal(shown.score, 5, 'shown with the reading it submitted');
    assert.match(shown.report, /Reuters refused/);
    assert.equal(history.caller_runs.find((r) => r.id === long.body.id).report.length, 4000);
  });
});
