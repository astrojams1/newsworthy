/**
 * Story updates, and the label the front page puts on a new development.
 *
 * Newsworthy records one reading an hour: the single biggest development at
 * that moment. A story keeps moving after it stops being the biggest — on
 * 2026-11-13 the FAA halted every US departure at 22:06 UTC and lifted the
 * halt at 01:15, by which time another story led, so no reading reported the
 * lift and the timeline kept showing the halt as the latest word. The hourly
 * caller now also checks each recent story for anything newer than its
 * newest development and posts what it finds as an update.
 *
 * An update has no score. It never feeds the number, never rescores the
 * development it follows, and resolves nothing in the replay (owner,
 * 2026-11-14: "updates never touch the number"). It changes what the
 * timeline says about a story, never how loud the story is.
 *
 * The headline never has an update. Rating and the update check run in one
 * hourly job, and the job checks the headline's own story before it submits,
 * so the reading on the page is always its story's latest word. It can *be*
 * an update — a newer development in a story already on record, which the
 * page labels "Update:" — but it never *has* one.
 */
import { completeSentence } from './ingest.js';
import { slug } from './merges.js';

export const UPDATE_KINDS = Object.freeze([
  'resolution', 'reversal', 'escalation', 'decision', 'confirmation', 'denial', 'correction', 'continuation',
]);

/** Stored text is capped like a reading's, never rejected for length. */
const MAX_STORED = 400;
const MAX_SOURCES = 10;
/** A caller's clock and its sources' timestamps can run slightly ahead. */
const FUTURE_SLACK_MS = 10 * 60_000;

/**
 * Check a posted update against the replay's live developments (the same
 * `activeStories()` the timeline is built from) and return the row to store,
 * or the reason it was refused.
 *
 * An update follows its story's newest development, because that is what the
 * check looks past and what the timeline would show it under; one that
 * follows an older development would be shown under an entry the story has
 * already moved past.
 *
 * @returns {{row: object} | {error: string}}
 */
export function checkStoryUpdate(body, stories, { now = Date.now() } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'body must be a JSON object' };

  const follows = Number(body.follows);
  if (!Number.isInteger(follows) || follows <= 0) {
    return { error: 'follows must be the root id of a development on the timeline' };
  }
  let found;
  let story;
  for (const candidate of stories) {
    const development = candidate.developments.find((d) => d.root === follows);
    if (development) {
      found = development;
      story = candidate;
      break;
    }
  }
  if (!found) return { error: `development ${follows} is not live on the timeline` };
  if (!found.story) return { error: `development ${follows} has no story` };
  if (body.story !== undefined && body.story !== null && slug(body.story) !== found.story) {
    return { error: `development ${follows} is in story "${found.story}", not "${slug(body.story)}"` };
  }
  const newest = Math.max(...story.developments.map((d) => d.opened));
  if (found.opened < newest) {
    const root = story.developments.find((d) => d.opened === newest)?.root;
    return { error: `development ${follows} is not the newest in "${found.story}"; updates follow ${root}` };
  }

  if (typeof body.explanation !== 'string' || !body.explanation.trim()) return { error: 'explanation is required' };
  const explanation = completeSentence(body.explanation.replace(/\s+/g, ' ').trim().slice(0, MAX_STORED));

  const at = Date.parse(body.at);
  if (!Number.isFinite(at)) return { error: 'at must be an ISO-8601 time' };
  if (at <= found.opened) return { error: `at must be after the development it follows (${new Date(found.opened).toISOString()})` };
  if (at > now + FUTURE_SLACK_MS) return { error: 'at is in the future' };

  if (!UPDATE_KINDS.includes(body.kind)) return { error: `kind must be one of ${UPDATE_KINDS.join(', ')}` };

  if (!Array.isArray(body.sources) || body.sources.length === 0) {
    return { error: 'sources must list at least one page with its own timestamp' };
  }
  const sources = [];
  for (const source of body.sources.slice(0, MAX_SOURCES)) {
    const url = typeof source === 'string' ? source : source?.url;
    if (typeof url !== 'string' || !/^https?:\/\/\S+$/i.test(url) || url.length > 2000) {
      return { error: 'every source needs an http(s) url' };
    }
    const entry = { url };
    for (const key of ['published', 'modified']) {
      if (typeof source?.[key] === 'string' && source[key].length <= 40) entry[key] = source[key];
    }
    sources.push(entry);
  }

  return { row: { follows, story: found.story, explanation, at: new Date(at).toISOString(), kind: body.kind, sources } };
}

/**
 * Put each development's newest update on its timeline entry.
 *
 * An update is shown only while it is the newest word in its story: once a
 * reading opens a development after it, that reading has taken the story on —
 * often by reporting the very event the update did — and showing both would
 * say it twice. Updates found after that follow the newer development.
 *
 * Every entry also gets `activity`, the time of its newest update or else of
 * the development itself. The app orders the timeline by it, so an updated
 * story moves up to when it last moved; the list itself keeps the order
 * installed builds expect, by when each development opened.
 *
 * @param timeline `developmentTimeline()` entries
 * @param stories `activeStories()`, the same replay, for every development
 *   in each story including the one on the page
 * @param updates stored updates, any order
 */
export function attachUpdates(timeline, stories, updates) {
  const newestInStory = new Map();
  for (const story of stories) {
    newestInStory.set(story.story ?? '', Math.max(...story.developments.map((d) => d.opened)));
  }
  const latest = new Map();
  for (const update of updates) {
    const previous = latest.get(update.follows);
    const t = Date.parse(update.at);
    if (!previous || t > Date.parse(previous.at) || (t === Date.parse(previous.at) && update.id > previous.id)) {
      latest.set(update.follows, update);
    }
  }
  return timeline.map((entry) => {
    const update = latest.get(entry.root);
    const shown = update && Date.parse(update.at) >= (newestInStory.get(entry.story ?? '') ?? -Infinity) ? update : null;
    return {
      ...entry,
      update: shown ? { explanation: completeSentence(shown.explanation), at: shown.at, kind: shown.kind } : null,
      activity: shown ? shown.at : entry.since,
    };
  });
}

/**
 * The label before a sentence that opened its own development: "New" when its
 * story had nothing on record before it, "Update" when the story did (owner,
 * 2026-11-14). Null for a re-report or an unjudged reading, which get no
 * label. "On record" is the replay's memory, `STORY_MEMORY_DAYS`, so a story
 * quiet for a month comes back as new, as it does everywhere else.
 *
 * @param newest the newest reading, as `currentDisplay()` returns it
 * @param ascending every reading in the memory window, oldest first, with
 *   `t` and canonical story names
 */
export function explanationLabel(newest, ascending, opens) {
  if (!opens) return null;
  if (!newest.story) return 'New';
  const t = newest.t ?? Date.parse(newest.created_at);
  return ascending.some((r) => r.id !== newest.id && r.story === newest.story && (r.t ?? Date.parse(r.created_at)) < t)
    ? 'Update' : 'New';
}
