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
      assert.equal(attr(node, 'fontFamily'), 'sans-serif-light', `${kind} light typography`);
      assert.equal(attr(node, 'includeFontPadding'), 'false', `${kind} font padding`);
    }
    assert.equal(attr(score, 'textColor'), '@color/widget_ink', `${kind} score theme binding`);
    assert.equal(attr(denom, 'textColor'), '@color/widget_muted', `${kind} denominator theme binding`);
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
    else assert.equal(attr(explanation, 'maxLines'), String(c.expandedExplanationLines), 'expanded context limit');
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
  assert.deepEqual(extract(java, /float scoreSize\s*=\s*compact\s*\?\s*(\d+)\s*:\s*(\d+)\s*;/, 'Android runtime score'), [c.compactScore, c.expandedScore]);
  assert.match(java, /setTextViewTextSize\(R\.id\.widget_score,\s*TypedValue\.COMPLEX_UNIT_SP,\s*scoreSize\)/, 'runtime score uses scale-aware shared sizes');
  assert.match(java, /String number\s*=\s*Integer\.toString\(reading\.optInt\("score"\)\)\s*;/, 'score value excludes the denominator');
  assert.match(java, /views\.setTextViewText\(R\.id\.widget_score, number\)/, 'score value uses the separate denominator');

  const swift = code(sources.swift).split('struct ReadingView: View {')[1]?.split('struct WidgetSurface:')[0];
  assert.ok(swift, 'Swift reading view is present');
  assert.deepEqual(extract(swift, /baseScoreSize:\s*CGFloat\s*\{\s*family == \.systemSmall \? (\d+) : (\d+)\s*\}/, 'iOS family score'), [c.compactScore, c.expandedScore]);
  assert.deepEqual(extract(swift, /Text\(" ∕ 10"\)\s*\.font\(\.system\(size: ([\d.]+) \* scoreSize \/ baseScoreSize, weight: \.light\)\)\.monospacedDigit\(\)\s*\.tracking\(0\)\s*\.foregroundColor\(Color\("NewsworthyGradientMuted"\)\)/, 'iOS adaptive denominator'), [c.denominatorSize]);
  assert.deepEqual(extract(swift, /\.font\(\.system\(size: scoreSize, weight: \.light\)\)\.monospacedDigit\(\)\s*\.tracking\(-scoreSize \* ([\d.]+)\)\s*\+ Text\(" ∕ 10"\)/, 'iOS baseline text run'), [-c.trackingEm]);
  assert.match(swift, /if family == \.systemMedium\s*\{\s*Text\(entry\.reading\?\.explanation[\s\S]*?\.lineLimit\(2\)/, 'iOS expanded explanation matches Android');
  assert.match(swift, /\.foregroundStyle\(Color\("NewsworthyInk"\)\)/, 'iOS primary text uses adaptive ink');
}
