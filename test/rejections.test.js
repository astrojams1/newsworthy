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
 *
 * Spawned rather than imported, for the reason src/server.js states: it has no
 * exports and calls listen() as a side effect, so importing it would leave a
 * listener open that never lets `node --test` exit. Port 8825 — every
 * server-spawning file here uses its own.
 */
const PORT = 8825;
const CALLER = 'test-caller-token';
const ADMIN = 'test-admin-token';

const withServer = async (run) => {
  const { spawn } = await import('node:child_process');
  const child = spawn(process.execPath, ['src/server.js'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      CALLER_TOKEN: CALLER,
      ADMIN_TOKEN: ADMIN,
      NEWSWORTHY_SQL_DRIVER: 'pglite',
      NEWSWORTHY_MOCK: '1',
      NEWSWORTHY_NO_SCHEDULER: '1',
    },
    stdio: 'ignore',
  });
  try {
    const base = `http://127.0.0.1:${PORT}`;
    for (let i = 0; i < 100; i++) {
      try { await fetch(`${base}/healthz`); break; } catch { await new Promise((r) => setTimeout(r, 100)); }
    }
    await run(base);
  } finally {
    child.kill();
  }
};

test('a rejected submission leaves a row saying which rule fired', async () => {
  await withServer(async (base) => {
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
    const rejections = await (async () => {
      // The write is deliberately not awaited by the handler, so it can land
      // just after the response. Poll rather than sleep.
      for (let i = 0; i < 50; i++) {
        const res = await fetch(`${base}/api/admin/history?token=${ADMIN}`);
        assert.equal(res.status, 200);
        const body = await res.json();
        if ((body.rejections ?? []).length >= 3) return body.rejections;
        await new Promise((r) => setTimeout(r, 100));
      }
      return assert.fail('no rejections were recorded');
    })();

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
  await withServer(async (base) => {
    const unauth = await fetch(`${base}/api/readings?score=3&explanation=Quiet+day`);
    assert.equal(unauth.status, 401, 'still refused, and still says so');

    // Softened too, since a caller that cannot read a 401 is stuck silently and
    // permanently. Neither shape may leave a row.
    const soft = await fetch(`${base}/api/readings?score=3&explanation=Quiet+day&soft_errors=1`);
    assert.equal(soft.status, 200);
    assert.equal((await soft.json()).status, 401);

    // A real rejection afterwards, so this cannot pass by the write simply
    // being slow: once the authenticated one has landed, the 401s have had
    // strictly longer to land and have not.
    await fetch(`${base}/api/readings?token=${CALLER}&score=3`);
    for (let i = 0; i < 50; i++) {
      const body = await (await fetch(`${base}/api/admin/history?token=${ADMIN}`)).json();
      if ((body.rejections ?? []).length >= 1) {
        assert.deepEqual(body.rejections.map((r) => r.status), [422],
          'the authenticated 422 is recorded and neither 401 is');
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.fail('the authenticated rejection was never recorded');
  });
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
