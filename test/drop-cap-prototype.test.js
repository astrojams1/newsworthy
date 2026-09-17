import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { previewReading, samples } from '../design/prototypes/drop-cap/model.js';

test('prototype removes visible denominators for every score while retaining accessible scale', () => {
  for (let score = 1; score <= 10; score++) {
    const reading = previewReading(score, 'standard');
    assert.equal(reading.number, String(score));
    assert.equal(reading.label, `${score} out of 10`);
    assert.equal(reading.level, score);
  }
});

test('prototype empty state does not masquerade as a scored reading', () => {
  const reading = previewReading(10, 'empty');
  assert.equal(reading.level, null);
  assert.equal(reading.number, '–');
  assert.equal(reading.label, 'Rating unavailable');
  assert.equal(reading.timestamp, 'Waiting for a reading');
  assert.equal(reading.explanation, samples.empty);
});

test('prototype preserves full custom explanations and renders two digits as one float', () => {
  const custom = '<not markup> ' + 'Long text '.repeat(35);
  assert.equal(previewReading(10, 'long', custom).explanation, custom);
  const html = readFileSync(new URL('../design/prototypes/drop-cap/index.html', import.meta.url), 'utf8');
  assert.equal((html.match(/class="drop-cap score" data-score/g) ?? []).length, 2);
  assert.equal((html.match(/data-score/g) ?? []).length, 5);
  assert.doesNotMatch(html, /\/10/);
});
