/**
 * What the front page shows.
 *
 * Two rules. The first answers "what is this reading's level" and is unchanged:
 * measured over 46 readings, the rater disagrees with itself by about 0.6
 * points on near-identical material, the series standard deviation is 1.12 and
 * its lag-1 autocorrelation is -0.11, so consecutive readings are
 * indistinguishable from independent draws around a slowly moving level. A
 * median of five cuts the standard deviation to 0.43; five rather than four
 * because an odd window makes the median an observed score. A reading two or
 * more above that median is a break rather than noise and passes straight
 * through, because smoothing costs lag and lag is what v6 was written to
 * remove. That level is what anchors a development — it is no longer the
 * number on the page.
 *
 * The second answers "how newsworthy is the news right now", and is why the
 * level alone was not enough. Every run is independent and rates the current
 * top news, so a story that dominates for days is re-rated at about the same
 * number hour after hour and the median of five 5s is 5 forever: over the
 * stored series the renewed US-Iran strikes held the page between 4 and 6 for
 * four days. Each development therefore carries its own level, decaying from
 * when it was first reported — halving every `halfLifeHours`, floored at 1 —
 * and the page shows the loudest development still live.
 *
 * The loudest, rather than the one this hour's reading named. Reading only the
 * named development was the first cut, and the judged series made its failure
 * obvious: on 2026-09-03 the rater mentioned a seven-day-old Nepal flood once
 * and the page fell from 4 to 1 and back to 3 within two hours, on no news at
 * all. That shape accounted for 57 of 74 two-point jumps and left the front
 * page moving more hour to hour (1.10) than the raw readings it was meant to
 * smooth (1.02). Taking the loudest instead: 0.43, and 7 such jumps.
 *
 * The number cannot rise without news. A development's value only decays, so
 * the maximum across them moves up only when one re-anchors or a new one opens,
 * and both of those are events rather than arithmetic.
 *
 * Which development a reading reports is judged once, when it arrives, and
 * stored on the row (see src/story.js). This replays that judgement; it never
 * makes it.
 *
 * Two earlier doctrines end here, and both were load-bearing. The displayed
 * number is no longer always an observed reading: it is an integer, never a
 * computed 4.5, but it can be a number no run produced. And a shock passes
 * through only when it reports a new development — a 7 on a story the judge
 * says has been running since morning is that story's noise, not a break.
 *
 * The sentence is untouched by all of this. It always comes from the newest
 * reading, because the number is a level and the sentence is what happened —
 * so a story still on top in the evening is still named in the evening, with a
 * smaller number beside it. In the hour where the two disagree, the number
 * describes the loudest story and the sentence names the one just rated; the
 * alternative is pairing the number with an older story's sentence, which reads
 * as an app that has stopped.
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
export function displayedSeries(ascending, options = {}) {
  return replay(ascending, options).points;
}

/**
 * The replay itself: the points, and the state of every development at the end
 * of the series. `/api/current` needs the second half to re-age at request
 * time, and both must come from one pass or the page and the chart can differ.
 */
