import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderPrompt, latestVersion, allPrompts } from '../src/prompts.js';

/**
 * PROMPT-RULES.md is the list; this file is its enforcement. Prompts are tweaked
 * often, and a rule that lives only in prose is a rule that gets forgotten on
 * the version where it matters. Every rule is checked against whichever version
 * is live, so these cannot go stale as versions accumulate.
 */
const rungsOf = (text) =>
  text.split('Scale')[1].split('\n').map((l) => l.trim()).filter((l) => /^\d+\./.test(l));

test('rule 1 — four sections, in order', () => {
  const text = renderPrompt(latestVersion()).text;
  assert.deepEqual(
    text.split('\n').filter((l) => /^(Summary|Sources|Scale|Output)$/.test(l)),
    ['Summary', 'Sources', 'Scale', 'Output'],
  );
});

test('rule 2 — ten rungs, numbered 1 to 10', () => {
  const rungs = rungsOf(renderPrompt(latestVersion()).text);
  assert.deepEqual(rungs.map((l) => parseInt(l, 10)), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('rule 3 — each rung is 8 words or fewer', () => {
  for (const rung of rungsOf(renderPrompt(latestVersion()).text)) {
    const words = rung.replace(/^\d+\.\s*/, '').split(/\s+/).length;
    assert.ok(words <= 8, `"${rung}" is ${words} words`);
  }
});

test('rule 5 — append-only: published versions are frozen', () => {
  // Pinned hashes. Rows in the database reference these, so a reading stays
  // traceable to a prompt that can be reproduced exactly.
  for (const [version, hash] of [
    [1, '7ebe2d68813f1487'], [4, 'cce0a516da847bf4'],
    [5, '6470f557ee94563d'], [6, 'cb27cb79f8f78ac2'], [7, 'e760cfdc6c2106ee'],
  ]) {
    assert.equal(renderPrompt(version).hash, hash, `v${version} changed`);
  }
  const versions = allPrompts().map((p) => p.version);
  assert.deepEqual(versions, [...versions].sort((a, b) => a - b), 'listed in order');
  assert.equal(new Set(allPrompts().map((p) => p.hash)).size, versions.length, 'hashes distinct');
});

test('rule 6 — under 2,000 characters', () => {
  const { text } = renderPrompt(latestVersion());
  assert.ok(text.length < 2000, `${text.length} characters`);
});

test('the rules file lists exactly what is enforced here', async () => {
  // If a rule is added to the file and not to this suite, it is decoration.
  const rules = await readFile('PROMPT-RULES.md', 'utf8');
  const listed = rules.split('\n').filter((l) => /^\d+\. /.test(l)).length;
  assert.equal(listed, 6, 'six rules; add a test before adding a seventh');
});

test('v8 encodes what the author said, not a paraphrase of it', () => {
  // Rule 4. The four calibration answers in CALIBRATION.md were all "lower",
  // and for two distinct reasons — a version that keeps the wording but loses
  // either reason measures something nobody asked for.
  const { text } = renderPrompt(8);

  // Novelty: judged intrinsically, since readings are isolated and a caller
  // cannot know what was rated before.
  assert.match(text, /has not changed since yesterday is not a development/);
  assert.match(text, /181st day/);

  // Reach: a grave event with no bearing on the reader stays low.
  assert.match(text, /no bearing on the reader stays low/);
  assert.match(text, /middle of the scale is for what changes a decision/);

  // And the recalibration itself: a normal day was 5 and should be 3.
  assert.match(text, /A normal day is a 3\./);

  assert.deepEqual(rungsOf(text), [
    '1. Nothing new; the news can wait.',
    '2. Ongoing story, no change today.',
    '3. Real development, no bearing on you.',
    '4. Notable shift; consequences not yet clear.',
    '5. Confirmed change that affects your decisions.',
    '6. Significant event; plans may need adjusting.',
    '7. Major shock breaking now.',
    '8. Severe disruption, broad and immediate.',
    '9. Systemic risk flashing; check immediately.',
    '10. Extreme global threat; continuous attention warranted.',
  ]);
});

test('v8 keeps what earlier versions were written to fix', () => {
  const { text } = renderPrompt(8);
  assert.match(text, /rate the event, not the tape/, 'v6 lag guard');
  assert.match(text, /Hacker News/, 'v4 source');
  assert.match(text, /single JSON object and nothing else/, 'the parser contract');
  assert.match(text, /do not justify the score/, 'v2');
});
