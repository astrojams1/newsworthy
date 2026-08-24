import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVerdict } from '../src/rate.js';
import { renderPrompt, latestVersion, allPrompts } from '../src/prompts.js';

test('parses the JSON contract', () => {
  const v = parseVerdict('{"score": 7, "explanation": "A thing happened."}');
  assert.equal(v.score, 7);
  assert.equal(v.explanation, 'A thing happened.');
});

test('parses JSON wrapped in fences and prose', () => {
  const v = parseVerdict('Sure!\n```json\n{"score": 2, "explanation": "Quiet day."}\n```');
  assert.equal(v.score, 2);
  assert.equal(v.explanation, 'Quiet day.');
});

test('falls back to a bare N/10', () => {
  const v = parseVerdict('3/10 — nothing much, mostly political noise.');
  assert.equal(v.score, 3);
  assert.match(v.explanation, /political noise/);
});

test('accepts 10 and rejects out-of-range scores', () => {
  assert.equal(parseVerdict('{"score": 10, "explanation": "Historic."}').score, 10);
  assert.throws(() => parseVerdict('{"score": 42, "explanation": "x"}'));
  assert.throws(() => parseVerdict('{"score": 0, "explanation": "x"}'));
  assert.throws(() => parseVerdict('   '));
});

test('supplies an explanation when the model omits one', () => {
  assert.equal(parseVerdict('{"score": 4}').explanation, 'No explanation given.');
});

test('published prompts are frozen — v1 must never change', () => {
  const p = renderPrompt(1);
  assert.equal(p.version, 1);
  assert.match(p.text, /rate from 1–10 how worthwhile/);
  // Pinned deliberately: rows in the database reference this hash. If editing
  // a published prompt breaks this, add a new version instead of changing v1.
  assert.equal(p.hash, '7ebe2d68813f1487');
  assert.throws(() => renderPrompt(99), /Unknown prompt version/);
});

test('the registry grows and the newest version is the active one', () => {
  const versions = allPrompts().map((p) => p.version);
  assert.deepEqual(versions, [...versions].sort((a, b) => a - b), 'listed in order');
  assert.equal(latestVersion(), Math.max(...versions));
  assert.equal(new Set(allPrompts().map((p) => p.hash)).size, versions.length, 'hashes are distinct');
});

test('slotFor floors to the interval boundary', async () => {
  const { slotFor } = await import('../src/rate.js');
  assert.equal(slotFor(new Date('2026-08-23T04:07:31.000Z'), 15), '2026-08-23T04:00:00.000Z');
  assert.equal(slotFor(new Date('2026-08-23T04:14:59.999Z'), 15), '2026-08-23T04:00:00.000Z');
  assert.equal(slotFor(new Date('2026-08-23T04:15:00.000Z'), 15), '2026-08-23T04:15:00.000Z');
  assert.equal(slotFor(new Date('2026-08-23T04:59:00.000Z'), 15), '2026-08-23T04:45:00.000Z');
});
