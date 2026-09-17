import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validReading } from '../apps/client/lib/reading.js';

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
      useCallback: fn => fn, useState: initial => { const slot = state.length; state.push(initial); return [initial, value => state[slot] = value]; },
    },
    'react-native': { AppState: { currentState: 'active', addEventListener: (_, callback) => { resume = callback; return { remove() {} }; } } },
    '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async () => JSON.stringify(reading), setItem: async () => { throw Error('disk full'); } } },
    './config': { apiOrigin: 'https://example.test' },
    './reading': { validReading, fetchReading: async () => { if (fail) throw Error('offline'); return value; } },
    './widget-sync': { syncWidgets },
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
  assert.equal(state[1], false, 'storage failure does not mark the fresh reading saved');
  fail = true;
  resume('active'); await flush();
  assert.equal(calls.length, 3, 'failed fetch cannot overwrite the widget');
  assert.equal(state[1], true);
  cleanup();
});

test('widget handoff keeps public fields and timestamp; unavailable/failed native bridges are harmless', async () => {
  const received = [];
  for (const native of [null, { syncReading: async () => { throw Error('unavailable'); } }, {
    syncReading: async (origin, payload) => received.push({ origin, payload: JSON.parse(payload) }),
  }]) {
    const { syncWidgets } = load('apps/client/lib/widget-sync.ts', {
      expo: { requireOptionalNativeModule: () => native }, './reading': { validReading },
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
  assert.match(worker, /RatingWidget.completeRefresh\(getApplicationContext\(\), display, revision\)/);
  assert.match(module, /defaults.set\(data, forKey: key\)/);
  assert.match(module, /reloadTimelines\(ofKind: "NewsworthyRating"\)/);
  assert.match(swift, /app.fetchedAt > startedAt/);
  assert.match(swift, /startedAt - app.fetchedAt < 60_000/);
  assert.match(swift, /timeline\(reading: cached\(\), saved: true\)/);
  const appConfig = read('apps/client/app.config.js');
  const targetConfig = read('apps/client/targets/widget/expo-target.config.js');
  for (const config of [appConfig, targetConfig]) {
    assert.match(config, /'com.apple.security.application-groups': \[`group.\$\{release.appId\}.widgets`\]/);
  }
});
