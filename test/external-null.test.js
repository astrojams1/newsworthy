import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insertRating, stats } from '../src/db.js';
import { validateSubmission } from '../src/ingest.js';

test('an external reading stores with a null model against real Postgres', async () => {
  // The model column was NOT NULL; external readings now record no model at
  // all, so the insert would fail without the migration.
  const submission = validateSubmission({
    score: 6, explanation: 'A thing happened.', prompt_version: 3,
    model: 'gpt-5', caller: 'chatgpt', usage: { input_tokens: 85_000 },
  });
  const saved = await insertRating({ ...submission, slot: null });
  assert.equal(saved.source, 'external');
  assert.equal(saved.model, null);
  assert.equal(saved.caller, null);
  assert.equal(saved.cost_usd, null);
  assert.equal(saved.input_tokens, null);

  const s = await stats({ hours: 24 });
  assert.equal(s.external_spend_usd, 0, 'an external reading adds nothing to spend');
});
