import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { latestSnapshot, readingSnapshot, validReading } from '../apps/client/lib/reading.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
function load(path, mocks, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(read(path), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    assert.ok(name in mocks, `Unexpected import: ${name}`);
    return mocks[name];
  }, ...globals });
  return exports;
}
const reading = { score: 4, explanation: 'A current development.', created_at: '2026-09-18T01:00:00Z' };
const flush = () => new Promise(resolve => setImmediate(resolve));

test('fresh app readings reach widgets on launch, foreground and polling, including score decay with the same timestamp', async () => {
  const calls = [], effects = [], state = [];
  let resume, poll, fail = false, value = reading;
  const syncWidgets = async (...args) => calls.push(args);
  const { useReading } = load('apps/client/lib/use-reading.ts', {
    react: {
      useEffect: callback => effects.push(callback), useRef: current => ({ current }),
      useCallback: fn => fn, useState: initial => { const slot = state.length; const value = typeof initial === 'function' ? initial() : initial; state.push(value); return [value, value => state[slot] = value]; },
    },
    'react-native': { AppState: { currentState: 'active', addEventListener: (_, callback) => { resume = callback; return { remove() {} }; } } },
    '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async () => JSON.stringify(reading), setItem: async () => { throw Error('disk full'); } } },
    './config': { apiOrigin: 'https://example.test' },
    './reading': { latestSnapshot, readingSnapshot, fetchReading: async () => { if (fail) throw Error('offline'); return value; } },
    './widget-sync': { syncWidgets, readWidgetSnapshot: () => null },
  }, { process: { env: { EXPO_OS: 'ios' } }, setInterval: callback => { poll = callback; }, clearInterval() {} });
  useReading();
  const cleanup = effects[0]();
  await flush();
  assert.equal(calls.length, 1, 'fresh launch reading synced once; cached app reading not synced');
  assert.equal(calls[0][0], 'https://example.test');
  assert.deepEqual(calls[0][1], reading);
  assert.equal(typeof calls[0][2], 'number');
  value = { ...reading, score: 3 };
  resume('active'); await flush();
  assert.equal(calls.length, 2);
  assert.equal(calls[1][1].score, 3, 'same original timestamp does not suppress decayed score');
  poll(); await flush();
  assert.equal(calls.length, 3);
  assert.equal(state[2], false, 'storage failure does not mark the fresh reading saved');
  fail = true;
  resume('active'); await flush();
  assert.equal(calls.length, 3, 'failed fetch cannot overwrite the widget');
  assert.equal(state[2], true);
  cleanup();
});

test('widget handoff keeps public fields and timestamp; unavailable/failed native bridges are harmless', async () => {
  const received = [];
  for (const native of [null, { syncReading: async () => { throw Error('unavailable'); } }, {
    syncReading: async (origin, payload) => received.push({ origin, payload: JSON.parse(payload) }),
  }]) {
    const { syncWidgets } = load('apps/client/lib/widget-sync.ts', {
      expo: { requireOptionalNativeModule: () => native }, './reading': { validReading, readingSnapshot, latestSnapshot },
    });
    await syncWidgets('https://example.test', { ...reading, private: 'discard' }, 1234);
    await syncWidgets('https://example.test', { ...reading, score: 99 }, 1234);
  }
  assert.deepEqual(received, [{ origin: 'https://example.test', payload: { reading, fetchedAt: 1234 } }]);
});

