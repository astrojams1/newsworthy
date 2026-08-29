import { latestAttempt, latestRating } from './db.js';
import { effectiveConfig } from './config.js';
import { runRating, slotFor } from './rate.js';

// The in-process scheduler ticks at the finest supported cadence; the
// configured interval is enforced by the slot, exactly as on Vercel Cron.
const TICK_MS = 15 * 60_000;

let running = false;

/**
 * One rating. Safe to call from the cron endpoint and the local scheduler
 * alike: the slot makes a duplicate delivery a no-op rather than a second row.
 */
/**
 * The three reasons that are this app's own schedule. Vercel Cron drives the
 * first; the in-process scheduler drives the other two, and it is the schedule
 * on every self-hosted deployment — treating Vercel as the only producer of a
 * 'cron' reading filed each of its runs as a button press.
 *
 * An allowlist rather than a test for 'manual', because of which way each fails.
 * CLAUDE.md records the original bug as a silent default: the column defaults to
 * 'cron', so a run that passed no source was recorded as scheduled, which is how
 * every "Rate now" click came to be labelled a cron run. Anything that maps
 * unrecognised reasons to 'cron' has that shape again — a new trigger, or a typo
 * in an existing one, is filed as the schedule without a word. Failing the other
 * way costs nothing: an unrecognised reason is something a person or a new call
 * site did, and 'manual' is exactly what the column means by that.
 */
const SCHEDULED_REASONS = new Set(['vercel-cron', 'scheduled', 'startup']);

/**
 * `reason` names the trigger and reaches the stored row, not just the log.
 */
export async function tick(reason = 'scheduled', { slot, force = false } = {}) {
  const { intervalMinutes } = await effectiveConfig();
  slot ??= slotFor(new Date(), intervalMinutes);

  // Only rate if nothing has arrived within the interval — a rolling window
  // from the last reading, not the fixed slot boundary. An external caller
  // posting at 03:59 must suppress the 04:00 run, which slot-alignment alone
  // would not do. The slot is still claimed below, as the guard against a
  // duplicate cron delivery.
  if (!force) {
    const latest = await latestRating();
    const ageMinutes = latest ? (Date.now() - Date.parse(latest.created_at)) / 60_000 : Infinity;
    if (ageMinutes < intervalMinutes) {
      return {
        skipped: true,
        reason: 'a reading already arrived within the interval',
        age_minutes: Math.round(ageMinutes),
        source: latest?.source ?? null,
      };
    }
  }

  if (running) return null;
  running = true;
  try {
    const row = await runRating({
      slot: force ? null : slot,
      source: SCHEDULED_REASONS.has(reason) ? 'cron' : 'manual',
    });
    const when = new Date().toISOString();
    if (row.deduped) {
      console.log(`[${when}] ${reason}: slot ${slot} already rated ${row.score}/10 — skipped`);
    } else if (row.status === 'ok') {
      console.log(`[${when}] ${reason}: ${row.score}/10 — ${row.explanation}`);
    } else {
      console.error(`[${when}] ${reason}: FAILED — ${row.error}`);
    }
    return row;
  } finally {
    running = false;
  }
}

export function isRunning() {
  return running;
}

/**
 * In-process scheduling, for running this as an ordinary long-lived server.
 * On Vercel there is no long-lived process — Vercel Cron calls /api/cron
 * instead — so server.js does not start this there.
 */
export function start() {
  Promise.all([latestAttempt(), effectiveConfig()])
    .then(([last, config]) => {
      const staleness = last ? Date.now() - Date.parse(last.created_at) : Infinity;
      if (staleness >= config.intervalMinutes * 60_000) return tick('startup');
      console.log(`Last rating is ${Math.round(staleness / 60_000)}m old — waiting for the next slot.`);
      return null;
    })
    .catch((err) => console.error('startup tick failed', err));

  const schedule = () => {
    const delay = TICK_MS - (Date.now() % TICK_MS);
    setTimeout(() => {
      tick().catch((err) => console.error('tick failed', err));
      schedule();
    }, delay);
  };
  schedule();

  console.log('Scheduler ticking every 15 minutes; cadence enforced by the configured interval.');
}
