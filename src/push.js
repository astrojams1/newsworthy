import {
  claimPushDelivery, countPushSubscriptions, deletePushSubscriptions, previousOkRating,
  pushSubscriptionsFor, recordPushRecipients, upsertPushSubscription,
} from './db.js';

/**
 * Push notifications for high readings.
 *
 * A device opts in from the app's settings screen with the lowest score it
 * wants to hear about — off by default, and 8 when turned on. The app sends
 * its Expo push token here; nothing else about the device is stored. The
 * token is the whole identity, so turning notifications off deletes the row.
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
 * Which development a stored reading announces.
 *
 * A judged reading names it, or names itself by opening one — the same rule
 * the front page uses. An unjudged reading cannot be placed, and announcing
 * every unjudged 8 through a judge outage would page a phone hourly about
 * one story, so it stands in for its predecessor's development when the
 * previous reading already met the threshold, and for itself otherwise: a
 * crossing is announced, a plateau is not.
 */
export function developmentFor(reading, previous, threshold) {
  if (reading.judge_version != null) return reading.development_of ?? reading.id;
  if (previous && previous.score >= threshold) {
    return previous.judge_version != null ? (previous.development_of ?? previous.id) : previous.id;
  }
  return reading.id;
}

/** The notification itself: the number and the sentence, nothing urgent. */
export function messageFor(reading) {
  return {
    title: `Newsworthy · ${reading.score}/10`,
    body: reading.explanation,
    sound: 'default',
    data: { reading_id: reading.id, score: reading.score },
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
 * Announce a freshly stored reading to every device whose threshold it meets,
 * once per development and threshold. Never throws: a push failure is logged
 * and must not turn a stored reading into an error.
 *
 * @returns {Promise<{sent: number, thresholds: number[]}>} what went out
 */
export async function notifyReading(reading, { fetchImpl, url } = {}) {
  const result = { sent: 0, thresholds: [] };
  try {
    if (!reading || reading.status !== 'ok' || reading.deduped || !Number.isInteger(reading.score)) return result;
    const subscribers = await pushSubscriptionsFor(reading.score);
    if (subscribers.length === 0) return result;

    const previous = reading.judge_version == null ? await previousOkRating(reading) : null;
    const recipients = [];
    for (const threshold of [...new Set(subscribers.map((s) => s.threshold))]) {
      const root = developmentFor(reading, previous, threshold);
      const claimed = await claimPushDelivery({ root, threshold, readingId: reading.id, score: reading.score });
      if (!claimed) continue;
      result.thresholds.push(threshold);
      for (const s of subscribers) if (s.threshold === threshold) recipients.push({ ...s, root });
    }
    if (recipients.length === 0) return result;

    const message = messageFor(reading);
    const tickets = await sendExpoPush(recipients.map((r) => ({ to: r.token, ...message })), { fetchImpl, url });
    // A token Expo no longer knows is a device that uninstalled, or a token
    // that never was one. Either way the row has no future.
    const dead = tickets
      .filter((t) => t.status === 'error' && t.details?.error === 'DeviceNotRegistered')
      .map((t) => t.to);
    if (dead.length) await deletePushSubscriptions(dead);
    result.sent = tickets.filter((t) => t.status === 'ok').length;

    const byRoot = new Map();
    for (const r of recipients) {
      const key = `${r.root}:${r.threshold}`;
      byRoot.set(key, { root: r.root, threshold: r.threshold, recipients: (byRoot.get(key)?.recipients ?? 0) + 1 });
    }
    for (const entry of byRoot.values()) await recordPushRecipients(entry);
    console.log(`push: reading ${reading.id} (${reading.score}/10) sent to ${result.sent} of ${recipients.length} devices`);
  } catch (err) {
    console.error('push failed', err);
  }
  return result;
}
