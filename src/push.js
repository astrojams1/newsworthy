import {
  claimPushDelivery, completePushDelivery, countPushSubscriptions, deletePushSubscriptions, history,
  pushSubscriptionsFor, releasePushDeliveries, rootTimes, upsertPushSubscription,
} from './db.js';
import { STORY_MEMORY_HOURS, currentDisplay } from './current.js';
import { effectiveConfig } from './config.js';

/**
 * Push notifications for high readings.
 *
 * A device opts in from the app's settings screen with the lowest score it
 * wants to hear about — off by default, and 8 when turned on. The app sends
 * its Expo push token here; nothing else about the device is stored. The
 * token is the whole identity, so turning notifications off deletes the row.
 *
 * What is announced is the front page's number, not the reading's own score.
 * The page smooths and ages readings and weighs a development against its
 * story, so a raw 8 can display as a 4; a notification saying 8 that opens on
 * a 4 is a notification that lied. So after a reading is stored the display
 * is computed exactly as /api/current computes it, and a device hears when
 * that number reaches its threshold — once per development and threshold,
 * whichever readings report it, because the page's replay already answers
 * which development the number is about, through judge outages included.
 *
 * Delivery goes through Expo's push service, which relays to APNs and FCM.
 * That is an HTTP call and nothing native, so it runs in the same serverless
 * function that stored the reading — and it is awaited there for the same
 * reason the rejection log is: a function may be frozen the moment its
 * response ends.
 */

export const DEFAULT_THRESHOLD = 8;
export const MIN_THRESHOLD = 1;
export const MAX_THRESHOLD = 10;

/**
 * A public write route needs a bound. The row is keyed by token, so a device
 * can only ever hold one, and a token has to look like one Expo issued — but
 * nothing stops a script inventing tokens, so past this many the route
 * refuses rather than letting a public URL grow a table without limit. Tokens
 * Expo reports as unregistered are deleted on the first send, so invented
 * ones do not stay.
 */
export const MAX_SUBSCRIPTIONS = 5000;

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 100; // Expo's documented maximum per request

const TOKEN_PATTERN = /^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]{8,128}\]$/;

export class PushError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

export function validThreshold(value) {
  return Number.isInteger(value) && value >= MIN_THRESHOLD && value <= MAX_THRESHOLD;
}

/** Shape a subscription request; every rejection names the field at fault. */
export function validateSubscription(body = {}) {
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!TOKEN_PATTERN.test(token)) throw new PushError('token must be an Expo push token');
  const threshold = body.threshold === undefined ? DEFAULT_THRESHOLD : body.threshold;
  if (!validThreshold(threshold)) {
    throw new PushError(`threshold must be an integer from ${MIN_THRESHOLD} to ${MAX_THRESHOLD}`);
  }
  const platform = body.platform === 'ios' || body.platform === 'android' ? body.platform : null;
  return { token, threshold, platform };
}

export async function subscribe(body) {
  const subscription = validateSubscription(body);
  if ((await countPushSubscriptions()) >= MAX_SUBSCRIPTIONS) {
    throw new PushError('too many devices are registered', 503);
  }
  return upsertPushSubscription(subscription);
}

export async function unsubscribe(body = {}) {
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!TOKEN_PATTERN.test(token)) throw new PushError('token must be an Expo push token');
  return { removed: await deletePushSubscriptions([token]) };
}

/**
 * The front page as it stands after this reading: its number, and which
 * development that number is about. The same rows, config and replay as
 * /api/current, so a device is told what it will see.
 */
export async function displayedNow({ now = Date.now() } = {}) {
  const { halfLifeHours, storyHalfLifeDays } = await effectiveConfig();
  const rows = await history({ hours: STORY_MEMORY_HOURS });
  if (rows.length === 0) return null;
  const ascending = rows.map((r) => ({ ...r, t: Date.parse(r.created_at) }));
  return currentDisplay(ascending, { now, halfLifeHours, storyHalfLifeDays, roots: await rootTimes(ascending) });
}

