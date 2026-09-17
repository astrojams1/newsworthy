import test from 'node:test';
import assert from 'node:assert/strict';
import { alignmentMetrics } from '../design/prototypes/widget-alignment/metrics.js';

test('widget numeral aligns its ink to a whole number of description lines', () => {
  const metrics = alignmentMetrics({ lines: 3, lineHeight: 20, bodyInkHeight: 10, numberInkAt100: 72 });
  assert.equal(metrics.lineBoxHeight, 60);
  assert.equal(metrics.inkHeight, 50);
  assert.equal(metrics.fontSize * .72, metrics.inkHeight);
  assert.notEqual(metrics.fontSize % 20, 0, 'font size itself need not be a line-height multiple');
});
test('alignment follows enlarged text and two-to-four-line spans', () => {
  for (const scale of [1, 1.3, 2]) for (const lines of [2, 3, 4]) {
    const m = alignmentMetrics({ lines, lineHeight: 20 * scale, bodyInkHeight: 10 * scale, numberInkAt100: 72 });
    assert.equal(m.inkHeight, (10 + (lines - 1) * 20) * scale);
  }
});
test('fractional line spans and unusable font metrics cannot silently break alignment', () => {
  for (const bad of [{ lines: 2.5 }, { numberInkAt100: 0 }, { lineHeight: NaN }]) assert.throws(() => alignmentMetrics({ lines: 3, lineHeight: 20, bodyInkHeight: 10, numberInkAt100: 72, ...bad }), RangeError);
});

// Native reference is a 3× iPhone 16 Pro Max capture, not a responsive browser card.
import { readFileSync } from 'node:fs';
test('iOS study fixes both supported widget frames and never grows with its text', () => {
  const css = readFileSync(new URL('../design/prototypes/widget-alignment/style.css', import.meta.url), 'utf8');
  assert.match(css, /width:364px;height:170px/);
  assert.match(css, /\.compact\{width:170px\}/);
  assert.match(css, /grid-template-rows:14px minmax\(0,1fr\) 16px/);
  const nativeLayout = readFileSync(new URL('../store/source/layouts/iphone-6.9-02-widget-sizes-v2.svg', import.meta.url), 'utf8');
  assert.match(nativeLayout, /viewBox="114 282 1092 510"/);
  assert.match(nativeLayout, /viewBox="114 918 510 510"/);
});


test('small and medium previews share the same numeral renderer and reclaim title height', () => {
  const html = readFileSync(new URL('../design/prototypes/widget-alignment/index.html', import.meta.url), 'utf8');
  assert.equal((html.match(/<text class="numeral">/g) ?? []).length, 2);
  assert.match(html, /id="show-name" checked/);
  const css = readFileSync(new URL('../design/prototypes/widget-alignment/style.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /font-size:52px/);
  assert.match(css, /body\.hide-name \.widget\{grid-template-rows:minmax\(0,1fr\) 16px\}/);
});
