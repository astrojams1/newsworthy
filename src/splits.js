/**
 * Development splits: a reading the judge filed under an earlier development
 * that was in fact a new one, and the readings filed after it that followed.
 *
 * A judgement is never recomputed, and the judge reads its own record, so one
 * misfiling carries itself forward. On 2026-11-05 the US chip selloff (reading
 * 1751, "US chip stocks fell 11%") was filed under 1740, a pause in Seoul
 * eleven hours earlier, and every US reading after it followed. Judge v7 was
 * written so a move in another market is a later occurrence, but the first
 * reading it judged saw a development whose latest lines were already about
 * New York and filed under it too. The page then showed an 8 for the US
 * selloff beside 1740's sentence about Korea.
 *
 * A split is a row, never an edit, like a merge (src/merges.js): stored
 * readings keep their judgement, and everything that groups readings into
 * developments resolves them through the splits in force. Splitting at
 * reading R makes R open its own development, and moves to R every later
 * reading filed under R's development before the split was made. Readings
 * stored after the split were judged against the corrected record and keep
 * their answer, as a rename covers only the readings stored before it. An undo
 * is another row, so undoing a split restores what was shown before it: a
 * reading judged against the split development while it stood is sent back to
 * the development the split was cut from, rather than left to open a phantom.
 *
 * Pure; the rows come from db.js.
 */

const at = (row) => Date.parse(row.created_at);

/** Whether `row` was stored after reading `split.reading_id`, ties by id. */
function after(row, split) {
  const t = at(row);
  const r = Date.parse(split.reading_at);
  return t > r || (t === r && row.id > split.reading_id);
}

/**
 * Rows with `development_of` resolved through the splits, oldest first. A
 * later split can cut a development an earlier one made, so they apply in
 * order. An undone split (`undone: true`) leaves its reading where it was
 * judged and sends any reading filed under it while it stood back to the
 * development it was cut from. Unjudged rows are left alone: the replay
 * inherits them into the development before them, which is already resolved.
 *
 * @param {Array<{id: number, created_at: string, judge_version?: number|null,
 *   development_of?: number|null}>} rows
 * @param {Array<{reading_id: number, reading_at: string, from_root: number,
 *   created_at: string, undone?: boolean}>} splits every split, undone or not
 */
export function resolveSplits(rows, splits = []) {
  if (!splits.length || !rows.some((r) => 'development_of' in r)) return rows;
  let out = rows;
  for (const split of splits) {
    const made = Date.parse(split.created_at);
    out = out.map((row) => {
      if (row.judge_version == null || !('development_of' in row)) return row;
      if (split.undone) {
        return row.development_of === split.reading_id && at(row) >= made
          ? { ...row, development_of: split.from_root }
          : row;
      }
      if (row.id === split.reading_id) return { ...row, development_of: null };
      if (row.development_of === split.from_root && after(row, split) && at(row) < made) {
        return { ...row, development_of: split.reading_id };
      }
      return row;
    });
  }
  return out;
}

/**
 * Why a reading cannot be split off, or null when it can. `reading` is the
 * stored row with its judgement already resolved through the splits in force.
 */
export function splitProblem(reading, id) {
  if (!reading) return `no reading ${id}`;
  if (reading.status && reading.status !== 'ok') return `reading ${reading.id} is not a stored reading`;
  if (reading.judge_version == null) return `reading ${reading.id} has no judgement to split`;
  if (reading.development_of == null) return `reading ${reading.id} already opens its own development`;
  return null;
}
