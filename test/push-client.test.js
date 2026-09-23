import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../apps/client/lib/push.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const flush = () => new Promise(resolve => setImmediate(resolve));
function load(notifications) {
  const exports = {};
  const mocks = { 'react-native': { Platform: { OS: 'ios' } }, 'expo-constants': {},
    'expo-notifications': { setNotificationHandler() {}, DEFAULT_ACTION_IDENTIFIER: 'default', ...notifications },
    './config': { apiOrigin: 'https://example.test' } };
  vm.runInNewContext(code, { exports, AbortSignal, require: name => { assert.ok(name in mocks); return mocks[name]; } });
  return exports;
}
const response = id => ({ actionIdentifier: 'default', notification: { request: { identifier: id } } });

test('notification taps open the reading once across cold launch and live responses, then unsubscribe', async () => {
  let listener, opens = 0, removed = 0, cleared = 0;
  const { onNotificationOpen } = load({
    addNotificationResponseReceivedListener: fn => { listener = fn; return { remove: () => removed++ }; },
    getLastNotificationResponseAsync: async () => response('cold'),
    clearLastNotificationResponseAsync: async () => { cleared++; },
  });
  const cleanup = onNotificationOpen(() => opens++);
  await flush();
  listener(response('cold'));
  assert.equal(opens, 1, 'same cold-start response delivered by both APIs opens once');
  listener({ ...response('dismissed'), actionIdentifier: 'dismiss' });
  assert.equal(opens, 1, 'dismissal does not navigate');
  listener(response('next'));
  assert.equal(opens, 2);
  assert.equal(cleared, 2, 'responses do not reopen on the next launch');
  cleanup();
  listener(response('unmounted'));
  assert.equal(opens, 2);
  assert.equal(removed, 1);
});

test('a late launch response cannot navigate after unmount', async () => {
  let resolveLast, opens = 0;
  const { onNotificationOpen } = load({
    addNotificationResponseReceivedListener: () => ({ remove() {} }),
    getLastNotificationResponseAsync: () => new Promise(resolve => { resolveLast = resolve; }),
    clearLastNotificationResponseAsync: async () => {},
  });
  onNotificationOpen(() => opens++)();
  resolveLast(response('late'));
  await flush();
  assert.equal(opens, 0);
});
