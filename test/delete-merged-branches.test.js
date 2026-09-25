import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decide } from '../scripts/delete-merged-branches.mjs';

// Merged branches are deleted automatically; the rules that keep a branch are
// the ones that matter, because a deletion loses work nobody pushed elsewhere.
const base = { branch: 'claude/fix', tip: 'abc', defaultBranch: 'main', mergedHeads: ['abc'] };

test('a branch whose tip is a merged pull request head is deleted', () => {
  assert.deepEqual(decide(base), { remove: true, reason: 'merged' });
});

test('a branch reused after its merge keeps its new commits', () => {
  assert.deepEqual(decide({ ...base, tip: 'def' }), { remove: false, reason: 'commits after the merge' });
});

test('the default branch, protected branches and branches with an open pull request are kept', () => {
  assert.equal(decide({ ...base, branch: 'main' }).remove, false);
  assert.equal(decide({ ...base, isProtected: true }).remove, false);
  assert.equal(decide({ ...base, hasOpenPr: true }).remove, false);
  assert.equal(decide({ ...base, mergedHeads: [] }).remove, false, 'closed without merging, or never proposed');
});

test('the workflow runs on merge only for this repository\'s branches, and sweeps weekly', () => {
  const workflow = readFileSync(new URL('../.github/workflows/delete-merged-branches.yml', import.meta.url), 'utf8');
  assert.match(workflow, /types: \[closed\]/);
  assert.match(workflow, /github\.event\.pull_request\.merged && github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /contents: write/);
  // The branch name reaches the script through the environment, never the
  // shell: a branch name is attacker-controlled text on a pull request.
  assert.doesNotMatch(workflow, /run:.*\$\{\{/);
});
