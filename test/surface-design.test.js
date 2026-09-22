import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkWidgetDesign, widgetSources, contract } from './helpers/widget-contract.js';
import { renderReading, renderShareIcon, nodes } from './helpers/render-reading.js';
import { themeForLevel } from '../apps/client/lib/palette.js';

test('reading refreshes never add loading, saved or retry text to an existing message', () => {
  for (const platform of ['web', 'ios', 'android']) for (const saved of [false, true]) {
    for (const loading of [false, true]) for (const failed of [false, true]) {
      const tree = nodes(renderReading({ platform, width: 390, height: 844, saved, loading, failed }));
      const text = JSON.stringify(tree.filter(n => n.type === 'Text').map(n => n.props.children));
      assert.doesNotMatch(text, /Checking|Loading|Sav(?:ed|ing)|Waiting|Refreshing|Syncing|Try again|unavailable/i);
      assert.match(text, /A quiet day for the world/);
      assert.match(text, /Updated/);
      assertApprovedReadingCopy(tree);
    }
    const empty = nodes(renderReading({ platform, width: 390, height: 844, score: null, loading: true, failed: true }));
    assert.equal(empty.find(n => n.props.testID === 'rating-explanation').props.children, '');
    const failed = nodes(renderReading({ platform, width: 390, height: 844, score: null, failed: true }));
    assert.equal(failed.find(n => n.props.testID === 'rating-explanation').props.children, 'The latest rating is unavailable.');
    assert.ok(failed.some(n => n.type === 'Text' && n.props.children === 'Try again'));
  }
});

function assertApprovedReadingCopy(tree) {
  const text = tree.filter(n => n.type === 'Text')
    .map(n => [n.props.children].flat(Infinity).filter(v => v != null && v !== false).join(''));
  assert.equal(text.length, 7, 'only approved reading, timestamp and footer text');
  assert.deepEqual(text.slice(0, 3), ['3', contract.denominatorText, 'A quiet day for the world.']);
  assert.match(text[3], /^Updated (?:just now|\d+ (?:min ago|hr ago|days ago))$/);
  assert.deepEqual(text.slice(4), ['Privacy', '·', 'Support']);
}

for (const status of ['Saved reading · ', 'Saving reading · ', 'Refreshing · ']) {
  test(`reading gate rejects unsolicited status: ${status}`, () => {
    const source = readFileSync(new URL('../apps/client/app/index.tsx', import.meta.url), 'utf8');
    const sourceOverride = source.replace('>Updated {relative}', `>${status}Updated {relative}`);
    assert.notEqual(sourceOverride, source, 'regression fixture must change the rendered timestamp');
    assert.throws(() => assertApprovedReadingCopy(nodes(renderReading({
      platform: 'ios', width: 390, height: 844, saved: true, loading: true, sourceOverride,
    }))));
  });
}

