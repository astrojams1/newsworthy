import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { CALLER_TOKEN as CALLER, PORTS, readings, withServer } from './with-server.js';
import { DEFAULT_THRESHOLD, MAX_SUBSCRIPTIONS, checkPushReceipts, messageFor, notifyReading, validateSubscription } from '../src/push.js';
import { PUSH_CLAIM_STALE_MINUTES, claimPushDelivery, completePushDelivery, ensureSchema, insertRating, releasePushDeliveries, upsertPushSubscription } from '../src/db.js';
import { sql } from '../src/sql.js';

const TOKENS = {
  a: 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]',
  b: 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]',
  gone: 'ExpoPushToken[gone-gone-gone-gone-gone]',
};

const call = (base) => async (method, body) => {
  const res = await fetch(`${base}/api/push/subscriptions`, {
    method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

/**
 * A stand-in for Expo's push service: records every message it is handed and
 * answers with a ticket per message, reporting one token as unregistered.
 */
async function withRelay(run) {
  const received = [];
  const relay = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const messages = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    received.push(...messages);
    const data = messages.map((m) => m.to === TOKENS.gone
      ? { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } }
      : { status: 'ok', id: 'ticket' });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data }));
  });
  await new Promise((resolve) => relay.listen(PORTS.pushRelay, resolve));
  try {
    await run(received, `http://127.0.0.1:${PORTS.pushRelay}/push/send`);
  } finally {
    relay.close();
  }
}

test('a subscription is one Expo token and a threshold, validated field by field', () => {
  assert.deepEqual(validateSubscription({ token: TOKENS.a }), { token: TOKENS.a, threshold: DEFAULT_THRESHOLD, platform: null });
  assert.equal(DEFAULT_THRESHOLD, 8, 'off by default in the app, and 8 when turned on');
  assert.deepEqual(validateSubscription({ token: ` ${TOKENS.b} `, threshold: 6, platform: 'ios' }),
    { token: TOKENS.b, threshold: 6, platform: 'ios' });
  assert.equal(validateSubscription({ token: TOKENS.a, platform: 'web' }).platform, null);
  for (const body of [{}, { token: 'abc' }, { token: 'ExponentPushToken[]' }, { token: 'ExponentPushToken[has space]' }, { token: 42 }]) {
    assert.throws(() => validateSubscription(body), /token must be an Expo push token/);
  }
  for (const threshold of [0, 11, 7.5, '8', null]) {
    assert.throws(() => validateSubscription({ token: TOKENS.a, threshold }), /threshold must be an integer from 1 to 10/);
  }
  assert.ok(MAX_SUBSCRIPTIONS > 0, 'a public write route is bounded');
});

test('the notification is the number the page shows and the newest sentence, nothing urgent', () => {
  const message = messageFor({ score: 8, newest: { id: 5, score: 9, explanation: 'A ceasefire took hold overnight.' } });
  assert.deepEqual(message, {
    title: 'Newsworthy · 8/10', body: 'A ceasefire took hold overnight.', sound: 'default', channelId: 'readings', data: { reading_id: 5, score: 8 },
  });
});

test('devices register, move their threshold and leave; malformed requests are named', async () => {
  await withServer({ port: PORTS.push, env: { NEWSWORTHY_NO_SCHEDULER: '1' } }, async (base) => {
    const push = call(base);
    assert.deepEqual(await push('PUT', { token: 'nope' }), { status: 422, body: { ok: false, error: 'token must be an Expo push token' } });
    assert.deepEqual(await push('PUT', { token: TOKENS.a, threshold: 11 }),
      { status: 422, body: { ok: false, error: 'threshold must be an integer from 1 to 10' } });
    assert.deepEqual(await push('PUT', { token: TOKENS.a, platform: 'ios' }), { status: 200, body: { ok: true, threshold: 8, platform: 'ios' } });
    assert.deepEqual(await push('PUT', { token: TOKENS.a, threshold: 9, platform: 'ios' }), { status: 200, body: { ok: true, threshold: 9, platform: 'ios' } });
    assert.deepEqual(await push('DELETE', { token: TOKENS.a }), { status: 200, body: { ok: true, removed: 1 } });
    assert.deepEqual(await push('DELETE', { token: TOKENS.a }), { status: 200, body: { ok: true, removed: 0 } });
    assert.deepEqual(await push('DELETE', { token: 'nope' }), { status: 422, body: { ok: false, error: 'token must be an Expo push token' } });
    const malformed = await fetch(`${base}/api/push/subscriptions`, { method: 'PUT', body: '{not json' });
    assert.equal(malformed.status, 400);
    // The route takes only the two verbs the app uses.
    assert.equal((await fetch(`${base}/api/push/subscriptions`)).status, 404);
  });
});

