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
  // The GET path must read as usable, not as a discouraged edge case: an agent
  // that cannot POST has to reach for it rather than give up.
  assert.match(text, /any client that can fetch a URL can submit/);
  assert.match(text, /Do not\s+give up because POST is unavailable/);
});

test('the base URL is taken from the caller, not hardcoded', () => {
  const text = callerInstructions({ baseUrl: 'http://localhost:3000', prompt: renderPrompt(1) });
  assert.ok(text.includes('http://localhost:3000/api/readings'));
  assert.ok(!text.includes('example.test'));
  assert.ok(!/newsworthy-indol/.test(text), 'no deployment is baked in');
});

test('the refusal rule survives, since only the caller can enforce it', () => {
  assert.match(build(), /stop and submit nothing/);
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
