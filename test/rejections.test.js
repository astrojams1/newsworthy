import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_TOKEN as ADMIN, CALLER_TOKEN as CALLER, PORTS, readings, withServer } from './with-server.js';

/**
 * A rejection has to outlive the log line that reports it. Two 422s on
 * 2026-08-28 cost a caller its explanation, and which of the four rules had
 * fired could not be established afterwards from anything: the only record was
 * a console.warn, and Vercel's function logs are ephemeral.
 */
test('what was refused is recorded; what was unauthenticated is not', async () => {
  await withServer({
    port: PORTS.rejections,
    env: { ADMIN_TOKEN: ADMIN, NEWSWORTHY_NO_SCHEDULER: '1' },
  }, async (base) => {
    const get = readings(base);

    // A 401 is the one refusal an unauthenticated request can provoke, since
    // this route answers before checking a token. Recording it would turn a
    // public URL into an unbounded database write, so neither shape leaves a
    // row — and both still say what they said.
    assert.equal((await get('score=3&explanation=Quiet+day')).status, 401);
    const softAuth = await get('score=3&explanation=Quiet+day&soft_errors=1');
    assert.equal(softAuth.status, 200);
    assert.equal(softAuth.body.status, 401);

    // The contract that must not move: recording a rejection changes nothing a
    // caller sees.
    const hard = await get(`token=${CALLER}&score=3`);
    assert.equal(hard.status, 422);
    assert.deepEqual(hard.body, { error: 'explanation is required' });

    const soft = await get(`token=${CALLER}&score=3&soft_errors=1`);
    assert.equal(soft.status, 200);
    assert.deepEqual(soft.body, {
      ok: false, stored: false, status: 422, error: 'explanation is required',
    });

    // A POST too, so the recorded method is something the row was told rather
    // than a constant: rejection() does not receive the request.
    const posted = await fetch(`${base}/api/readings?token=${CALLER}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ score: 11, explanation: 'Out of range.' }),
    });
    assert.equal(posted.status, 422);

    // A stored reading, to prove the table holds refusals and not traffic.
    assert.equal((await get(`token=${CALLER}&score=4&explanation=A+thing`)).status, 201);

    // Read back through the route: the child owns its own in-memory PGlite, so
    // this is the only way to see the rows, and it checks the surfacing too. No
    // polling — the handler awaits the write, so a response means the row is in.
    const { rejections } = await (await fetch(`${base}/api/admin/history?token=${ADMIN}`)).json();

    assert.deepEqual(
      rejections.map((r) => [r.status, r.reason, r.method, r.soft_errors]),
      [
        [422, 'score must be an integer from 1 to 10', 'POST', false],
        [422, 'explanation is required', 'GET', true],
        [422, 'explanation is required', 'GET', false],
      ],
      'three refusals, newest first — neither 401 and not the stored reading',
    );
    assert.ok(rejections[0].id > 0, 'a BIGSERIAL id arrives as a number, not a string');
    assert.match(rejections[0].created_at, /^\d{4}-\d{2}-\d{2}T/);
  });
});

test('an authenticated call to an endpoint that does not exist is recorded, without its query', async () => {
  // A caller following instructions that no longer match the server — a
  // removed endpoint, a wrong method — used to leave no trace at all, so a run
  // that went wrong could only be explained by guessing.
  await withServer({ port: PORTS.unknownPaths, env: { ADMIN_TOKEN: ADMIN, NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    const missing = await fetch(`${base}/api/readings/draft?token=${CALLER}`, { method: 'POST' });
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: 'no such endpoint: POST /api/readings/draft' });
    assert.equal((await fetch(`${base}/api/developments?token=${CALLER}`, { method: 'POST' })).status, 404, 'a wrong method too');
    assert.equal((await fetch(`${base}/api/nothing-here`)).status, 404, 'unauthenticated: answered, not recorded');

    // The step #144 removed answers 410 and names the current workflow, so a
    // run still following the old one can learn it inside the run.
    const removed = await fetch(`${base}/api/readings/prepare?token=${CALLER}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"score":4}',
    });
    assert.equal(removed.status, 410);
    assert.match((await removed.json()).error, /no prepare step.*\/api\/developments.*\/api\/runs/);
    const soft = await (await fetch(`${base}/api/readings/prepare?token=${CALLER}&soft_errors=1`)).json();
    assert.equal(soft.status, 410, 'soft errors carry it too');
    assert.equal((await fetch(`${base}/api/readings/prepare`, { method: 'POST' })).status, 401);
    // A reviewer probing with the admin token is marked as one, so the probe
    // is never read as the caller's refusal.
    assert.equal((await fetch(`${base}/api/readings/prepare`, { method: 'POST', headers: { 'x-admin-token': ADMIN } })).status, 410);

    const { rejections } = await (await fetch(`${base}/api/admin/history?token=${ADMIN}`)).json();
    assert.deepEqual(rejections.map((r) => [r.status, r.method, r.reason.split(':')[0], r.token]), [
      [410, 'POST', 'removed on 2026-09-25', 'admin'],
      [410, 'GET', 'removed on 2026-09-25', 'caller'],
      [410, 'POST', 'removed on 2026-09-25', 'caller'],
      [404, 'POST', 'no such endpoint', 'caller'],
      [404, 'POST', 'no such endpoint', 'caller'],
    ]);
    assert.ok(rejections.every((r) => !r.reason.includes(CALLER)), 'the token in the query is never kept');
  });
});

