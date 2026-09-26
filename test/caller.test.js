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

test('POST is the only submission shape, authenticated by header', () => {
  const text = build();
  assert.ok(text.includes('POST https://example.test/api/readings'));
  assert.ok(!text.includes('GET https://example.test/api/readings'), 'no GET form');
  assert.match(text, /header `x-newsworthy-token`/);
  assert.ok(!/token=/.test(text), 'no token in any URL');
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

test('the submission is two fields, and says so', () => {
  // Model, caller name and token counts were self-reported and unverifiable.
  // prompt_version was worse: a caller that can name a version can pin one, and
  // one did — submissions kept arriving as v3 for hours after v4 went live.
  const text = build();
  assert.match(text, /Those two fields are the whole reading/);
  assert.match(text, /stamped by the\s+server/);
  assert.match(text, /not a field a caller\s+sets/);
  for (const gone of ['"prompt_version"', 'input_tokens', 'output_tokens',
    'web_search_requests', '"measured"', '"caller"']) {
    assert.ok(!text.includes(gone), `${gone} is no longer asked for`);
  }
});

test('the fetch guidance carries what a real run had to learn the hard way', () => {
  const text = build();
  assert.match(text, /links without usable snippets/);
  assert.match(text, /No list of sites is\s+fixed/);
  assert.match(text, /looks stale is fetched again with `curl`/);
  assert.ok(!/Reuters|CNBC|CNN answer/.test(text), 'no hard-coded source list');
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

test('the caller API is read raw, with curl', () => {
  // A web-fetch tool that passes pages through a model paraphrased and cut
  // what it returned; curl returns the bytes the server sent.
  const text = build();
  assert.match(text.slice(0, text.indexOf('## 1.')), /made with `curl`/);
});

test('the digest is expected, not offered as optional', () => {
  // First wording said "is optional" and "Omitting the field is also fine",
  // then treated omission as a finding. The one reading taken under it carried
  // no digest, which proved nothing — the page had invited exactly that.
  const text = build();
  assert.match(text, /A complete submission carries three things/);
  assert.match(text, /sends one every time/);
  assert.ok(!/`prompt_sha256`, is optional/.test(text), 'not framed as optional');
  assert.ok(!/Omitting the field is also fine/.test(text));
  // And still never a rejection, so the four rules stay four.
  assert.match(text, /A mismatch is never a rejection/);
});

test('the digest is required where the rules that get followed live', () => {
  // Compliance tracked position, not wording. The one instruction followed by
  // every run — a reading exists only on a 201 — sits in the opening lines. The
  // digest sat at 31% and 82% through a 10,892-character page and was returned
  // by one run in two. This puts it beside the rule that works.
  const text = build();
  const opening = text.slice(0, text.indexOf('## 1.'));
  assert.match(opening, /A complete submission carries three things/);
  assert.match(opening, /all 64 characters, computed with a code tool/);
  assert.ok(opening.includes('prompt_sha256'), 'named before the first section');
  // And the definition still lives with the prompt it is a digest of.
  assert.match(text, /Verifying the text arrived intact/);
});

test('the request example carries the digest field', () => {
  // Asked for in prose, absent from the two shapes a caller copies. A caller
  // following the example exactly produced a submission without it, which is
  // the most mechanical explanation available for why it arrived once in two.
  const text = build();
  // The code block, not the opening line that also names POST /api/readings.
  const block = text.indexOf('POST https://example.test/api/readings\ncontent-type');
  assert.ok(block > 0, 'the POST example block is present');
  assert.match(text.slice(block, text.indexOf('```', block)),
    /"prompt_sha256": "<64 lowercase hex characters/);
});

test('the digest is defined against the text field of /api/prompt', () => {
  // The JSON string value is byte-identical to what the server hashes, with
  // no markers to strip.
  const text = build();
  assert.match(text, /`https:\/\/example\.test\/api\/prompt`: its `text` field/);
  assert.match(text, /no markers to\s+strip and no whitespace to guess at/);
  // And the answer is still not published anywhere: only the 16-char prefix is.
  assert.match(text, /are the\s+first 16 of that digest\. They are not the answer/);
});

test('the digest is defined as the text field value, not the endpoint response', () => {
  // The first wording opened with "The bytes to hash come from /api/prompt",
  // which reads as the response body; the text-field qualifier trailed behind a
  // dash. A caller followed it, hashed the whole JSON body, and its reading
  // stored with prompt_verified: false — a correct-looking 201 whose only
  // failure signal was a flag the caller had no reason to distrust its own
  // hashing over. The definition now leads with the field's decoded value and
  // names both wrong inputs, and what a false flag means for a caller that
  // followed this section.
  const text = build();
  assert.match(text, /bytes to hash are the decoded value of one field/);
  assert.match(text, /Not the whole response body/);
  assert.match(text, /not\s+the field as it sits escaped/);
  assert.match(text, /means the wrong bytes were hashed, not that\s+the text arrived altered/);
  assert.ok(!/bytes to hash come from/.test(text), 'the old opening is gone');
});

test('length guidance is not an API rejection', () => {
  const text = build();
  const guidance = /at most 140 characters including spaces and punctuation/;
  assert.match(renderPrompt(latestVersion()).text, guidance);
  assert.match(text, guidance);
  assert.doesNotMatch(text, /25[- ]word/);
  assert.match(text, /beyond 400 characters is truncated and stored, never rejected/);
});

test('the judge prompt is in the instructions, after the rating, and the history is a separate fetch', async () => {
  const { renderJudgePrompt } = await import('../src/story.js');
  const judge = renderJudgePrompt();
  const text = build();
  assert.ok(text.includes(judge.text), 'the judge prompt is embedded verbatim');
  assert.ok(text.indexOf('## 3. The prompt') < text.indexOf('## 4. The judge prompt'),
    'placed after the rating prompt, apart from anything the rating reads');
  assert.match(text, new RegExp(`"judge_version": ${judge.version}`), 'the submission example carries its version');
  assert.match(text, /Once the score and sentence are final, and not before, the caller fetches\s+`GET https:\/\/example\.test\/api\/developments`/,
    'the history is fetched only after the reading is written');
});
