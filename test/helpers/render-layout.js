// Render the actual navigator options; this does not simulate UIKit materials.
import { readFileSync } from 'node:fs';
import { designModules } from './design-modules.js';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { themeForLevel } from '../../apps/client/lib/palette.js';
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../../apps/client/app/_layout.tsx', import.meta.url), 'utf8');
export function renderLayout({ platform = 'ios', dark = false, score = 3 } = {}) {
  const theme = themeForLevel(score, dark);
  // Keep the defaults distinct from our palette: forgetting an override fails.
  const navigationTheme = dark => ({ dark, colors: { background: dark ? '#000' : '#fff' }, fonts: { regular: { fontFamily: 'System' } } });
  const mocks = { ...designModules,
    react: { ...require('react'), useEffect() {} },
    'react-native': { Appearance: {} },
    '@/components/preferences-provider': { PreferencesProvider: 'PreferencesProvider', usePreferences: () => ({ preferences: { theme: 'system' } }) },
    '@/components/reading-provider': { ReadingProvider: 'ReadingProvider', useCurrentReading: () => ({ reading: null }) },
    '../../../public/favicon': {},
    'expo-router': { useRouter: () => ({ replace() {} }), Stack: Object.assign(() => {}, { Screen: 'Screen' }), ThemeProvider: 'ThemeProvider', DefaultTheme: navigationTheme(false), DarkTheme: navigationTheme(true) },
    '@/lib/push': { onNotificationOpen: () => () => {} },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    '@/lib/theme': { useTheme: () => theme },
  };
  const exports = {};
  const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, { exports, process: { env: { EXPO_OS: platform } }, require: name => {
    if (name === 'react/jsx-runtime') return require(name);
    if (!(name in mocks)) throw new Error(`Unreviewed layout dependency: ${name}`);
    return mocks[name];
  } });
  return exports.default().props.children.props.children.type();
}

// The settings sheet's own stack, rendered the same way.
export function renderSettingsLayout({ platform = 'ios', dark = false } = {}) {
  const theme = themeForLevel(3, dark);
  const mocks = { ...designModules, 'expo-router': { Stack: Object.assign(() => {}, { Screen: 'Screen' }) }, '@/lib/theme': { useTheme: () => theme },
    'expo-router/react-navigation': { HeaderBackButton: 'HeaderBackButton' }, '@/components/glyph': { Glyph: 'Glyph' } };
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(new URL('../../apps/client/app/settings/_layout.tsx', import.meta.url), 'utf8'),
    { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, { exports, process: { env: { EXPO_OS: platform } }, require: name => {
    if (name === 'react/jsx-runtime') return require(name);
    if (!(name in mocks)) throw new Error(`Unreviewed layout dependency: ${name}`);
    return mocks[name];
  } });
  return exports.default();
}
