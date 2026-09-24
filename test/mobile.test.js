import test from 'node:test';
import assert from 'node:assert/strict';
import { validReading, fetchReading } from '../apps/client/lib/reading.js';
import { validateMobileConfig } from '../scripts/mobile-config.js';
import { withServer } from './with-server.js';

const reading = { score: 4, explanation: 'A consequential development.', created_at: '2026-09-15T00:00:00Z' };
const config = { appId: 'com.newsworthy.app', apiBaseUrl: 'https://newsworthy-indol.vercel.app/',
  privacyUrl: 'https://newsworthy-indol.vercel.app/privacy', supportUrl: 'https://newsworthy-indol.vercel.app/support' };

test('bad or corrupted readings cannot replace the saved rating', async () => {
  assert.equal(validReading(reading), true);
  for (const data of [null, {}, { ...reading, score: 11 }, { ...reading, score: '4' },
    { ...reading, score: 4.5 }, { ...reading, explanation: '' }, { ...reading, created_at: 'yesterday' }]) {
    assert.equal(validReading(data), false);
    await assert.rejects(fetchReading('', async () => ({ ok: true, json: async () => data })), /Invalid reading/);
  }
  await assert.rejects(fetchReading('', async () => ({ ok: false, status: 503 })), /503/);
});

test('web requests stay same-origin and mobile requests use only the public backend', async () => {
  for (const base of ['', config.apiBaseUrl.slice(0, -1)]) {
    const data = await fetchReading(base, async (url, options) => {
      assert.equal(url, `${base}/api/current`);
      assert.equal(options.credentials, 'omit');
      assert.equal(options.cache, 'no-store');
      assert.ok(options.signal instanceof AbortSignal);
      return { ok: true, json: async () => ({ ...reading, secret: 'not persisted' }) };
    });
    assert.deepEqual(data, reading);
  }
});

test('release validation refuses placeholders, insecure endpoints, missing store links and embedded tokens', () => {
  assert.equal(validateMobileConfig(config, { release: true }).apiBaseUrl, config.apiBaseUrl.slice(0, -1));
  for (const changes of [{ appId: 'com.example.newsworthy' }, { appId: 'bad id' },
    { apiBaseUrl: 'http://backend.com' }, { apiBaseUrl: 'https://localhost' },
    { apiBaseUrl: 'https://example.com' }, { apiBaseUrl: 'https://backend.com/path' },
    { apiBaseUrl: 'https://user:secret@backend.com' }, { apiBaseUrl: 'https://backend.com?token=secret' },
    { privacyUrl: '' }, { supportUrl: '' }]) {
    assert.throws(() => validateMobileConfig({ ...config, ...changes }, { release: true }));
  }
});

test('only the public reading grants native CORS, including error responses and preflight', async () => {
  await withServer({ port: 8837, env: { NEWSWORTHY_NO_SCHEDULER: '1', ADMIN_TOKEN: 'locked' } }, async (base) => {
    for (const origin of ['http://localhost:8081', 'http://127.0.0.1:8081']) {
      const response = await fetch(`${base}/api/current`, { headers: { Origin: origin } });
      assert.equal(response.status, 503); // Empty DB still supplies CORS for a readable error.
      assert.equal(response.headers.get('access-control-allow-origin'), origin);
      assert.equal(response.headers.get('vary'), 'Origin');
      const preflight = await fetch(`${base}/api/current`, { method: 'OPTIONS', headers: { Origin: origin } });
      assert.equal(preflight.status, 204);
      assert.equal(preflight.headers.get('access-control-allow-methods'), 'GET, OPTIONS');
      const admin = await fetch(`${base}/api/admin/settings`, { headers: { Origin: origin } });
      assert.equal(admin.status, 401);
      assert.equal(admin.headers.get('access-control-allow-origin'), null);
    }
    const stranger = await fetch(`${base}/api/current`, { headers: { Origin: 'https://untrusted.invalid' } });
    assert.equal(stranger.headers.get('access-control-allow-origin'), null);
    // '/settings' is an exported page reached by reload or shared link as
    // well as by the gear: the server must find settings.html for it.
    for (const path of ['/', '/privacy', '/support', '/settings']) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get('content-type'), /html/);
    }
    assert.equal((await fetch(`${base}/no-such-page`)).status, 404, 'a missing page is still missing');
    assert.equal((await fetch(`${base}/api/no-such-route`)).status, 404);
  });
});


test('the first-coverage timestamp survives API normalization and offline cache storage', async () => {
  const input = { ...reading, explanation_text: 'The Fed raised rates.', explanation_since: '2026-09-14T00:00:00Z', explanation_new: false };
  const result = await fetchReading('', async () => ({ok:true,json:async()=>input}));
  assert.deepEqual(JSON.parse(JSON.stringify(result)),input);
});

test('only an explicit true marks a reading new; an older server never does', async () => {
  const fresh = { ...reading, explanation_text: 'A volcano erupted.', explanation_since: null, explanation_new: true };
  assert.equal((await fetchReading('', async () => ({ok:true,json:async()=>fresh}))).explanation_new, true);
  const older = { ...reading, explanation_text: 'A volcano erupted.', explanation_since: null };
  assert.equal((await fetchReading('', async () => ({ok:true,json:async()=>older}))).explanation_new, false);
  for (const value of ['true', 1]) {
    assert.equal((await fetchReading('', async () => ({ok:true,json:async()=>({ ...older, explanation_new: value })}))).explanation_new, false);
  }
});

test('packaged privacy declarations include requested notifications and hosting diagnostics without tracking', async () => {
  const { createRequire } = await import('node:module');
  const config = createRequire(import.meta.url)('../apps/client/app.config.js');
  const privacy = config.ios.privacyManifests;
  assert.equal(privacy.NSPrivacyTracking, false);
  assert.deepEqual(privacy.NSPrivacyCollectedDataTypes.map(d => d.NSPrivacyCollectedDataType).sort(), [
    'NSPrivacyCollectedDataTypeDeviceID', 'NSPrivacyCollectedDataTypeOtherDataTypes',
    'NSPrivacyCollectedDataTypeOtherDiagnosticData', 'NSPrivacyCollectedDataTypePerformanceData',
  ]);
  for (const data of privacy.NSPrivacyCollectedDataTypes) {
    assert.equal(data.NSPrivacyCollectedDataTypeLinked, true);
    assert.equal(data.NSPrivacyCollectedDataTypeTracking, false);
    assert.deepEqual(data.NSPrivacyCollectedDataTypePurposes, ['NSPrivacyCollectedDataTypePurposeAppFunctionality']);
  }
});
