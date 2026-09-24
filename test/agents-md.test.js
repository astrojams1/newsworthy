import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// AGENTS.md is read in full at the start of every session, so its length is a
// recurring cost. The limit lives in the file itself so raising it is one
// visible, approved edit, the same way PROMPT-RULES.md governs the prompt.
test('AGENTS.md stays under its stated character limit', async () => {
  const text = await readFile('AGENTS.md', 'utf8');
  const match = text.match(/This file is capped at ([\d,]+) characters/);
  assert.ok(match, 'AGENTS.md states its own limit');
  const limit = Number(match[1].replace(/,/g, ''));
  assert.ok(text.length < limit,
    `AGENTS.md is ${text.length} characters, limit ${limit}: make room by tightening before proposing a raise`);
});
