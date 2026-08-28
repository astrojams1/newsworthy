import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentReading } from '../src/current.js';

// newest first, as recentRatings() returns them
const readings = (...scores) =>
  scores.map((score, i) => ({ score, explanation: `reading ${i}`, created_at: `t${i}` }));

test('the number shown is always an actual reading, never a computed value', () => {
  // An odd window is the whole reason for five rather than four: the median is
  // one of the observations, so the score and the sentence beside it come from
  // the same row. A computed 4.5 would have to borrow somebody's explanation.
  for (const scores of [[4, 5, 6, 5, 4], [3, 7, 5, 2, 6], [5, 5, 5, 5, 5]]) {
    const window = readings(...scores);
    const { row } = currentReading(window);
    assert.ok(window.includes(row), `${scores} returned a row from the window`);
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
  const { displayedSeries, currentReading } = await import('../src/current.js');
  const hour = 3600_000;
  const series = [5, 4, 6, 5, 4, 3, 8].map((score, i) => ({ t: i * hour, score }));
  const out = displayedSeries(series);

  assert.equal(out.length, series.length);
  assert.ok(out.every((p, i) => p.score === series[i].score), 'raw scores are untouched');

  // The newest point of the replay must equal what the live route would say
  // given the same window, or the chart's right edge contradicts the page.
  const live = currentReading(series.slice(-5).reverse());
  assert.equal(out.at(-1).displayed, live.row.score);
  assert.equal(out.at(-1).basis, live.basis);

  // 8 against a level of 4-5 is a shock and passes through unsmoothed.
  assert.equal(out.at(-1).displayed, 8);
  assert.equal(out.at(-1).basis, 'shock');
  // The early points have too short a window to take a median of.
  assert.deepEqual(out.slice(0, 2).map((p) => p.basis), ['latest', 'latest']);
});

test('the replay window is time-bounded, not just counted', async () => {
  const { displayedSeries } = await import('../src/current.js');
  const hour = 3600_000;
  // Four readings around 5, then a gap of a day, then a lone 2. The old
  // readings are outside the six-hour window, so the 2 stands alone as the
  // only estimate rather than being median-ed against stale company.
  const series = [
    { t: 0, score: 5 }, { t: hour, score: 5 }, { t: 2 * hour, score: 5 },
    { t: 3 * hour, score: 5 }, { t: 27 * hour, score: 2 },
  ];
  const out = displayedSeries(series);
  assert.equal(out.at(-1).displayed, 2, 'not dragged up by day-old readings');
  assert.equal(out.at(-1).basis, 'latest');
});

test('the page is dated from the newest reading, not the row the median landed on', async () => {
  // Shipped broken: /api/current returned the median row's created_at, so a
  // page updated minutes ago read "Updated an hour ago" whenever the median
  // landed on an older row — which is most hours.
  const { spawn } = await import('node:child_process');
  const child = spawn(process.execPath, ['src/server.js'], {
    env: {
      ...process.env,
      PORT: '8817',
      CALLER_TOKEN: 'test-caller-token',
      NEWSWORTHY_SQL_DRIVER: 'pglite',
      NEWSWORTHY_MOCK: '1',
    },
    stdio: 'ignore',
  });
  try {
    const base = 'http://127.0.0.1:8817';
    for (let i = 0; i < 100; i++) {
      try { await fetch(`${base}/healthz`); break; } catch { await new Promise((r) => setTimeout(r, 100)); }
    }
    const submit = (score, explanation) =>
      fetch(`${base}/api/readings?token=test-caller-token&score=${score}&explanation=${explanation}`);

    // Enough readings for a median, with the newest deliberately off the level
    // so the median lands on an earlier row.
    for (const [score, text] of [[5, 'five+a'], [5, 'five+b'], [4, 'four'], [6, 'six+newest']]) {
      await submit(score, text);
    }
    const body = await (await fetch(`${base}/api/current`)).json();

    assert.equal(body.basis, 'median');
    assert.equal(body.score, 5, 'the median of the window');
    assert.ok(body.explanation.startsWith('five'), 'with the sentence from a row that scored it');
    // created_at belongs to that row; updated_at is the newest reading.
    assert.ok(body.updated_at >= body.created_at, 'updated_at is never older');
    assert.notEqual(body.updated_at, body.created_at, 'and here they genuinely differ');

    const newest = await (await fetch(`${base}/api/admin/history?hours=1`)).json()
      .catch(() => null);
    if (newest?.points?.length) {
      assert.equal(body.updated_at, newest.points.at(-1).created_at, 'it is the newest reading');
    }
  } finally {
    child.kill();
  }
});
