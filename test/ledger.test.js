// store/ledger.json is the release ledger the shared app-release skill's
// ledger.mjs keeps (npm run ledger -- record …), with store/ledger.md generated
// from it (npm run ledger -- render; npm run ledger -- check compares them).
// The tool is tested with the skill; this checks the record itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const json = () => JSON.parse(readFileSync(new URL('../store/ledger.json', import.meta.url), 'utf8'));
const STATES = ['todo', 'in_progress', 'waiting_user', 'waiting_provider', 'waiting_verification', 'uncertain', 'failed', 'done', 'not_applicable'];

test('the ledger\'s history is append-only and each gate matches its latest event', () => {
  const ledger = json();
  assert.equal(ledger.schema_version, 1);
  assert.deepEqual(ledger.events.map(e => e.sequence), ledger.events.map((e, i) => i + 1), 'sequences are contiguous');
  for (const [gate, step] of Object.entries(ledger.steps)) {
    assert.ok(STATES.includes(step.state), `${gate}: ${step.state}`);
    const last = ledger.events.filter(e => e.gate === gate).at(-1);
    assert.deepEqual(last.result, step, `${gate} matches its latest event`);
  }
});

test('the generated view names its source and has not been edited into a different ledger', () => {
  const view = readFileSync(new URL('../store/ledger.md', import.meta.url), 'utf8');
  assert.match(view, /never edit this view/);
  for (const gate of Object.keys(json().steps)) assert.ok(view.includes(`| ${gate} |`), `${gate} is in the view`);
});