test('devices hear the number the page shows, once per development and threshold', async () => {
  await withRelay(async (received, url) => {
    await withServer({ port: PORTS.pushDeliveries, env: { NEWSWORTHY_NO_SCHEDULER: '1', NEWSWORTHY_PUSH_URL: url } }, async (base) => {
      const push = call(base);
      const submit = readings(base);
      for (const [token, threshold] of [[TOKENS.a, 8], [TOKENS.b, 9], [TOKENS.gone, 8]]) {
        assert.equal((await push('PUT', { token, threshold, platform: 'android' })).status, 200);
      }
      const sent = () => received.splice(0).map((m) => [m.to, m.title]);
      const shown = async () => (await (await fetch(`${base}/api/current`)).json()).score;

      // Below every threshold: nothing.
      assert.equal((await submit(`token=${CALLER}&score=7&explanation=Talks+continue+over+the+border+dispute`)).status, 201);
      assert.deepEqual(sent(), []);

      // An 8 opens a development and the page shows 8: the 8s hear, the 9 does
      // not. The unregistered device is dropped.
      const first = await submit(`token=${CALLER}&score=8&explanation=Earthquake+levels+towns+across+the+northern+valley`);
      assert.equal(first.status, 201);
      assert.equal(first.body.development, 'new');
      assert.equal(await shown(), 8);
      assert.deepEqual(sent(), [[TOKENS.a, 'Newsworthy · 8/10'], [TOKENS.gone, 'Newsworthy · 8/10']]);
      assert.deepEqual(await push('DELETE', { token: TOKENS.gone }), { status: 200, body: { ok: true, removed: 0 } },
        'Expo said the device is gone, so its row went with it');

      // The same development an hour later, still an 8: already announced.
      const again = await submit(`token=${CALLER}&score=8&explanation=Earthquake+levels+towns+across+the+northern+valley+as+rescue+continues`);
      assert.equal(again.body.development, 'same');
      assert.deepEqual(sent(), []);

      // A 9 on the same development is inside the page's noise margin: the
      // page still shows 8, so the device waiting for a 9 is not told a 9.
      const nudge = await submit(`token=${CALLER}&score=9&explanation=Earthquake+death+toll+across+the+northern+valley+passes+a+thousand`);
      assert.equal(nudge.body.development, 'same');
      assert.equal(await shown(), 8);
      assert.deepEqual(sent(), []);

      // A 10 on the same development re-anchors it only once the median
      // confirms the level — the page's own lag against a single loud reading.
      // Even when the page shows 10, nobody hears: the sentence re-reports a
      // development first covered earlier, and only new developments announce.
      for (const [text, expected, announced] of [
        ['Earthquake death toll across the northern valley passes ten thousand', 8, []],
        ['Earthquake across the northern valley: toll passes ten thousand as aid stalls', 8, []],
        ['Earthquake toll across the northern valley nears fifteen thousand', 10, []],
      ]) {
        const worse = await submit(`token=${CALLER}&score=10&explanation=${text.replaceAll(' ', '+')}`);
        assert.equal(worse.body.development, 'same', text);
        assert.equal(await shown(), expected, text);
        assert.deepEqual(sent(), announced, text);
      }

      // A different development at 8 while the 10 is still the loudest: the
      // page does not change, so nothing is announced — a notification would
      // have opened on a 10 about something else.
      const other = await submit(`token=${CALLER}&score=8&explanation=Central+bank+halts+currency+trading+after+overnight+collapse`);
      assert.equal(other.body.development, 'new');
      assert.equal(await shown(), 10);
      assert.deepEqual(sent(), []);
    });
  });
});

// ---- in-process: the announcer against PGlite, with Expo stood in by a function

const base = { prompt_version: 1, prompt_hash: 'abc', prompt_text: 'p', model: 'mock-model', status: 'ok' };
const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();
function relay(fail = () => false) {
  const received = [];
  const fetchImpl = async (_url, { body }) => {
    const messages = JSON.parse(body);
    if (fail(messages)) return { ok: false, status: 503, json: async () => ({}) };
    received.push(...messages);
    return { ok: true, status: 200, json: async () => ({ data: messages.map(() => ({ status: 'ok', id: 't' })) }) };
  };
  return { received, fetchImpl };
}