function replay(ascending, {
  limit = 5,
  hours = 6,
  halfLifeHours = DEFAULT_HALF_LIFE_HOURS,
  roots = new Map(),
} = {}) {
  const span = hours * 3600_000;
  const developments = new Map();
  let previousRoot = null;

  const points = ascending.map((point, i) => {
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
      const known = roots.get(root);
      development = {
        anchor: root === id ? point.score : level,
        since: known?.t ?? point.t,
        // The lowest level this development has shown since it was last
        // anchored, which is what a later rise is measured against.
        low: root === id ? point.score : level,
        story: point.story ?? known?.story ?? null,
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

    const loudest = loudestAt(developments, point.t, halfLifeHours);
    return {
      ...point,
      level,
      ...loudest,
      // The row's own slug survives the spread above. `loudestAt` also returns
      // a `story` — the loudest development's — and letting it overwrite the
      // column was a quiet trap: a Ukraine reading came back filed under
      // `iran-war`, because that was what led at the time. The two are
      // different facts and now have different names.
      story: point.story ?? null,
      leading_story: loudest.story,
      // The development this reading itself reports, which is not always the
      // one the number describes. Never displayed; it is what makes a
      // surprising number traceable to the reading that caused it.
      reports: root,
      level_row: row,
    };
  });

  return { points, developments };
}

/**
 * The loudest development still live, and the number it shows.
 *
 * The number answers "how newsworthy is the news right now", so it is the
 * loudest thing on the board rather than the age of whichever story this
 * hour's reading happened to name. Reading only the named development was the
 * first cut and it failed in a way the stored series made obvious: on
 * 2026-09-03 the rater mentioned a seven-day-old Nepal flood once, and the page
 * fell from 4 to 1 and back to 3 within two hours. Nothing had happened. Across
 * the judged series that shape accounted for 57 of 74 two-point jumps, and left
 * the front page moving more hour to hour (1.10) than the raw readings it was
 * meant to smooth (1.02). Taking the loudest instead: 0.43, with 7 such jumps.
 *
 * It cannot rise without news. A development's value only ever decays, so the
 * maximum across them moves up only when one re-anchors or a new one opens —
 * both of which are events, not arithmetic.
 *
 * The sentence still comes from the newest reading, so in the hour those two
 * disagree the number describes the loudest story and the sentence names the
 * one just rated. That is the accepted cost: the alternative is pairing the
 * number with an older story's sentence, which reads as an app that has
 * stopped.
 */
function loudestAt(developments, now, halfLifeHours, breakAt = now) {
  let best = null;
  for (const [id, development] of developments) {
    // Older than the replay window is older than three halvings at the longest
    // half-life: at the floor, and no longer competing for the front page.
    if (now - development.since > LOOKBACK_HOURS * 3600_000) continue;
    const value = agedScore(development.anchor, now - development.since, halfLifeHours);
    if (!best || value > best.value) best = { id, development, value };
  }
  if (!best) return { displayed: FLOOR, basis: 'aged', root: null, anchor: null, since: now, story: null };

  const { id, development, value } = best;
  const displayed = Math.max(FLOOR, Math.min(10, Math.round(value)));
  return {
    displayed,
    // 'new' when the loudest development's clock started with the newest
    // reading — one first reported by it, or one it escalated. Both mean the
    // same thing on the page: the number is a break, not a decayed level.
    // Compared against the reading's own timestamp rather than against `now`,
    // because `/api/current` ages at request time and is always some
    // milliseconds later, which made 'new' unreachable there.
    basis: development.since === breakAt ? 'new' : 'aged',
    root: id,
    anchor: development.anchor,
    since: development.since,
    story: development.story ?? null,
  };
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
  const { points, developments } = replay(ascending, { limit, hours, halfLifeHours, roots });
  const last = points.at(-1);
  if (!last) return undefined;

  // The level window as it stands now, not as it stood at the last reading:
  // once the newest reading falls out of it there is no window left, and the
  // stored reading is stale rather than missing.
  const span = hours * 3600_000;
  const windowSize = ascending.filter((p) => now - p.t <= span).length;

  // Every live development re-aged at request time, not just the one the last
  // reading named: an hour of silence ages all of them, and which is loudest
  // can change while nothing new arrives.
  const loudest = loudestAt(developments, now, halfLifeHours, last.t);

  return {
    score: loudest.displayed,
    level: last.level,
    levelRow: last.level_row,
    newest: last,
    // 'stale' outranks the rest: when the newest reading has fallen out of the
    // level window, which development is loudest matters less than the fact
    // that nothing recent produced it. The score still ages — that is the point.
    basis: windowSize === 0 ? 'stale' : loudest.basis,
    window: windowSize,
    since: loudest.since,
    root: loudest.root,
    story: loudest.story,
    reports: last.reports,
  };
}

/**
 * The stories still live, and the developments inside them.
 *
 * The front page is one number, and that number is one development's aged
 * level — but the board behind it is several stories running at once, each
 * ageing on its own clock, and only the loudest reaches the page. That is what
 * makes a number surprising: nothing on the front page explains why an 8 from
 * this morning now reads 4, or which of two running stories the 4 belongs to.
 *
 * Built from the same replay the page and the chart use, so it cannot disagree
 * with either. A second grouping pass over the raw rows would be free to drift,
 * which is the same reason `displayedSeries()` lives here rather than in
 * admin.html.
 *
 * "Live" is the replay's own window: a development older than `LOOKBACK_HOURS`
 * is at the floor and no longer competing, so it leaves the board rather than
 * accumulating there forever.
 *
 * @returns {Array<{story: string|null, displayed: number, leading: boolean,
 *   developments: Array<object>}>} loudest story first
 */
export function activeStories(ascending, {
  now = Date.now(),
  halfLifeHours = DEFAULT_HALF_LIFE_HOURS,
  hours = 6,
  limit = 5,
  roots = new Map(),
} = {}) {
  const { points, developments } = replay(ascending, { limit, hours, halfLifeHours, roots });
  const loudest = loudestAt(developments, now, halfLifeHours);

  // What each development was first and last heard saying, and how often. The
  // readings are grouped by `reports` — the development the reading itself
  // reported — rather than by the row's stored column, so an unjudged reading
  // lands where the replay put it rather than nowhere.
  const readings = new Map();
  for (const point of points) {
    const seen = readings.get(point.reports);
    if (seen) {
      seen.latest = point;
      seen.count += 1;
    } else {
      readings.set(point.reports, { first: point, latest: point, count: 1 });
    }
  }

  const byStory = new Map();
  for (const [root, development] of developments) {
    const ageMs = now - development.since;
    if (ageMs > LOOKBACK_HOURS * 3600_000) continue;

    const heard = readings.get(root);
    const entry = {
      root,
      story: development.story ?? null,
      // The level it was last anchored at, and what that has decayed to.
      anchor: development.anchor,
      displayed: Math.max(FLOOR, Math.min(10, Math.round(agedScore(development.anchor, ageMs, halfLifeHours)))),
      since: development.since,
      age_hours: Math.round((ageMs / 3600_000) * 10) / 10,
      readings: heard?.count ?? 0,
      first: heard?.first?.explanation ?? null,
      latest: heard?.latest?.explanation ?? null,
      latest_at: heard?.latest?.created_at ?? null,
      // The one the front page number is about, right now.
      leading: root === loudest.root,
    };

    const key = entry.story ?? '';
    const story = byStory.get(key);
    if (story) story.developments.push(entry);
    else byStory.set(key, { story: entry.story, developments: [entry] });
  }

  const stories = [...byStory.values()].map((story) => {
    // Newest development first within a story: a running story is read from
    // what just happened backwards, not from where it started.
    story.developments.sort((a, b) => b.since - a.since);
    return {
      ...story,
      displayed: Math.max(...story.developments.map((d) => d.displayed)),
      leading: story.developments.some((d) => d.leading),
    };
  });

  // Loudest first, and the story on the front page always heads the board.
  stories.sort((a, b) => (b.leading - a.leading) || (b.displayed - a.displayed)
    || (Math.max(...b.developments.map((d) => d.since)) - Math.max(...a.developments.map((d) => d.since))));
  return stories;
}
