import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { readingGradientSvg } from '../apps/client/lib/reading-gradient.js';

// Reference pixels captured from Chromium rendering public/levels.css, not the
// SVG implementation. Both appearances, all levels, portrait and landscape.
const references = JSON.parse(readFileSync(new URL('./fixtures/reading-gradient.json', import.meta.url)));
test('reading canvas matches the approved CSS preview across levels, appearances and aspect ratios', async () => {
  for (const { score, dark, width, height, points } of references) {
    const svg = readingGradientSvg(score, dark, width, height);
    const { data } = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const { x, y, rgb } of points) for (let channel = 0; channel < 3; channel++) {
      const actual = data[(y * width + x) * 3 + channel];
      // CSS/SVG rasterizers round composited alpha slightly differently.
      assert.ok(Math.abs(actual - rgb[channel]) <= 4,
        `level ${score}, dark=${dark}, ${width}x${height}, (${x},${y}) channel ${channel}: ${actual} vs ${rgb[channel]}`);
    }
  }
});
test('missing readings and unmeasured canvases do not render a level gradient', () => {
  for (const score of [undefined, null, 0, 11, 1.5, '4']) assert.equal(readingGradientSvg(score, false, 390, 844), null);
  assert.equal(readingGradientSvg(4, false, 0, 844), null);
});
