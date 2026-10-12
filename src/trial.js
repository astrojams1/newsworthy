/**
 * Side by side: a trial caller's readings against the live caller's.
 *
 * Both callers fire on the same schedule, so each trial reading is paired with
 * the live reading nearest it in time, within PAIR_WINDOW_MINUTES; outside
 * that, the hour had no live reading to compare with and the trial reading is
 * left unpaired rather than matched to another hour's news.
 *
 * Judgements agree when both name the same development. The trial usually
 * fetches the record after the live reading of the same hour is stored, so a
 * live reading that opened a development is often on the trial's record as
 * that development: naming it is agreeing with "new", not disagreeing.
 */
export const PAIR_WINDOW_MINUTES = 30;

const minutes = (a, b) => Math.abs(Date.parse(a.created_at) - Date.parse(b.created_at)) / 60_000;

/** The development a judged reading reports: its root, or 'new'. Null when unjudged. */
function development(reading, { liveId = null } = {}) {
  if (reading.judge_version == null) return null;
  if (reading.development_of == null) return 'new';
  return reading.development_of === liveId ? 'new' : reading.development_of;
}

function judgementsAgree(trial, live) {
  const t = development(trial, { liveId: live.id });
  const l = development(live);
  if (t === null || l === null) return null;
  return t === l;
}

export function pairTrials(trials, live) {
  return trials.map((trial) => {
    let best = null;
    for (const reading of live) {
      const gap = minutes(trial, reading);
      if (gap <= PAIR_WINDOW_MINUTES && (!best || gap < best.gap)) best = { reading, gap };
    }
    if (!best) return { trial, live: null };
    const { reading } = best;
    return {
      trial,
      live: reading,
      minutes_apart: Math.round(best.gap),
      score_diff: trial.score - reading.score,
      judgement_agrees: judgementsAgree(trial, reading),
    };
  });
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const share = (xs, f) => (xs.length ? xs.filter(f).length / xs.length : null);
const round = (x, places = 2) => (x === null ? null : Number(x.toFixed(places)));

export function summarizeTrial(pairs) {
  const trials = pairs.map((p) => p.trial);
  const paired = pairs.filter((p) => p.live);
  const judged = paired.filter((p) => p.judgement_agrees !== null);
  const diffs = paired.map((p) => p.score_diff);
  return {
    trial_readings: trials.length,
    paired: paired.length,
    score_exact: round(share(diffs, (d) => d === 0)),
    score_within_1: round(share(diffs, (d) => Math.abs(d) <= 1)),
    score_mean_abs_diff: round(mean(diffs.map(Math.abs))),
    // Positive when the trial scores higher than the live caller.
    score_mean_diff: round(mean(diffs)),
    judgement_agreement: round(share(judged, (p) => p.judgement_agrees)),
    judgements_compared: judged.length,
    trial_prompt_verified: round(share(trials, (r) => r.prompt_verified === true)),
    live_prompt_verified: round(share(paired, (p) => p.live.prompt_verified === true)),
    trial_judged: round(share(trials, (r) => r.judge_version != null)),
    live_judged: round(share(paired, (p) => p.live.judge_version != null)),
    trial_mean_chars: round(mean(trials.map((r) => r.explanation.length)), 0),
    live_mean_chars: round(mean(paired.map((p) => p.live.explanation.length)), 0),
  };
}
