import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DOMParser } from '@xmldom/xmldom';

const root = new URL('../../', import.meta.url);
const android = 'apps/client/plugins/widget-android/';
const read = path => readFileSync(new URL(path, root), 'utf8');
export const contract = JSON.parse(read('design/surfaces.json'));
export const widgetSources = () => ({
  compact: read(android + 'res/layout/rating_widget_compact.xml'),
  expanded: read(android + 'res/layout/rating_widget.xml'),
  provider: read(android + 'res/xml/rating_widget_info.xml'),
  light: read(android + 'res/values/widget.xml'),
  dark: read(android + 'res/values-night/widget.xml'),
  java: read(android + 'RatingWidget.java'),
  swift: read('apps/client/targets/widget/NewsworthyWidget.swift'),
});
const xml = source => new DOMParser({ errorHandler: {
  warning: message => { throw new Error(message); },
  error: message => { throw new Error(message); },
  fatalError: message => { throw new Error(message); },
} }).parseFromString(source, 'text/xml');
const all = doc => Array.from(doc.getElementsByTagName('*'));
const attr = (node, name) => node?.getAttribute('android:' + name);
const one = (doc, predicate, label) => {
  const found = all(doc).filter(predicate);
  assert.equal(found.length, 1, `Expected one ${label}`);
  return found[0];
};
// These small source guards deliberately fail closed when native expressions
// change. XML is parsed structurally; Swift/Java guards do not claim to execute
// the native layout engine. Keep runtime screenshots as a separate release gate.
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const extract = (source, pattern, label) => {
  const match = source.match(pattern);
  assert.ok(match, `${label}: expression changed; review cross-surface contract`);
  return match.slice(1).map(Number);
};

