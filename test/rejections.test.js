import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_TOKEN as ADMIN, CALLER_TOKEN as CALLER, PORTS, submit, withServer } from './with-server.js';

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
    const post = submit(base);

    // A 401 is the one refusal an unauthenticated request can provoke, since
    // this route answers before checking a token. Recording it would turn a
    // public URL into an unbounded database write, so it leaves no row.
    assert.equal((await post({ score: 3, explanation: 'Quiet day.' }, { token: null })).status, 401);
    // A token in the query string no longer authenticates: callers use curl,
    // which sends the header.
    const queried = await fetch(`${base}/api/readings?token=${CALLER}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"score":3,"explanation":"x"}',
    });
    assert.equal(queried.status, 401);

    // The contract that must not move: recording a rejection changes nothing a
    // caller sees.
    const missing = await post({ score: 3 });
    assert.equal(missing.status, 422);
    assert.deepEqual(missing.body, { error: 'explanation is required' });
    assert.equal((await post({ score: 11, explanation: 'Out of range.' })).status, 422);

    // A stored reading, to prove the table holds refusals and not traffic.
    assert.equal((await post({ score: 4, explanation: 'A thing.' })).status, 201);

    // Read back through the route: the child owns its own in-memory PGlite, so
    // this is the only way to see the rows, and it checks the surfacing too. No
    // polling — the handler awaits the write, so a response means the row is in.
    const { rejections } = await (await fetch(`${base}/api/admin/history?token=${ADMIN}`)).json();

    assert.deepEqual(
      rejections.map((r) => [r.status, r.reason, r.method, r.token]),
      [
        [422, 'score must be an integer from 1 to 10', 'POST', 'caller'],
        [422, 'explanation is required', 'POST', 'caller'],
      ],
      'two refusals, newest first — no 401 and not the stored reading',
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
    const headers = { 'x-newsworthy-token': CALLER };
    const missing = await fetch(`${base}/api/readings/draft?probe=1`, { method: 'POST', headers });
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: 'no such endpoint: POST /api/readings/draft' });
    assert.equal((await fetch(`${base}/api/developments`, { method: 'POST', headers })).status, 404, 'a wrong method too');
    assert.equal((await fetch(`${base}/api/readings`, { headers })).status, 404, 'the GET form is gone');
    assert.equal((await fetch(`${base}/api/nothing-here`)).status, 404, 'unauthenticated: answered, not recorded');
    // A reviewer probing with the admin token is marked as one, so the probe
    // is never read as the caller's refusal.
    assert.equal((await fetch(`${base}/api/readings/prepare`, { method: 'POST', headers: { 'x-admin-token': ADMIN } })).status, 404);

    const { rejections } = await (await fetch(`${base}/api/admin/history?token=${ADMIN}`)).json();
    assert.deepEqual(rejections.map((r) => [r.status, r.method, r.reason, r.token]), [
      [404, 'POST', 'no such endpoint: POST /api/readings/prepare', 'admin'],
      [404, 'GET', 'no such endpoint: GET /api/readings', 'caller'],
      [404, 'POST', 'no such endpoint: POST /api/developments', 'caller'],
      [404, 'POST', 'no such endpoint: POST /api/readings/draft', 'caller'],
    ]);
    assert.ok(rejections.every((r) => !r.reason.includes('probe')), 'the query is never kept');
  });
});

test('reads of the instructions, prompt and record are logged with whose token, never the token', async () => {
  // Tells apart a run that never fetched the current instructions from one
  // that fetched them and followed something else.
  await withServer({ port: PORTS.callerFetches, env: { ADMIN_TOKEN: ADMIN, NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    const headers = { 'x-newsworthy-token': CALLER };
    await fetch(`${base}/api/instructions`, { headers });
    await fetch(`${base}/api/prompt`, { headers });
    await fetch(`${base}/api/developments`, { headers: { 'x-admin-token': ADMIN } });
    assert.equal((await fetch(`${base}/api/instructions`)).status, 401);

    const { caller_fetches: fetches } = await (await fetch(`${base}/api/admin/history?token=${ADMIN}`)).json();
    assert.deepEqual(fetches.map((f) => [f.path, f.format, f.token]).reverse(), [
      ['/api/instructions', 'text', 'caller'],
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
  const settled = await logRejection({ status: 422, reason: null, method: 'POST' })
    .then(() => 'resolved', () => 'rejected');
  assert.equal(settled, 'resolved', 'reason is NOT NULL, so that insert failed and was swallowed');
});
