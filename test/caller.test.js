import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callerInstructions } from '../src/caller.js';
import { latestVersion, renderPrompt } from '../src/prompts.js';

const build = () =>
  callerInstructions({ baseUrl: 'https://example.test', prompt: renderPrompt(latestVersion()) });

test('the instructions carry the live prompt inline, so one fetch is enough', () => {
  const prompt = renderPrompt(latestVersion());
  const text = build();
  assert.ok(text.includes(prompt.text), 'the rating prompt itself is embedded');
  assert.ok(text.includes(prompt.hash), 'stamped with the hash it came from');
  assert.ok(text.includes(`version ${prompt.version}`));
});

test('both submission shapes are present, POST first', () => {
  const text = build();
  const post = text.indexOf('POST https://example.test/api/readings');
  const get = text.indexOf('GET https://example.test/api/readings');
  assert.ok(post > 0 && get > 0, 'both are documented');
  assert.ok(post < get, 'POST is presented before the GET fallback');
  // The GET path must read as usable, not as a discouraged edge case: a caller
  // that cannot POST has to reach for it rather than give up.
  assert.match(text, /any client that can retrieve a URL can submit/);
});

test('the base URL is taken from the caller, not hardcoded', () => {
  const text = callerInstructions({ baseUrl: 'http://localhost:3000', prompt: renderPrompt(1) });
  assert.ok(text.includes('http://localhost:3000/api/readings'));
  assert.ok(!text.includes('example.test'));
  assert.ok(!/newsworthy-indol/.test(text), 'no deployment is baked in');
});

test('the refusal rule survives, since only the caller can enforce it', () => {
  assert.match(build(), /submits nothing at all/);
});

test('instructions are served as text/plain, which every fetch tool accepts', async () => {
  // A caller agent could not read these when they were text/markdown: its
  // browser layer rejected the MIME type before exposing the body, so it never
  // learned the GET fallback existed.
  const src = await import('node:fs/promises').then((fs) => fs.readFile('src/server.js', 'utf8'));
  assert.ok(src.includes("'content-type': 'text/plain; charset=utf-8'"), 'plain text');
  assert.ok(!/'content-type': 'text\/markdown/.test(src), 'never served as markdown');
  assert.match(src, /format.*===.*'json'/, 'and JSON on request');
});

test('nothing on the page is phrased as an order to the tool fetching it', () => {
  // Two callers got an apologetic "I cannot make HTTP requests" instead of this
  // page: a fetch tool summarizes through a small model, and that model read
  // imperatives aimed at "you" as its own orders. One burned two fetches before
  // getting through. A specification gives it nothing to refuse.
  const text = build();
  const body = text.slice(0, text.indexOf('----- BEGIN PROMPT'));
  assert.ok(!/\bYou (are|must|should|will|can)\b/.test(body), 'no second-person commands');
  assert.ok(!/^\s*(Run|Print|Report|Submit|Do not) /m.test(body), 'no bare imperatives');
  // Not even a disclaimer: a summarizer quoted an earlier "nothing here
  // addresses you" line back and argued with it against its own constraints,
  // returning the argument instead of the page. Self-reference is the bug.
  assert.ok(!/\bthis page\b/.test(body), 'the page does not talk about itself');
});

test('the finish line is a fact about the system, so it survives paraphrase', () => {
  // The rule that stopped two callers — a score is not a finished job — has to
  // outlive a summarizer. Stated as a property of the API it does; stated as
  // "you are not done until…" it is exactly what gets compressed away.
  const text = build();
  const stated = text.indexOf('A reading exists only when');
  assert.ok(stated > 0 && stated < text.indexOf('## 1.'), 'stated before any section');
  assert.match(text, /is not a reading/);
});

test('a caller that only got a summary is told how to get the prompt intact', () => {
  // Observed: a caller rated the news from a summarized paraphrase of the
  // prompt, then submitted prompt_version 3 — attributing the reading to text
  // it never actually read.
  const text = build();
  assert.match(text, /attributed to a prompt the caller never read/);
  assert.match(text, /api\/instructions\?format=json/);
  // Unconditional, not "if you notice you got a summary" — a caller cannot
  // tell. A live fetch returned the scale reworded closely enough to look
  // right and rate differently.
  assert.match(text, /no\s+way to tell from the result that this happened/);
  assert.ok(!/received a\s+summarized/.test(text), 'not phrased as a condition the caller must detect');
});

test('the submission is three fields, and says so', () => {
  // Model, caller name and token counts were all self-reported and all stored
  // as fact. One caller estimated 85,000 input tokens with no counter; priced
  // at Opus rates that was $0.48 of invented spend in a real total.
  const text = build();
  assert.match(text, /Those are the whole submission/);
  assert.match(text, /cannot verify any of it/);
  for (const gone of ['input_tokens', 'output_tokens', 'web_search_requests', '"measured"', '"caller"']) {
    assert.ok(!text.includes(gone), `${gone} is no longer asked for`);
  }
});

test('a client that blocks both requests is told to surface the payload', () => {
  const text = build();
  assert.match(text, /Some sandboxes permit neither request/);
  assert.match(text, /was \*\*not\*\* submitted/);
  assert.match(text, /https:\/\/example\.test\/admin/);
  assert.match(text, /Paste a reading/);
});

test('the fetch guidance carries what a real run had to learn the hard way', () => {
  const text = build();
  assert.match(text, /links without usable snippets/);
  assert.match(text, /Reuters, AP and BBC block automated\s+fetches/);
  assert.match(text, /unreliable digit by digit/);
});
