import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkWidgetDesign, widgetSources, contract } from './helpers/widget-contract.js';
import { renderReading, nodes } from './helpers/render-reading.js';
import { themeForLevel } from '../apps/client/lib/palette.js';

test('native widget implementations satisfy the same compact/expanded design contract', () => {
  checkWidgetDesign();
});

// Prove the checker rejects the actual categories of bugs, rather than merely
// accepting today's source. Each mutation is isolated and must fail specifically.
const regressions = [
  ['full-size /10', s => { s.compact = s.compact.replace('android:textSize="12sp"', 'android:textSize="52sp"'); }, /compact denominator size/],
  ['lost baseline', s => { s.expanded = s.expanded.replace('android:baselineAligned="true"', 'android:baselineAligned="false"'); }, /expanded denominator baseline/],
  ['different compact score', s => { s.compact = s.compact.replace('52sp', '40sp'); }, /compact score size/],
  ['different iOS score', s => { s.swift = s.swift.replace('.systemSmall ? 52 : 44', '.systemSmall ? 40 : 44'); }, /Expected values to be strictly deep-equal/],
  ['theme color baked into RemoteViews', s => { s.java += '\nnew ForegroundColorSpan(resolvedColor);'; }, /XML theme\/size bindings/],
  ['denominator bound to fixed color', s => { s.compact = s.compact.replaceAll('@color/widget_muted', '#eeeeee'); }, /compact denominator theme binding/],
  ['wrong dark text role', s => { s.dark = s.dark.replace('@color/nw_gradient_muted', '@color/nw_surface'); }, /dark widget_muted uses adaptive palette/],
  ['minimum too large to reach 2x2', s => { s.provider = s.provider.replace('android:minResizeWidth="120dp"', 'android:minResizeWidth="180dp"'); }, /launcher minResizeWidth/],
  ['height-only compact choice', s => { s.java = s.java.replace('width < 250 || height < 150', 'height < 150'); }, /compact selection/],
  ['runtime score overrides layout', s => { s.java = s.java.replace('compact ? 52 : 44', 'compact ? 40 : 40'); }, /Expected values to be strictly deep-equal/],
  ['explanation crowds compact widget', s => { s.compact = s.compact.replace('android:visibility="gone"', 'android:visibility="visible"'); }, /compact keeps score/],
];
for (const [name, mutate, error] of regressions) test(`design gate rejects regression: ${name}`, () => {
  const sources = widgetSources();
  mutate(sources);
  assert.throws(() => checkWidgetDesign(sources), error);
});

function inspectReading(options) {
  const tree = nodes(renderReading(options));
  const score = tree.find(n => n.props.testID === 'rating-score');
  const explanation = tree.find(n => n.props.testID === 'rating-explanation');
  const denominator = tree.find(n => n.type === 'Text' && n.props.children === '/10');
  const gradient = tree.find(n => n.type === 'ReadingGradient');
  assert.ok(score && explanation && denominator && gradient, 'all reading design roles are rendered');
  assert.equal(score.parent, denominator.parent, 'score and denominator share a container');
  const c = contract.reading;
  const landscape = options.height < 520;
  const theme = themeForLevel(options.score, options.dark);
  assert.equal(score.parent.props.style.alignItems, 'baseline');
  assert.equal(score.props.style.fontWeight, c.weight);
  assert.equal(denominator.props.style.fontWeight, c.weight);
  assert.equal(score.props.style.letterSpacing, score.props.style.fontSize * c.trackingEm);
  assert.equal(denominator.props.style.fontSize, landscape ? c.denominatorLandscape : c.denominatorPortrait);
  assert.equal(denominator.props.style.marginLeft, c.denominatorGap);
  assert.equal(score.props.style.color, theme.ink);
  assert.equal(explanation.props.style.color, theme.ink);
  assert.equal(denominator.props.style.color, theme.gradientMuted);
  assert.equal(gradient.props.dark, options.dark);
  assert.equal(gradient.props.score, options.score ?? undefined);
  assert.equal(score.props.children, options.score ?? '–');
  assert.equal(score.props.numberOfLines, 1);
  assert.equal(score.props.adjustsFontSizeToFit, true);
  assert.ok(score.props.style.fontSize <= c.maximumScore);
  if (!landscape) assert.ok(score.props.style.fontSize >= c.minimumPortraitScore);
  // Copy out data: vm object prototypes are intentionally from another realm.
  return JSON.parse(JSON.stringify({ score: score.props.style, denominator: denominator.props.style,
    explanation: explanation.props.style, alignment: score.parent.props.style,
    gradient: gradient.props, number: score.props.children }));
}

test('production reading component keeps typography, palette and gradient consistent on every platform', () => {
  // Include two-digit, empty, cached, enlarged text, tablet and landscape states.
  for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1024, 1366]]) {
    for (const score of [null, 1, 3, 10]) for (const dark of [false, true]) for (const fontScale of [1, 2]) {
      const options = { width, height, score, dark, fontScale, saved: score === 3 };
      const reference = inspectReading({ ...options, platform: 'web' });
      for (const platform of ['ios', 'android']) assert.deepEqual(inspectReading({ ...options, platform }), reference,
        `${platform}: ${width}x${height}, score=${score}, dark=${dark}, fontScale=${fontScale}`);
    }
  }
});

test('rendered-prop test catches a platform-specific denominator regression', () => {
  const source = readFileSync(new URL('../apps/client/app/index.tsx', import.meta.url), 'utf8');
  const sourceOverride = source.replace('fontSize: landscape ? 17 : 20', "fontSize: process.env.EXPO_OS === 'android' ? 40 : (landscape ? 17 : 20)");
  assert.notEqual(sourceOverride, source);
  assert.throws(() => inspectReading({ sourceOverride, platform: 'android', width: 390, height: 844, score: 3, dark: false }), /40 !== 20/);
});
