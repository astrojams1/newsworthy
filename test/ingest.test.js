import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SubmissionError, validateSubmission } from '../src/ingest.js';
import { latestVersion, renderPrompt } from '../src/prompts.js';
import { PORTS, submit, withServer } from './with-server.js';

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

test('prompt provenance comes from our registry, never from the caller', async () => {
  const { latestVersion: latest } = await import('../src/prompts.js');
  const current = renderPrompt(latest());

  // A caller cannot choose a version, so it cannot pin one. After v4 shipped,
  // every submission kept arriving as v3 because the caller named it.
  const pinned = validateSubmission({ ...good, prompt_version: 1 });
  assert.equal(pinned.prompt_version, latest(), 'stamped current, not what was asked for');
  assert.equal(pinned.prompt_hash, current.hash);

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

test('a stored sentence always ends in punctuation', async () => {
  const { completeSentence } = await import('../src/ingest.js');
  const of = (explanation) => validateSubmission({ score: 4, explanation }).explanation;
  assert.equal(of('The Fed raised rates a quarter point'), 'The Fed raised rates a quarter point.');
  assert.equal(of('  Talks collapsed ,  '), 'Talks collapsed.', 'a dangling comma is replaced, not followed');
  assert.equal(of('Strikes resumed overnight —'), 'Strikes resumed overnight.');
  for (const done of ['Already done.', 'Really?', 'Ceasefire!', 'Cut short…', 'Cut short...',
    'The minister said "no."', 'Rates rose (again).', 'She called it “over.”']) {
    assert.equal(of(done), done, `${done} is already complete`);
  }
  assert.equal(of('The minister said "no"'), 'The minister said "no".');
  const capped = of(`${'x'.repeat(1000)}`);
  assert.ok(capped.endsWith('…') && capped.length <= 400, 'the length cap already ends the sentence');
  assert.equal(completeSentence(null), null);
  assert.equal(completeSentence(''), '');
});

test('a returned digest proves the caller received the text we sent', async () => {
  // Five rewordings of "do not justify the score" produced the same rate of
  // score-justifying sentences. Nothing distinguished "the prompt is wrong"
  // from "the prompt never arrived", so every prompt edit was unfalsifiable.
  const { renderPrompt, latestVersion } = await import('../src/prompts.js');
  const prompt = renderPrompt(latestVersion());

  await withServer({ port: PORTS.ingestDigest }, async (base) => {
    const post = submit(base);
    const reading = { score: 4, explanation: 'A thing happened.' };

    const none = await post(reading);
    assert.equal(none.body.prompt_verified, null, 'absent is neither pass nor fail');

    const ok = await post({ ...reading, prompt_sha256: prompt.digest });
    assert.equal(ok.body.prompt_verified, true);

    // The published 16-character hash is a prefix of the digest and is printed
    // in the instructions beside the prompt. If it satisfied the check, the
    // check would pass most reliably for a caller that only skimmed the page —
    // exactly the case it exists to catch.
    const echoed = await post({ ...reading, prompt_sha256: prompt.hash });
    assert.equal(echoed.body.prompt_verified, false, 'echoing the printed prefix is not proof');
    assert.equal(echoed.status, 201, 'and it still stores');

    // A digest for a different version fails, which is the v7-rated-as-v9 case.
    const stale = await post({ ...reading, prompt_sha256: renderPrompt(7).digest });
    assert.equal(stale.body.prompt_verified, false);

    for (const bogus of ['a'.repeat(64), 'not-a-digest', '']) {
      const r = await post({ ...reading, prompt_sha256: bogus });
      assert.equal(r.status, 201, 'a bad digest is never a rejection');
      assert.notEqual(r.body.prompt_verified, true, `${bogus || '(empty)'} must not verify`);
    }
  });
});

test('the digest is a proof, not a self-report', () => {
  const digest = renderPrompt(latestVersion()).digest;
  const v = validateSubmission({ score: 4, explanation: 'A thing.', prompt_sha256: digest });
  assert.equal(v.prompt_verified, true);
  assert.equal(v.score, 4, 'and it changes nothing about the reading');
  assert.equal(validateSubmission({ score: 4, explanation: 'A thing.' }).prompt_verified, null);
});
