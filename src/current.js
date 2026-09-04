/**
 * What the front page shows.
 *
 * Two rules, in order. The first answers "what is the news at, right now" and
 * is a level: measured over 46 readings, the rater disagrees with itself by
 * about 0.6 points on near-identical material, the series standard deviation is
 * 1.12 and its lag-1 autocorrelation is -0.11, so consecutive readings are
 * indistinguishable from independent draws around a slowly moving level. The
 * newest reading is the noisiest estimator available; a median of five cuts the
 * standard deviation to 0.43. Five rather than four because an odd window makes
 * the median an observed score rather than a computed midpoint. A reading two
 * or more above that median is a break rather than noise and passes straight
 * through, because smoothing costs lag and lag is what v6 was written to
 * remove.
 *
 * The second answers "how long have we been saying this", and is why the level
 * alone was not enough. Every run is independent and rates the current top
 * news, so a story that dominates for four days is re-rated at about the same
 * number hour after hour, and the median of five 5s is 5 forever. Measured over
 * the stored series, the renewed US-Iran strikes held the page between 4 and 6
 * for four days. So the displayed number is the level of the development the
 * newest reading reports, decayed from when that development was first
 * reported, halving every `halfLifeHours` and floored at 1.
 *
 * Which development a reading reports is judged once, when it arrives, and
 * stored on the row (see src/story.js). This replays that judgement; it never
 * makes it. A reading whose development was first reported this hour shows its
 * own score undecayed — a break is reported immediately, which is the whole
 * point — and one restating a development from this morning shows this
 * morning's level, aged.
 *
 * Two earlier doctrines end here, and both were load-bearing. The displayed
 * number is no longer always an observed reading; it is an integer, never a
 * computed 4.5, but it can be a number no run produced. And a shock only passes
 * through when it reports a new development: a 7 on a story the judge says has
 * been running since morning is that story's noise, not a break.
 *
 * The sentence is untouched by all of this. It always comes from the newest
 * reading, because the number is a level and the sentence is what happened —
 * so a story still on top in the evening is still named in the evening, with a
 * smaller number beside it.
 */

/** How far above the median a reading must sit to be treated as a break rather
 *  than as noise. Two, because the rater's own disagreement is about 0.6 and a
 *  one-point gap is inside it. */
const SHOCK_MARGIN = 2;

/** Below this there is nothing to take a median of, and the newest reading is
 *  the best available estimate rather than a noisy one. */
const MIN_WINDOW = 3;

/** The page never shows below the bottom of the scale. Rung 1 is "Nothing new;
 *  skip the news", which is what a story nobody has added to in two days is. */
const FLOOR = 1;

/** Hours for a development's level to halve. Twelve: a 7 breaking in the
 *  morning reads 5 by evening and 4 the next morning, which is the shape asked
 *  for — a decay measured in hours of a day, not in days. Adjustable from
 *  /admin, because the right value is a matter of taste about the front page
 *  and the chart replays whatever is set. */
const DEFAULT_HALF_LIFE_HOURS = 12;

/** Offered in the admin picker. Nothing here is magic; they are a spread from
 *  "aggressive" to "gentle" wide enough to tell apart on the chart. */
const HALF_LIFE_CHOICES = [4, 6, 8, 12, 24];

/** How far back the replay reads to find a development's first report. Three
 *  days: at the longest half-life that is three halvings, so a development
 *  older than this is at the floor either way, and its exact age stops
 *  mattering. Roots older than the window are still fetched by id, so `since`
 *  is the real first report rather than the edge of the window. */
const LOOKBACK_HOURS = 72;

export { SHOCK_MARGIN, MIN_WINDOW, FLOOR, DEFAULT_HALF_LIFE_HOURS, HALF_LIFE_CHOICES, LOOKBACK_HOURS };

/**
 * The level: which reading answers "how newsworthy is it".
 *
 * @param {Array<{score: number}>} recent newest first
 * @returns {{row: object, basis: 'latest' | 'median' | 'shock'}}
 */
export function currentReading(recent) {
  const [newest] = recent;
  if (recent.length < MIN_WINDOW) return { row: newest, basis: 'latest' };

  const sorted = [...recent].sort((a, b) => a.score - b.score);
  const median = sorted[Math.floor(sorted.length / 2)].score;

  if (newest.score - median >= SHOCK_MARGIN) return { row: newest, basis: 'shock' };

  // The most recent reading that scored the median, so the sentence shown is
  // the freshest account of the level being reported. `recent` is newest first,
  // so the first match is that one.
  return { row: recent.find((r) => r.score === median), basis: 'median' };
}

/** A development's level after `ageMs`, halving every `halfLifeHours`. */
export function agedScore(anchor, ageMs, halfLifeHours = DEFAULT_HALF_LIFE_HOURS) {
  if (!(ageMs > 0)) return anchor;
  return anchor * 2 ** (-ageMs / (halfLifeHours * 3600_000));
}

/**
 * Which development a reading reports, as an id.
 *
 * A judged reading names it, or names itself by reporting a new one. An
 * unjudged reading — a judge outage, or history from before the judge existed —
 * inherits the previous reading's development rather than starting one, because
 * an outage that reset the clock every hour would look exactly like a story
 * that never ages. The score-only fallback still applies on top: a level two or
 * more above the development's own level is a break by the same margin the
 * shock rule uses, and starts a development.
 */
function rootFor(point, previousRoot, level, anchor) {
  if (point.judge_version != null) return point.development_of ?? point.id;
  if (previousRoot == null) return point.id;
  if (anchor != null && level - anchor >= SHOCK_MARGIN) return point.id;
  return previousRoot;
}

