import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { readingGradientSvg, gradientSvg } from '../apps/client/lib/reading-gradient.js';
import tokens from '../public/tokens.js';

// Reference pixels captured from Chromium rendering public/levels.css, not the
// SVG implementation, portrait and landscape. Each case carries its own
// colours, so a palette change needs no new capture; after a change to
// levels.css run scripts/capture-reading-gradient.mjs.
const references = JSON.parse(readFileSync(new URL('./fixtures/reading-gradient.json', import.meta.url)));
test('reading canvas matches the approved CSS preview across colours, appearances and aspect ratios', async () => {
  for (const { case: name, colors, width, height, points } of references) {
    const svg = gradientSvg(colors, width, height);
    const { data } = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const { x, y, rgb } of points) for (let channel = 0; channel < 3; channel++) {
      const actual = data[(y * width + x) * 3 + channel];
      // CSS/SVG rasterizers round composited alpha slightly differently.
      assert.ok(Math.abs(actual - rgb[channel]) <= 4,
        `${name}, ${width}x${height}, (${x},${y}) channel ${channel}: ${actual} vs ${rgb[channel]}`);
    }
  }
});
test('each level draws its own palette through the shared renderer', () => {
  for (const level of tokens.levels) for (const dark of [false, true]) {
    const t = level[dark ? 'dark' : 'light'];
    assert.equal(readingGradientSvg(level.score, dark, 390, 844),
      gradientSvg({ primary: level.primary, companion: level.companion, surface: t.surface, glow: t.glow, wash: t.wash, veil: t.veil }, 390, 844));
  }
});
test('missing readings and unmeasured canvases do not render a level gradient', () => {
  for (const score of [undefined, null, 0, 11, 1.5, '4']) assert.equal(readingGradientSvg(score, false, 390, 844), null);
  assert.equal(readingGradientSvg(4, false, 0, 844), null);
});
