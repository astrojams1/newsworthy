// Execute the production settings screens with deterministic hook inputs, the
// way render-reading.js does for the reading screen: rendered props, not layout.
// The shared list components are executed too, so a row's text and styles are
// the ones the screens actually produce.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as preferences from '../../apps/client/lib/preferences.js';
import { themeForLevel } from '../../apps/client/lib/palette.js';

const require = createRequire(import.meta.url);
const react = require('react');
const read = path => readFileSync(new URL(`../../apps/client/${path}`, import.meta.url), 'utf8');
export const SETTINGS_SCREENS = { index: 'app/settings/index.tsx', appearance: 'app/settings/appearance.tsx', notifications: 'app/settings/notifications.tsx' };
const compile = text => ts.transpileModule(text, { compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;

function load(source, mocks, platform) {
  const exports = {};
  vm.runInNewContext(compile(source), {
    exports, process: { env: { EXPO_OS: platform } },
    require: name => {
      if (name === 'react/jsx-runtime') return require(name);
      if (!(name in mocks)) throw new Error(`Unreviewed renderer dependency: ${name}`);
      return mocks[name];
    },
  });
  return exports;
}

// Call this app's own function components in place, so their output is in the
// tree; host components and mocked ones stay as named elements.
function expand(tree) {
  if (tree == null || typeof tree !== 'object') return tree;
  if (Array.isArray(tree)) return tree.map(expand);
  if (typeof tree.type === 'function') return expand(tree.type(tree.props));
  if (tree.props?.children === undefined) return tree;
  return { ...tree, props: { ...tree.props, children: expand(tree.props.children) } };
}

export function renderSettings({ platform, screen = 'index', width = 390, height = 844, dark = false, stored = {}, pushSupported = platform !== 'web', push = {}, canGoBack = true, busy = false, sourceOverride, listOverride } = {}) {
  // Recorded as plain copies: values built inside the vm context carry that
  // context's prototypes, which strict deep equality would refuse.
  const calls = { setTheme: [], enable: 0, disable: 0, choose: [], replace: [], back: 0, openSettings: 0, notices: [] };
  const current = preferences.parsePreferences(stored);
  const theme = themeForLevel(3, dark);
  const mocks = {
    // The provider owns pending requests; local state only holds a notice.
    react: { ...react, useEffect() {}, useRef: current => ({ current }),
      useState: value => value === false ? [busy, () => {}] : [value, next => { if (typeof next === 'string') calls.notices.push(next); }] },
    'react-native': { View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator',
      Linking: { openSettings: async () => { calls.openSettings += 1; } }, useWindowDimensions: () => ({ width, height, fontScale: 1 }) },
    '@/components/toggle': { Toggle: 'Toggle' },
    '@/components/check-icon': { CheckIcon: 'CheckIcon' },
    '@/components/glyph': { Glyph: 'Glyph' },
    'expo-router/head': { __esModule: true, default: 'Head' },
    'expo-router': { Stack: { Screen: 'Screen' }, Link: 'Link', useRouter: () => ({ canGoBack: () => canGoBack, back: () => { calls.back += 1; }, replace: href => calls.replace.push(href) }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@/lib/theme': { useTheme: () => theme },
    '@/lib/preferences': preferences,
    // `push.enable` / `push.disable` / `push.choose` are the outcomes the
    // provider's controller would return; the controller itself is tested on
    // its own in preferences.test.js.
    '@/components/preferences-provider': { usePreferences: () => ({
      preferences: current, loaded: true, savingNotifications: busy,
      setTheme: theme => calls.setTheme.push(theme),
      subscription: {
        enable: async () => { calls.enable += 1; return push.enable ?? { ok: true }; },
        disable: async () => { calls.disable += 1; return push.disable ?? { ok: true }; },
        choose: async next => { calls.choose.push(next); return push.choose ?? { ok: true }; },
      },
    }) },
    '@/lib/push': { pushSupported },
    '@/lib/config': { privacyUrl: '/privacy', supportUrl: '/support' },
  };
  mocks['@/components/settings-list'] = load(listOverride ?? read('components/settings-list.tsx'), mocks, platform);
  const exports = load(sourceOverride ?? read(SETTINGS_SCREENS[screen]), mocks, platform);
  return { tree: expand(exports.default()), calls, theme };
}

export { nodes } from './render-reading.js';

/** The iOS-style toggle on its own, with Animated stood in by plain values. */
export function renderToggle({ platform = 'web', value = false, disabled = false, dark = false } = {}) {
  const toggleSource = read('components/toggle.tsx');
  class Value { constructor(v) { this.v = v; } interpolate({ outputRange }) { return outputRange[this.v]; } }
  const mocks = {
    react: { ...react, useEffect() {}, useRef: current => ({ current }) },
    'react-native': { Pressable: 'Pressable', Animated: { Value, View: 'Animated.View', timing: () => ({ start() {} }) } },
    '@/lib/theme': { useTheme: () => themeForLevel(3, dark) },
  };
  const exports = load(toggleSource, mocks, platform);
  return { tree: exports.Toggle({ value, disabled, accessibilityLabel: 'Notify me about high readings', onValueChange() {} }), accent: themeForLevel(3, dark).accent };
}
