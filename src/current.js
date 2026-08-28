/**
 * Which reading the front page shows.
 *
 * Measured over 46 readings: the rater disagrees with itself by about 0.6
 * points on near-identical material, the series has a standard deviation of
 * 1.12, and its lag-1 autocorrelation is -0.11. Consecutive readings are
 * statistically indistinguishable from independent draws around a slowly
 * moving level, so an hour-to-hour change on the chart is mostly noise. Showing
 * the newest reading — which is what this did — is the noisiest estimator
 * available, and the hourly caller was already supplying the samples to do
 * better with.
 *
 * A median of five cuts the standard deviation to 0.43. Five rather than four
 * because an odd window makes the median an actual observed reading: the score
 * and the sentence beside it then come from one real row, instead of a computed
 * number sitting next to somebody else's explanation.
 *
 * The cost of any smoothing is lag, which is what v6 was written to remove — a
 * shock would take five readings to register. So the median governs the quiet
 * band only. 83% of readings sit between 4 and 6 and readings of 7 or more are
 * three in 46, so the noise and the shocks live in different places, and a
 * reading well above the recent level passes straight through. Against the
 * stored series that override fires about 5% of the time.
 */

/** How far above the median a reading must sit to be treated as a break rather
 *  than as noise. Two, because the rater's own disagreement is about 0.6 and a
 *  one-point gap is inside it. */
const SHOCK_MARGIN = 2;

/** Below this there is nothing to take a median of, and the newest reading is
 *  the best available estimate rather than a noisy one. */
const MIN_WINDOW = 3;

/**
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

export { SHOCK_MARGIN, MIN_WINDOW };

/**
 * The same rule applied backwards over a stored series, so the admin chart can
 * draw what the front page would have shown at each point beside what was
 * actually recorded.
 *
 * Computed here rather than in the page: a second implementation in admin.html
 * would be free to drift from this one, and a chart that disagrees with the
 * front page about the front page is worse than no chart.
 *
 * @param {Array<{t: number, score: number}>} ascending oldest first, `t` in ms
 */
export function displayedSeries(ascending, { limit = 5, hours = 6 } = {}) {
  const span = hours * 3600_000;
  return ascending.map((point, i) => {
    // The window as recentRatings() would have returned it at that moment:
    // inside the time bound, newest first, at most `limit`.
    const window = [];
    for (let j = i; j >= 0 && window.length < limit; j--) {
      if (point.t - ascending[j].t > span) break;
      window.push(ascending[j]);
    }
    const { row, basis } = currentReading(window);
    return { ...point, displayed: row.score, basis };
  });
}