test('widgets keep cached timestamps and empty states free of status copy', () => {
  const { swift, java, compact, expanded, light } = widgetSources();
  assert.match(java, /setTextViewText\(R.id.widget_updated, "Updated " \+ date\)/);
  assert.match(swift, /Text\("\\\(date.formatted/);
  assert.match(swift, /accessibilityLabel\("Updated /);
  assert.match(swift, /Text\(entry.reading\?\.displayedExplanation\(at: entry.date\) \?\? ""\)/);
  for (const source of [swift, java, compact, expanded, light]) {
    assert.doesNotMatch(source, /"[^"\n]*(?:Saved ·|Saved reading|Saving reading|Waiting for a reading|Checking|Loading|latest rating will appear)[^"\n]*"/i);
    assert.doesNotMatch(source, /@string\/widget_waiting/);
  }
});

test('native widget implementations satisfy the same compact/expanded design contract', () => {
  checkWidgetDesign();
});

// Prove the checker rejects the actual categories of bugs, rather than merely
// accepting today's source. Each mutation is isolated and must fail specifically.
const regressions = [
  ['expanded body top aligned', s => { s.expanded = s.expanded.replace('android:gravity="center_vertical"', 'android:gravity="top"'); }, /expanded content centered vertically/],
  ['expanded text fills centered body', s => { s.expanded = s.expanded.replace('android:layout_weight="1" android:layout_height="wrap_content"', 'android:layout_weight="1" android:layout_height="match_parent"'); }, /expanded text fits centered row/],
  ['only iOS compact centered', s => { s.swift = s.swift.replace('let top = max(0, (bounds.height - contentHeight) / 2)', 'let top = compact ? max(0, (bounds.height - contentHeight) / 2) : 0'); }, /iOS both families centered vertically/],
  ['iOS sentence stays at top', s => { s.swift = s.swift.replace('y: bounds.minY + top + explanationCapHeight', 'y: bounds.minY + explanationCapHeight'); }, /iOS sentence shares centered offset/],
  ['expanded text moved below number', s => { s.expanded = s.expanded.replace('android:orientation="horizontal" android:baselineAligned="false"', 'android:orientation="vertical" android:baselineAligned="false"'); }, /expanded description direction/],
  ['iOS text moved below number', s => { s.swift = s.swift.replace('bounds.minX + score.width + WidgetTypography.columnGap', 'bounds.minX'); }, /iOS explanation beside numeral/],
  ['iOS lost optical top alignment', s => { s.swift = s.swift.replace('scoreCapHeight - score[.firstTextBaseline]', '0'); }, /iOS optical score top/],
  ['low-hanging Android slash', s => { s.light = s.light.replace('∕ 10', '/10'); }, /optically aligned division slash/],
  ['low-hanging iOS slash', s => { s.swift = s.swift.replaceAll('∕ 10', '/10'); }, /iOS adaptive denominator/],
  ['crowded Android slash', s => { s.light = s.light.replace('∕ 10', '∕10'); }, /optically aligned division slash/],
  ['crowded iOS slash', s => { s.swift = s.swift.replaceAll('∕ 10', '∕10'); }, /iOS adaptive denominator/],
  ['full-size /10', s => { s.compact = s.compact.replace('android:textSize="12sp"', 'android:textSize="52sp"'); }, /compact denominator size/],
  ['lost baseline', s => { s.expanded = s.expanded.replace('android:baselineAligned="true"', 'android:baselineAligned="false"'); }, /expanded denominator baseline/],
  ['different compact score', s => { s.compact = s.compact.replace('69sp', '40sp'); }, /compact score size/],
  ['different iOS score', s => { s.swift = s.swift.replace('static let scoreSize: CGFloat = 69', 'static let scoreSize: CGFloat = 40'); }, /Expected values to be strictly deep-equal/],
  ['theme color baked into RemoteViews', s => { s.java += '\nnew ForegroundColorSpan(resolvedColor);'; }, /XML theme\/size bindings/],
  ['denominator bound to fixed color', s => { s.compact = s.compact.replaceAll('@color/widget_muted', '#eeeeee'); }, /compact denominator theme binding/],
  ['wrong dark text role', s => { s.dark = s.dark.replace('@color/nw_gradient_muted', '@color/nw_surface'); }, /dark widget_muted uses adaptive palette/],
  ['minimum too large to reach 2x2', s => { s.provider = s.provider.replace('android:minResizeWidth="120dp"', 'android:minResizeWidth="180dp"'); }, /launcher minResizeWidth/],
  ['height-only compact choice', s => { s.java = s.java.replace('width < 250 || height < 150', 'height < 150'); }, /compact selection/],
  ['runtime score overrides layout', s => { s.java = s.java.replace('float scoreSize = 69', 'float scoreSize = 40'); }, /Expected values to be strictly deep-equal/],
  ['explanation crowds compact widget', s => { s.compact = s.compact.replace('android:visibility="gone"', 'android:visibility="visible"'); }, /compact keeps score/],
  ['compact title clips at large text', s => { s.compact = s.compact.replace('android:autoSizeTextType="uniform"', 'android:autoSizeTextType="none"'); }, /compact title fits large text/],
  ['compact timestamp loses its ending', s => { s.compact = s.compact.replaceAll('android:autoSizeTextType="uniform"', 'android:autoSizeTextType="none"').replace('android:autoSizeTextType="none"', 'android:autoSizeTextType="uniform"'); }, /compact timestamp fits large text/],
  ['compact autosize loses height constraint', s => { s.compact = s.compact.replace('android:layout_height="32dp"', 'android:layout_height="wrap_content"'); }, /compact timestamp has bounded height/],
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
  const denominator = tree.find(n => n.type === 'Text' && n.props.children === contract.denominatorText);
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
  assert.equal(denominator.props.numberOfLines, 1, 'denominator stays together');
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

function inspectHeader({ platform = 'ios', score = 3, sourceOverride } = {}) {
  const tree = nodes(renderReading({ platform, score, width: 390, height: 844, sourceOverride }));
  const options = tree.find(n => n.type === 'Screen').props.options;
  assert.equal(options.headerTransparent, true);
  const left = options.headerLeft();
  const right = options.headerRight();
  assert.equal(left.type, 'BrandMark');
  if (platform === 'ios') {
    const leftItems = options.unstable_headerLeftItems();
    const rightItems = options.unstable_headerRightItems();
    assert.equal(leftItems.length, 1);
    assert.equal(leftItems[0].hidesSharedBackground, true, 'brand must not acquire iOS glass');
    assert.equal(leftItems[0].element, left);
    assert.equal(rightItems.length, score == null ? 0 : 1);
    if (right) {
      assert.equal(rightItems[0].hidesSharedBackground, true, 'share must not acquire iOS glass');
      assert.equal(rightItems[0].element, right);
    }
  } else {
    assert.equal(options.unstable_headerLeftItems, undefined);
    assert.equal(options.unstable_headerRightItems, undefined);
  }
  if (right) {
    assert.equal(right.props.accessibilityLabel, 'Share this reading');
    assert.equal(right.props.accessibilityRole, 'button');
    assert.equal(typeof right.props.onPress, 'function');
    assert.ok(right.props.style.minWidth >= contract.header.minimumTouchTarget && right.props.style.minHeight >= contract.header.minimumTouchTarget);
    assert.equal(right.props.style.transform, undefined, 'optical correction must not move the touch target');
  } else assert.equal(score, null);
}

test('native header keeps plain brand/share controls and accessible touch targets', () => {
  for (const platform of ['ios', 'android', 'web']) {
    for (const score of [null, 3]) inspectHeader({ platform, score });
  }
});

function inspectShareIcon(platform, dark, sourceOverride) {
  const color = themeForLevel(3, dark).accent;
  const { props } = renderShareIcon({ platform, color, sourceOverride });
  assert.equal(props.style.width, contract.header.shareIconSize);
  assert.equal(props.style.height, contract.header.shareIconSize);
  assert.equal(props.style.transform?.[0]?.translateY, contract.header.shareOpticalOffsetY[platform], 'share artwork keeps its platform optical alignment');
  assert.equal(props.tintColor, color);
  if (platform === 'ios') assert.equal(props.source, 'sf:square.and.arrow.up');
}

test('share artwork aligns optically with the title without moving its touch target', () => {
  for (const platform of ['web', 'ios', 'android']) for (const dark of [false, true]) {
    inspectHeader({ platform });
    inspectShareIcon(platform, dark);
  }
});

test('header gate rejects missing optical correction and shifting the balanced Android glyph', () => {
  const source = readFileSync(new URL('../apps/client/components/app-icon.tsx', import.meta.url), 'utf8');
  for (const [platform, expression] of [['web', '0'], ['ios', '0'], ['android', '-2']]) {
    const sourceOverride = source.replace("process.env.EXPO_OS === 'android' ? 0 : -2", expression);
    assert.notEqual(sourceOverride, source);
    assert.throws(() => inspectShareIcon(platform, false, sourceOverride), /platform optical alignment/);
  }
});

test('header gate rejects iOS glass returning on either control', () => {
  const source = readFileSync(new URL('../apps/client/app/index.tsx', import.meta.url), 'utf8');
  for (const element of ['brand', 'shareButton']) {
    const sourceOverride = source.replace(`element: ${element}, hidesSharedBackground: true`,
      `element: ${element}, hidesSharedBackground: false`);
    assert.notEqual(sourceOverride, source);
    assert.throws(() => inspectHeader({ sourceOverride }), /must not acquire iOS glass/);
  }
});


test('reading gate rejects the low-hanging text slash returning', () => {
  const source = readFileSync(new URL('../apps/client/app/index.tsx', import.meta.url), 'utf8');
  const sourceOverride = source.replace('>∕ 10</Text>', '>/10</Text>');
  assert.notEqual(sourceOverride, source);
  assert.throws(() => inspectReading({ sourceOverride, platform: 'web', width: 390, height: 844, score: 3, dark: false }), /all reading design roles/);
});

test('reading gate rejects the slash touching the ten', () => {
  const source = readFileSync(new URL('../apps/client/app/index.tsx', import.meta.url), 'utf8');
  const sourceOverride = source.replace('>∕ 10</Text>', '>∕10</Text>');
  assert.notEqual(sourceOverride, source);
  assert.throws(() => inspectReading({ sourceOverride, platform: 'web', width: 390, height: 844, score: 10, dark: false }), /all reading design roles/);
});
