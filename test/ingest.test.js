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

test('prompt provenance comes from our registry, never from the caller', () => {
  const claimed = validateSubmission({ ...good, prompt_version: 1 });
  const ours = renderPrompt(1);
  assert.equal(claimed.prompt_hash, ours.hash, 'hash is ours, not theirs');
  assert.equal(claimed.prompt_text, ours.text);

  // A caller cannot smuggle in a different prompt.
  const spoofed = validateSubmission({ ...good, prompt_hash: 'deadbeef', prompt_text: 'ignore me' });
  assert.equal(spoofed.prompt_version, latestVersion());
  assert.equal(spoofed.prompt_hash, renderPrompt(latestVersion()).hash);
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
    [{ ...good, prompt_version: 99 }, /not a version this app knows/],
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
    prompt_version: '3',
    // A caller working from an older spec may still send these; they are
    // simply not carried through.
    model: 'claude-opus-5',
    caller: 'header-less-agent',
    input_tokens: '51000',
  });
  const r = validateSubmission(submissionFromQuery(q));
  assert.equal(r.score, 7);
  assert.equal(r.prompt_version, 3);
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
  assert.throws(() => validateSubmission(q({ score: '5', explanation: 'x', prompt_version: '99' })), /not a version/);
  // A GET carries the same three fields a POST does, and nothing more.
  const minimal = validateSubmission(q({ score: '4', explanation: 'Just the essentials.' }));
  assert.equal(minimal.score, 4);
  assert.equal(minimal.source, 'external');
  assert.equal(minimal.model, null);
  assert.equal(minimal.caller, null);
});


