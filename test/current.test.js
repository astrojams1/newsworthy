import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeStories, agedScore, currentDisplay, currentReading, displayedSeries } from '../src/current.js';
import { CALLER_TOKEN, PORTS, withServer } from './with-server.js';

// newest first, as recentRatings() returns them
const readings = (...scores) =>
  scores.map((score, i) => ({ score, explanation: `reading ${i}`, created_at: `t${i}` }));

const HOUR = 3600_000;

/**
 * An ascending series of judged readings. `spec` entries are [score, root],
 * where root is the index of the reading that first reported this development
 * and an entry equal to its own index opens one.
 */
const judged = (...spec) =>
  spec.map(([score, root], i) => ({
    id: i,
    t: i * HOUR,
    score,
    explanation: `reading ${i}`,
    created_at: new Date(i * HOUR).toISOString(),
    judge_version: 1,
    development_of: root === i ? null : root,
  }));

test('the level is always an actual reading; the number shown is an integer no higher', () => {
  // The level rule still returns one of the observations — an odd window is the
  // whole reason for five rather than four, so the level and the sentence come
  // from the same row. What the page shows is that level aged, which is an
  // integer but need not be a score anyone gave.
  for (const scores of [[4, 5, 6, 5, 4], [3, 7, 5, 2, 6], [5, 5, 5, 5, 5]]) {
    const window = readings(...scores);
    const { row } = currentReading(window);
    assert.ok(window.includes(row), `${scores} returned a row from the window`);
  }
  const series = displayedSeries(judged([5, 0], [5, 0], [5, 0], [5, 0], [5, 0]));
  for (const point of series) {
    assert.ok(Number.isInteger(point.displayed), 'a number out of ten, never a computed 4.5');
    assert.ok(point.displayed <= point.level, 'and never above what the rater said');
    assert.ok(point.displayed >= 1, 'nor below the bottom of the scale');
  }
});

test('a median of five, taken from the most recent reading at that level', () => {
  // Sorted: 4 4 5 5 6 -> median 5. Two readings scored 5; the fresher one wins,
  // so the sentence is the newest account of the level being reported.
  const window = readings(4, 5, 6, 5, 4);
  const { row, basis } = currentReading(window);
  assert.equal(basis, 'median');
  assert.equal(row.score, 5);
  assert.equal(row.explanation, 'reading 1', 'the newer of the two fives');
});

test('noise in the quiet band is absorbed', () => {
  // One reading a point off the level does not move the front page. That single
  // point is inside the rater's own 0.6-point disagreement with itself.
  const level = currentReading(readings(5, 5, 5, 5, 5));
  const jittered = currentReading(readings(4, 5, 5, 5, 5));
  assert.equal(level.row.score, jittered.row.score, 'a one-point wobble changes nothing');
  assert.equal(jittered.basis, 'median');
});

test('a shock passes straight through, undelayed', () => {
  // Smoothing costs lag, which is exactly what v6 was written to remove. A
  // reading well clear of the recent level is reported the hour it arrives.
  const { row, basis } = currentReading(readings(8, 4, 5, 4, 5));
  assert.equal(basis, 'shock');
  assert.equal(row.score, 8);
  assert.equal(row.explanation, 'reading 0', 'and with its own sentence');
});

test('the shock margin is two, so a one-point rise is still noise', () => {
  // The rater disagrees with itself by about 0.6 points on identical material,
  // so a single point of movement is inside the error bar and not an event.
  assert.equal(currentReading(readings(6, 5, 5, 4, 5)).basis, 'median');
  assert.equal(currentReading(readings(7, 5, 5, 4, 5)).basis, 'shock');
});

test('a drop is never treated as a shock', () => {
  // Asymmetric on purpose: the cost of being slow to report calm is nothing,
  // and the cost of being slow to report a break is the whole product.
  const { row, basis } = currentReading(readings(2, 6, 6, 5, 6));
  assert.equal(basis, 'median');
  assert.equal(row.score, 6, 'one quiet reading does not stand the level down');
});