test('reads of the instructions, prompt and record are logged with whose token, never the token', async () => {
  // Tells apart a run that never fetched the current instructions from one
  // that fetched them and followed something else.
  await withServer({ port: PORTS.callerFetches, env: { ADMIN_TOKEN: ADMIN, NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    await fetch(`${base}/api/instructions?token=${CALLER}`);
    await fetch(`${base}/api/instructions?format=json`, { headers: { 'x-newsworthy-token': CALLER } });
    await fetch(`${base}/api/prompt?token=${CALLER}`);
    await fetch(`${base}/api/developments`, { headers: { 'x-admin-token': ADMIN } });
    assert.equal((await fetch(`${base}/api/instructions`)).status, 401);

    const { caller_fetches: fetches } = await (await fetch(`${base}/api/admin/history?token=${ADMIN}`)).json();
    assert.deepEqual(fetches.map((f) => [f.path, f.format, f.token]).reverse(), [
      ['/api/instructions', 'text', 'caller'],
      ['/api/instructions', 'json', 'caller'],
      ['/api/prompt', 'json', 'caller'],
      ['/api/developments', 'json', 'admin'],
    ], 'an unauthenticated fetch is not logged, and an admin read is marked as one');
    assert.ok(JSON.stringify(fetches).indexOf(CALLER) === -1);
  });
});

test('the rejection write is awaited, not left in flight', async () => {
  // Asserted against the source, like the max_uses check in pricing.test.js,
  // because nothing running here can see the difference: a local server always
  // drains an unawaited insert before the next request, and a serverless one
  // may be frozen the moment the response ends. That is how the first cut of
  // this shipped green with the row going missing only in production.
  const src = await import('node:fs/promises').then((fs) => fs.readFile('src/server.js', 'utf8'));
  assert.match(src, /await logRejection\(/, 'the handler waits for the row');
  assert.ok(!/void logRejection\(/.test(src), 'and does not leave it racing the freeze');
});

test('failing to record a rejection cannot become a 500', async () => {
  // The 422 path exists to name the field at fault, so a failure writing the
  // audit row must not replace that answer — which is why logRejection swallows
  // internally, and why the handler can safely await it.
  const { logRejection } = await import('../src/db.js');
  const settled = await logRejection({ status: 422, reason: null, method: 'GET', soft_errors: false })
    .then(() => 'resolved', () => 'rejected');
  assert.equal(settled, 'resolved', 'reason is NOT NULL, so that insert failed and was swallowed');
});
