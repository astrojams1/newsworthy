import { latestAttempt } from './db.js';
import { runRating } from './rate.js';

export const INTERVAL_MINUTES = Number(process.env.NEWSWORTHY_INTERVAL_MINUTES) || 15;
const INTERVAL_MS = INTERVAL_MINUTES * 60_000;

let running = false;

/** One tick, guarded so a slow run can never overlap the next one. */
export async function tick(reason = 'scheduled') {
  if (running) return null;
  running = true;
  try {
    const row = await runRating();
    const when = new Date().toISOString();
    if (row.status === 'ok') {
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

/** Fire on the wall clock (:00/:15/:30/:45 at the default interval). */
export function start() {
  const last = latestAttempt();
  const staleness = last ? Date.now() - Date.parse(last.created_at) : Infinity;
  if (staleness >= INTERVAL_MS) {
    tick('startup').catch((err) => console.error('startup tick failed', err));
  } else {
    const mins = Math.round(staleness / 60_000);
    console.log(`Last rating is ${mins}m old — waiting for the next slot.`);
  }

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
