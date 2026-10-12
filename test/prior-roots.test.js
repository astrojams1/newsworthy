import { test, before } from 'node:test';
import assert from 'node:assert/strict';

// PGlite, like db.test.js, in a file of its own so its rows cannot shift that
// file's counts.
const { insertRating, history, priorRoots, ensureSchema } = await import('../src/db.js');
const { PRIOR_HOURS, judgeRecord } = await import('../src/story.js');

const base = { prompt_version: 1, prompt_hash: 'abc123', prompt_text: 'p', model: 'claude-opus-5', status: 'ok' };
const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString();

before(() => ensureSchema());

test('the judge record names a root older than its window by its own first report', async () => {
  // The 12 October case: re-reports inside six days of a development first
  // reported 147 hours earlier.
  const root = await insertRating({ ...base, score: 4, explanation: 'Houthis say they struck Riyadh airport',
    created_at: hoursAgo(PRIOR_HOURS + 3), story: 'iran-war', judge_version: 4 });
  await insertRating({ ...base, score: 5, explanation: 'Houthis strike Riyadh airport again, killing three',
    created_at: hoursAgo(100), story: 'iran-war', judge_version: 4, development_of: root.id });
  await insertRating({ ...base, score: 4, explanation: 'Saudi-led forces hit Houthi targets',
    created_at: hoursAgo(20), story: 'iran-war', judge_version: 4 });

  const priors = await history({ hours: PRIOR_HOURS });
  assert.ok(!priors.some((r) => r.id === root.id), 'the root is outside the window');
  const roots = await priorRoots(priors);
  assert.deepEqual([...roots.keys()], [root.id], 'only the missing root is fetched');

  const { text, roots: ids } = judgeRecord({ priors, roots });
  assert.ok(ids.includes(root.id));
  assert.match(text, new RegExp(`\\[${root.id}\\] iran-war · first seen ${root.created_at.replace(/\./g, '\\.')}`));
  assert.match(text, /first: Houthis say they struck Riyadh airport/);
});
