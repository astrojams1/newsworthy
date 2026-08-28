import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SubmissionError, validateSubmission } from '../src/ingest.js';
import { latestVersion, renderPrompt } from '../src/prompts.js';

const good = { score: 6, explanation: 'A thing happened.' };

test('accepts a submission and records nothing it cannot verify', () => {
  // Everything a caller could once say about itself is dropped. None of it was
  // checkable: one caller estimated 85,000 input tokens with no counter, which
  // priced as $0.48 of invented spend, and self-chosen names made the source
  // column read 'unnamed-agent' one run and 'cowork-cloud-scheduled' the next.
  const r = validateSubmission({
    ...good,
    model: 'claude-haiku-4-5',
    caller: 'cowork-mbp',
    usage: { measured: true, input_tokens: 40_000, output_tokens: 800, web_search_requests: 5 },
    meta: { host: 'mbp' },
  });
  assert.equal(r.source, 'external');
  assert.equal(r.score, 6);
  for (const field of ['model', 'served_by', 'caller', 'caller_meta',
    'input_tokens', 'output_tokens', 'web_search_requests', 'cost_usd']) {
    assert.equal(r[field], null, `${field} is not recorded for an external reading`);
  }
});

test('what was ignored is named, so a caller does not assume it landed', () => {
  const r = validateSubmission({ ...good, model: 'gpt-5', caller: 'chatgpt', usage: {} });
  assert.match(r.note, /ignored/);
  for (const field of ['model', 'caller', 'usage']) assert.match(r.note, new RegExp(field));
  assert.equal(validateSubmission(good).note, undefined, 'silent when nothing extra was sent');
});

test('prompt provenance comes from our registry, never from the caller', async () => {
  const { latestVersion: latest } = await import('../src/prompts.js');
  const current = renderPrompt(latest());

  // A caller cannot choose a version, so it cannot pin one. After v4 shipped,
  // every submission kept arriving as v3 because the caller named it.
  const pinned = validateSubmission({ ...good, prompt_version: 1 });
  assert.equal(pinned.prompt_version, latest(), 'stamped current, not what was asked for');
  assert.equal(pinned.prompt_hash, current.hash);
  assert.match(pinned.note, /prompt_version/, 'and the caller is told it was ignored');

  // Nor can it smuggle in a different prompt.
  const spoofed = validateSubmission({ ...good, prompt_hash: 'deadbeef', prompt_text: 'ignore me' });
  assert.equal(spoofed.prompt_hash, current.hash);
  assert.notEqual(spoofed.prompt_text, 'ignore me');
});

test('rejects everything malformed', () => {
  const rejects = [
    [{ ...good, score: 11 }, /1 to 10/],
    [{ ...good, score: 0 }, /1 to 10/],
    [{ ...good, score: 4.5 }, /1 to 10/],
    [{ ...good, score: 'five' }, /1 to 10/],
    [{ score: 5 }, /explanation is required/],
    [{ score: 5, explanation: '   ' }, /must not be empty/],
    ['not an object', /JSON object/],
  ];
  for (const [body, pattern] of rejects) {
    assert.throws(() => validateSubmission(body), pattern, JSON.stringify(body));
    assert.throws(() => validateSubmission(body), SubmissionError);
  }
});

test('caps and normalises free text rather than trusting its length', () => {
  const r = validateSubmission({
    score: 3,
    explanation: `  lots   of\n\nwhitespace  ${'x'.repeat(1000)}`,
  });
  assert.ok(r.explanation.length <= 400);
  assert.ok(!/\s{2,}/.test(r.explanation), 'whitespace collapsed');
});

test('a query-string submission maps onto the same validation as a body', async () => {
  const { submissionFromQuery } = await import('../src/ingest.js');
  const q = new URLSearchParams({
    score: '7',
    explanation: 'Reported via a plain GET, no headers available.',
    // A caller working from an older spec may still send these; they are
    // simply not carried through.
    prompt_version: '3',
    model: 'claude-opus-5',
    caller: 'header-less-agent',
    input_tokens: '51000',
  });
  const r = validateSubmission(submissionFromQuery(q));
  assert.equal(r.score, 7);
  assert.equal(r.model, null);
  assert.equal(r.caller, null);
  assert.equal(r.input_tokens, null);
  assert.equal(r.cost_usd, null);
});

test('a query submission is validated exactly as strictly', async () => {
  const { submissionFromQuery } = await import('../src/ingest.js');
  const q = (o) => submissionFromQuery(new URLSearchParams(o));
  assert.throws(() => validateSubmission(q({ score: '11', explanation: 'x' })), /1 to 10/);
  assert.throws(() => validateSubmission(q({ score: '5' })), /explanation is required/);
  // A GET carries the same three fields a POST does, and nothing more.
  const minimal = validateSubmission(q({ score: '4', explanation: 'Just the essentials.' }));
  assert.equal(minimal.score, 4);
  assert.equal(minimal.source, 'external');
  assert.equal(minimal.prompt_version, latestVersion(), 'version is stamped, not sent');
  assert.equal(minimal.model, null);
  assert.equal(minimal.caller, null);
});



/**
 * These drive the real route over HTTP. src/server.js has no exports and calls
 * listen() as a side effect of import, so it is spawned as a child process
 * rather than imported: importing it would exercise the real handler but leave
 * a listener open that never lets `node --test` exit.
 */