test('too few readings to average falls back to the newest', () => {
  // A fresh database, or a caller that has stopped and left the window empty.
  for (const scores of [[7], [7, 3]]) {
    const { row, basis } = currentReading(readings(...scores));
    assert.equal(basis, 'latest');
    assert.equal(row.score, 7, 'the newest, which is the only estimate there is');
  }
  // Three is enough to have a middle. Not (7, 3, 3) — a 7 against a level of 3
  // is a shock by the rule, which is the point of the rule.
  assert.equal(currentReading(readings(4, 3, 3)).basis, 'median');
  assert.equal(currentReading(readings(7, 3, 3)).basis, 'shock');
});

test('a short window still yields a real reading', () => {
  const { row } = currentReading(readings(6, 4, 5));
  assert.equal(row.score, 5, 'the middle of three');
});

test('recentRatings is time-bounded, so an old reading falls out of the window', async () => {
  // This is what made the first cut of /api/current wrong: an empty window was
  // read as "nothing stored" and answered 503, when it actually means the
  // newest reading is older than the window — a stalled caller, or a cron
  // cadence wider than it. That is a stale reading, not a missing one.
  const { insertRating, recentRatings, latestRating } = await import('../src/db.js');
  const { renderPrompt, latestVersion } = await import('../src/prompts.js');
  const prompt = renderPrompt(latestVersion());
  const base = {
    status: 'ok', slot: null, source: 'external', model: null,
    prompt_version: prompt.version, prompt_hash: prompt.hash, prompt_text: prompt.text,
  };
  const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString();

  await insertRating({ ...base, score: 4, explanation: 'nine hours ago', created_at: hoursAgo(9) });
  assert.equal((await recentRatings()).length, 0, 'outside the six-hour window');
  assert.equal((await latestRating()).explanation, 'nine hours ago', 'but still the newest reading');

  await insertRating({ ...base, score: 6, explanation: 'one hour ago', created_at: hoursAgo(1) });
  const window = await recentRatings();
  assert.equal(window.length, 1);
  assert.equal(window[0].explanation, 'one hour ago', 'newest first');
});

test('displayedSeries replays the same rule the front page runs', async () => {
  // Computed on the server rather than in admin.html: a second implementation
  // in the page would be free to drift, and a chart that disagrees with the
  // front page about the front page is worse than no chart.
  const series = judged([5, 0], [4, 0], [6, 0], [5, 0], [4, 0], [3, 0], [8, 6]);
  const out = displayedSeries(series);

  assert.equal(out.length, series.length);
  assert.ok(out.every((p, i) => p.score === series[i].score), 'raw scores are untouched');

  // The newest point of the replay must equal what the live route would say
  // given the same series, or the chart's right edge contradicts the page.
  const live = currentDisplay(series, { now: series.at(-1).t });
  assert.equal(out.at(-1).displayed, live.score);
  assert.equal(out.at(-1).basis, live.basis);

  // The 8 opens a development of its own, so it is shown whole and at once.
  assert.equal(out.at(-1).displayed, 8);
  assert.equal(out.at(-1).basis, 'new');
  // The first reading opens the series' only other development; from there
  // the number is that development's level, ageing.
  assert.equal(out[0].basis, 'new');
  assert.equal(out[1].basis, 'aged');
});

