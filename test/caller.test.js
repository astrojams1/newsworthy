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

test('submitting is framed as the finish line, not producing the score', () => {
  // Observed failure: an agent ran the prompt, printed
  // {"score":4,"explanation":"..."} and stopped, having read the prompt's own
  // "reply with a single JSON object and nothing else" as its last
  // instruction. Nothing was ever submitted. The wrapper has to scope that
  // sentence to the verdict's shape and put the finish line at the 201.
  const text = build();
  const prompt = renderPrompt(latestVersion());
  assert.match(prompt.text, /single JSON object and nothing else/, 'the competing instruction is real');
  assert.match(text, /finished when a submission returns `201`/);
  assert.match(text, /does not end your work/);
  assert.match(text, /payload for step 2, not your answer/);
});

test('the finish line is stated before the prompt an agent might stop at', () => {
  const text = build();
  assert.ok(
    text.indexOf('finished when a submission returns') < text.indexOf('----- BEGIN PROMPT'),
    'an agent that reads top-down knows the job has two steps before it sees the prompt',
  );
});

test('a client that blocks both requests is told to surface the payload', () => {
  // Observed failure: an agent's sandbox rejected the GET as an "unsafe
  // synthesized URL" — a model-built URL carrying data and a token is the
  // shape harnesses block. It then reported the job complete. Neither the
  // silent drop nor the false success is acceptable; the verdict has to come
  // back where a human can paste it.
  const text = build();
  assert.match(text, /refuses to send either request/);
  assert.match(text, /do not report success/);
  assert.match(text, /pasted into the app's admin page/);
});
