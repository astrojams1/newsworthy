import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { CALLER_TOKEN as CALLER, PORTS, readings, withServer } from './with-server.js';
import { DEFAULT_THRESHOLD, MAX_SUBSCRIPTIONS, developmentFor, messageFor, validateSubscription } from '../src/push.js';

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

test('which development a reading announces: judged rows name it, unjudged rows announce a crossing', () => {
  const judgedNew = { id: 10, score: 8, judge_version: 2, development_of: null };
  const judgedSame = { id: 11, score: 9, judge_version: 2, development_of: 10 };
  assert.equal(developmentFor(judgedNew, null, 8), 10);
  assert.equal(developmentFor(judgedSame, judgedNew, 8), 10, 'a re-report is its development, not itself');
  // Unjudged: the previous reading below the threshold makes this a crossing,
  // one at or above it makes this the same plateau.
  const unjudged = { id: 12, score: 8, judge_version: null, development_of: null };
  assert.equal(developmentFor(unjudged, { id: 9, score: 5, judge_version: null }, 8), 12);
  assert.equal(developmentFor(unjudged, { id: 9, score: 8, judge_version: null }, 8), 9);
  assert.equal(developmentFor(unjudged, judgedSame, 8), 10, 'the plateau is the previous reading’s development');
  assert.equal(developmentFor(unjudged, judgedSame, 10), 12, 'and a plateau is judged per threshold');
  assert.equal(developmentFor(unjudged, null, 8), 12);
});

test('the notification is the number and the sentence, nothing urgent', () => {
  const message = messageFor({ id: 5, score: 8, explanation: 'A ceasefire took hold overnight.' });
  assert.deepEqual(message, {
    title: 'Newsworthy · 8/10', body: 'A ceasefire took hold overnight.', sound: 'default', data: { reading_id: 5, score: 8 },
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

test('a stored reading reaches the devices whose threshold it meets, once per development and threshold', async () => {
  await withRelay(async (received, url) => {
    await withServer({ port: PORTS.pushDeliveries, env: { NEWSWORTHY_NO_SCHEDULER: '1', NEWSWORTHY_PUSH_URL: url } }, async (base) => {
      const push = call(base);
      const submit = readings(base);
      for (const [token, threshold] of [[TOKENS.a, 8], [TOKENS.b, 9], [TOKENS.gone, 8]]) {
        assert.equal((await push('PUT', { token, threshold, platform: 'android' })).status, 200);
      }
      const sent = () => received.splice(0).map((m) => [m.to, m.title]);

      // Below every threshold: nothing.
      assert.equal((await submit(`token=${CALLER}&score=7&explanation=Talks+continue+over+the+border+dispute`)).status, 201);
      assert.deepEqual(sent(), []);

      // An 8 reaches the 8s and not the 9. The unregistered device is dropped.
      const first = await submit(`token=${CALLER}&score=8&explanation=Earthquake+levels+towns+across+the+northern+valley`);
      assert.equal(first.status, 201);
      assert.equal(first.body.development, 'new');
      assert.deepEqual(sent(), [[TOKENS.a, 'Newsworthy · 8/10'], [TOKENS.gone, 'Newsworthy · 8/10']]);
      assert.deepEqual(await push('DELETE', { token: TOKENS.gone }), { status: 200, body: { ok: true, removed: 0 } },
        'Expo said the device is gone, so its row went with it');

      // The same development an hour later, still an 8: already announced.
      const again = await submit(`token=${CALLER}&score=8&explanation=Earthquake+levels+towns+across+the+northern+valley+as+rescue+continues`);
      assert.equal(again.body.development, 'same');
      assert.deepEqual(sent(), []);

      // It escalates to a 9: the device waiting for a 9 hears now, the one
      // that already heard at 8 does not hear twice.
      const worse = await submit(`token=${CALLER}&score=9&explanation=Earthquake+death+toll+across+the+northern+valley+passes+a+thousand`);
      assert.equal(worse.body.development, 'same');
      assert.deepEqual(sent(), [[TOKENS.b, 'Newsworthy · 9/10']]);

      // A different development at 8 is news again for the 8.
      const other = await submit(`token=${CALLER}&score=8&explanation=Central+bank+halts+currency+trading+after+overnight+collapse`);
      assert.equal(other.body.development, 'new');
      assert.deepEqual(sent(), [[TOKENS.a, 'Newsworthy · 8/10']]);
      assert.deepEqual(received.map((m) => m.body), [], 'every message was consumed by the assertions above');
    });
  });
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
