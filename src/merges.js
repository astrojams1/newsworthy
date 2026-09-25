/**
 * Story merges: one story recorded under two names, and the name it goes by.
 *
 * The judge names stories as free text, and a name coined twice for one story
 * used to be permanent: nothing reconciled the two, and both stayed on the
 * list the judge reuses from. The US-Iran war ran as `iran-war` and
 * `hormuz-conflict` for weeks, and because story fatigue groups by name, each
 * name aged and set its routine level on its own.
 *
 * A merge is a row, never an edit: stored readings keep the name they were
 * judged with, and every reader that groups by story resolves names through
 * the merges in force. An undo is another row, so undoing a merge restores
 * exactly what was shown before it.
 *
 * Pure; the rows come from db.js.
 */

/**
 * Alias → canonical, from the merges in force, oldest first. A later merge can
 * send a canonical name on into another, so resolution follows the chain.
 *
 * @param {Array<{alias: string, canonical: string}>} merges
 */
export function aliasMap(merges = []) {
  const map = new Map();
  for (const { alias, canonical } of merges) {
    if (alias && canonical && alias !== canonical) map.set(alias, canonical);
  }
  return map;
}

/** The name a story goes by. A cycle — which mergeProblem refuses to create —
 *  stops at the first repeat rather than looping. */
export function canonicalStory(map, story) {
  if (!story || !map?.size) return story ?? null;
  const seen = new Set([story]);
  let name = story;
  while (map.has(name)) {
    const next = map.get(name);
    if (seen.has(next)) break;
    seen.add(next);
    name = next;
  }
  return name;
}

/** Lowercase-slug, the shape the judge's names are stored in. */
export function slug(value) {
  const s = String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return s ? s.slice(0, 40) : null;
}

/**
 * Why a proposed merge cannot be made, or null when it can.
 *
 * @param {[string, string]} pair two story names, as proposed
 * @param {{ map: Map<string,string>, known: Set<string> }} context
 *   `known` is the set of canonical names the proposer may name: the names on
 *   record for a caller, every stored name for the admin.
 */
export function mergeProblem(pair, { map, known }) {
  if (!Array.isArray(pair) || pair.length !== 2) return 'same_story must be two story names';
  const [a, b] = pair.map(slug);
  if (!a || !b) return 'same_story must be two story names';
  const [ca, cb] = [canonicalStory(map, a), canonicalStory(map, b)];
  if (ca === cb) return `${a} and ${b} are already one story`;
  for (const name of [ca, cb]) if (!known.has(name)) return `${name} is not a story on record`;
  return null;
}

/**
 * Which of two canonical names survives: the one more readings were filed
 * under, since it is the name the story is known by; the older on a tie. The
 * choice is the label only — once merged, a story's age and routine level come
 * from the developments of both names, whichever is kept.
 *
 * @param {Map<string, {readings: number, first: string}>} stats per canonical name
 */
export function survivor(a, b, stats) {
  const [sa, sb] = [stats.get(a) ?? { readings: 0, first: '' }, stats.get(b) ?? { readings: 0, first: '' }];
  if (sa.readings !== sb.readings) return sa.readings > sb.readings ? a : b;
  return String(sa.first) <= String(sb.first) ? a : b;
}