test('the replay window is time-bounded, not just counted', () => {
  // Four readings around 5, then a gap of a day, then a lone 2 restating the
  // same development. The old readings are outside the six-hour level window,
  // so the 2 stands alone as the only estimate rather than being median-ed
  // against stale company — and a day of ageing has taken the level below it.
  const series = [
    { id: 0, t: 0, score: 5 }, { id: 1, t: HOUR, score: 5 }, { id: 2, t: 2 * HOUR, score: 5 },
    { id: 3, t: 3 * HOUR, score: 5 }, { id: 4, t: 27 * HOUR, score: 2 },
  ].map((r) => ({ ...r, judge_version: 1, development_of: r.id === 0 ? null : 0 }));
  const out = displayedSeries(series);
  assert.equal(out.at(-1).level, 2, 'not dragged up by day-old readings');
  assert.equal(out.at(-1).displayed, 1, 'and a day-old development is at the floor');
  assert.equal(out.at(-1).basis, 'aged');
});

test('a development breaks at its own score and decays from there', () => {
  // What the whole change is for: a story that breaks is reported at once, and
  // a story still being re-reported twelve hours later is reported smaller.
  const quiet = [[4, 0], [4, 0], [4, 0], [4, 0]];
  const held = Array.from({ length: 13 }, () => [8, 4]);
  const out = displayedSeries(judged(...quiet, [8, 4], ...held.slice(1)));

  const breakPoint = out[4];
  assert.equal(breakPoint.displayed, 8, 'the break is shown the hour it lands');
  assert.equal(breakPoint.basis, 'new');

  const halved = out.find((p) => p.t === breakPoint.t + 12 * HOUR);
  assert.equal(halved.displayed, 4, 'and reads half that after one half-life');
  assert.equal(halved.basis, 'aged');
  assert.equal(halved.level, 8, 'while the rater is still saying 8');

  // Never back up on unchanged readings: a sawtooth would be worse than a
  // number that does not move at all.
  const after = out.slice(4).map((p) => p.displayed);
  for (let i = 1; i < after.length; i += 1) {
    assert.ok(after[i] <= after[i - 1], `rose from ${after[i - 1]} to ${after[i]}`);
  }
});

test('a story superseded and returning never rejuvenates', () => {
  // The case the score-only rule could not answer: X breaks at 08:00, Y takes
  // the top slot at midday, X is top again by evening. X may not come back as a
  // 7 — it is ten hours old — and what it contributes is its aged level.
  const series = [
    { id: 1, t: 0, score: 7, development_of: null },              // X breaks
    { id: 2, t: HOUR, score: 5, development_of: 1 },
    { id: 3, t: 2 * HOUR, score: 5, development_of: 1 },
    { id: 4, t: 4 * HOUR, score: 8, development_of: null },       // Y breaks
    { id: 5, t: 5 * HOUR, score: 6, development_of: 4 },
    { id: 6, t: 30 * HOUR, score: 6, development_of: 1 },         // X is back, a day later
  ].map((r) => ({ ...r, judge_version: 1, explanation: `reading ${r.id}` }));
  const out = displayedSeries(series);

  assert.equal(out[0].displayed, 7, 'X is shown whole when it breaks');
  assert.equal(out[3].displayed, 8, 'and so is Y');

  const back = out.at(-1);
  assert.equal(back.reports, 1, 'the evening reading reports X');
  assert.equal(back.displayed, 2, 'X came back as a 6 and moved the page to 2');
  assert.equal(back.basis, 'aged');
  // Both are nearly spent by now, and Y — twenty-six hours old against X's
  // thirty — is the last one standing. Either way the page is low, which is
  // the point: nothing here is new, however it is scored.
  assert.equal(back.root, 4);
  assert.ok(out.every((p) => p.displayed <= 8), 'and nothing ever rose above its own break');
});