/**
 * Replay both rules over a stored series, oldest first.
 *
 * Computed here rather than in the page: a second implementation in admin.html
 * would be free to drift, and a chart that disagrees with the front page about
 * the front page is worse than no chart.
 *
 * @param {Array<{t: number, score: number, id?: number}>} ascending oldest first, `t` in ms
 * @param {object} [options]
 * @param {Map<number, {t: number}>} [options.roots] first-report times for roots
 *   that fall outside `ascending`, keyed by id
 */
export function displayedSeries(ascending, {
  limit = 5,
  hours = 6,
  halfLifeHours = DEFAULT_HALF_LIFE_HOURS,
  roots = new Map(),
} = {}) {
  const span = hours * 3600_000;
  const developments = new Map();
  let previousRoot = null;

  return ascending.map((point, i) => {
    // The window as recentRatings() would have returned it at that moment:
    // inside the time bound, newest first, at most `limit`.
    const window = [];
    for (let j = i; j >= 0 && window.length < limit; j--) {
      if (point.t - ascending[j].t > span) break;
      window.push(ascending[j]);
    }
    const { row, basis: levelBasis } = currentReading(window);
    const level = row.score;

    const id = point.id ?? i;
    const root = rootFor({ ...point, id }, previousRoot, level, developments.get(previousRoot)?.anchor);
    previousRoot = root;

    let development = developments.get(root);
    if (!development) {
      // A development first seen here starts at this reading's own score, from
      // now — unless its first report is older than the replay window, in which
      // case its real first-report time is carried in `roots`.
      const since = roots.get(root)?.t ?? point.t;
      development = {
        anchor: root === id ? point.score : level,
        since,
        // The lowest level this development has shown since it was last
        // anchored, which is what a later rise is measured against.
        low: root === id ? point.score : level,
      };
      developments.set(root, development);
    } else if (levelBasis !== 'shock') {
      // A development whose level climbs two clear of its own recent low is
      // news again, and its clock restarts there. This is the safety net under
      // the judge: without it, a story the judge keeps calling one development
      // sits at the floor however far it escalates. Replayed over the stored
      // series with story identity stood in by keywords — the crudest judge
      // there is — four days of intensifying US-Iran strikes showed 1 on the
      // day the rater said 7. It also catches an escalation the judge misses,
      // and a ramp too gradual for any single reading to look like a break.
      //
      // Two points, against the development's own recent low, because that is
      // the same margin the shock rule uses and for the same reason: the
      // rater's disagreement with itself is about 0.6, so anything smaller is
      // inside the error bar. Measured against the low rather than against the
      // anchor, because a single early peak would otherwise lock the
      // development at the floor for as long as it ran. Measured against the
      // level rather than against the decayed value, because a rise the news
      // did not make is a sawtooth: the number would fall for half a day and
      // spring back on unchanged readings, which is worse than not ageing at
      // all. A shock reading on a development already recorded is that
      // development's noise by the judge's own finding, so it never anchors:
      // measured over the stored series, letting shock levels anchor doubled
      // the upward steps (23 rises against 12, 18 of them two points or more)
      // and took the hour-to-hour movement back to 0.75 against the raw 0.88 —
      // a page bouncing as much as the readings it was smoothing. The cost is
      // about an hour of lag on a sharp escalation, until the median confirms
      // it. A sharp escalation is the judge's case, not this one's.
      if (level - development.low >= SHOCK_MARGIN) {
        development.anchor = level;
        development.since = point.t;
        development.low = level;
      } else {
        development.low = Math.min(development.low, level);
      }
    }

    const aged = agedScore(development.anchor, point.t - development.since, halfLifeHours);
    const isNew = root === id && point.t === development.since;
    const displayed = isNew
      ? point.score
      : Math.max(FLOOR, Math.min(level, Math.round(aged)));
    const basis = isNew ? 'new' : (displayed < level ? 'aged' : levelBasis);

    return {
      ...point,
      level,
      displayed,
      basis,
      root,
      anchor: development.anchor,
      since: development.since,
      story: point.story ?? null,
      level_row: row,
    };
  });
}

/**
 * What `/api/current` shows: the last point of the replay, aged at `now`.
 *
 * Re-ageing at `now` rather than at the last reading's timestamp is what makes
 * a stalled caller visible on the page: ten hours of silence after an 8 is not
 * an 8, whatever the last row says.
 */
export function currentDisplay(ascending, {
  now = Date.now(),
  halfLifeHours = DEFAULT_HALF_LIFE_HOURS,
  hours = 6,
  limit = 5,
  roots = new Map(),
} = {}) {
  const series = displayedSeries(ascending, { limit, hours, halfLifeHours, roots });
  const last = series.at(-1);
  if (!last) return undefined;

  // The level window as it stands now, not as it stood at the last reading:
  // once the newest reading falls out of it there is no window left, and the
  // stored reading is stale rather than missing.
  const span = hours * 3600_000;
  const windowSize = ascending.filter((p) => now - p.t <= span).length;

  const aged = agedScore(last.anchor, now - last.since, halfLifeHours);
  const score = Math.max(FLOOR, Math.min(last.level, Math.round(aged)));

  // 'stale' outranks the rest: when the newest reading has fallen out of the
  // level window, which rule picked the level matters less than the fact that
  // nothing recent produced it. The score still ages — that is the point.
  const basis = windowSize === 0 ? 'stale' : (score < last.level ? 'aged' : last.basis);
  return {
    score,
    level: last.level,
    levelRow: last.level_row,
    newest: last,
    basis,
    window: windowSize,
    since: last.since,
    root: last.root,
    story: last.story,
  };
}
