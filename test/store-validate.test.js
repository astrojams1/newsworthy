import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// store/scripts/validate.mjs holds every store field to Apple's and Google's
// limits, but nothing ran it: 1.0.3's Review Notes reached 4,216 characters and
// App Store Connect refused them (409, "cannot be longer than 4000 characters")
// only when the daily review run sent them (2026-11-14).
test('store copy and store images pass store/scripts/validate.mjs', () => {
  const run = spawnSync(process.execPath, ['store/scripts/validate.mjs'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /Listing lengths and store image formats pass\./);
});
