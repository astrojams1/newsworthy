import { latestAttempt } from './db.js';
import { INTERVAL_MINUTES, runRating, slotFor } from './rate.js';

const INTERVAL_MS = INTERVAL_MINUTES * 60_000;

let running = false;

/**
 * One rating. Safe to call from the cron endpoint and the local scheduler
 * alike: the slot makes a duplicate delivery a no-op rather than a second row.
 */
export async function tick(reason = 'scheduled', { slot = slotFor(), force = false } = {}) {
  if (running) return null;
  running = true;
  try {
    const row = await runRating({ slot: force ? null : slot });
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
  latestAttempt()
    .then((last) => {
      const staleness = last ? Date.now() - Date.parse(last.created_at) : Infinity;
      if (staleness >= INTERVAL_MS) return tick('startup');
      console.log(`Last rating is ${Math.round(staleness / 60_000)}m old — waiting for the next slot.`);
      return null;
    })
    .catch((err) => console.error('startup tick failed', err));

  const schedule = () => {
    const delay = INTERVAL_MS - (Date.now() % INTERVAL_MS);
    setTimeout(() => {
      tick().catch((err) => console.error('tick failed', err));
      schedule();
    }, delay);
  };
  schedule();

  console.log(`Scheduler running every ${INTERVAL_MINUTES} minutes.`);
}
