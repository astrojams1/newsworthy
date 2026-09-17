// Execute the production component with deterministic hook inputs. This checks
// rendered props, not native glyph rasterization or Yoga's final layout.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { themeForLevel } from '../../apps/client/lib/palette.js';

const require = createRequire(import.meta.url);
const react = require('react');
const source = readFileSync(new URL('../../apps/client/app/index.tsx', import.meta.url), 'utf8');
const compile = text => ts.transpileModule(text, { compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;
const compiled = compile(source);

export function renderShareIcon({ platform, color, sourceOverride }) {
  const iconSource = sourceOverride ?? readFileSync(new URL('../../apps/client/components/app-icon.tsx', import.meta.url), 'utf8');
  const exports = {};
  vm.runInNewContext(compile(iconSource), {
    exports, process: { env: { EXPO_OS: platform } },
    require: name => name === 'expo-image' ? { Image: 'Image' } : require(name),
  });
  return exports.AppIcon({ color });
}

export function renderReading({ platform, width, height, fontScale = 1, score = 3, dark = false, saved = false, sourceOverride }) {
  const reading = score == null ? null : { score, explanation: 'A quiet day for the world.', created_at: '2026-09-16T09:00:00Z' };
  const mocks = {
    react: { ...react, useEffect() {}, useState: value => [value, () => {}] },
    'react-native': { View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable', Share: {}, useWindowDimensions: () => ({ width, height, fontScale }) },
    'expo-router': { Stack: { Screen: 'Screen' }, Link: 'Link' },
    'expo-router/head': { default: 'Head' },
    '@/components/app-icon': { AppIcon: 'AppIcon' },
    '@/components/brand-mark': { BrandMark: 'BrandMark' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@/lib/theme': { useTheme: () => themeForLevel(score, dark) },
    '@/components/reading-provider': { useCurrentReading: () => ({ reading, saved, failed: false, loading: false }) },
    '@/components/reading-gradient': { ReadingGradient: 'ReadingGradient' },
    'expo-router/react-navigation': { useHeaderHeight: () => 44 },
    '@/lib/config': { website: 'https://example.test', privacyUrl: '/privacy', supportUrl: '/support' },
  };
  const exports = {};
  vm.runInNewContext(sourceOverride ? compile(sourceOverride) : compiled, {
    exports, process: { env: { EXPO_OS: platform } },
    require: name => {
      if (name === 'react/jsx-runtime') return require(name);
      if (!(name in mocks)) throw new Error(`Unreviewed renderer dependency: ${name}`);
      return mocks[name];
    },
  });
  return exports.default();
}

export function nodes(tree, parent = null) {
  if (tree == null || typeof tree === 'boolean') return [];
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, parent));
  if (typeof tree !== 'object') return [];
  return [{ ...tree, parent }, ...nodes(tree.props?.children, tree)];
}
