import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('AGENTS.md is the coding-agent guide; CLAUDE.md must not exist', () => {
  // Include new files before they are staged; skip ignored dependencies,
  // generated output and other worktrees. Deleted index entries are harmless.
  const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const forbidden = paths.filter((path) =>
    basename(path).toLowerCase() === 'claude.md' && existsSync(join(root, path)));
  assert.deepEqual(forbidden, [],
    `Do not create CLAUDE.md; keep coding-agent guidance in AGENTS.md. Found: ${forbidden.join(', ')}`);
});

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
