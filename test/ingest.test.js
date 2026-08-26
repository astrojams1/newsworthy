import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SubmissionError, validateSubmission } from '../src/ingest.js';
import { latestVersion, renderPrompt } from '../src/prompts.js';

const good = { score: 6, explanation: 'A thing happened.', caller: 'cowork-mbp' };

test('accepts a well-formed submission and marks it external', () => {
  const r = validateSubmission({
    ...good,
    model: 'claude-haiku-4-5',
    usage: { input_tokens: 40_000, output_tokens: 800, web_search_requests: 5 },
    meta: { host: 'mbp', skill: 'newsworthy@1' },
  });
  assert.equal(r.source, 'external');
  assert.equal(r.caller, 'cowork-mbp');
  assert.equal(r.score, 6);
  assert.equal(r.model, 'claude-haiku-4-5');
  assert.deepEqual(r.caller_meta, { host: 'mbp', skill: 'newsworthy@1' });
  assert.ok(r.cost_usd > 0, 'priced from the caller’s own reported usage');
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
    [{ ...good, meta: 'nope' }, /meta must be an object/],
    [{ ...good, usage: { input_tokens: -1 } }, /out of range/],
    [{ ...good, usage: 'lots' }, /usage must be an object/],
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
    caller: 'y'.repeat(500),
  });
  assert.ok(r.explanation.length <= 400);
  assert.ok(r.caller.length <= 120);
  assert.ok(!/\s{2,}/.test(r.explanation), 'whitespace collapsed');
});

test('an unnamed caller and an unknown model still store cleanly', () => {
  const r = validateSubmission({ score: 2, explanation: 'Quiet.' });
  assert.equal(r.caller, 'unnamed-agent');
  assert.equal(r.model, 'unreported');
  assert.equal(r.cost_usd, null, 'no rate card, so no invented cost');
});

test('a query-string submission maps onto the same validation as a body', async () => {
  const { submissionFromQuery } = await import('../src/ingest.js');
  const q = new URLSearchParams({
    score: '7',
    explanation: 'Reported via a plain GET, no headers available.',
    caller: 'header-less-agent',
    model: 'claude-opus-5',
    prompt_version: '3',
    measured: 'true',
    input_tokens: '51000',
    output_tokens: '900',
    web_search_requests: '6',
    meta: JSON.stringify({ why: 'client cannot set headers' }),
  });
  const r = validateSubmission(submissionFromQuery(q));
  assert.equal(r.score, 7);
  assert.equal(r.caller, 'header-less-agent');
  assert.equal(r.model, 'claude-opus-5');
  assert.equal(r.prompt_version, 3);
  assert.equal(r.input_tokens, 51_000);
  assert.equal(r.web_search_requests, 6);
  assert.deepEqual(r.caller_meta, { why: 'client cannot set headers' });
  assert.ok(r.cost_usd > 0);
});

test('a query submission is validated exactly as strictly', async () => {
  const { submissionFromQuery } = await import('../src/ingest.js');
  const q = (o) => submissionFromQuery(new URLSearchParams(o));
  assert.throws(() => validateSubmission(q({ score: '11', explanation: 'x' })), /1 to 10/);
  assert.throws(() => validateSubmission(q({ score: '5' })), /explanation is required/);
  assert.throws(() => validateSubmission(q({ score: '5', explanation: 'x', prompt_version: '99' })), /not a version/);
  assert.throws(() => submissionFromQuery(new URLSearchParams({ meta: 'not json' })), /meta must be valid JSON/);
  // Absent optional fields stay absent rather than becoming empty strings.
  const minimal = validateSubmission(q({ score: '4', explanation: 'Just the essentials.' }));
  assert.equal(minimal.caller, 'unnamed-agent');
  assert.equal(minimal.model, 'unreported');
});

test('usage counts are taken flat as well as nested', () => {
  // A real caller POSTed {"score":5,...,"web_search_requests":4} and the count
  // was silently dropped: the row stored 201 with no usage, understating
  // external spend. The GET fallback documents flat parameters and the POST
  // body documents a nested object, so a caller mixing them is following a
  // shape this app publishes. Accept both.
  const flat = validateSubmission({
    score: 5, explanation: 'x', model: 'claude-opus-5', measured: true,
    input_tokens: 40_000, output_tokens: 1_000, web_search_requests: 4,
  });
  assert.equal(flat.web_search_requests, 4);
  assert.equal(flat.input_tokens, 40_000);
  assert.ok(flat.cost_usd > 0, 'a flat report still prices the run');

  const nested = validateSubmission({
    score: 5, explanation: 'x', model: 'claude-opus-5',
    usage: { measured: true, input_tokens: 40_000, output_tokens: 1_000, web_search_requests: 4 },
  });
  assert.equal(nested.cost_usd, flat.cost_usd, 'both shapes price identically');
});

test('an explicit nested usage wins over a flat field of the same name', () => {
  const both = validateSubmission({
    score: 5, explanation: 'x', web_search_requests: 9, usage: { web_search_requests: 4 },
  });
  assert.equal(both.web_search_requests, 4);
});
