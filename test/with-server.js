/**
 * Spawn the real server for a test, and take it down afterwards.
 *
 * src/server.js has no exports and calls listen() as a side effect of import,
 * so a test that imported it would leave a listener open that never lets
 * `node --test` exit. Three files had grown their own copy of this — four
 * copies, two of them in current.test.js — and the copies had drifted.
 *
 * Not named *.test.js: `npm test` globs test/*.test.js, and a helper picked up
 * as a suite is a suite with no assertions in it.
 */
export const CALLER_TOKEN = 'test-caller-token';
export const ADMIN_TOKEN = 'test-admin-token';

/** One port per spawn site: `node --test` runs files concurrently, and
 *  child.kill() is an async SIGTERM, so a reused port can still be held. */
export const PORTS = {
  newLabel: 8835,
  callerRuns: 8853,
  ingestSoftErrors: 8811,
  currentSmoothing: 8817,
  currentScoreFrom: 8819,
  promptVersionSurface: 8821,
  ingestDigest: 8823,
  rejections: 8825,
  storyIngest: 8827,
  storyBackfill: 8829,
  storySettings: 8831,
  storyBoard: 8833,
  push: 8839,
  pushDeliveries: 8841,
  pushRelay: 8843, // the stand-in for Expo's push service, not a Newsworthy server
  sentencePunctuation: 8845,
  webSettings: 8847,
  webSettingsTheme: 8849,
  webSettingsGlyphs: 8851,
};

/** Wait for the server, and say why if it never answers — the poll used to fall
 *  through silently and let the test run on against a dead port. */
async function waitForReady(base, child, port) {
  for (let i = 0; i < 100; i += 1) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`server for port ${port} exited before answering — port still held?`);
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

/** @param {(base: string) => Promise<void>} run receives the base URL */
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

/** GET /api/readings, with the status and parsed body together. */
export const readings = (base) => async (qs) => {
  const res = await fetch(`${base}/api/readings?${qs}`);
  return { status: res.status, body: await res.json() };
};

/**
 * The caller's sequence once it has scored and written: fetch the record,
 * answer the judge prompt against it, and submit the reading with the answer.
 * `same` answers with the newest development the record lists, read from its
 * text the way a caller reads it; `new` answers null; a number names that
 * development. The judge version is the one the instructions print.
 */
export const caller = (base) => async (score, explanation, { answer = 'new', story = 'fixture' } = {}) => {
  const { judgeVersion } = await import('../src/story.js');
  const { record } = await (await fetch(`${base}/api/developments`, { headers: { 'x-newsworthy-token': CALLER_TOKEN } })).json();
  const offered = [...record.matchAll(/^\[(\d+)\]/gm)].map((m) => Number(m[1]));
  const development_of = answer === 'new' ? null : answer === 'same' ? offered.at(-1) : answer;
  const res = await fetch(`${base}/api/readings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-newsworthy-token': CALLER_TOKEN },
    body: JSON.stringify({
      score, explanation,
      judgement: { judge_version: judgeVersion(), development_of, story, note: `test: ${answer}` },
    }),
  });
  return { status: res.status, body: await res.json(), record };
};
