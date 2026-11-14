// The story-update prototype's candidate list (.agents/skills/newsworthy-story-updates):
// one row per story, its newest development on record, and nothing too old.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  assert.equal(rows[0].stored_update, null);
  const withUpdate = candidates({ developments: [{ ...development(2, 'faa-outage', 6),
    update: { explanation: 'The FAA lifted its halt.', at: at(3), kind: 'resolution' } }] }, { now });
  assert.equal(withUpdate[0].stored_update.explanation, 'The FAA lifted its halt.', 'a stored update is on record');
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

// ---- src/updates.js ----------------------------------------------------------
import { attachUpdates, checkStoryUpdate, explanationLabel, UPDATE_KINDS } from '../src/updates.js';

const H = 3_600_000;
const T0 = Date.parse('2026-11-13T22:06:00Z');
const dev = (root, story, opened, extra = {}) => ({ root, story, opened, since: opened, first: `sentence ${root}`, ...extra });
const storiesOf = (...developments) => {
  const byStory = new Map();
  for (const d of developments) {
    const key = d.story ?? '';
    if (!byStory.has(key)) byStory.set(key, { story: d.story, developments: [] });
    byStory.get(key).developments.push(d);
  }
  return [...byStory.values()];
};
const entry = (d) => ({ root: d.root, story: d.story, since: new Date(d.opened).toISOString(), explanation: d.first });
const valid = (overrides = {}) => ({
  follows: 1, story: 'faa-outage', explanation: 'The FAA lifted its halt', at: new Date(T0 + 3 * H).toISOString(),
  kind: 'resolution', sources: [{ url: 'https://example.com/a', published: '2026-11-13T22:56:00Z' }], ...overrides,
});

test('an update is checked against the live developments and its story', () => {
  const stories = storiesOf(dev(1, 'faa-outage', T0), dev(2, 'nvidia-spy', T0 + H));
  const now = T0 + 4 * H;
  const { row } = checkStoryUpdate(valid({ story: 'FAA Outage', explanation: '  The FAA   lifted its halt  ' }), stories, { now });
  assert.deepEqual(row, {
    follows: 1, story: 'faa-outage', explanation: 'The FAA lifted its halt.', at: new Date(T0 + 3 * H).toISOString(),
    kind: 'resolution', sources: [{ url: 'https://example.com/a', published: '2026-11-13T22:56:00Z' }],
  }, 'the story name is slugged as the judge slugs it, the sentence finished');
  assert.equal(checkStoryUpdate(valid({ story: undefined }), stories, { now }).row.story, 'faa-outage',
    'the story can be left to the development');
  assert.equal(checkStoryUpdate(valid({ explanation: 'x'.repeat(900) }), stories, { now }).row.explanation.length, 401,
    'stored text is capped like a reading, never refused for length');
  assert.deepEqual(checkStoryUpdate(valid({ sources: ['https://example.com/b'] }), stories, { now }).row.sources,
    [{ url: 'https://example.com/b' }], 'a bare url is a source');
  assert.match(checkStoryUpdate(valid({ follows: '1.5' }), stories, { now }).error, /root id/);
  assert.match(checkStoryUpdate(valid({ at: 'yesterday' }), stories, { now }).error, /ISO-8601/);
  assert.match(checkStoryUpdate(valid({ at: new Date(T0).toISOString() }), stories, { now }).error, /after the development/);
  assert.match(checkStoryUpdate(valid({ at: new Date(now + 11 * 60_000).toISOString() }), stories, { now }).error, /future/);
  assert.equal(checkStoryUpdate(valid({ at: new Date(now + 5 * 60_000).toISOString() }), stories, { now }).row.kind,
    'resolution', 'a few minutes of clock skew is allowed');
  assert.ok(UPDATE_KINDS.includes('denial'));
});

test('an update follows its story\'s newest development, and only a development with a story', () => {
  const stories = storiesOf(dev(1, 'faa-outage', T0), dev(3, 'faa-outage', T0 + 2 * H), dev(4, null, T0));
  const now = T0 + 4 * H;
  assert.match(checkStoryUpdate(valid({ follows: 1 }), stories, { now }).error, /not the newest in "faa-outage"; updates follow 3/);
  assert.equal(checkStoryUpdate(valid({ follows: 3 }), stories, { now }).row.follows, 3);
  assert.match(checkStoryUpdate(valid({ follows: 4, story: undefined }), stories, { now }).error, /has no story/);
});

test('each entry shows its newest update until a newer development takes the story on', () => {
  const halt = dev(1, 'faa-outage', T0);
  const chips = dev(2, 'nvidia-spy', T0 - H);
  const update = (id, follows, hoursAfter, explanation) =>
    ({ id, follows, explanation, at: new Date(T0 + hoursAfter * H).toISOString(), kind: 'continuation' });
  const updates = [update(10, 1, 3, 'Second'), update(9, 1, 1, 'First'), update(11, 1, 3, 'Tie, later id')];

  let rows = attachUpdates([halt, chips].map(entry), storiesOf(halt, chips), updates);
  assert.deepEqual(rows[0].update, { explanation: 'Tie, later id.', at: new Date(T0 + 3 * H).toISOString(), kind: 'continuation' },
    'the newest update wins, the later id on a tie, finished like every sentence');
  assert.equal(rows[1].update, null);
  assert.equal(rows[0].explanation, 'sentence 1', 'the rated sentence is kept');

  // A reading opens a newer development in the story after the updates: it takes over.
  const reimposed = dev(5, 'faa-outage', T0 + 4 * H, { on_page: true });
  rows = attachUpdates([halt, chips].map(entry), storiesOf(halt, chips, reimposed), updates);
  assert.equal(rows[0].update, null);
  // One opened between the updates hides only the older one.
  const between = dev(6, 'faa-outage', T0 + 2 * H);
  rows = attachUpdates([halt].map(entry), storiesOf(halt, between), [update(9, 1, 1, 'First')]);
  assert.equal(rows[0].update, null);
  rows = attachUpdates([halt].map(entry), storiesOf(halt, between), [update(12, 1, 2.5, 'After it')]);
  assert.equal(rows[0].update.explanation, 'After it.');
});