test('a judge outage announces nothing: an unjudged reading is not known to be new', async () => {
  // The first finding: with the predecessor's id as the root, four unjudged 8s
  // announced three times. The page's replay inherits through an outage. Now
  // only a reading the judge placed in no earlier development starts an
  // announcement, and an unjudged one has not been placed at all.
  await ensureSchema();
  await sql`DELETE FROM ratings`; await sql`DELETE FROM push_subscriptions`; await sql`DELETE FROM push_deliveries`;
  await upsertPushSubscription({ token: TOKENS.a, threshold: 8, platform: 'ios' });
  const { received, fetchImpl } = relay();
  const results = [];
  for (const [minutes, text] of [[40, 'Dam breach floods the delta'], [30, 'Dam breach floods the delta, towns evacuated'],
    [20, 'Dam breach floods the delta, toll rising'], [10, 'Dam breach floods the delta, aid arriving']]) {
    const row = await insertRating({ ...base, score: 8, explanation: text, created_at: minutesAgo(minutes), judge_version: null });
    results.push(await notifyReading(row, { fetchImpl }));
  }
  assert.deepEqual(results.map((r) => r.score), [8, 8, 8, 8], 'the page shows 8 throughout');
  assert.deepEqual(results.map((r) => r.sent), [0, 0, 0, 0], 'nothing announced');
  assert.equal(received.length, 0);
});

test('a failed send gives its claim back, so the next reading of the development tries again', async () => {
  // The finding: a claim committed before Expo answered was never released,
  // so one 503 silenced a development for every device at that threshold.
  await ensureSchema();
  await sql`DELETE FROM ratings`; await sql`DELETE FROM push_subscriptions`; await sql`DELETE FROM push_deliveries`;
  await upsertPushSubscription({ token: TOKENS.a, threshold: 8, platform: 'ios' });
  let outage = true;
  const { received, fetchImpl } = relay(() => outage);
  const first = await insertRating({ ...base, score: 8, explanation: 'Refinery blast cuts fuel supply', created_at: minutesAgo(30), judge_version: 2, development_of: null, story: 'refinery' });
  assert.deepEqual(await notifyReading(first, { fetchImpl }), { sent: 0, score: 8, thresholds: [8] }, 'claimed, then Expo failed');
  assert.equal(received.length, 0);
  outage = false;
  const second = await insertRating({ ...base, score: 8, explanation: 'Refinery blast cuts fuel supply, prices jump', created_at: minutesAgo(20), judge_version: 2, development_of: first.id, story: 'refinery' });
  assert.deepEqual(await notifyReading(second, { fetchImpl }), { sent: 1, score: 8, thresholds: [8] }, 'the released claim is taken again and delivered');
  assert.deepEqual(received.map((m) => m.title), ['Newsworthy · 8/10']);
  const third = await insertRating({ ...base, score: 8, explanation: 'Refinery blast cuts fuel supply, repairs begin', created_at: minutesAgo(10), judge_version: 2, development_of: first.id, story: 'refinery' });
  assert.equal((await notifyReading(third, { fetchImpl })).sent, 0, 'and once delivered it stays delivered');
});

test('a claim protects against a concurrent duplicate, keeps progress when released, and a stale one is taken over', async () => {
  await ensureSchema();
  await sql`DELETE FROM push_deliveries`;
  const claim = { root: 900, threshold: 8, readingId: 901, score: 8 };
  assert.deepEqual(await claimPushDelivery(claim), { delivered: [] });
  assert.equal(await claimPushDelivery({ ...claim, readingId: 902 }), null, 'a second sender at the same moment sends nothing');
  await releasePushDeliveries([{ ...claim, delivered: ['ExponentPushToken[one]'] }]);
  assert.deepEqual(await claimPushDelivery({ ...claim, readingId: 902 }), { delivered: ['ExponentPushToken[one]'] }, 'released, it can be taken again with what was reached');
  await completePushDelivery({ ...claim, delivered: ['ExponentPushToken[two]'] });
  await releasePushDeliveries([claim]);
  assert.equal(await claimPushDelivery({ ...claim, readingId: 903 }), null, 'a completed delivery is never released or retaken');
  const [row] = await sql`SELECT recipients, delivered FROM push_deliveries WHERE root = 900`;
  assert.deepEqual([Number(row.recipients), row.delivered], [2, ['ExponentPushToken[one]', 'ExponentPushToken[two]']]);
  // A sender that froze mid-send: its claim has no sent_at and ages out.
  const frozen = { root: 910, threshold: 8, readingId: 911, score: 8 };
  assert.deepEqual(await claimPushDelivery(frozen), { delivered: [] });
  assert.equal(await claimPushDelivery({ ...frozen, readingId: 912 }), null);
  await sql`UPDATE push_deliveries SET claimed_at = now() - make_interval(mins => ${PUSH_CLAIM_STALE_MINUTES + 1}) WHERE root = 910`;
  assert.deepEqual(await claimPushDelivery({ ...frozen, readingId: 912 }), { delivered: [] }, 'stale, it is taken over');
});