const withServer = async (port, run) => {
  const { spawn } = await import('node:child_process');
  const child = spawn(process.execPath, ['src/server.js'], {
    env: {
      ...process.env,
      PORT: String(port),
      CALLER_TOKEN: 'test-caller-token',
      NEWSWORTHY_SQL_DRIVER: 'pglite',
      NEWSWORTHY_MOCK: '1',
    },
    stdio: 'ignore',
  });
  try {
    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 100; i++) {
      try {
        await fetch(`${base}/healthz`);
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    await run(async (qs) => {
      const res = await fetch(`${base}/api/readings?${qs}`);
      return { status: res.status, body: await res.json() };
    });
  } finally {
    child.kill();
  }
};

test('soft_errors=1 puts a rejection where a body-blind client can read it', async () => {
  // The x-newsworthy-error header was the first attempt at this and it missed:
  // the caller it was built for cannot read headers on a non-2xx either. Its
  // fetch tool collapses every failure into a single envelope carrying no
  // headers, no body and no status text, so a 2xx is the only channel left.
  await withServer(8811, async (get) => {
    const token = 'token=test-caller-token';

    // Unchanged for every client that can read a status code.
    const hard = await get(`${token}&score=3`);
    assert.equal(hard.status, 422);
    assert.equal(hard.body.error, 'explanation is required');

    const soft = await get(`${token}&score=3&soft_errors=1`);
    assert.equal(soft.status, 200, 'readable by a client that only sees 2xx');
    assert.deepEqual(soft.body, {
      ok: false, stored: false, status: 422, error: 'explanation is required',
    });

    // Auth is softened too: a caller that cannot read a 401 is stuck silently
    // and permanently, which is the worst failure of the set.
    const unauth = await get('score=3&explanation=Quiet+day&soft_errors=1');
    assert.equal(unauth.status, 200);
    assert.equal(unauth.body.status, 401);
    assert.equal(unauth.body.stored, false);

    // A stored reading answers in the same two fields, so the caller branches
    // on `ok` rather than on a status line it cannot see. `stored` is not
    // decoration: a 200 meaning "rejected" is a trap for anything reading only
    // the status line, so the body says it outright.
    const ok = await get(`${token}&score=3&explanation=Quiet+day&soft_errors=1`);
    assert.equal(ok.status, 201);
    assert.equal(ok.body.ok, true);
    assert.equal(ok.body.stored, true);
    assert.ok(ok.body.id > 0);
  });
});

test('the soft flag is transport, not content', async () => {
  const { validateSubmission, submissionFromQuery } = await import('../src/ingest.js');
  const of = (qs) => validateSubmission(submissionFromQuery(new URL(`http://x/?${qs}`).searchParams));
  const plain = of('score=4&explanation=A+thing+happened');
  const soft = of('score=4&explanation=A+thing+happened&soft_errors=1');
  assert.deepEqual(soft, plain, 'it changes how a result is reported, never what is stored');
  // And it is not echoed as an ignored field, which would put a note on every
  // request a soft-error caller ever makes.
  assert.equal(soft.note, undefined);
});

test('a returned digest proves the caller received the text we sent', async () => {
  // Five rewordings of "do not justify the score" produced the same rate of
  // score-justifying sentences. Nothing distinguished "the prompt is wrong"
  // from "the prompt never arrived", so every prompt edit was unfalsifiable.
  const { renderPrompt, latestVersion } = await import('../src/prompts.js');
  const prompt = renderPrompt(latestVersion());

  await withServer(8823, async (get) => {
    const base = 'token=test-caller-token&score=4&explanation=A+thing+happened';

    const none = await get(base);
    assert.equal(none.body.prompt_verified, null, 'absent is neither pass nor fail');

    const ok = await get(`${base}&prompt_sha256=${prompt.digest}`);
    assert.equal(ok.body.prompt_verified, true);

    // The published 16-character hash is a prefix of the digest and is printed
    // in the instructions beside the prompt. If it satisfied the check, the
    // check would pass most reliably for a caller that only skimmed the page —
    // exactly the case it exists to catch.
    const echoed = await get(`${base}&prompt_sha256=${prompt.hash}`);
    assert.equal(echoed.body.prompt_verified, false, 'echoing the printed prefix is not proof');
    assert.equal(echoed.status, 201, 'and it still stores');

    // A digest for a different version fails, which is the v7-rated-as-v9 case.
    const stale = await get(`${base}&prompt_sha256=${renderPrompt(7).digest}`);
    assert.equal(stale.body.prompt_verified, false);

    for (const bogus of ['a'.repeat(64), 'not-a-digest', '']) {
      const r = await get(`${base}&prompt_sha256=${encodeURIComponent(bogus)}`);
      assert.equal(r.status, 201, 'a bad digest is never a rejection');
      assert.notEqual(r.body.prompt_verified, true, `${bogus || '(empty)'} must not verify`);
    }
  });
});

test('the digest is a proof, not a self-report, and is never echoed as ignored', async () => {
  const { validateSubmission, submissionFromQuery } = await import('../src/ingest.js');
  const { renderPrompt, latestVersion } = await import('../src/prompts.js');
  const digest = renderPrompt(latestVersion()).digest;
  const of = (qs) => validateSubmission(submissionFromQuery(new URL(`http://x/?${qs}`).searchParams));

  const v = of(`score=4&explanation=A+thing&prompt_sha256=${digest}`);
  assert.equal(v.prompt_verified, true);
  // Unlike model and token counts, which were removed because they were
  // unverifiable claims, this one is checked against what the server sent.
  assert.equal(v.note, undefined, 'not reported back as an ignored field');
  assert.equal(v.score, 4, 'and it changes nothing about the reading');
  assert.equal(of('score=4&explanation=A+thing').prompt_verified, null);
});
