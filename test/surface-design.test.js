import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkWidgetDesign, widgetSources, contract } from './helpers/widget-contract.js';
import { renderReading, renderShareIcon, nodes } from './helpers/render-reading.js';
import { renderSettings } from './helpers/render-settings.js';
import { renderLayout, renderSettingsLayout } from './helpers/render-layout.js';
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
  // Privacy and Support are reached from Settings, so nothing sits below the timestamp.
  assert.equal(text.length, 4, 'only approved reading and timestamp text');
  assert.deepEqual(text.slice(0, 3), ['3', contract.denominatorText, 'A quiet day for the world.']);
  assert.match(text[3], /^Updated (?:just now|\d+ (?:min ago|hr ago|days ago))$/);
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
  assert.match(swift, /explanationText\(entry.reading, at: entry.date\)/);
  assert.match(swift, /Text\(verbatim: parts.label\).bold\(\) \+ Text\(verbatim: " " \+ parts.body\)/, 'the iOS label is bold and nothing else');
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
  ['iOS cap height ignores curved glyph overshoot', s => { s.swift = s.swift.replace('targetCapHeight / inkHeight', 'targetCapHeight / font.capHeight'); }, /visible ink height/],
  ['iOS slash extends below third baseline', s => { s.swift = s.swift.replace('baselineOffset(WidgetTypography.baselineLift("∕", font: denominatorFont, scale: displayScale))', 'baselineOffset(0)'); }, /visible glyph bottom/],
  ['iOS numeral extends below third baseline', s => { s.swift = s.swift.replace('baselineOffset(WidgetTypography.baselineLift(numeral, font: numberFont, scale: displayScale))', 'baselineOffset(0)'); }, /visible glyph bottom/],
  ['iOS content touches rounded corners', s => { s.swift = s.swift.replace('content.padding(16).containerBackground', 'content.containerBackground'); }, /inside rounded widget corners/],
  ['extra iOS gap before denominator', s => { s.swift = s.swift.replace('+ Text("∕")', '+ Text(" ∕")'); }, /iOS adaptive denominator/],
  ['extra Android gap before denominator', s => { s.compact = s.compact.replace('layout_marginStart="2dp"', 'layout_marginStart="6dp"'); }, /compact denominator gap/],
  ['iOS score above third baseline', s => { s.swift = s.swift.replace('return idealSize * scale', 'return WidgetTypography.scoreSize * scale'); }, /measured baseline size/],
  ['Android score above third baseline', s => { s.java = s.java.replace('targetCapHeight / -numberInk.top', '1'); }, /third baseline/],
  ['wide Android denominator space', s => { s.light = s.light.replace('∕10', '∕ 10'); }, /optically aligned division slash/],
  ['wide iOS denominator space', s => { s.swift = s.swift.replace('+ Text("∕")', '+ Text("∕ ")'); }, /iOS adaptive denominator/],
  ['proportional Android digits', s => { s.compact = s.compact.replaceAll('monospace', 'sans-serif-light'); }, /monospace typography/],
  ['proportional iOS digits', s => { s.swift = s.swift.replaceAll('UIFont.monospacedSystemFont', 'UIFont.systemFont'); }, /monospace face/],
  ['stale iOS background identity', s => { s.swift = s.swift.replace('.id(entry.reading?.score)', '.id(1)'); }, /background change identity/],
  ['wrong iOS level', s => { s.swift = s.swift.replace('WidgetSurface(score: entry.reading?.score)', 'WidgetSurface(score: 1)'); }, /background change identity/],
  ['wrong Android level', s => { s.java = s.java.replace('LevelPalette.background(reading == null ? 0 : reading.optInt("score"))', 'LevelPalette.background(1)'); }, /palette follows displayed score/],
  ['expanded body top aligned', s => { s.expanded = s.expanded.replace('android:gravity="center_vertical"', 'android:gravity="top"'); }, /expanded content centered vertically/],
  ['expanded text fills centered body', s => { s.expanded = s.expanded.replace('android:layout_weight="1" android:layout_height="wrap_content"', 'android:layout_weight="1" android:layout_height="match_parent"'); }, /expanded text fits centered row/],
  ['only iOS compact centered', s => { s.swift = s.swift.replace('let top = max(0, (bounds.height - contentHeight) / 2)', 'let top = compact ? max(0, (bounds.height - contentHeight) / 2) : 0'); }, /iOS both families centered vertically/],
  ['iOS sentence stays at top', s => { s.swift = s.swift.replace('y: bounds.minY + top + explanationCapHeight', 'y: bounds.minY + explanationCapHeight'); }, /iOS sentence shares centered offset/],
  ['expanded text moved below number', s => { s.expanded = s.expanded.replace('android:orientation="horizontal" android:baselineAligned="false"', 'android:orientation="vertical" android:baselineAligned="false"'); }, /expanded description direction/],
  ['iOS text moved below number', s => { s.swift = s.swift.replace('bounds.minX + score.width + WidgetTypography.columnGap', 'bounds.minX'); }, /iOS explanation beside numeral/],
  ['iOS lost optical top alignment', s => { s.swift = s.swift.replace('scoreInkHeight - score[.firstTextBaseline]', '0'); }, /iOS optical score top/],
  ['low-hanging Android slash', s => { s.light = s.light.replace('∕10', '/10'); }, /optically aligned division slash/],
  ['low-hanging iOS slash', s => { s.swift = s.swift.replace('+ Text("∕")', '+ Text("/")'); }, /iOS adaptive denominator/],
  ['extra Android slash space', s => { s.light = s.light.replace('∕10', '∕ 10'); }, /optically aligned division slash/],
  ['extra iOS slash space', s => { s.swift = s.swift.replace('+ Text("∕")', '+ Text("∕ ")'); }, /iOS adaptive denominator/],
  ['full-size /10', s => { s.compact = s.compact.replace('android:textSize="12sp"', 'android:textSize="52sp"'); }, /compact denominator size/],
  ['lost baseline', s => { s.expanded = s.expanded.replace('android:baselineAligned="true"', 'android:baselineAligned="false"'); }, /expanded denominator baseline/],
  ['different compact score', s => { s.compact = s.compact.replace('69sp', '40sp'); }, /compact score size/],
  ['different iOS score', s => { s.swift = s.swift.replace('static let scoreSize: CGFloat = 69', 'static let scoreSize: CGFloat = 40'); }, /Expected values to be strictly deep-equal/],
  ['theme color baked into RemoteViews', s => { s.java += '\nnew ForegroundColorSpan(resolvedColor);'; }, /XML theme\/size bindings/],
  ['Android New label styled beyond bold', s => { s.java = s.java.replace('new StyleSpan(Typeface.BOLD)', 'new StyleSpan(Typeface.BOLD_ITALIC)'); }, /XML theme\/size bindings/],
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
  assert.equal(score.props.style.fontFamily, contract.scoreFont[options.platform]);
  assert.equal(denominator.props.style.fontFamily, contract.scoreFont[options.platform]);
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
  return JSON.parse(JSON.stringify({ score: { ...score.props.style, fontFamily: 'monospace' }, denominator: { ...denominator.props.style, fontFamily: 'monospace' },
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

function inspectHeader({ platform = 'ios', score = 3, sourceOverride, timeline = [] } = {}) {
  const tree = nodes(renderReading({ platform, score, width: 390, height: 844, sourceOverride, timeline }));
  const options = tree.find(n => n.type === 'Screen').props.options;
  assert.equal(options.headerTransparent, true);
  const left = options.headerLeft();
  const rightGroup = options.headerRight();
  if (score != null && timeline.length) {
    // With a timeline below, the wordmark is the way back to the reading.
    assert.equal(left.type, 'Pressable');
    assert.equal(left.props.accessibilityRole, 'button');
    assert.equal(left.props.accessibilityLabel, 'Newsworthy, back to the reading');
    assert.equal(typeof left.props.onPress, 'function');
    assert.ok(left.props.style({ pressed: false }).minHeight >= contract.header.minimumTouchTarget);
    // It reaches across the header to Share and Settings, not just the word.
    assert.equal(left.props.style({ pressed: false }).width, 390 - 96 - (platform === 'web' ? 12 : 40));
    assert.equal(left.props.children.type, 'BrandMark');
  } else assert.equal(left.type, 'BrandMark', 'with nowhere to return from, the wordmark is not a button');
  // The right side is share (when there is a reading) then settings, always.
  assert.equal(rightGroup.props.style.flexDirection, 'row');
  const [share, settings] = rightGroup.props.children;
  assert.equal(settings.props.accessibilityLabel, 'Settings');
  assert.equal(nodes(settings).some(n => n.type === 'SettingsIcon'), true);
  if (platform === 'ios') {
    const leftItems = options.unstable_headerLeftItems();
    const rightItems = options.unstable_headerRightItems();
    assert.equal(leftItems.length, 1);
    assert.equal(leftItems[0].hidesSharedBackground, true, 'brand must not acquire iOS glass');
    assert.equal(leftItems[0].element, left);
    assert.equal(rightItems.length, score == null ? 1 : 2);
    for (const item of rightItems) assert.equal(item.hidesSharedBackground, false, 'share and settings sit in the iOS glass capsule');
    assert.equal(rightItems.at(-1).element, settings);
    if (share) assert.equal(rightItems[0].element, share);
  } else {
    assert.equal(options.unstable_headerLeftItems, undefined);
    assert.equal(options.unstable_headerRightItems, undefined);
  }
  for (const control of [share, settings]) {
    if (!control) { assert.equal(score, null); continue; }
    assert.equal(control.props.accessibilityRole, 'button');
    assert.equal(typeof control.props.onPress, 'function');
    assert.ok(control.props.style.minWidth >= contract.header.minimumTouchTarget && control.props.style.minHeight >= contract.header.minimumTouchTarget);
    assert.equal(control.props.style.transform, undefined, 'optical correction must not move the touch target');
  }
  if (share) assert.equal(share.props.accessibilityLabel, 'Share this reading');
}

test('native header keeps plain brand/share controls and accessible touch targets', () => {
  for (const platform of ['ios', 'android', 'web']) {
    for (const score of [null, 3]) inspectHeader({ platform, score });
    inspectHeader({ platform, timeline: [{ root: 1, story: 'fed-rates', since: '2026-09-16T08:00:00Z', score: 4, displayed: 3, leading: false, explanation: 'The Fed held.' }] });
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

test('header gate rejects missing optical correction on iOS and a lift on the balanced glyphs', () => {
  const source = readFileSync(new URL('../apps/client/components/app-icon.tsx', import.meta.url), 'utf8');
  for (const [platform, expression] of [['web', '-2'], ['ios', '0'], ['android', '-2']]) {
    const sourceOverride = source.replace("process.env.EXPO_OS === 'ios' ? -2 : 0", expression);
    assert.notEqual(sourceOverride, source);
    assert.throws(() => inspectShareIcon(platform, false, sourceOverride), /platform optical alignment/);
  }
});

test('header gate rejects iOS glass moving: onto the wordmark, or off the controls', () => {
  const source = readFileSync(new URL('../apps/client/app/index.tsx', import.meta.url), 'utf8');
  const brandGlass = source.replace('element: brand, hidesSharedBackground: true', 'element: brand, hidesSharedBackground: false');
  assert.notEqual(brandGlass, source);
  assert.throws(() => inspectHeader({ sourceOverride: brandGlass }), /must not acquire iOS glass/);
  for (const element of ['shareButton', 'settingsButton']) {
    const sourceOverride = source.replace(`element: ${element}, hidesSharedBackground: false`,
      `element: ${element}, hidesSharedBackground: true`);
    assert.notEqual(sourceOverride, source);
    assert.throws(() => inspectHeader({ sourceOverride }), /sit in the iOS glass capsule/);
  }
});


test('reading gate rejects the low-hanging text slash returning', () => {
  const source = readFileSync(new URL('../apps/client/app/index.tsx', import.meta.url), 'utf8');
  const sourceOverride = source.replace('>∕10</Text>', '>/10</Text>');
  assert.notEqual(sourceOverride, source);
  assert.throws(() => inspectReading({ sourceOverride, platform: 'web', width: 390, height: 844, score: 3, dark: false }), /all reading design roles/);
});

test('reading gate rejects the extra space after the slash', () => {
  const source = readFileSync(new URL('../apps/client/app/index.tsx', import.meta.url), 'utf8');
  const sourceOverride = source.replace('>∕10</Text>', '>∕ 10</Text>');
  assert.notEqual(sourceOverride, source);
  assert.throws(() => inspectReading({ sourceOverride, platform: 'web', width: 390, height: 844, score: 10, dark: false }), /all reading design roles/);
});

test('reading gate rejects a full-width space or proportional score face', () => {
  const source = readFileSync(new URL('../apps/client/app/index.tsx', import.meta.url), 'utf8');
  for (const sourceOverride of [source.replace('∕10', '∕ 10'), source.replaceAll('fontFamily: scoreFont', "fontFamily: 'sans-serif'")]) {
    assert.notEqual(sourceOverride, source);
    assert.throws(() => inspectReading({ sourceOverride, platform: 'ios', width: 390, height: 844, score: 3, dark: false }));
  }
});


test('navigation materials and transition canvas match the resolved app appearance', () => {
  for (const platform of ['ios', 'android', 'web']) for (const dark of [false, true]) for (const score of [null, 1, 8, 10]) {
    const tree = renderLayout({ platform, dark, score });
    const palette = themeForLevel(score, dark);
    assert.equal(tree.type, 'ThemeProvider');
    const navigation = tree.props.value;
    assert.equal(navigation.dark, dark, 'native header materials follow the resolved app theme');
    assert.equal(navigation.colors.background, palette.tinted, 'the transition canvas cannot flash a default background');
    assert.equal(navigation.colors.card, palette.tinted);
    assert.equal(navigation.colors.primary, palette.accent);
    assert.equal(navigation.colors.text, palette.ink);
    assert.ok(navigation.fonts.regular, 'retain router font defaults');
    const all = nodes(tree);
    const stack = all.find(n => n.props.screenOptions);
    assert.equal(stack.props.screenOptions.contentStyle.backgroundColor, navigation.colors.background);
    assert.equal(all.find(n => n.type === 'StatusBar').props.style, dark ? 'light' : 'dark');
  }
});

test('notification saving never adds a control or changes the row geometry', () => {
  for (const platform of ['ios', 'android']) for (const dark of [false, true]) for (const width of [320, 390, 440]) {
    for (const enabled of [false, true]) for (const threshold of [5, 8, 10]) {
      const stored = { notifications: { enabled, threshold, token: enabled ? 'ExponentPushToken[test]' : null } };
      for (const [screen, ids] of [['notifications', ['notifications-row', 'threshold-row']], ['threshold', ['threshold-5', 'threshold-10']]]) {
        const render = busy => nodes(renderSettings({ platform, screen, width, dark, stored, busy }).tree);
        const idle = render(false), saving = render(true);
        const byId = (all, id) => all.find(n => n.props.testID === id);
        for (const id of ids) {
          const before = byId(idle, id), during = byId(saving, id);
          assert.deepEqual(JSON.parse(JSON.stringify(during.props.style)), JSON.parse(JSON.stringify(before.props.style)));
          assert.deepEqual(nodes(during).map(n => n.type), nodes(before).map(n => n.type));
          assert.equal(during.props.style.height, undefined, 'large text remains free to grow');
        }
        assert.equal(saving.some(n => n.type === 'ActivityIndicator'), false);
        assert.equal(byId(saving, 'notifications-status').props.children, 'Saving…');
        assert.equal(byId(saving, 'notifications-status').props.accessibilityLiveRegion, 'polite');
        // Reported 2026-09-24: an idle line restating the switch ("Alerts at 8
        // or higher are off.") was removed; idle, the status says nothing.
        assert.equal(byId(idle, 'notifications-status').props.children, '');
      }
      const saving = nodes(renderSettings({ platform, screen: 'notifications', width, dark, stored, busy: true }).tree);
      assert.equal(saving.find(n => n.props.testID === 'notifications-row').props.disabled, true);
      const picker = nodes(renderSettings({ platform, screen: 'threshold', width, dark, stored, busy: true }).tree);
      assert.ok(picker.filter(n => /^threshold-\d+$/.test(n.props.testID ?? '')).every(n => n.props.disabled));
    }
  }
});

test('Settings rises as a sheet on the phone and stays a page on the web', () => {
  for (const platform of ['ios', 'android', 'web']) for (const dark of [false, true]) {
    const all = nodes(renderLayout({ platform, dark }));
    const settings = all.find(n => n.type === 'Screen' && n.props.name === 'settings').props.options;
    assert.equal(settings.presentation, platform === 'web' ? 'card' : 'modal');
    assert.equal(settings.headerShown, false, 'the sheet draws its own stack header');
    const stack = renderSettingsLayout({ platform, dark });
    const screens = Object.fromEntries(nodes(stack).filter(n => n.type === 'Screen').map(n => [n.props.name, n.props.options]));
    assert.deepEqual(Object.keys(screens), ['index', 'appearance', 'notifications', 'threshold']);
    assert.equal(screens.index.headerTitle, '', 'the overview shows no title');
    assert.equal(screens.index.headerBackVisible, false, 'the overview closes with its X, not a back arrow');
    assert.equal(screens.index.headerLeft(), null, 'the web header draws no back arrow either');
    assert.equal(screens.index.title, 'Settings', 'but is still named for assistive technology');
    assert.deepEqual([screens.appearance.title, screens.notifications.title, screens.threshold.title], ['Appearance', 'Notifications', 'Threshold']);
    const options = nodes(stack).find(n => n.props.screenOptions).props.screenOptions;
    assert.equal(options.headerBackButtonDisplayMode, 'minimal');
    assert.equal(options.contentStyle.backgroundColor, themeForLevel(3, dark).tinted);
    // Reported 2026-09-24: on the web the navigator's arrow kept its first
    // colour when Appearance changed the theme. The web draws the app's own
    // arrow in the current accent; native headers keep their own.
    if (platform === 'web') {
      const button = options.headerLeft({ canGoBack: true, tintColor: '#000' });
      assert.equal(button.type, 'HeaderBackButton');
      const arrow = button.props.backImage({ tintColor: '#000' });
      assert.equal(arrow.type, 'BackIcon');
      assert.equal(arrow.props.color, themeForLevel(3, dark).accent, 'the arrow is drawn in this theme\'s accent');
      assert.equal(options.headerLeft({ canGoBack: false }), null, 'nothing to go back to draws no arrow');
    } else {
      assert.equal(options.headerLeft, undefined, 'the native header draws its own back arrow');
    }
  }
});

test('story timeline prototype sits a full screen below the reading, in the sentence column, and snaps', () => {
  const development = { root: 1, story: 'fed-rates', since: '2026-09-16T08:00:00Z', score: 4, displayed: 3, leading: false, explanation: 'The Fed held.' };
  for (const platform of ['ios', 'android', 'web']) {
    const without = nodes(renderReading({ platform, width: 402, height: 874 }));
    const withTimeline = nodes(renderReading({ platform, width: 402, height: 874, timeline: [development] }));
    const block = list => list.find(n => n.type === 'AnimatedView' && n.props?.style?.maxWidth != null);
    // Nothing of the timeline is clipped into the first screen: the reading keeps all of it.
    assert.equal(block(withTimeline).props.style.minHeight, 874);
    // Without one, the reading fills the scroll view rather than a window-sized
    // block plus padding, which scrolled on the web.
    assert.equal(block(without).props.style.flex, 1);
    assert.equal(block(without).props.style.minHeight, undefined);
    assert.equal(block(withTimeline).props.style.alignItems, 'center');
    // The first screen is the scroll view's measured height, not the window's:
    // the web export's window height can stay at its static fallback, which put
    // the cue below the fold.
    assert.equal(typeof withTimeline.find(n => n.type === 'ScrollView').props.onLayout, 'function');
    // A quiet cue announces the timeline instead.
    assert.ok(withTimeline.some(n => n.type === 'Pressable' && n.props.accessibilityLabel === 'Earlier developments'));
    assert.ok(!without.some(n => n.type === 'Pressable' && n.props.accessibilityLabel === 'Earlier developments'));
    // The timeline shares the sentence's column rather than keeping a margin of its own.
    const sentence = withTimeline.find(n => n.props?.testID === 'rating-explanation');
    const timeline = withTimeline.find(n => n.type === 'Timeline');
    assert.equal(timeline.parent.props.style.maxWidth, sentence.props.style.maxWidth);
    // However short, the timeline is a screen tall below the header, so its top can reach the snap offset.
    assert.equal(timeline.parent.props.style.minHeight, 874 - 44 - 32);
    assert.deepEqual(timeline.props.developments, [development]);
    // Scrolled, entries fade as they near the header instead of running under a
    // bar: nothing is drawn behind the header, least of all a hard rule.
    assert.equal(timeline.props.fadeAt, 44);
    assert.ok(timeline.props.scrollY, 'the timeline fades with the scroll position');
    assert.ok(!withTimeline.some(n => n.props?.style?.position === 'absolute' && n.props.style.top === 0 && n.props.style.left === 0),
      'no panel covers the header');
    assert.ok(!withTimeline.some(n => n.props?.style?.borderBottomWidth && n.props.style.left === 0), 'no rule under the header');
  }
});

test('story timeline is off by default: with the setting off the screen is the reading alone', () => {
  const development = { root: 1, story: 'fed-rates', since: '2026-09-16T08:00:00Z', score: 4, displayed: 3, leading: false, explanation: 'The Fed held.' };
  for (const platform of ['ios', 'android', 'web']) {
    const off = nodes(renderReading({ platform, width: 402, height: 874, timeline: [development], timelineOn: false }));
    // Developments exist on the server, but none are asked for or shown.
    assert.equal(off.find(n => n.type === 'Timeline').props.developments.length, 0);
    assert.ok(!off.some(n => n.props?.accessibilityLabel === 'Earlier developments'), 'no cue');
    const screen = off.find(n => n.type === 'Screen').props.options;
    assert.equal(screen.headerLeft().type, 'BrandMark', 'the wordmark is not a button');
    const block = off.find(n => n.type === 'AnimatedView' && n.props?.style?.maxWidth != null);
    assert.equal(block.props.style.flex, 1, 'the reading fills the scroll view, so nothing scrolls');
    assert.equal(block.props.style.minHeight, undefined, 'not a window-sized block that overflows it');
    assert.equal(block.props.style.opacity, 1, 'the reading never fades');
  }
});

test('story timeline snaps on the web with CSS scroll snap, not a script that scrolls after the fact', () => {
  const source = readFileSync(new URL('../apps/client/app/index.tsx', import.meta.url), 'utf8');
  // A timer that waited for the scroll to go quiet and then scrolled fought iOS
  // momentum scrolling: the page drifted, turned round and jumped.
  assert.doesNotMatch(source, /setTimeout/, 'no deferred scroll on the home screen');
  assert.doesNotMatch(source, /listener:/, 'the scroll handler only tracks position');
  assert.match(source, /scrollSnapType: 'y mandatory'/);
  // Two snap areas: the reading, and the timeline below the header's clearance.
  assert.equal(source.match(/scrollSnapAlign: 'start'/g)?.length, 2);
  assert.match(source, /scrollMarginTop: headerHeight \+ 32/);
  assert.match(source, /snap = hasTimeline && timelineTop \? Math\.max\(1, timelineTop - headerHeight - 32\)/, 'the web snap point matches the native one');
});