test('a later reading can finish an announcement but never start one', async () => {
  await ensureSchema();
  await sql`DELETE FROM push_deliveries`;
  const claim = { root: 920, threshold: 8, readingId: 921, score: 8 };
  assert.equal(await claimPushDelivery({ ...claim, resumeOnly: true }), null, 'nothing begun, nothing to finish');
  assert.equal((await sql`SELECT * FROM push_deliveries WHERE root = 920`).length, 0, 'and no claim was created');
  assert.deepEqual(await claimPushDelivery(claim), { delivered: [] });
  assert.equal(await claimPushDelivery({ ...claim, readingId: 922, resumeOnly: true }), null, 'a live claim is honoured');
  await releasePushDeliveries([{ ...claim, delivered: ['ExponentPushToken[one]'] }]);
  assert.deepEqual(await claimPushDelivery({ ...claim, readingId: 922, resumeOnly: true }), { delivered: ['ExponentPushToken[one]'] },
    'a released one is taken over with its progress');
});

test('a re-report that lifts the page past a threshold announces nothing', async () => {
  // The development opened below every threshold, so no announcement began;
  // the reading that lifts it carries an age prefix and is not new.
  await ensureSchema();
  await sql`DELETE FROM ratings`; await sql`DELETE FROM push_subscriptions`; await sql`DELETE FROM push_deliveries`;
  await upsertPushSubscription({ token: TOKENS.a, threshold: 5, platform: 'ios' });
  const { received, fetchImpl } = relay();
  const first = await insertRating({ ...base, score: 4, explanation: 'Grid failure darkens the capital', created_at: minutesAgo(30), judge_version: 2, development_of: null, story: 'grid' });
  assert.deepEqual(await notifyReading(first, { fetchImpl }), { sent: 0, score: 4, thresholds: [] });
  const shock = await insertRating({ ...base, score: 9, explanation: 'Grid failure spreads to three provinces', created_at: minutesAgo(20), judge_version: 2, development_of: first.id, story: 'grid' });
  const result = await notifyReading(shock, { fetchImpl });
  assert.ok(result.score >= 5, 'the page number meets the threshold');
  assert.equal(result.sent, 0, 'but the sentence is not new');
  assert.equal(received.length, 0);
});

test('a batch that fails after another succeeded retries only the devices not yet reached', async () => {
  // The finding: releasing the whole claim after a second-batch 503 sent the
  // first batch's hundred devices the same development twice.
  await ensureSchema();
  await sql`DELETE FROM ratings`; await sql`DELETE FROM push_subscriptions`; await sql`DELETE FROM push_deliveries`;
  const tokens = Array.from({ length: 101 }, (_, i) => `ExponentPushToken[device-${String(i).padStart(3, '0')}]`);
  for (const token of tokens) await upsertPushSubscription({ token, threshold: 8, platform: 'ios' });
  let batches = 0;
  let outage = true;
  const { received, fetchImpl } = relay(() => { batches += 1; return outage && batches === 2; });
  const first = await insertRating({ ...base, score: 8, explanation: 'Port strike halts grain exports', created_at: minutesAgo(30), judge_version: 2, development_of: null, story: 'port' });
  assert.deepEqual(await notifyReading(first, { fetchImpl }), { sent: 100, score: 8, thresholds: [8] }, 'the first batch landed, the second did not');
  outage = false;
  const second = await insertRating({ ...base, score: 8, explanation: 'Port strike halts grain exports for a third day', created_at: minutesAgo(20), judge_version: 2, development_of: first.id, story: 'port' });
  assert.deepEqual(await notifyReading(second, { fetchImpl }), { sent: 1, score: 8, thresholds: [8] }, 'the retry reaches the one device left');
  const counts = new Map();
  for (const m of received) counts.set(m.to, (counts.get(m.to) ?? 0) + 1);
  assert.equal(counts.size, 101, 'every device heard');
  assert.ok([...counts.values()].every((n) => n === 1), 'and none heard twice');
  const third = await insertRating({ ...base, score: 8, explanation: 'Port strike halts grain exports, talks resume', created_at: minutesAgo(10), judge_version: 2, development_of: first.id, story: 'port' });
  assert.equal((await notifyReading(third, { fetchImpl })).sent, 0, 'delivered in full, it stays delivered');
});

