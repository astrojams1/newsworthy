// The story-update prototype's candidate list (.agents/skills/newsworthy-story-updates):
// one row per story, its newest development on record, and nothing too old.
import test from 'node:test';
import assert from 'node:assert/strict';
import { candidates } from '../.agents/skills/newsworthy-story-updates/candidates.mjs';

const now = Date.parse('2026-11-14T04:30:00Z');
const at = (hoursAgo) => new Date(now - hoursAgo * 3_600_000).toISOString();
const development = (root, story, hoursAgo, explanation = `development ${root}`) =>
  ({ root, story, since: at(hoursAgo), score: 5, displayed: 5, leading: false, explanation });

test('one row per story, newest development first, earlier sentences kept', () => {
  const rows = candidates({ developments: [
    development(1, 'bond-selloff', 30),
    development(2, 'faa-outage', 6),
    development(3, 'bond-selloff', 8),
  ] }, { now });
  assert.deepEqual(rows.map((row) => row.story), ['faa-outage', 'bond-selloff']);
  assert.equal(rows[1].last_recorded.root, 3);
  assert.deepEqual(rows[1].earlier.map((row) => row.explanation), ['development 1']);
});

test('developments without a story and stories gone quiet are left out', () => {
  const rows = candidates({ developments: [
    development(1, null, 2),
    development(2, 'ai-stocks', 80),
    development(3, 'iran-war', 19),
  ] }, { now });
  assert.deepEqual(rows.map((row) => row.story), ['iran-war']);
});

test('the reading on screen is on record for its own story only', () => {
  const current = { story: 'nvidia-spy', explanation: 'Chip stocks fell further.', explanation_at: at(11) };
  const rows = candidates({ developments: [development(1, 'nvidia-spy', 17), development(2, 'iran-war', 19)] },
    { now, current });
  assert.deepEqual(rows[0].current_reading, { at: at(11), explanation: 'Chip stocks fell further.' });
  assert.equal(rows[1].current_reading, undefined);
});

test('a missing or malformed timeline gives no candidates', () => {
  assert.deepEqual(candidates(undefined, { now }), []);
  assert.deepEqual(candidates({ developments: null }, { now }), []);
});