test('the number is the loudest development, not the one this hour named', () => {
  // A reading naming an old story must not drag the page down with it. On
  // 2026-09-03 the rater mentioned a seven-day-old Nepal flood once and the
  // first cut of this rule fell from 4 to 1 and back to 3 within two hours,
  // on no news at all.
  const series = [
    { id: 1, t: 0, score: 3, development_of: null, story: 'old-flood' },
    { id: 2, t: 20 * HOUR, score: 7, development_of: null, story: 'war' },
    { id: 3, t: 21 * HOUR, score: 6, development_of: 2, story: 'war' },
    { id: 4, t: 22 * HOUR, score: 3, development_of: 1, story: 'old-flood' },
  ].map((r) => ({ ...r, judge_version: 1, explanation: `reading ${r.id}` }));
  const out = displayedSeries(series);

  const mention = out.at(-1);
  assert.equal(mention.reports, 1, 'the reading restates the old flood');
  assert.equal(mention.root, 2, 'but the war is what the number is about');
  assert.equal(mention.leading_story, 'war');
  assert.equal(mention.story, 'old-flood', 'while the reading keeps its own slug');
  assert.ok(mention.displayed >= 5, `the page held at ${mention.displayed}, it did not dip`);
});

test('noise on a running development never rejuvenates it', () => {
  // A 9 an hour after an 8, on the same development, is the rater disagreeing
  // with itself — it is not a second break, and the judge is what says so.
  const series = judged([4, 0], [4, 0], [4, 0], [8, 3], [7, 3], [9, 3], [8, 3], [7, 3]);
  const out = displayedSeries(series);
  const shown = out.slice(3).map((p) => p.displayed);
  assert.deepEqual(shown, [8, 8, 7, 7, 6], 'the 9 goes on decaying, it does not restart the clock');
  assert.ok(out.slice(4).every((p) => p.basis !== 'new'), 'nor open a development');
  const nine = out[5];
  assert.equal(nine.score, 9, 'the reading is stored as it was rated');
  assert.ok(nine.displayed < 9, 'and shown as the development it restates');
});

test('a development that escalates is news again, even if the judge does not say so', () => {
  // The safety net under the judge. A story it keeps calling one development
  // must not sit at the floor however far it escalates: replayed over the
  // stored series with story identity stood in by keywords, four days of
  // intensifying US-Iran strikes showed 1 on the day the rater said 7.
  const quiet = Array.from({ length: 14 }, () => [4, 0]);
  const risen = Array.from({ length: 5 }, () => [6, 0]);
  const out = displayedSeries(judged([4, 0], ...quiet.slice(1), ...risen));

  const faded = out[13];
  assert.ok(faded.displayed < 4, `half a day of 4s faded to ${faded.displayed}`);
  const after = out.slice(14).map((p) => p.displayed);
  assert.ok(after.includes(6), 'and a two-point rise in the level is reported');
  assert.equal(out.at(-1).displayed < 6, true, 'then ages again from there');
});

test('a one-point drift never restarts the clock', () => {
  // The same margin the shock rule uses, for the same reason: the rater's
  // disagreement with itself is about 0.6, so a single point is inside the
  // error bar. A page that sprang back up on that would saw back and forth,
  // which is worse than not ageing at all.
  const drift = [[4, 0], [4, 0], [4, 0], [4, 0], [4, 0], [5, 0], [5, 0], [5, 0], [5, 0]];
  const out = displayedSeries(judged(...drift));
  const shown = out.map((p) => p.displayed);
  for (let i = 1; i < shown.length; i += 1) {
    assert.ok(shown[i] <= shown[i - 1], `rose from ${shown[i - 1]} to ${shown[i]}`);
  }
});

test('a new development on a faded story is shown at once', () => {
  // Ageing must not swallow the next break. An 8 that has decayed for a day is
  // at 2; a genuinely new development scored 6 shows 6 the hour it arrives.
  const held = Array.from({ length: 24 }, (_, i) => [i === 0 ? 8 : 4, 0]);
  const out = displayedSeries(judged(...held, [6, 24]));
  const before = out.at(-2);
  const fresh = out.at(-1);
  assert.ok(before.displayed <= 2, `faded to ${before.displayed}`);
  assert.equal(fresh.displayed, 6);
  assert.equal(fresh.basis, 'new');
});