test('the push is awaited where the reading is stored, not left in flight', async () => {
  // Like the rejection log: a serverless function may be frozen the moment the
  // response ends, and nothing running locally can see the difference.
  for (const file of ['src/server.js', 'src/rate.js']) {
    const src = await readFile(file, 'utf8');
    assert.match(src, /await notifyReading\(/, `${file} waits for the push`);
    assert.ok(!/void notifyReading\(/.test(src), `${file} does not leave it racing the freeze`);
  }
});

test('rejected and missing Expo tickets retry without repeating accepted recipients', async () => {
  await ensureSchema();
  await sql`DELETE FROM ratings`; await sql`DELETE FROM push_subscriptions`; await sql`DELETE FROM push_deliveries`; await sql`DELETE FROM push_receipts`;
  for (const token of Object.values(TOKENS)) await upsertPushSubscription({ token, threshold: 8, platform: 'ios' });
  const reading = await insertRating({ ...base, score: 8, explanation: 'Port strike halts grain exports', created_at: minutesAgo(10), judge_version: 2, development_of: null, story: 'port' });
  const first = await notifyReading(reading, { fetchImpl: async () => ({ ok: true, json: async () => ({ data: [
    { status: 'ok', id: 'accepted-a' }, { status: 'error', details: { error: 'InvalidCredentials' } },
  ] }) }) });
  assert.equal(first.sent, 1);
  const { received, fetchImpl } = relay();
  assert.equal((await notifyReading(reading, { fetchImpl })).sent, 2);
  assert.deepEqual(received.map(m => m.to), [TOKENS.b, TOKENS.gone]);
});

test('receipts remove unregistered devices and retry only explicitly rejected delivery', async () => {
  await ensureSchema();
  await sql`DELETE FROM ratings`; await sql`DELETE FROM push_subscriptions`; await sql`DELETE FROM push_deliveries`; await sql`DELETE FROM push_receipts`;
  for (const token of Object.values(TOKENS)) await upsertPushSubscription({ token, threshold: 8, platform: 'ios' });
  const reading = await insertRating({ ...base, score: 8, explanation: 'Port strike halts grain exports', created_at: minutesAgo(10), judge_version: 2, development_of: null, story: 'port' });
  await notifyReading(reading, { fetchImpl: async () => ({ ok: true, json: async () => ({ data: [
    { status: 'ok', id: 'a' }, { status: 'ok', id: 'b' }, { status: 'ok', id: 'gone' },
  ] }) }) });
  // No immediate polling: receipts are given time to become available.
  assert.deepEqual(await checkPushReceipts({ fetchImpl: () => { throw Error('too soon'); } }), { accepted: 0, failed: 0, pending: 0, expired: 0 });
  await sql`UPDATE push_receipts SET created_at = now() - interval '16 minutes'`;
  const result = await checkPushReceipts({ fetchImpl: async (_url, { body }) => {
    assert.deepEqual(JSON.parse(body).ids.sort(), ['a', 'b', 'gone']);
    return { ok: true, json: async () => ({ data: {
      a: { status: 'ok' }, b: { status: 'error', details: { error: 'InvalidCredentials' } },
      gone: { status: 'error', details: { error: 'DeviceNotRegistered' } },
    } }) };
  } });
  assert.deepEqual(result, { accepted: 1, failed: 2, pending: 0, expired: 0 });
  assert.equal((await sql`SELECT * FROM push_receipts`).length, 0);
  assert.equal((await sql`SELECT * FROM push_subscriptions WHERE token = ${TOKENS.gone}`).length, 0);
  const { received, fetchImpl } = relay();
  assert.equal((await notifyReading(reading, { fetchImpl })).sent, 1);
  assert.deepEqual(received.map(m => m.to), [TOKENS.b]);
});

test('a missing receipt is retained, then expires without duplicating a possibly delivered alert', async () => {
  await ensureSchema();
  await sql`DELETE FROM push_receipts`;
  await sql`INSERT INTO push_receipts (id, token, root, threshold, created_at)
    VALUES ('unknown', ${TOKENS.a}, 1, 8, now() - interval '16 minutes')`;
  const options = { fetchImpl: async () => ({ ok: true, json: async () => ({ data: {} }) }) };
  assert.equal((await checkPushReceipts(options)).pending, 1);
  await sql`UPDATE push_receipts SET created_at = now() - interval '25 hours'`;
  assert.equal((await checkPushReceipts(options)).expired, 1);
  assert.equal((await sql`SELECT * FROM push_receipts`).length, 0);
});
