// Regenerates test/fixtures/reading-gradient.json: reference pixels from
// Chromium rendering public/levels.css (not the SVG implementation). Each case
// carries its own colours, so a palette change never needs a new capture;
// run this only when levels.css or the sample cases change:
//   node scripts/capture-reading-gradient.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { channels } from '../design/colors.js';

const root = new URL('../', import.meta.url);
const fixturePath = new URL('test/fixtures/reading-gradient.json', root);
const levelsCss = readFileSync(new URL('public/levels.css', root), 'utf8').replace(/@import[^;]+;/, '');
const fixture = JSON.parse(readFileSync(fixturePath));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
for (const entry of fixture) {
  const { colors: c, width, height } = entry;
  await page.setViewportSize({ width, height });
  const vars = `--level-color:${channels(c.primary)};--level-companion:${channels(c.companion)};--glow:${c.glow};--wash:${c.wash};--veil:${c.veil}`;
  await page.setContent(`<!doctype html><style>${levelsCss} body{margin:0;background:${c.surface}}</style>
    <body><div data-level style="${vars}"><div class="level-gradient" style="transition:none"></div></div></body>`);
  const png = await page.screenshot({ type: 'png' });
  entry.points = await page.evaluate(async ({ b64, points, width, height }) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const ctx = new OffscreenCanvas(width, height).getContext('2d');
    ctx.drawImage(img, 0, 0);
    // Chromium dithers gradients, so average a 5x5 patch rather than trust one pixel.
    return points.map(({ x, y }) => {
      const x0 = Math.max(0, x - 2), y0 = Math.max(0, y - 2);
      const w = Math.min(width, x + 3) - x0, h = Math.min(height, y + 3) - y0;
      const { data } = ctx.getImageData(x0, y0, w, h), sum = [0, 0, 0];
      for (let i = 0; i < data.length; i += 4) for (let k = 0; k < 3; k++) sum[k] += data[i + k];
      return { x, y, rgb: sum.map(v => Math.round(v / (w * h))) };
    });
  }, { b64: png.toString('base64'), points: entry.points, width, height });
}
await browser.close();
writeFileSync(fixturePath, JSON.stringify(fixture) + '\n');
console.log(`Captured ${fixture.length} reference canvases.`);
