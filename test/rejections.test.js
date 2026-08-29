import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * A rejection has to outlive the log line that reports it.
 *
 * Two 422s on 2026-08-28 cost a caller its explanation — it burned four
 * attempts guessing at a message its fetch tool would not show it, and settled
 * on a deliberately worse sentence. Which of the four rules had fired could not
 * be established afterwards from anything: the only record was a console.warn,
 * and Vercel's function logs are ephemeral and not queryable months later. So
 * every rejection now leaves a row, and these drive the real route to prove it.
 */
import { ADMIN_TOKEN as ADMIN, CALLER_TOKEN as CALLER, PORTS, withServer } from './with-server.js';

const env = { ADMIN_TOKEN: ADMIN, NEWSWORTHY_NO_SCHEDULER: '1' };

test('a rejected submission leaves a row saying which rule fired', async () => {
  await withServer({ port: PORTS.rejectionsRecorded, env }, async (base) => {
    const get = async (qs) => {
      const res = await fetch(`${base}/api/readings?${qs}`);
      return { status: res.status, body: await res.json() };
    };

    // The contract that must not move, asserted here as well as in
    // ingest.test.js: recording a rejection changes nothing a caller sees.
    const hard = await get(`token=${CALLER}&score=3`);
    assert.equal(hard.status, 422);
    assert.deepEqual(hard.body, { error: 'explanation is required' });

    const soft = await get(`token=${CALLER}&score=3&soft_errors=1`);
    assert.equal(soft.status, 200);
    assert.deepEqual(soft.body, {
      ok: false, stored: false, status: 422, error: 'explanation is required',
    });

    // A POST rejection too, so the recorded method is something the row was
    // told rather than a constant: rejection() does not receive the request.
    const posted = await fetch(`${base}/api/readings?token=${CALLER}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ score: 11, explanation: 'Out of range.' }),
    });
    assert.equal(posted.status, 422);

    // A stored reading, to prove the table holds refusals and not traffic.
    const ok = await get(`token=${CALLER}&score=4&explanation=A+thing+happened`);
    assert.equal(ok.status, 201);

    // The rows are read back through the admin endpoint rather than from a
    // second database handle: the child server owns its own in-memory PGlite,
    // so this process could not see the rows any other way, and going through
    // the route checks the surfacing at the same time.
    // No polling: the handler awaits the write, so a returned response means
    // the row is already there. It used to be left in flight, which forced a
    // retry loop here — and that loop was the reason the production defect
    // stayed invisible, since a long-lived local server always drains an
    // unawaited insert eventually and a frozen serverless one does not.
    const res = await fetch(`${base}/api/admin/history?token=${ADMIN}`);
    assert.equal(res.status, 200);
    const { rejections } = await res.json();

    assert.equal(rejections.length, 3, 'three refusals, and the stored reading is not one');
    // Newest first, like every other query in db.js.
    const [postRow, softRow, hardRow] = rejections;

    assert.deepEqual(
      { status: hardRow.status, reason: hardRow.reason, method: hardRow.method, soft: hardRow.soft_errors },
      { status: 422, reason: 'explanation is required', method: 'GET', soft: false },
    );
    assert.deepEqual(
      { status: softRow.status, reason: softRow.reason, method: softRow.method, soft: softRow.soft_errors },
      { status: 422, reason: 'explanation is required', method: 'GET', soft: true },
    );
    // Which rule fired is the point of the row: the two 422s above are the same
    // status and different rules, and the reason is what separates them.
    assert.equal(postRow.status, 422);
    assert.match(postRow.reason, /1 to 10/);
    assert.equal(postRow.method, 'POST');
    assert.equal(postRow.soft_errors, false);

    assert.ok(postRow.id > 0, 'a BIGSERIAL id arrives as a number, not a string');
    assert.match(postRow.created_at, /^\d{4}-\d{2}-\d{2}T/, 'and created_at as an ISO string');
  });
});

test('an unauthenticated refusal is logged but never stored', async () => {
  // /api/readings answers before checking a token, so a 401 is the one refusal
  // anyone who can reach the host can provoke. Writing a row for it would turn
  // a public URL into an unbounded database write — a worse thing to have built
  // than the diagnosis is worth. Every rejection the table exists for, all four
  // rules, is raised after auth has passed, so none of them is lost by this.
  await withServer({ port: PORTS.rejectionsUnauthenticated, env }, async (base) => {
    const unauth = await fetch(`${base}/api/readings?score=3&explanation=Quiet+day`);
    assert.equal(unauth.status, 401, 'still refused, and still says so');

    // Softened too, since a caller that cannot read a 401 is stuck silently and
    // permanently. Neither shape may leave a row.
    const soft = await fetch(`${base}/api/readings?score=3&explanation=Quiet+day&soft_errors=1`);
    assert.equal(soft.status, 200);
    assert.equal((await soft.json()).status, 401);

    // An authenticated rejection afterwards, so the assertion cannot pass just
    // by nothing having been written yet: the writes are awaited, so this row
    // exists by the time its response returns, and the two 401s had strictly
    // longer to produce one.
    await fetch(`${base}/api/readings?token=${CALLER}&score=3`);
    const { rejections } = await (await fetch(`${base}/api/admin/history?token=${ADMIN}`)).json();
    assert.deepEqual(rejections.map((r) => r.status), [422],
      'the authenticated 422 is recorded and neither 401 is');
  });
});

test('the rejection write is awaited, not left in flight', async () => {
  // Asserted against the source, like the max_uses check in pricing.test.js and
  // the content-type check in caller.test.js, because no test running here can
  // see the difference. A local server lives on after the response and always
  // drains an unawaited insert before the next request arrives; a serverless
  // function may be frozen the moment the response ends and never resume. So
  // the runtime behaviour is identical in this suite and divergent in the only
  // deployment that matters — which is precisely how the first cut of this
  // shipped green with the row it exists to write going missing in production.
  const src = await import('node:fs/promises').then((fs) => fs.readFile('src/server.js', 'utf8'));
  assert.match(src, /await logRejection\(/, 'the handler waits for the row');
  assert.ok(!/void logRejection\(/.test(src), 'and does not leave it racing the freeze');
});

test('a rejection carries no request payload', async () => {
  // The four rules each name the field at fault, so the reason is the whole
  // finding. Keeping bodies posted to a token-gated endpoint would be a junk
  // magnet and a disclosure risk for whatever is mistakenly sent to it, so the
  // columns to store one do not exist.
  const { ensureSchema } = await import('../src/db.js');
  await ensureSchema();
  const { sql } = await import('../src/sql.js');
  const columns = (await sql`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'rejections'`)
    .map((r) => r.column_name).sort();
  assert.deepEqual(columns, ['created_at', 'id', 'method', 'reason', 'soft_errors', 'status']);
});

test('failing to record a rejection cannot become a 500', async () => {
  // The 422 path exists to name the field at fault. A schema or connection
  // failure while writing the audit row must not replace that answer, and must
  // not surface as an unhandled rejection either — which is why logRejection
  // swallows internally and the handler calls it without awaiting.
  const { logRejection } = await import('../src/db.js');
  const settled = await logRejection({ status: 422, reason: null, method: 'GET', soft_errors: false })
    .then(() => 'resolved', () => 'rejected');
  assert.equal(settled, 'resolved', 'reason is NOT NULL, so that insert failed and was swallowed');
});