test('an unjudged reading inherits rather than starting a development', () => {
  // A judge outage must not look like a story breaking afresh every hour. The
  // score-only fallback still applies: two clear of the development's level is
  // a break by the same margin the shock rule uses.
  const series = [
    { id: 1, t: 0, score: 7, judge_version: 1, development_of: null },
    { id: 2, t: HOUR, score: 6 },              // unjudged
    { id: 3, t: 2 * HOUR, score: 6 },          // unjudged
    { id: 4, t: 3 * HOUR, score: 6 },          // unjudged
  ].map((r) => ({ ...r, explanation: `reading ${r.id}` }));
  const out = displayedSeries(series);
  assert.ok(out.every((p) => p.root === 1), 'all one development');
  assert.ok(out.at(-1).displayed < 7, 'so the clock kept running');

  const withBreak = displayedSeries([
    ...series,
    { id: 5, t: 4 * HOUR, score: 9, explanation: 'reading 5' },
    { id: 6, t: 5 * HOUR, score: 9, explanation: 'reading 6' },
    { id: 7, t: 6 * HOUR, score: 9, explanation: 'reading 7' },
  ]);
  assert.equal(withBreak.at(-1).root, 5, 'a level two clear still registers unjudged');
});

test('the page ages while the caller is silent', () => {
  // Ten hours after an 8 is not an 8, whatever the last stored row says. The
  // window is empty by then, so the basis says stale — and the number has still
  // moved, which is what a page that has not stopped looks like.
  const series = judged([8, 0], [8, 0], [8, 0]);
  const last = series.at(-1).t;
  const atLast = currentDisplay(series, { now: last });
  assert.equal(atLast.score, 7, 'two hours in, an 8 already reads 7');
  assert.equal(atLast.window, 3, 'and all three readings are inside the level window');

  const later = currentDisplay(series, { now: last + 10 * HOUR });
  assert.equal(later.basis, 'stale');
  assert.equal(later.window, 0);
  assert.ok(later.score < 8 && later.score >= 1, `aged to ${later.score}`);
});

test('a development older than the replay window keeps its real age', () => {
  // The chart pads its fetch and trims the result for exactly this reason: a
  // point at the left edge must age from the first report the front page used,
  // not from the edge of whatever range the page asked for.
  const series = [
    { id: 9, t: 30 * HOUR, score: 6, judge_version: 1, development_of: 1, explanation: 'x' },
  ];
  const roots = new Map([[1, { t: 0 }]]);
  const withRoot = displayedSeries(series, { roots });
  assert.equal(withRoot[0].since, 0, 'dated from the real first report');
  assert.ok(withRoot[0].displayed < displayedSeries(series)[0].displayed,
    'and reads lower than it would dated from the window edge');
});

test('the board shows every live story, loudest first, the leader marked', () => {
  // The front page is one number about one development. Everything else that is
  // still running is invisible there, which is what makes a number surprising —
  // so the admin board carries the rest, from the same replay.
  const series = [
    { id: 1, t: 0, score: 7, story: 'war', development_of: null, explanation: 'war breaks' },
    { id: 2, t: HOUR, score: 6, story: 'war', development_of: 1, explanation: 'war continues' },
    { id: 3, t: 4 * HOUR, score: 8, story: 'flood', development_of: null, explanation: 'flood breaks' },
    { id: 4, t: 9 * HOUR, score: 5, story: 'war', development_of: null, explanation: 'war escalates' },
  ].map((r) => ({ ...r, judge_version: 1, created_at: new Date(r.t).toISOString() }));
  const board = activeStories(series, { now: 10 * HOUR });

  assert.deepEqual(board.map((s) => s.story), ['flood', 'war'], 'loudest story first');
  assert.equal(board[0].leading, true, 'and the front page is about it');
  assert.equal(board[0].displayed, 6, '8 aged six hours');

  const war = board[1];
  assert.equal(war.developments.length, 2, 'one story, two developments');
  assert.deepEqual(war.developments.map((d) => d.root), [4, 1], 'newest development first');
  assert.equal(war.displayed, 5, 'the story is as loud as its loudest development');
  assert.equal(war.developments[1].anchor, 7, 'the older one keeps the level it broke at');
  assert.equal(war.developments[1].displayed, 4, 'and shows that level aged');
  assert.equal(war.developments[1].readings, 2, 'with the readings that reported it');
  assert.equal(war.developments[1].latest, 'war continues', 'and its freshest sentence');
  assert.ok(war.developments.every((d) => d.leading === false));
});