/** The notification itself: the number and the sentence, nothing urgent. */
export function messageFor({ score, newest }) {
  return {
    title: `Newsworthy · ${score}/10`,
    body: newest.explanation,
    sound: 'default',
    data: { reading_id: newest.id, score },
  };
}

/**
 * Send one batch of messages through Expo and return the per-message tickets.
 * `fetchImpl` and `url` are injectable so a test can stand in for Expo.
 */
export async function sendExpoPush(messages, { fetchImpl = fetch, url = expoPushUrl() } = {}) {
  const tickets = [];
  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    const headers = { 'content-type': 'application/json', accept: 'application/json' };
    // Optional: an access token lets Expo enforce that only this server sends
    // to this project's tokens. Not required for delivery.
    if (process.env.EXPO_ACCESS_TOKEN) headers.authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    const res = await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(chunk) });
    if (!res.ok) throw new Error(`Expo push responded ${res.status}`);
    const parsed = await res.json();
    const data = Array.isArray(parsed?.data) ? parsed.data : [];
    for (let j = 0; j < chunk.length; j += 1) tickets.push({ to: chunk[j].to, ...(data[j] ?? {}) });
  }
  return tickets;
}

export function expoPushUrl() {
  return process.env.NEWSWORTHY_PUSH_URL || EXPO_PUSH_URL;
}

/**
 * After a reading is stored: announce the front page's number to every device
 * whose threshold it now meets, once per development and threshold. Never
 * throws — a push failure is logged and must not turn a stored reading into
 * an error. A failed send gives its claims back, so the next reading of the
 * same development tries again rather than finding it silently spent.
 *
 * @returns {Promise<{sent: number, score: number|null, thresholds: number[]}>}
 */
export async function notifyReading(reading, { fetchImpl, url, now } = {}) {
  const result = { sent: 0, score: null, thresholds: [] };
  let claims = [];
  try {
    if (!reading || reading.status !== 'ok' || reading.deduped) return result;
    const current = await displayedNow({ now });
    if (!current || !Number.isInteger(current.score)) return result;
    result.score = current.score;
    const subscribers = await pushSubscriptionsFor(current.score);
    if (subscribers.length === 0) return result;

    const recipients = [];
    for (const threshold of [...new Set(subscribers.map((s) => s.threshold))]) {
      const claimed = await claimPushDelivery({ root: current.root, threshold, readingId: reading.id, score: current.score });
      if (!claimed) continue;
      claims.push({ root: current.root, threshold });
      result.thresholds.push(threshold);
      for (const s of subscribers) if (s.threshold === threshold) recipients.push(s);
    }
    if (recipients.length === 0) return result;

    const message = messageFor(current);
    const tickets = await sendExpoPush(recipients.map((r) => ({ to: r.token, ...message })), { fetchImpl, url });
    // A token Expo no longer knows is a device that uninstalled, or a token
    // that never was one. Either way the row has no future.
    const dead = tickets
      .filter((t) => t.status === 'error' && t.details?.error === 'DeviceNotRegistered')
      .map((t) => t.to);
    if (dead.length) await deletePushSubscriptions(dead);
    result.sent = tickets.filter((t) => t.status === 'ok').length;

    for (const claim of claims) {
      const count = recipients.filter((r) => r.threshold === claim.threshold).length;
      await completePushDelivery({ ...claim, recipients: count });
    }
    claims = [];
    console.log(`push: reading ${reading.id} shows ${current.score}/10, sent to ${result.sent} of ${recipients.length} devices`);
  } catch (err) {
    console.error('push failed', err);
    // Best effort: a release that fails leaves a claim that goes stale on its
    // own, so the next reading still gets its turn — just later.
    if (claims.length) await releasePushDeliveries(claims).catch(() => {});
  }
  return result;
}
