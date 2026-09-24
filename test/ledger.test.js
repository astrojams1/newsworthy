import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render, record } from '../store/scripts/ledger.mjs';

const json = () => JSON.parse(readFileSync(new URL('../store/ledger.json', import.meta.url), 'utf8'));

test('store/ledger.md is generated from store/ledger.json, never edited by hand', () => {
  assert.equal(readFileSync(new URL('../store/ledger.md', import.meta.url), 'utf8'), render(json()),
    'run: npm run ledger -- render');
});

test('recording an event updates its gate, appends history and keeps unspecified fields', () => {
  const ledger = json();
  const count = ledger.events.length;
  const gate = Object.keys(ledger.steps)[0];
  const before = ledger.steps[gate];
  record(ledger, { gate, summary: 'Checked again.', evidence: ['a note'] }, new Date('2030-01-01T00:00:00Z'));
  assert.equal(ledger.events.length, count + 1);
  assert.equal(ledger.events.at(-1).sequence, Math.max(...ledger.events.slice(0, -1).map(e => e.sequence)) + 1);
  assert.deepEqual(ledger.steps[gate], { state: before.state, owner: before.owner, basis: before.basis,
    summary: 'Checked again.', evidence: ['a note'], next_action: before.next_action, updated_at: '2030-01-01T00:00:00+00:00' });
  assert.equal(ledger.updated_at, '2030-01-01T00:00:00+00:00');
  assert.match(render(ledger), /### \d+\. .+\n\n2030-01-01T00:00:00\+00:00 · /);
  assert.throws(() => record(ledger, { gate: 'brand-new', summary: 'x', state: 'todo' }), /owner and --basis/);
  assert.throws(() => record(ledger, { gate, summary: 'x', state: 'finished' }), /state must be one of/);
});
