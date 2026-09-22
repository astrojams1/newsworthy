import assert from 'node:assert/strict';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

// Measure the 50% contrast contour in untouched native screenshots. Estimate
// the smooth background from each row's clear left/right margins, and normalize
// against the glyph's full ink color. This handles muted text and both themes
// without choosing different brightness thresholds to make an image pass.
export async function measureWidgetPixels(file, regions, mode) {
  const { data, info } = await sharp(file instanceof URL ? fileURLToPath(file) : file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 3);
  const pixel = (x, y) => Array.from(data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3));
  const result = {};
  for (const [name, [left, top, right, bottom]] of Object.entries(regions)) {
    assert.ok(left >= 0 && top >= 0 && right <= info.width && bottom <= info.height, name);
    let ink, extreme = mode === 'light' ? Infinity : -Infinity;
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
      const p = pixel(x, y), sum = p.reduce((a, b) => a + b);
      if (mode === 'light' ? sum < extreme : sum > extreme) { extreme = sum; ink = p; }
    }
    assert.ok(ink.reduce((sum, v, c) => sum + Math.abs(v - pixel(left, top)[c]), 0) > 240,
      `${name}: screenshot must contain high-contrast text, not an empty gradient`);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, count = 0;
    for (let y = top; y < bottom; y++) {
      const start = pixel(left, y), end = pixel(right - 1, y);
      for (let x = left; x < right; x++) {
        const p = pixel(x, y);
        const background = start.map((v, c) => v + (end[c] - v) * (x - left) / (right - 1 - left));
        const direction = ink.map((v, c) => v - background[c]);
        const denominator = direction.reduce((sum, v) => sum + v * v, 0);
        const contrast = direction.reduce((sum, v, c) => sum + (p[c] - background[c]) * v, 0) / denominator;
        if (contrast >= 0.5) {
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); count++;
        }
      }
    }
    assert.ok(count > 5, `${name}: expected visible glyph`);
    result[name] = { left: minX, top: minY, right: maxX, bottom: maxY, pixels: count };
  }
  return result;
}

export function assertWidgetAlignment(metrics) {
  assert.equal(metrics.numeral.top, metrics.firstCapital.top, 'numeral top must match the first sentence capital');
  for (const name of ['numeral', 'slash', 'one', 'zero']) {
    assert.equal(metrics[name].bottom, metrics.thirdCapital.bottom, `${name} bottom must match sentence line three`);
  }
}