test('a point keeps its own story, and names the leading one separately', () => {
  // Letting the loudest development's slug overwrite the row's own was a quiet
  // trap: a Ukraine reading came back filed under the war that happened to be
  // leading. The two are different facts.
  const series = [
    { id: 1, t: 0, score: 8, story: 'war', development_of: null, explanation: 'war breaks' },
    { id: 2, t: HOUR, score: 3, story: 'ukraine', development_of: null, explanation: 'kyiv struck' },
  ].map((r) => ({ ...r, judge_version: 1, created_at: new Date(r.t).toISOString() }));
  const out = displayedSeries(series);

  assert.equal(out[1].story, 'ukraine', 'the reading reported Ukraine');
  assert.equal(out[1].leading_story, 'war', 'while the number is still about the war');
  assert.equal(out[1].reports, 2);
  assert.equal(out[1].root, 1);
});

test('a development older than the lookback leaves the board', () => {
  // What is live is the same set that competes for the front page. A story
  // nobody has added to in three days is at the floor and no longer competing,
  // so it stops accumulating there.
  const series = [
    { id: 1, t: 0, score: 8, story: 'old', development_of: null, explanation: 'old news' },
    { id: 2, t: 80 * HOUR, score: 4, story: 'now', development_of: null, explanation: 'todays news' },
  ].map((r) => ({ ...r, judge_version: 1, created_at: new Date(r.t).toISOString() }));
  const board = activeStories(series, { now: 80 * HOUR });
  assert.deepEqual(board.map((s) => s.story), ['now']);
});

test('the board and the front page name the same leading development', () => {
  // Two implementations of "which development leads" would be free to drift,
  // and a board that disagrees with the page about the page is worse than none.
  const series = judged([4, 0], [4, 0], [4, 0], [8, 3], [7, 3], [7, 3]);
  const board = activeStories(series, { now: series.at(-1).t });
  const page = currentDisplay(series, { now: series.at(-1).t });
  const leader = board.flatMap((s) => s.developments).find((d) => d.leading);
  assert.equal(leader.root, page.root);
  assert.equal(leader.displayed, page.score);
});

test('the quiet band tracks the rater, then falls to the floor', () => {
  // Nothing dramatic is happening and the rater keeps saying 3. The page says 3
  // for the first hours and 1 after a day: the scale's own bottom rung is
  // "Nothing new; skip the news", which is what a day-old unchanged story is.
  const day = Array.from({ length: 25 }, (_, i) => [i === 0 ? 3 : 3, 0]);
  const out = displayedSeries(judged(...day));
  assert.equal(out[0].displayed, 3);
  assert.equal(out[2].displayed, 3, 'the first hours read what the rater said');
  assert.equal(out.at(-1).displayed, 1);
  assert.equal(agedScore(3, 24 * HOUR) < 1, true, 'three halvings of 3 is under 1');
});

