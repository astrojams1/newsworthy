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
 * A rename is the same kind of row (`kind = 'rename'`), for a name that has
 * outgrown its story rather than a story named twice: `korea-stocks`, coined
 * for a fall in Seoul, held three weeks of AI-spending news and labelled an
 * Amazon sentence "Korea Stocks". It covers only the readings stored before
 * it, so the old name is free again afterwards: a Seoul story coined under it
 * later is its own story, not the renamed one.
 *
 * Pure; the rows come from db.js.
 */

/**
 * Alias → what it resolves to, from the merges and renames in force, oldest
 * first. A later row can send a name on into another, so resolution follows
 * the chain. Each entry carries the alias's merge, if any, from the moment it
 * was made, and its renames, each holding until the moment it was made.
 *
 * @param {Array<{alias: string, canonical: string, kind?: string, created_at?: string}>} merges
 */
export function aliasMap(merges = []) {
  const map = new Map();
  for (const { alias, canonical, kind, created_at } of merges) {
    if (!alias || !canonical || alias === canonical) continue;
    const entry = map.get(alias) ?? { merge: null, renames: [] };
    const made = Date.parse(created_at);
    if (kind === 'rename') entry.renames.push({ canonical, until: made });
    else entry.merge = { canonical, since: Number.isNaN(made) ? -Infinity : made };
    map.set(alias, entry);
  }
  return map;
}

/**
 * One step along the chain for a reading that has held `name` since `at`: the
 * first rename made after that, else the name's merge. A merge carries the
 * reading on from the moment it was made, so a rename older than the merge
 * does not reach it: renamed `korea-stocks` → `ai-stocks`, then a later
 * `korea-stocks` merged with `ai-stocks`, every reading of either lands on the
 * one name the merge kept.
 */
function step(map, name, at) {
  const entry = map.get(name);
  if (!entry) return null;
  const rename = entry.renames.find((r) => at < r.until);
  if (rename) return { name: rename.canonical, at };
  return entry.merge ? { name: entry.merge.canonical, at: Math.max(at, entry.merge.since) } : null;
}

/** The name a story goes by, for a reading stored at `at` (ms). Without `at`
 *  the name is read as it is used now, so a rename does not apply to it. A
 *  name can come round again later, as `korea-stocks` does above; a cycle —
 *  which mergeProblem refuses to create — repeats a name at the same moment,
 *  and stops there rather than looping. */
export function canonicalStory(map, story, at = Infinity) {
  if (!story || !map?.size) return story ?? null;
  const seen = new Set([`${story}@${at}`]);
  let hop = { name: story, at };
  for (let next = step(map, hop.name, hop.at); next != null; next = step(map, hop.name, hop.at)) {
    const key = `${next.name}@${next.at}`;
    if (seen.has(key)) break;
    seen.add(key);
    hop = next;
  }
  return hop.name;
}

/**
 * Readings filed under each story by the name it goes by, and when each name
 * was first used, from every stored reading's own name and time.
 *
 * @param {Array<{story: string, created_at: string}>} filings
 * @returns {Map<string, {readings: number, first: string}>}
 */
export function storyStats(filings, map) {
  const stats = new Map();
  for (const { story, created_at } of filings) {
    const name = canonicalStory(map, story, Date.parse(created_at));
    const held = stats.get(name) ?? { readings: 0, first: created_at };
    stats.set(name, { readings: held.readings + 1, first: String(created_at) < String(held.first) ? created_at : held.first });
  }
  return stats;
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
 * Why a story cannot take a new name, or null when it can. The new name must
 * be unused — never stored, merged or renamed — because a name in use is
 * another story, and joining two stories is a merge.
 *
 * @param {{ map: Map, known: Set<string>, used: Set<string> }} context
 *   `known`, the names stories go by; `used`, every name ever stored or in a row
 */
export function renameProblem(story, name, { map, known, used }) {
  const [from, to] = [slug(story), slug(name)];
  if (!from || !to) return 'a rename needs a story and its new name';
  const current = canonicalStory(map, from);
  if (!known.has(current)) return `${from} is not a story on record`;
  if (current === to) return `${to} is already its name`;
  if (used.has(to)) return `${to} is already a name on record: merge the two instead`;
  return null;
}

/** Every name ever stored or written in a merge or rename row. */
export function usedNames(filings, merges = []) {
  return new Set([...filings.map((f) => f.story), ...merges.flatMap((m) => [m.alias, m.canonical])]);
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