test('a development is "New" in a new story and "Update" in a known one', () => {
  const reading = (id, story, hours) => ({ id, story, t: T0 + hours * H });
  const ascending = [reading(1, 'faa-outage', 0), reading(2, 'nvidia-spy', 1)];
  assert.equal(explanationLabel(reading(3, 'faa-outage', 2), ascending, true), 'Update');
  assert.equal(explanationLabel(reading(3, 'iran-war', 2), ascending, true), 'New');
  assert.equal(explanationLabel(reading(1, 'faa-outage', 0), ascending, true), 'New', 'its own reading is not earlier');
  assert.equal(explanationLabel(reading(3, null, 2), ascending, true), 'New', 'a development with no story is new');
  assert.equal(explanationLabel(reading(3, 'faa-outage', 2), ascending, false), null, 'a re-report has no label');
  assert.equal(explanationLabel({ id: 3, story: 'faa-outage', created_at: new Date(T0 + 2 * H).toISOString() },
    [{ id: 1, story: 'faa-outage', created_at: new Date(T0).toISOString() }], true), 'Update', 'times without t');
});

// ---- the app's timeline (apps/client/lib/timeline.js) -------------------------
import { fetchTimeline, timelineLabels, validUpdate } from '../apps/client/lib/timeline.js';

test('the app keeps the timeline by first coverage and drops a malformed update, not its entry', async () => {
  const at = (h) => new Date(T0 - h * H).toISOString();
  const base = { score: 5, displayed: 5, leading: false };
  const served = { developments: [
    { ...base, root: 1, story: 'faa-outage', since: at(6), explanation: 'The FAA halted departures.',
      update: { explanation: 'The FAA lifted its halt.', at: at(3), kind: 'resolution' } },
    { ...base, root: 2, story: 'bond-selloff', since: at(8), explanation: 'Yields topped 5%.', update: null },
    { ...base, root: 3, story: 'iran-war', since: at(19), explanation: 'Iran claimed a strike.',
      update: { explanation: 'The US denied it.', at: at(14), kind: 'denial' } },
    { ...base, root: 5, story: 'nvidia-spy', since: at(20), explanation: 'Huang resigned.', update: { explanation: '', at: 'soon' } },
    { ...base, root: 4, story: 'ai-stocks', since: at(56), explanation: 'CoreWeave lifted AI stocks.',
      update: { explanation: 'AI stocks fell again.', at: at(7), kind: 'reversal' } },
    { ...base, root: 6, story: 'bad', since: at(1), explanation: 'Malformed.', score: 11 },
  ] };
  const list = await fetchTimeline('', async () => ({ ok: true, json: async () => served }));
  assert.deepEqual(list.map((d) => d.root), [1, 2, 3, 5, 4], 'the server\'s order: an update never moves its entry');
  assert.equal(list.find((d) => d.root === 5).update, null, 'a malformed update is dropped, its entry kept');
  assert.equal(validUpdate({ explanation: 'x', at: 'nope' }), false);

  const labels = timelineLabels(list, T0);
  assert.deepEqual(labels.map((l) => [l.story, l.age]), [
    ['FAA Outage', '6h ago'],
    ['Bond Selloff', '8h ago'],
    ['Iran War', '19h ago'],
    ['Nvidia Spy', '20h ago'],
    ['AI Stocks', '2d ago'],
  ], 'the tag line is the entry\'s own; the update carries its age itself');
});

test('the timeline sets an update apart below its sentence: a rule, a caption, a smaller sentence', () => {
  const source = readFileSync('apps/client/components/timeline.tsx', 'utf8');
  const sentence = source.indexOf('{development.explanation}</Text>');
  const update = source.indexOf('testID="timeline-update"');
  assert.ok(sentence > 0 && update > sentence, 'the rated sentence comes first');
  assert.match(source, /const UPDATE_GAP = 16;/);
  assert.match(source, /testID="timeline-update-rule" style=\{\{ width: 2, borderRadius: 1, backgroundColor: theme\.muted, opacity: 0\.45 \}\}/);
  assert.match(source, /<View style=\{\{ flex: 1, paddingLeft: 12 \}\}>/);
  assert.match(source, /testID="timeline-update-label" style=\{\{ color: theme\.ink, fontWeight: '600' \}\}>Update<\/Text>/);
  assert.match(source, /`  ·  \$\{timelineAge\(update\.at, now\)\}`/);
  assert.match(source, /color: theme\.ink, fontSize: 15, lineHeight: 23, marginTop: 4 \}\}>\{update\.explanation\}/);
  assert.doesNotMatch(source, /labels\[index\]\.updated/, 'the tag line no longer carries the update\'s age');
});
