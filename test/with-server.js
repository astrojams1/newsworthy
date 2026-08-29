/**
 * Spawn the real server for a test, and take it down afterwards.
 *
 * `src/server.js` has no exports and calls listen() as a side effect of import,
 * so a test that imported it would exercise the real handler but leave a
 * listener open that never lets `node --test` exit. Every test that needs the
 * routes therefore spawns it as a child process.
 *
 * Kept in one place because four files had grown their own copy of this and the
 * copies had drifted — different poll counts, different env, a port per file in
 * one and a port per test in another. Each copy was another place the two
 * mistakes below had to be fixed separately, and they were not.
 *
 * Not named *.test.js: `npm test` globs test/*.test.js, and a helper picked up
 * as a suite is a suite with no assertions in it.
 */
export const CALLER_TOKEN = 'test-caller-token';
export const ADMIN_TOKEN = 'test-admin-token';

/**
 * Ports in use, one per spawn rather than one per file.
 *
 * `node --test` runs files concurrently, so two files sharing a port collide —
 * which is why they were separated. Two tests in one file collide too, more
 * quietly: they run in sequence, but `child.kill()` is an asynchronous SIGTERM,
 * so the next spawn can reach listen() while the previous process still holds
 * the port. Claiming one here per spawn site keeps that impossible rather than
 * unlikely, and keeps the list somewhere a new test can see it.
 */
export const PORTS = {
  ingestSoftErrors: 8811,
  currentSmoothing: 8817,
  currentScoreFrom: 8819,
  promptVersionSurface: 8821,
  ingestDigest: 8823,
  rejectionsRecorded: 8825,
  rejectionsUnauthenticated: 8827,
};

/**
 * Wait for the server to answer, and say why if it never does.
 *
 * The poll used to fall through silently on exhaustion and let the test run on
 * against a dead port, so a server that failed to start surfaced as a pile of
 * opaque ECONNREFUSED errors from whichever fetch happened to run first. The
 * likeliest cause is the port still being held, so it is worth naming.
 */
async function waitForReady(base, child, port) {
  for (let i = 0; i < 100; i += 1) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(
        `server for port ${port} exited (code ${child.exitCode}, signal ${child.signalCode}) ` +
          'before answering — the port is probably still held by an earlier spawn',
      );
    }
    try {
      await fetch(`${base}/healthz`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error(`server on port ${port} never answered /healthz within 10s`);
}

/**
 * @param {{port: number, env?: Record<string, string>}} options
 * @param {(base: string) => Promise<void>} run receives the base URL
 */
export async function withServer({ port, env = {} }, run) {
  const { spawn } = await import('node:child_process');
  const child = spawn(process.execPath, ['src/server.js'], {
    env: {
      ...process.env,
      PORT: String(port),
      CALLER_TOKEN,
      NEWSWORTHY_SQL_DRIVER: 'pglite',
      NEWSWORTHY_MOCK: '1',
      ...env,
    },
    stdio: 'ignore',
  });
  try {
    const base = `http://127.0.0.1:${port}`;
    await waitForReady(base, child, port);
    await run(base);
  } finally {
    child.kill();
  }
}
