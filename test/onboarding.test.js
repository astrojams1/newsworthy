import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as onboarding from '../apps/client/lib/onboarding.js';
import { themeForLevel } from '../apps/client/lib/palette.js';
import { nodes } from './helpers/render-reading.js';

const { BODY_LENGTH, TITLE_LENGTH, onboardingSlides } = onboarding;
const require = createRequire(import.meta.url);

const platforms = ['ios', 'android'];

test('both apps show the same five slides, the widget named as each platform names it', () => {
  const keys = platform => onboardingSlides(platform).map(slide => slide.key);
  assert.deepEqual(keys('ios'), ['what', 'scale', 'fade', 'widget', 'alert']);
  assert.deepEqual(keys('android'), keys('ios'));
  const slide = (platform, key) => onboardingSlides(platform).find(s => s.key === key);
  assert.equal(slide('ios', 'widget').title, 'Also on your Home Screen', 'Apple writes Home Screen as a name');
  assert.equal(slide('android', 'widget').title, 'Also on your home screen');
  // The widget picker's own description (docs/product-messaging.md).
  assert.match(slide('ios', 'widget').body, /the current rating and when it was updated/);
  for (const platform of ['ios', 'android']) {
    assert.match(slide(platform, 'alert').body, /^Off by default\./, 'notifications are described as optional first');
    assert.match(slide(platform, 'alert').body, /one notification per development/);
  }
});

// Reported 2026-09-27: the copy read as emotional and spent its slides on how
// the phone works. It states what the app does; the reader knows their device.
test('the introduction states what the app does, without teaching the device or pointing at Settings', () => {
  for (const platform of platforms) for (const { key, title, body } of onboardingSlides(platform)) {
    const text = `${title} ${body}`;
    assert.doesNotMatch(text, /\bSettings\b|\btap\b|touch and hold|\bswipe\b|\bpermission\b|\basks?\b/i, `${platform} ${key}: "${text}"`);
    // Reported 2026-09-27: no mention of AI and no warnings that it can err.
    assert.doesNotMatch(text, /\bAI\b|artificial|\bmodel\b|mistake|\bwrong\b|\berrors?\b|accura/i, `${platform} ${key}: "${text}"`);
    assert.doesNotMatch(text, /\byou ask\b|\byours?\b.*\bown\b|!|\bjust\b|\bonly if\b|\bworry|\bcalm|\banxi|\bbreath/i, `${platform} ${key}: no emotional framing`);
  }
});

// Reported 2026-09-27: descriptions ran from 43 to 106 characters, so some
// slides read as a caption and others as a paragraph.
test('titles and descriptions are each about the same length on every slide', () => {
  for (const platform of platforms) for (const { key, title, body } of onboardingSlides(platform)) {
    assert.ok(title.length >= TITLE_LENGTH.min && title.length <= TITLE_LENGTH.max, `${platform} ${key}: "${title}" is ${title.length} characters`);
    assert.ok(!/[.!?]$/.test(title), `${platform} ${key}: titles share one form, with no end punctuation`);
    const plain = body.replace(/\*\*/g, '');
    assert.ok(plain.length >= BODY_LENGTH.min && plain.length <= BODY_LENGTH.max, `${platform} ${key}: "${plain}" is ${plain.length} characters`);
  }
});

// Reported 2026-09-27: "a bold New:" described the label instead of showing it.
test('New is shown in bold, without a colon, and never described as bold', () => {
  const fade = onboardingSlides('ios').find(slide => slide.key === 'fade').body;
  assert.match(fade, /\*\*New\*\* /);
  for (const platform of platforms) for (const { body } of onboardingSlides(platform)) {
    assert.doesNotMatch(body, /New:|\bbold\b/, body);
  }
});

// The screen itself, executed with stand-in hooks the way the settings tests
// run theirs: rendered props, not layout. The website cannot draw the
// introduction any more, so the fixed heights that keep every title at one
// height are checked here rather than in a browser.
function renderIntroduction(platform) {
  const source = readFileSync(new URL('../apps/client/app/onboarding.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const react = require('react');
  const mocks = {
    react: { ...react, useEffect() {}, useRef: current => ({ current }), useState: value => [value, () => {}] },
    'react-native': { Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View', useWindowDimensions: () => ({ width: 390, height: 844 }) },
    'expo-router': { Redirect: 'Redirect', useRouter: () => ({ canGoBack: () => true, back() {}, replace() {} }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '../../../public/tokens.js': { __esModule: true, default: require('../public/tokens.js').default ?? require('../public/tokens.js') },
    '@/lib/theme': { useTheme: () => themeForLevel(null, false) },
    '@/components/preferences-provider': { usePreferences: () => ({ setOnboarded() {} }) },
    '@/lib/onboarding': onboarding,
  };
  const exports = {};
  vm.runInNewContext(compiled, { exports, process: { env: { EXPO_OS: platform } }, require: name => {
    if (name === 'react/jsx-runtime') return require(name);
    if (!(name in mocks)) throw new Error(`Unreviewed dependency: ${name}`);
    return mocks[name];
  } });
  const expand = tree => {
    if (tree == null || typeof tree !== 'object') return tree;
    if (Array.isArray(tree)) return tree.map(expand);
    if (typeof tree.type === 'function') return expand(tree.type(tree.props));
    if (tree.props?.children === undefined) return tree;
    return { ...tree, props: { ...tree.props, children: expand(tree.props.children) } };
  };
  return expand(exports.default());
}

test('the website has no introduction; a link to it opens the reading', () => {
  const tree = renderIntroduction('web');
  assert.equal(tree.type, 'Redirect');
  assert.equal(tree.props.href, '/');
});

test('every slide reserves the same title and description heights, and New is drawn bold', () => {
  for (const platform of platforms) {
    const all = nodes(renderIntroduction(platform));
    const titles = all.filter(n => n.props?.testID === 'onboarding-title');
    const bodies = all.filter(n => n.props?.testID === 'onboarding-body');
    assert.equal(titles.length, 5, platform);
    assert.deepEqual(new Set(titles.map(n => `${n.props.style.minHeight}/${n.props.style.lineHeight}`)).size, 1, 'one title box for every slide');
    assert.deepEqual(new Set(bodies.map(n => `${n.props.style.minHeight}/${n.props.style.lineHeight}`)).size, 1, 'one description box for every slide');
    const bold = all.filter(n => n.type === 'Text' && n.props.children === 'New');
    assert.ok(bold.length >= 2 && bold.every(n => n.props.style.fontWeight === '700'), 'New is bold in the sentence and the illustration');
    assert.ok(!JSON.stringify(bodies.map(n => n.props.children)).includes('**'), 'no markup reaches the screen');
  }
});
