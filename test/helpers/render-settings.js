// Execute the production settings screen with deterministic hook inputs, the
// way render-reading.js does for the reading screen: rendered props, not layout.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as preferences from '../../apps/client/lib/preferences.js';
import { themeForLevel } from '../../apps/client/lib/palette.js';

const require = createRequire(import.meta.url);
const react = require('react');
const source = readFileSync(new URL('../../apps/client/app/settings.tsx', import.meta.url), 'utf8');
const compile = text => ts.transpileModule(text, { compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;
const compiled = compile(source);

export function renderSettings({ platform, width = 390, height = 844, dark = false, stored = {}, pushSupported = platform !== 'web', push = {}, canGoBack = true, busy = false } = {}) {
  // Recorded as plain copies: values built inside the vm context carry that
  // context's prototypes, which strict deep equality would refuse.
  const calls = { setTheme: [], setNotifications: [], enablePush: [], disablePush: [], updatePushThreshold: [], replace: [], openSettings: 0, notices: [] };
  const plain = value => JSON.parse(JSON.stringify(value));
  const current = preferences.parsePreferences(stored);
  const mocks = {
    // `busy` is the one piece of state a test drives; the notice setter is
    // recorded so a refusal's message can be asserted without a re-render.
    react: { ...react, useEffect() {}, useRef: current => ({ current }),
      useState: value => value === false ? [busy, () => {}] : [value, next => { if (typeof next === 'string') calls.notices.push(next); }] },
    'react-native': { View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator',
      Linking: { openSettings: async () => { calls.openSettings += 1; } }, useWindowDimensions: () => ({ width, height, fontScale: 1 }) },
    '@/components/toggle': { Toggle: 'Toggle' },
    '@/components/check-icon': { CheckIcon: 'CheckIcon' },
    'expo-router/head': { __esModule: true, default: 'Head' },
    'expo-router': { Stack: { Screen: 'Screen' }, useRouter: () => ({ canGoBack: () => canGoBack, replace: href => calls.replace.push(href) }) },
    '@/components/back-icon': { BackIcon: 'BackIcon' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@/lib/theme': { useTheme: () => themeForLevel(3, dark) },
    '@/lib/preferences': preferences,
    '@/components/preferences-provider': { usePreferences: () => ({
      preferences: current, loaded: true,
      setTheme: theme => calls.setTheme.push(theme),
      setNotifications: update => calls.setNotifications.push(plain(update)),
    }) },
    '@/lib/push': {
      pushSupported,
      enablePush: async threshold => { calls.enablePush.push(threshold); return typeof push.enable === 'function' ? push.enable() : (push.enable ?? { ok: true, token: 'ExponentPushToken[test-test-test]' }); },
      disablePush: async token => { calls.disablePush.push(token); return typeof push.disable === 'function' ? push.disable() : (push.disable ?? true); },
      updatePushThreshold: async (token, threshold) => { calls.updatePushThreshold.push(plain([token, threshold])); return typeof push.update === 'function' ? push.update() : (push.update ?? true); },
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, process: { env: { EXPO_OS: platform } },
    require: name => {
      if (name === 'react/jsx-runtime') return require(name);
      if (!(name in mocks)) throw new Error(`Unreviewed renderer dependency: ${name}`);
      return mocks[name];
    },
  });
  return { tree: exports.default(), calls };
}

export { nodes } from './render-reading.js';

/** The iOS-style toggle on its own, with Animated stood in by plain values. */
export function renderToggle({ platform = 'web', value = false, disabled = false, dark = false } = {}) {
  const toggleSource = readFileSync(new URL('../../apps/client/components/toggle.tsx', import.meta.url), 'utf8');
  class Value { constructor(v) { this.v = v; } interpolate({ outputRange }) { return outputRange[this.v]; } }
  const mocks = {
    react: { ...react, useEffect() {}, useRef: current => ({ current }) },
    'react-native': { Pressable: 'Pressable', Animated: { Value, View: 'Animated.View', timing: () => ({ start() {} }) } },
    '@/lib/theme': { useTheme: () => themeForLevel(3, dark) },
  };
  const exports = {};
  vm.runInNewContext(compile(toggleSource), {
    exports, process: { env: { EXPO_OS: platform } },
    require: name => { if (name === 'react/jsx-runtime') return require(name); if (!(name in mocks)) throw new Error(`Unreviewed renderer dependency: ${name}`); return mocks[name]; },
  });
  return { tree: exports.Toggle({ value, disabled, accessibilityLabel: 'Notify me about high readings', onValueChange() {} }), accent: themeForLevel(3, dark).accent };
}
