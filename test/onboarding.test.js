import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as onboarding from '../apps/client/lib/onboarding.js';
import { themeForLevel } from '../apps/client/lib/palette.js';
import * as storyAge from '../apps/client/lib/story-age.js';
import * as readingGradient from '../apps/client/lib/reading-gradient.js';
import { nodes } from './helpers/render-reading.js';

const { BODY_LENGTH, TITLE_LENGTH, onboardingSlides } = onboarding;
const require = createRequire(import.meta.url);

const platforms = ['ios', 'android'];

test('both apps show the same three slides, the widget named as each platform names it', () => {
  const keys = platform => onboardingSlides(platform).map(slide => slide.key);
  assert.deepEqual(keys('ios'), ['what', 'widget', 'alert']);
  assert.deepEqual(keys('android'), keys('ios'));
  const slide = (platform, key) => onboardingSlides(platform).find(s => s.key === key);
  assert.equal(slide('ios', 'widget').title, 'Also on your Home Screen', 'Apple writes Home Screen as a name');
  assert.equal(slide('android', 'widget').title, 'Also on your home screen');
  // The widget picker's own description (docs/product-messaging.md).
  assert.match(slide('ios', 'widget').body, /the current rating and when it was updated/);
  for (const platform of ['ios', 'android']) {
    assert.match(slide(platform, 'alert').body, /^Off by default\./, 'notifications are described as optional first');
    assert.match(slide(platform, 'alert').body, /one per development/);
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
    const plain = body;
    assert.ok(plain.length >= BODY_LENGTH.min && plain.length <= BODY_LENGTH.max, `${platform} ${key}: "${plain}" is ${plain.length} characters`);
  }
});


// The screen itself, executed with stand-in hooks the way the settings tests
// run theirs: rendered props, not layout. The website cannot draw the
// introduction any more, so the fixed heights that keep every title at one
// height are checked here rather than in a browser.
function renderIntroduction(platform, { score = 3, dark = false } = {}) {
  const source = readFileSync(new URL('../apps/client/app/onboarding.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const react = require('react');
  const mocks = {
    // A laid-out size, so the gradients are drawn.
    react: { ...react, useEffect() {}, useRef: current => ({ current }), useState: value => [value && typeof value === 'object' && 'width' in value ? { width: 100, height: 100 } : value, () => {}] },
    'react-native': { Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View', useWindowDimensions: () => ({ width: 390, height: 844 }) },
    'expo-router': { Redirect: 'Redirect', useRouter: () => ({ canGoBack: () => true, back() {}, replace() {} }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '../../../public/tokens.js': { __esModule: true, default: require('../public/tokens.js').default ?? require('../public/tokens.js') },
    '@/lib/theme': { useTheme: () => themeForLevel(score, dark) },
    '@/components/reading-provider': { useCurrentReading: () => ({ reading: score ? { score, created_at: new Date().toISOString(), explanation: 'A sample sentence.' } : null }) },
    '@/components/reading-gradient': { ReadingGradient: 'ReadingGradient' },
    'expo-image': { Image: 'Image' },
    'base64-js': { fromByteArray: bytes => Buffer.from(bytes).toString('base64') },
    '@/components/preferences-provider': { usePreferences: () => ({ setOnboarded() {} }) },
    '@/lib/onboarding': onboarding,
    '@/lib/story-age': storyAge,
    '@/lib/reading-gradient': readingGradient,
    '@/lib/palette': { themeForLevel },
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

test('every slide reserves the same title and description heights', () => {
  for (const platform of platforms) {
    const all = nodes(renderIntroduction(platform));
    const titles = all.filter(n => n.props?.testID === 'onboarding-title');
    const bodies = all.filter(n => n.props?.testID === 'onboarding-body');
    assert.equal(titles.length, 3, platform);
    assert.deepEqual(new Set(titles.map(n => `${n.props.style.minHeight}/${n.props.style.lineHeight}`)).size, 1, 'one title box for every slide');
    assert.deepEqual(new Set(bodies.map(n => `${n.props.style.minHeight}/${n.props.style.lineHeight}`)).size, 1, 'one description box for every slide');
  }
});

// Reported 2026-09-27: the illustrations' colors and the widget did not match
// what the app and the widgets actually show. Each level is drawn with its own
// three stops, the widget with the current reading's, and the screen sits on
// the reading's canvas.
const svgOf = (node, platform) => {
  const uri = nodes(node).find(n => n.type === 'Image').props.source.uri;
  return platform === 'android' ? Buffer.from(uri.split(',')[1], 'base64').toString() : decodeURIComponent(uri.split(',')[1]);
};

test('the widget uses the real level colors, and the first slide shows the current score alone', async () => {
  const tokens = (await import('../public/tokens.js')).default;
  for (const platform of platforms) for (const dark of [false, true]) for (const score of [3, 8, null]) {
    const mode = dark ? 'dark' : 'light';
    const all = nodes(renderIntroduction(platform, { score, dark }));
    const canvas = all.find(n => n.type === 'ReadingGradient');
    assert.deepEqual([canvas.props.score, canvas.props.dark], [score ?? undefined, dark], 'the reading screen\'s canvas behind the slides');
    const widget = all.find(n => n.props?.testID === 'onboarding-widget');
    const colors = (score ? tokens.levels[score - 1] : tokens.brand)[mode];
    const svg = svgOf(widget, platform);
    for (const stop of [colors.start, colors.center, colors.end]) assert.ok(svg.includes(stop), `${platform} ${mode} ${score}: widget stop ${stop}`);
    assert.match(svg, /x1="0" y1="0" x2="1" y2="1"/, 'top-left to bottom-right, as both widgets draw it');
    const text = nodes(widget).filter(n => n.type === 'Text').map(n => [n.props.children].flat().join(''));
    assert.deepEqual(text.slice(0, 3), ['NEWSWORTHY', String(score ?? '–'), '∕10']);
    assert.match(text[3], platform === 'android' ? /^Updated / : /^\d/, 'the platform\'s own timestamp');
    // Reported 2026-09-27: the first slide's graphic was too busy. It is the
    // current score and its denominator, as the reading screen sets them.
    // Reported 2026-09-27: the description spoke of a sentence the graphic did
    // not show. It shows the current sentence under the score, as the app does.
    const scoreArt = all.find(n => n.props?.testID === 'onboarding-score');
    const texts = nodes(scoreArt).filter(n => n.type === 'Text');
    assert.deepEqual(texts.slice(0, 2).map(n => [n.props.children].flat().join('')), [String(score ?? '–'), '∕10']);
    const sentence = all.find(n => n.props?.testID === 'onboarding-sentence');
    if (score) assert.equal([sentence.props.children].flat(Infinity).filter(v => typeof v === 'string').join(''), 'A sample sentence.');
    else assert.equal(sentence, undefined, 'no sentence before any reading; placeholder lines instead');
    assert.ok(!all.some(n => /^onboarding-level-/.test(n.props?.testID ?? '') || n.props?.testID === 'onboarding-reading'), 'no tiles or card');
  }
});

test('the notification carries the title the server sends', () => {
  for (const platform of platforms) {
    const all = nodes(renderIntroduction(platform));
    assert.ok(all.some(n => n.type === 'Text' && n.props.children === 'Newsworthy · 8/10'), platform);
  }
});