export function checkWidgetDesign(sources = widgetSources()) {
  const c = contract.widget;
  for (const kind of ['compact', 'expanded']) {
    const doc = xml(sources[kind]);
    const score = one(doc, n => attr(n, 'id') === '@+id/widget_score', `${kind} score`);
    const denom = one(doc, n => attr(n, 'text') === '@string/widget_denominator', `${kind} denominator`);
    assert.equal(attr(score, 'textSize'), `${c[kind + 'Score']}sp`, `${kind} score size`);
    assert.equal(attr(denom, 'maxLines'), '1', `${kind} denominator stays together`);
    assert.equal(attr(denom, 'textSize'), `${c.denominatorSize}sp`, `${kind} denominator size`);
    assert.equal(score.parentNode, denom.parentNode, `${kind} score and denominator share a baseline container`);
    assert.equal(attr(score.parentNode, 'orientation'), 'horizontal', `${kind} score direction`);
    assert.equal(attr(score.parentNode, 'baselineAligned'), 'true', `${kind} denominator baseline`);
    assert.equal(attr(score, 'letterSpacing'), String(c.trackingEm), `${kind} score tracking`);
    assert.equal(attr(denom, 'layout_marginStart'), `${c.androidDenominatorGap}dp`, `${kind} denominator gap`);
    for (const node of [score, denom]) {
      assert.equal(attr(node, 'fontFamily'), contract.scoreFont.android, `${kind} monospace typography`);
      assert.equal(attr(node, 'includeFontPadding'), 'false', `${kind} font padding`);
    }
    assert.equal(attr(score, 'textColor'), '@color/widget_ink', `${kind} score theme binding`);
    assert.equal(attr(denom, 'textColor'), '@color/widget_muted', `${kind} denominator theme binding`);
    const centeredBody = kind === 'compact' ? score.parentNode.parentNode : score.parentNode.parentNode.parentNode;
    assert.equal(attr(centeredBody, 'gravity'), 'center_vertical', `${kind} content centered vertically`);
    assert.equal(attr(centeredBody, 'layout_weight'), '1', `${kind} body fills remaining height`);
    const explanation = one(doc, n => attr(n, 'id') === '@+id/widget_explanation', `${kind} explanation`);
    if (kind === 'compact') {
      assert.equal(attr(explanation, 'visibility'), 'gone', 'compact keeps score and update time');
      // Bounded fields must fit their entire content when system text grows.
      // Native screenshots separately verify Android's autosizing behavior.
      const title = one(doc, n => attr(n, 'text') === '@string/widget_name', 'compact title');
      const updated = one(doc, n => attr(n, 'id') === '@+id/widget_updated', 'compact timestamp');
      for (const [node, role, height] of [[title, 'title', '18dp'], [updated, 'timestamp', '32dp']]) {
        assert.equal(attr(node, 'autoSizeTextType'), 'uniform', `compact ${role} fits large text`);
        assert.equal(attr(node, 'layout_width'), 'match_parent', `compact ${role} has bounded width`);
        assert.equal(attr(node, 'layout_height'), height, `compact ${role} has bounded height`);
        assert.equal(attr(node, 'autoSizeMinTextSize'), '6sp', `compact ${role} fitting minimum`);
        assert.equal(attr(node, 'autoSizeMaxTextSize'), '10sp', `compact ${role} fitting maximum`);
      }
    }
    else {
      assert.equal(attr(explanation.parentNode, 'layout_height'), 'wrap_content', 'expanded centered row fits content');
      assert.equal(attr(explanation, 'layout_height'), 'wrap_content', 'expanded text fits centered row');
      assert.equal(attr(explanation, 'maxLines'), String(c.expandedExplanationLines), 'expanded context limit');
      assert.equal(attr(explanation, 'textSize'), `${c.explanationSize}sp`, 'expanded explanation size');
      assert.equal(attr(explanation, 'lineHeight'), `${c.explanationLineHeight}sp`, 'expanded line rhythm');
      assert.equal(explanation.parentNode, score.parentNode.parentNode, 'description beside numeral');
      assert.equal(attr(explanation.parentNode, 'orientation'), 'horizontal', 'expanded description direction');
      assert.equal(attr(explanation, 'layout_marginStart'), `${c.columnGap}dp`, 'expanded column gap');
      assert.equal(attr(explanation, 'ellipsize'), 'end', 'bounded explanation truncates');
    }
  }
  for (const mode of ['light', 'dark']) {
    const doc = xml(sources[mode]);
    if (mode === 'light') {
      const denominator = one(doc, n => n.tagName === 'string' && n.getAttribute('name') === 'widget_denominator', 'denominator text');
      assert.equal(denominator.textContent.trim(), `"${contract.denominatorText}"`, 'denominator uses optically aligned division slash');
    }
    for (const [name, role] of [['widget_ink', 'nw_ink'], ['widget_muted', 'nw_gradient_muted']]) {
      const color = one(doc, n => n.tagName === 'color' && n.getAttribute('name') === name, `${mode} ${name}`);
      assert.equal(color.textContent.trim(), '@color/' + role, `${mode} ${name} uses adaptive palette`);
    }
  }
  const provider = xml(sources.provider).documentElement;
  for (const name of ['minWidth', 'minHeight', 'minResizeWidth', 'minResizeHeight']) {
    assert.equal(attr(provider, name), `${c.minimumDp}dp`, `launcher ${name}`);
  }
  for (const name of ['targetCellWidth', 'targetCellHeight']) assert.equal(attr(provider, name), String(c.minimumCells), `launcher ${name}`);
  assert.equal(attr(provider, 'resizeMode'), 'horizontal|vertical', 'both resize directions');

  const java = code(sources.java);
  // Runtime paint overrides bypass theme-resource reapplication on host changes.
  assert.doesNotMatch(java, /\b(?:ForegroundColorSpan|RelativeSizeSpan|AbsoluteSizeSpan|SpannableString|setTextColor)\b|"setTextColor"/, 'widget text must retain XML theme/size bindings');
  assert.deepEqual(extract(java, /boolean compact\s*=\s*width\s*<\s*(\d+)\s*\|\|\s*height\s*<\s*(\d+)\s*;/, 'compact selection'), [c.expandedMinWidth, c.expandedMinHeight]);
  assert.deepEqual(extract(java, /float scoreSize\s*=\s*(\d+)\s*;/, 'Android runtime score'), [c.compactScore]);
  assert.equal(c.compactScore, c.expandedScore, 'shared numeral size');
  assert.match(java, /applyTypography\(context, views, width, height, compact, scoreSize\)/, 'runtime fits host constraints');
  assert.match(java, /setTextViewTextSize\(R\.id\.widget_score,\s*TypedValue\.COMPLEX_UNIT_PX,\s*number\.getTextSize\(\)\)/, 'runtime uses measured numeral');
  assert.match(java, /float targetCapHeight = -textInk.top \+ 2 \* lineHeight/, 'Android score spans three sentence baselines');
  assert.match(java, /number.setTextSize\(number.getTextSize\(\) \* targetCapHeight \/ -numberInk.top\)/, 'Android matches the sentence third baseline');
  assert.match(java, /number\.measureText\("10"\)/, 'fit is stable across score values');
  assert.match(java, /String number\s*=\s*Integer\.toString\(reading\.optInt\("score"\)\)\s*;/, 'score value excludes the denominator');
  assert.match(java, /views\.setTextViewText\(R\.id\.widget_score, number\)/, 'score value uses the separate denominator');

  assert.match(java, /Typeface.create\("monospace", Typeface.NORMAL\)/, 'Android measures the rendered monospace face');
  assert.match(java, /LevelPalette.background\(reading == null \? 0 : reading.optInt\("score"\)\)/, 'Android palette follows displayed score');
  assert.match(java, /static synchronized void renderAll/, 'all Android instances render one snapshot without interleaving');

  const swift = code(sources.swift);
  assert.deepEqual(extract(swift, /static let scoreSize: CGFloat = (\d+)/, 'iOS shared numeral'), [c.compactScore]);
  assert.deepEqual(extract(swift, /static let denominatorSize: CGFloat = (\d+)/, 'iOS denominator size'), [c.denominatorSize]);
  assert.deepEqual(extract(swift, /static let explanationSize: CGFloat = (\d+)/, 'iOS explanation size'), [c.explanationSize]);
  assert.deepEqual(extract(swift, /static let explanationLineHeight: CGFloat = (\d+)/, 'iOS line rhythm'), [c.explanationLineHeight]);
  assert.match(swift, /\+ Text\(" ∕10"\)[\s\S]*?foregroundColor\(Color\("NewsworthyGradientMuted"\)\)/, 'iOS adaptive denominator');
  assert.match(swift, /font\(\.system\(size: size, weight: \.light, design: \.monospaced\)\)/, 'iOS score uses a monospace face');
  assert.match(swift, /font\(\.system\(size: WidgetTypography.denominatorSize, weight: \.light, design: \.monospaced\)\)/, 'iOS denominator uses a monospace face');
  assert.doesNotMatch(swift, /monospacedDigitSystemFont/, 'measurement must use the full monospace face');
  assert.match(swift, /\.modifier\(WidgetSurface\(score: entry.reading\?\.score\)\)\s*\.id\(entry.reading\?\.score\)/, 'iOS score and extracted background change identity together');
  assert.match(swift, /score.map \{ String\(format: "Level%02d", \$0\) \}/, 'iOS palette follows displayed score');
  assert.match(swift, /tracking\(-size \* 0\.04\)/, 'iOS score tracking');
  assert.match(swift, /static let numeralLines: CGFloat = 3/, 'iOS numeral spans three sentence lines');
  assert.match(swift, /bodyFont.capHeight \+ \(WidgetTypography.numeralLines - 1\) \* explanationLineHeight/, 'iOS matches the sentence third baseline');
  assert.match(swift, /return idealSize \* scale/, 'iOS applies measured baseline size');
  assert.match(swift, /WidgetReadingLayout\(compact: family == \.systemSmall/, 'same score layout across families');
  assert.match(swift, /bounds\.minX \+ score\.width \+ WidgetTypography\.columnGap/, 'iOS explanation beside numeral');
  assert.equal(c.contentVerticalAlignment, 'center');
  assert.match(swift, /let contentHeight = max\(scoreCapHeight, textHeight\)/, 'iOS centers the whole reading');
  assert.match(swift, /let top = max\(0, \(bounds.height - contentHeight\) \/ 2\)/, 'iOS both families centered vertically');
  assert.match(swift, /y: bounds.minY \+ top \+ explanationCapHeight/, 'iOS sentence shares centered offset');
  assert.match(swift, /scoreCapHeight - score\[\.firstTextBaseline\]/, 'iOS optical score top');
  assert.match(swift, /explanationCapHeight - text\[\.firstTextBaseline\]/, 'iOS optical sentence top');
  assert.match(swift, /lineLimit\(max\(1, Int\(geometry\.size\.height \/ explanationLineHeight\)\)\)/, 'iOS bounded context limit');
  assert.match(swift, /if entry\.showAppName/, 'title setting retained');
  assert.doesNotMatch(swift, /systemSmall \? (?:52|72)/, 'no smaller compact numeral');
  assert.match(swift, /\.foregroundStyle\(Color\("NewsworthyInk"\)\)/, 'iOS primary text uses adaptive ink');
}
