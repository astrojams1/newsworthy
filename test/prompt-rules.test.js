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
const sectionsOf = (text) =>
  text.split('\n').filter((l) => /^(Summary|Sources|Scale|Examples|Output)$/.test(l));
const rungsOf = (text) =>
  text.split('Scale')[1].split('Examples')[0].split('\n')
    .map((l) => l.trim()).filter((l) => /^\d+\./.test(l));
const examplesOf = (text) =>
  text.split('\nExamples')[1].split('\nOutput')[0].split('\n')
    .map((l) => l.trim()).filter((l) => /^\d+ /.test(l));
const words = (s) => s.split(/\s+/).length;

test('rule 1 — five sections, in order', () => {
  assert.deepEqual(
    sectionsOf(renderPrompt(latestVersion()).text),
    ['Summary', 'Sources', 'Scale', 'Examples', 'Output'],
  );
});

test('rule 2 — ten rungs, numbered 1 to 10, each 8 words or fewer', () => {
  const rungs = rungsOf(renderPrompt(latestVersion()).text);
  assert.deepEqual(rungs.map((l) => parseInt(l, 10)), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (const rung of rungs) {
    const n = words(rung.replace(/^\d+\.\s*/, ''));
    assert.ok(n <= 8, `"${rung}" is ${n} words`);
  }
});

test('rule 3 — each example is a score and a headline of 8 words or fewer', () => {
  const examples = examplesOf(renderPrompt(latestVersion()).text);
  assert.ok(examples.length >= 1, 'at least one example');
  for (const example of examples) {
    assert.match(example, /^(10|[1-9]) — \S/, `"${example}" is not "<score> — <headline>"`);
    const n = words(example.replace(/^\d+ — /, ''));
    assert.ok(n <= 8, `"${example}" is ${n} words`);
  }
});

test('rule 4 — only Scale and Examples say how to rate', () => {
  // v8 kept rating high because the recalibration went into Summary as prose
  // while the rungs still described the old bands. Two places saying how to
  // rate means one of them is ignored, and it is not the prose.
  const { text } = renderPrompt(latestVersion());
  const before = text.split('\nScale')[0];
  assert.ok(words(before.split('Sources')[0]) < 30, 'Summary states the task and stops');
  for (const leak of [/normal day is a/i, /pulls? a score/i, /stays low/i,
    /middle of the scale/i, /sit near the bottom/i, /rate the event/i]) {
    assert.ok(!leak.test(before), `${leak} belongs in Scale or Examples`);
  }
});

test('rule 5 — examples are the author\'s calibration, verbatim', () => {
  // Four readings the author scored directly. An example nobody scored is this
  // app's own opinion wearing the author's clothes.
  assert.deepEqual(examplesOf(renderPrompt(9).text), [
    '2 — Standing war continues, ceasefire holding, nothing new.',
    '3 — Foreign flood kills hundreds; no domestic effect.',
    '3 — Corporate settlement, billions, no user action needed.',
    '3 — Trade dispute escalates by one more round.',
  ]);
});

test('rule 6 — append-only: published versions are frozen', () => {
  // Rows reference these hashes, so a reading stays traceable to a prompt that
  // can be reproduced exactly.
  for (const [version, hash] of [
    [1, '7ebe2d68813f1487'], [4, 'cce0a516da847bf4'], [5, '6470f557ee94563d'],
    [6, 'cb27cb79f8f78ac2'], [7, 'e760cfdc6c2106ee'], [8, 'e841c5d77cd6bb33'],
  ]) {
    assert.equal(renderPrompt(version).hash, hash, `v${version} changed`);
  }
  const versions = allPrompts().map((p) => p.version);
  assert.deepEqual(versions, [...versions].sort((a, b) => a - b), 'listed in order');
  assert.equal(new Set(allPrompts().map((p) => p.hash)).size, versions.length, 'hashes distinct');
});

test('rule 7 — under 2,000 characters', () => {
  const { text } = renderPrompt(latestVersion());
  assert.ok(text.length < 2000, `${text.length} characters`);
});

test('the rules file lists exactly what is enforced here', async () => {
  // A rule added to the file and not to this suite is decoration.
  const rules = await readFile('PROMPT-RULES.md', 'utf8');
  assert.equal(rules.split('\n').filter((l) => /^\d+\. /.test(l)).length, 7,
    'seven rules; add a test before adding an eighth');
});

test('v9 moves the rungs rather than annotating them', () => {
  // The substance of the fix. v8 was asked to rate lower and answered with a
  // paragraph; the rungs are where a scale actually lives.
  const [v8, v9] = [8, 9].map(renderPrompt);
  assert.notDeepEqual(rungsOf(v9.text), rungsOf(v8.text), 'the scale itself changed');
  // Rung 3 is where the author put all four calibration readings.
  assert.match(rungsOf(v9.text)[2], /Significant elsewhere; changes nothing for you/);
  assert.ok(v9.text.length < v8.text.length, 'and it got shorter, not longer');
});

test('v9 keeps what earlier versions were written to fix', () => {
  const { text } = renderPrompt(9);
  assert.match(text, /silence is not evidence against an event/, 'v6 lag guard');
  assert.match(text, /Hacker News/, 'v4 source');
  assert.match(text, /single JSON object and nothing else/, 'the parser contract');
  assert.match(text, /do not justify the score/, 'v2');
});
