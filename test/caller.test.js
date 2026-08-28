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

test('the submission is two fields, and says so', () => {
  // Model, caller name and token counts were self-reported and unverifiable.
  // prompt_version was worse: a caller that can name a version can pin one, and
  // one did — submissions kept arriving as v3 for hours after v4 went live.
  const text = build();
  assert.match(text, /Those two fields are the whole submission/);
  assert.match(text, /stamped by the\s+server/);
  assert.match(text, /not a field a caller\s+sets/);
  for (const gone of ['"prompt_version"', 'input_tokens', 'output_tokens',
    'web_search_requests', '"measured"', '"caller"']) {
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

test('the GET example uses + for spaces, which is shorter than %20', () => {
  // Not an encoding-compatibility matter, though it was first reported as one:
  // a client refuses URLs over 250 characters, and %20 costs three characters
  // per space where + costs one.
  const text = build();
  // The code block only — the prose after it names %20 to explain the choice.
  const start = text.indexOf('GET https://example.test/api/readings');
  const example = text.slice(start, text.indexOf('```', start));
  assert.ok(!example.includes('%20'), 'no %20 in the GET example');
  assert.match(example, /explanation=\w+\+\w+/, 'spaces shown as +');
  assert.match(text, /Spaces are `\+` in that query string/);
  assert.match(text, /a\s+comma is `%2C`/);
  assert.match(text, /refuses to send any URL over 250 characters/);
  assert.match(text, /POST form, which carries the sentence in a body/);
});

test('a body-blind client is offered a 2xx channel for rejections', () => {
  // The x-newsworthy-error header was the first attempt and it missed: the
  // caller it was built for cannot read headers on a non-2xx either. Its tool
  // collapses every failure into one envelope with no headers and no body.
  const text = build();
  assert.match(text, /&soft_errors=1/);
  assert.match(text, /"ok": false, "stored": false, "status": 422/);
  assert.match(text, /branches on `ok`/);
  // And the trap it has to name: a 200 that means rejected.
  assert.match(text, /would otherwise read as success/);
});

test('a 422 is documented as storing nothing, so a retry cannot duplicate', () => {
  // A caller hit two 422s, assumed a retry would leave a stray row, and
  // submitted a deliberately worse explanation to avoid one. Nothing had been
  // stored either time.
  const text = build();
  assert.match(text, /nothing was written/);
  assert.match(text, /Only a `201` creates one/);
});

test('the four rejections are named, and length is not one of them', () => {
  // The caller's leading hypothesis for its 422s was an undocumented length
  // cap on the explanation. There is none: past 400 characters the text is
  // truncated and stored, never rejected.
  const text = build();
  for (const rule of ['score must be an integer from 1 to 10', 'explanation is required',
    'explanation must not be empty', 'body must be a JSON object']) {
    assert.ok(text.includes(rule), rule);
  }
  assert.match(text, /Length is not among them/);
  assert.match(text, /truncated and stored, never rejected/);
  // And what a 422 on a well-formed submission actually means, since that is
  // the case the caller was in and guessed wrong about.
  assert.match(text, /did not arrive as it was sent/);
});

test('the header is documented, for clients that only see a body on 2xx', () => {
  assert.match(build(), /`x-newsworthy-error` header/);
});

test('every URL that needs the token is printed with it', () => {
  // /api/instructions?format=json was printed bare. It answers 401 without a
  // token, and a caller followed it into exactly that.
  const text = build();
  for (const [, url] of text.matchAll(/`(https:\/\/example\.test\/api\/instructions[^`]*)`/g)) {
    assert.match(url, /token=/, `${url} is printed without a token`);
  }
});

test('the JSON form is stated up front, where a summary still carries it', () => {
  // Section 3 already said it, but a caller that summarizes has paraphrased
  // the prompt long before reaching section 3.
  const text = build();
  assert.ok(text.indexOf('/api/instructions?format=json') < text.indexOf('## 1.'),
    'named before the first section');
});
