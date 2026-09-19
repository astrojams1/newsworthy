import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { DOMParser } from '@xmldom/xmldom';
import tokens from '../public/tokens.js';
import { contrast } from '../design/colors.js';
import { faviconSvg, levelPalette } from '../public/design.js';

test('reading identities only accept an integer level; invalid inputs cannot become SVG', () => {
  for (const score of [null, undefined, 0, 11, 1.5, '7', '<script>']) {
    assert.equal(levelPalette(score), tokens.brand);
    assert.ok(!faviconSvg(score).includes('<text'));
    assert.ok(!faviconSvg(score).includes('<script'));
  }
  assert.match(faviconSvg(10), />10<\/text>/);
  assert.notEqual(faviconSvg(7, true), faviconSvg(7, false));
});

test('all level and brand text meets AA on its intended surfaces in both appearances', () => {
  for (const palette of [tokens.brand, ...tokens.levels]) for (const mode of ['light', 'dark']) {
    const t = palette[mode];
    for (const surface of ['start', 'center', 'end', 'surface', 'tinted', 'elevated']) {
      for (const role of ['ink', 'gradientMuted', 'accent']) assert.ok(contrast(t[role], t[surface]) >= 4.5, `${palette.name} ${mode} ${role} on ${surface}`);
    }
    for (const surface of ['surface', 'tinted', 'elevated']) for (const role of ['muted', 'faint', 'danger']) {
      assert.ok(contrast(t[role], t[surface]) >= 4.5, `${palette.name} ${mode} ${role} on ${surface}`);
    }
  }
});

test('web, Android, and iOS palettes are generated from the current source', () => {
  execFileSync(process.execPath, ['scripts/generate-design.mjs', '--check'], { cwd: new URL('..', import.meta.url), stdio: 'pipe' });
});

// Link previews shrink this image to a thumbnail. Keep one readable wordmark
// instead of allowing taglines and feature lists to accumulate on the artwork.
test('share artwork is an evergreen dash and wordmark, with matching PNG exports', async () => {
  const svg = await readFile(new URL('../public/social-card.svg', import.meta.url), 'utf8');
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const texts = Array.from(doc.getElementsByTagName('text'));
  assert.deepEqual(texts.map(node => node.textContent), ['Newsworthy']);
  assert.equal(doc.getElementsByTagName('linearGradient').length, 0);
  assert.equal(doc.getElementsByTagName('image').length, 0);
  const rects = Array.from(doc.getElementsByTagName('rect'));
  assert.equal(rects.length, 2, 'one canvas and one dash');
  assert.equal(rects[0].getAttribute('fill'), tokens.brand.light.center);
  assert.equal(rects[1].getAttribute('width'), '64');
  assert.equal(rects[1].getAttribute('height'), '8');
  assert.ok(Number(texts[0].getAttribute('font-size')) >= 80, 'wordmark stays legible in a thumbnail');
  const card = await readFile(new URL('../public/social-card.png', import.meta.url));
  const brand = await readFile(new URL('../public/brand/share.png', import.meta.url));
  assert.deepEqual(card, brand);
  const { data, info } = await sharp(card).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 1200);
  assert.equal(info.height, 630);
  const bg = tokens.brand.light.center.slice(1).match(/../g).map(hex => parseInt(hex, 16));
  // Clear margins reject the old multi-line promotional layout even if SVG and
  // PNG were accidentally updated separately. Typography rasterization varies by OS.
  for (const [x, y] of [[80, 100], [80, 275], [80, 360], [80, 525], [1100, 525]]) {
    const offset = (y * info.width + x) * 4;
    assert.deepEqual([...data.subarray(offset, offset + 4)], [...bg, 255]);
  }
  const dash = (234 * info.width + 600) * 4;
  const ink = tokens.brand.light.ink.slice(1).match(/../g).map(hex => parseInt(hex, 16));
  assert.deepEqual([...data.subarray(dash, dash + 4)], [...ink, 255]);
});