test('native handoff wiring preserves private transport, reload and stale-worker protection', () => {
  const android = read('apps/client/plugins/widget-android/RatingWidget.java');
  const worker = read('apps/client/plugins/widget-android/RatingWidgetWorker.java');
  const kotlin = read('apps/client/modules/newsworthy-widgets/android/src/main/java/expo/modules/newsworthywidgets/NewsworthyWidgetsModule.kt');
  const swift = read('apps/client/targets/widget/NewsworthyWidget.swift');
  const module = read('apps/client/modules/newsworthy-widgets/ios/NewsworthyWidgetsModule.swift');
  assert.match(kotlin, /setComponent\(ComponentName/);
  assert.match(android, /BuildConfig.NEWSWORTHY_API_URL.equals/);
  assert.match(android, /if \(valid\(reading\)\)/);
  assert.match(android, /getLong\(REVISION, 0\) != revision/);
  assert.match(worker, /RatingWidget.completeRefresh\(getApplicationContext\(\), display, revision, fetchedAt\)/);
  assert.match(module, /defaults.set\(data, forKey: key\)/);
  assert.match(module, /reloadTimelines\(ofKind: "NewsworthyRating"\)/);
  const store = read('apps/client/targets/widget/WidgetReadingStore.swift');
  assert.match(swift, /private static let store = WidgetReadingStore/);
  assert.match(swift, /reloadTimelines\(ofKind: "NewsworthyRating"\)/);
  assert.match(store, /if let inFlight = inFlight/);
  assert.match(store, /age < 60_000/);
  assert.match(store, /AppReading.newest\(previous, candidate\)/);
  assert.match(store, /set\(encoded, forKey: cacheKey \+ ":widget"\)/);
  assert.match(store, /previous\?\.reading != accepted.reading/);
  assert.match(module, /Function\("getReadings"\)/);
  assert.match(module, /\[key, key \+ ":widget"\]/);
  assert.match(kotlin, /Function\("getReadings"\)/);
  assert.match(android, /putLong\(FETCHED_AT, fetchedAt\)/);
  const appConfig = read('apps/client/app.config.js');
  const targetConfig = read('apps/client/targets/widget/expo-target.config.js');
  for (const config of [appConfig, targetConfig]) {
    assert.match(config, /'com.apple.security.application-groups': \[`group.\$\{release.appId\}.widgets`\]/);
  }
});

test('widget snapshots are optional, validated and synchronously available', () => {
  for (const [native, expected] of [
    [null, null], [{}, null], [{ getReadings() { throw Error('unavailable'); } }, null],
    [{ getReadings: () => ['invalid json'] }, null],
    [{ getReadings: () => [JSON.stringify({ reading: { ...reading, score: 99 }, fetchedAt: 1 })] }, null],
    [{ getReadings: () => [JSON.stringify({ reading, fetchedAt: -1 })] }, null],
    [{ getReadings: origin => { assert.equal(origin, 'https://example.test'); return ['broken cache', JSON.stringify({ reading, fetchedAt: 123 }), JSON.stringify({ reading, fetchedAt: 1 })]; } }, { reading, fetchedAt: 123 }],
  ]) {
    const { readWidgetSnapshot } = load('apps/client/lib/widget-sync.ts', {
      expo: { requireOptionalNativeModule: () => native }, './reading': { validReading, readingSnapshot, latestSnapshot },
    });
    assert.deepEqual(JSON.parse(JSON.stringify(readWidgetSnapshot('https://example.test'))), expected);
  }
});

test('a newer widget message is the first app reading, survives old disk/network data, and appears synchronously on resume', async () => {
  const newer = { ...reading, explanation: 'The updated widget message.', created_at: '2026-09-18T02:00:00Z' };
  let widget = { reading: newer, fetchedAt: 200 };
  let resume, resolveNetwork, resolveDisk;
  const effects = [], state = [], displayed = [], synced = [];
  const { useReading } = load('apps/client/lib/use-reading.ts', {
    react: {
      useEffect: fn => effects.push(fn), useRef: current => ({ current }), useCallback: fn => fn,
      useState: initial => {
        const slot = state.length, value = typeof initial === 'function' ? initial() : initial;
        state.push(value);
        if (slot === 1) displayed.push(value);
        return [value, next => { state[slot] = next; if (slot === 1) displayed.push(next); }];
      },
    },
    'react-native': { AppState: { currentState: 'active', addEventListener: (_, fn) => { resume = fn; return { remove() {} }; } } },
    '@react-native-async-storage/async-storage': { __esModule: true, default: {
      getItem: () => new Promise(resolve => { resolveDisk = resolve; }), setItem: async () => {},
    } },
    './config': { apiOrigin: 'https://example.test' },
    './reading': { latestSnapshot, readingSnapshot, fetchReading: () => new Promise(resolve => { resolveNetwork = resolve; }) },
    './widget-sync': { readWidgetSnapshot: () => widget, syncWidgets: async (_, value) => synced.push(value) },
  }, { process: { env: { EXPO_OS: 'ios' } }, setInterval() {}, clearInterval() {} });
  const hook = useReading();
  assert.equal(hook.reading, newer, 'first render already matches the widget');
  const cleanup = effects[0]();
  resolveDisk(JSON.stringify(reading)); await flush();
  assert.equal(state[1], newer, 'old disk cache never replaces the widget');
  resolveNetwork(reading); await flush();
  assert.equal(state[1], newer, 'an older server response never rolls back the message');
  assert.equal(synced[0], newer);

  resume('active'); // Leave a request pending while the widget refreshes independently.
  widget = { reading: { ...newer, score: 2, explanation: 'Another widget update.', created_at: '2026-09-18T03:00:00Z' }, fetchedAt: Date.now() + 1000 };
  resume('active');
  assert.equal(state[1], widget.reading, 'resume adopts widget synchronously even with a request pending');
  resolveNetwork(newer); await flush();
  assert.equal(state[1], widget.reading);
  assert.ok(displayed.every(value => value !== reading), 'the stale message was never rendered');
  cleanup();
});

test('snapshot ordering preserves newer messages and same-message score decay, including legacy caches', () => {
  const old = readingSnapshot(reading);
  assert.equal(old.fetchedAt, 0);
  const decayed = { reading: { ...reading, score: 2 }, fetchedAt: 20 };
  assert.equal(latestSnapshot(old, decayed), decayed);
  assert.equal(latestSnapshot(decayed, old), decayed);
  assert.equal(latestSnapshot(decayed, { reading: { ...reading, created_at: '2026-09-17T01:00:00Z' }, fetchedAt: 30 }), decayed);
  assert.equal(readingSnapshot({ reading, fetchedAt: Infinity }), null);
});
