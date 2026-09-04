import { getSettings, setSetting } from './db.js';
import { isKnownModel } from './pricing.js';
import { DEFAULT_HALF_LIFE_HOURS, HALF_LIFE_CHOICES } from './current.js';

/**
 * Effective runtime configuration: database settings win, environment
 * variables are the fallback, and there is a hard-coded floor under both.
 *
 * Vercel Cron fires every 15 minutes (vercel.json). A longer interval is
 * enforced here rather than there: the slot is floored to the configured
 * interval, so the extra cron calls inside one interval find the slot already
 * filled and skip without spending an API call.
 */
export const ENV_MODEL = process.env.NEWSWORTHY_MODEL || 'claude-opus-5';
// Four hours by default. At Opus 5 rates a run costs roughly $0.26, so a
// 15-minute cadence is ~$767/month while 4-hourly is ~$48/month. Change it in
// the admin page; no redeploy needed.
export const ENV_INTERVAL = Number(process.env.NEWSWORTHY_INTERVAL_MINUTES) || 240;

// Multiples of the 15-minute cron tick, so slot boundaries line up exactly.
export const INTERVAL_CHOICES = [15, 30, 60, 120, 240, 360, 720, 1440];

// How fast the front-page number ages, and which model decides whether a
// reading reports a development already recorded. Both are display-side: they
// change what the page shows about readings already stored, never the rating.
export const ENV_HALF_LIFE = Number(process.env.NEWSWORTHY_HALF_LIFE_HOURS) || DEFAULT_HALF_LIFE_HOURS;
export const ENV_JUDGE_MODEL = process.env.NEWSWORTHY_JUDGE_MODEL || 'claude-opus-5';

export function halfLifeLabel(hours) {
  return hours === 24 ? 'a day' : `${hours} hours`;
}

export function intervalLabel(minutes) {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes === 60) return 'hour';
  if (minutes < 1440) return `${minutes / 60} hours`;
  return minutes === 1440 ? 'day' : `${minutes / 1440} days`;
}

export async function effectiveConfig() {
  let stored = {};
  try {
    stored = await getSettings();
  } catch {
    // No database yet — fall back to env so the app still describes itself.
  }
  const model = isKnownModel(stored.model) ? stored.model : ENV_MODEL;
  const interval = INTERVAL_CHOICES.includes(Number(stored.interval_minutes))
    ? Number(stored.interval_minutes)
    : ENV_INTERVAL;
  const halfLife = HALF_LIFE_CHOICES.includes(Number(stored.half_life_hours))
    ? Number(stored.half_life_hours)
    : ENV_HALF_LIFE;
  const judgeModel = isKnownModel(stored.judge_model) ? stored.judge_model : ENV_JUDGE_MODEL;
  return {
    model,
    intervalMinutes: interval,
    halfLifeHours: halfLife,
    judgeModel,
    source: stored,
  };
}

/** Validate then persist. Throws with a readable message on bad input. */
export async function updateConfig({ model, intervalMinutes, halfLifeHours, judgeModel }) {
  if (model !== undefined) {
    if (!isKnownModel(model)) throw new Error(`Unknown model: ${model}`);
    await setSetting('model', model);
  }
  if (intervalMinutes !== undefined) {
    const minutes = Number(intervalMinutes);
    if (!INTERVAL_CHOICES.includes(minutes)) {
      throw new Error(`Interval must be one of ${INTERVAL_CHOICES.join(', ')} minutes`);
    }
    await setSetting('interval_minutes', minutes);
  }
  if (halfLifeHours !== undefined) {
    const hours = Number(halfLifeHours);
    if (!HALF_LIFE_CHOICES.includes(hours)) {
      throw new Error(`Half-life must be one of ${HALF_LIFE_CHOICES.join(', ')} hours`);
    }
    await setSetting('half_life_hours', hours);
  }
  if (judgeModel !== undefined) {
    if (!isKnownModel(judgeModel)) throw new Error(`Unknown model: ${judgeModel}`);
    await setSetting('judge_model', judgeModel);
  }
  return effectiveConfig();
}