test('the score is smoothed, the sentence is not', async () => {
  // Two questions, two rows. The number is a level and a median estimates it
  // better; the sentence is what happened and goes stale, so a median row's
  // sentence sitting beside a current number reads as an app that has stopped.
  // No startup tick: an empty database makes the scheduler rate immediately
  // with a RANDOM mock score, and that reading now opens a development of its
  // own that stays live for three days. The old workaround — submit five
  // readings to push it out of the six-hour level window — no longer works,
  // because a development outlives the window by design.
  await withServer({ port: PORTS.currentSmoothing, env: { NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    const submit = (score, explanation) =>
      fetch(`${base}/api/readings?token=${CALLER_TOKEN}&score=${score}&explanation=${explanation}`);

    // One development, five readings: they share a stem so the mock judge
    // groups them, which is what puts the level rule rather than the break rule
    // in charge of the number. The newest is deliberately off the level.
    for (const [score, text] of [
      [5, 'hormuz+tanker+strike+alpha'], [5, 'hormuz+tanker+strike+bravo'],
      [5, 'hormuz+tanker+strike+charlie'], [4, 'hormuz+tanker+strike+delta'],
      [6, 'hormuz+tanker+strike+newest'],
    ]) {
      await submit(score, text);
    }
    const body = await (await fetch(`${base}/api/current`)).json();

    assert.equal(body.basis, 'aged', 'one development, already ageing');
    assert.equal(body.score, 5, 'the level it broke at, barely aged in the same second');
    assert.equal(body.explanation, 'hormuz tanker strike newest', 'but the newest sentence');
    assert.equal(body.level, 5);
    assert.ok(body.since, 'and the development the number is about is dated');
    assert.ok(body.created_at >= body.since, 'the page is dated from the reading, not the development');
    assert.equal(body.score_from, undefined, 'no score_from: `since` dates the number now');
  });
});

test('a break opens a development and is shown whole, at once', async () => {
  // A story with nothing in common with what came before is new, and a new
  // development is reported the moment it lands rather than smoothed into the
  // level around it.
  await withServer({ port: PORTS.currentScoreFrom, env: { NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    // The last reading shares no words with the rest, so the mock judge opens a
    // development for it — and a development an hour old cannot outshout one a
    // second old at the same score.
    for (const [s, t] of [
      [4, 'tariff+round+alpha'], [4, 'tariff+round+bravo'], [4, 'tariff+round+charlie'],
      [4, 'tariff+round+delta'], [9, 'volcano+erupts+overnight'],
    ]) {
      await fetch(`${base}/api/readings?token=${CALLER_TOKEN}&score=${s}&explanation=${t}`);
    }
    const body = await (await fetch(`${base}/api/current`)).json();
    assert.equal(body.basis, 'new');
    assert.equal(body.score, 9);
    assert.equal(body.explanation, 'volcano erupts overnight');
    assert.equal(body.story, 'volcano');
    assert.equal(body.score_from, undefined, 'the field is gone; `since` dates the number');
  });
});

test('history carries prompt_verified, so the chart cannot misread a missing key', async () => {
  // shape() converts only the columns a query selected, so an unselected column
  // is an absent key rather than null. history() omitted prompt_verified and a
  // reading that had verified read as "no digest sent" — twice.
  const { insertRating, history } = await import('../src/db.js');
  const { renderPrompt, latestVersion } = await import('../src/prompts.js');
  const prompt = renderPrompt(latestVersion());
  const base = {
    status: 'ok', slot: null, source: 'external', model: null,
    prompt_version: prompt.version, prompt_hash: prompt.hash, prompt_text: prompt.text,
  };
  await insertRating({ ...base, score: 5, explanation: 'verified row', prompt_verified: true });
  await insertRating({ ...base, score: 5, explanation: 'unverified row', prompt_verified: false });
  await insertRating({ ...base, score: 5, explanation: 'no digest row' });

  const rows = await history({ hours: 1 });
  const find = (text) => rows.find((r) => r.explanation === text);
  assert.equal(find('verified row').prompt_verified, true);
  assert.equal(find('unverified row').prompt_verified, false);
  assert.equal(find('no digest row').prompt_verified, null);
  // The key has to be present in every case, or absent reads as "not verified".
  for (const text of ['verified row', 'unverified row', 'no digest row']) {
    assert.ok('prompt_verified' in find(text), `${text} is missing the key`);
  }
});
