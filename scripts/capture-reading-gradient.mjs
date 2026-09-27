// Regenerates test/fixtures/reading-gradient.json: reference pixels from
// Chromium rendering public/levels.css (not the SVG implementation) at the
// fixture's existing sizes and sample points. Run after a palette change:
//   node scripts/capture-reading-gradient.mjs [tokens.css]
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const root = new URL('../', import.meta.url);
const fixturePath = new URL('test/fixtures/reading-gradient.json', root);
const tokensCss = readFileSync(process.argv[2] ?? new URL('public/tokens.css', root), 'utf8');
const levelsCss = readFileSync(new URL('public/levels.css', root), 'utf8').replace(/@import[^;]+;/, '');
const surfaces = JSON.parse(readFileSync(new URL('design/palette.json', root))).appearance;
const fixture = JSON.parse(readFileSync(fixturePath));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
for (const entry of fixture) {
  const { score, dark, width, height } = entry;
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><html data-appearance="${dark ? 'dark' : 'light'}"><style>${tokensCss}${levelsCss}
    body{margin:0;background:${surfaces[dark ? 'dark' : 'light'].surface}}</style>
    <body><div data-level="${score}"><div class="level-gradient" style="transition:none"></div></div></body></html>`);
  const png = await page.screenshot({ type: 'png' });
  const pixels = await page.evaluate(async ({ b64, points, width, height }) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const canvas = new OffscreenCanvas(width, height), ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    // Chromium dithers gradients, so average a 5x5 patch rather than trust one pixel.
    return points.map(({ x, y }) => {
      const x0 = Math.max(0, x - 2), y0 = Math.max(0, y - 2);
      const w = Math.min(width, x + 3) - x0, h = Math.min(height, y + 3) - y0;
      const { data } = ctx.getImageData(x0, y0, w, h), sum = [0, 0, 0];
      for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += data[i + c];
      return sum.map(v => Math.round(v / (w * h)));
    });
  }, { b64: png.toString('base64'), points: entry.points, width, height });
  entry.points = entry.points.map((point, i) => ({ ...point, rgb: pixels[i] }));
}
await browser.close();
writeFileSync(fixturePath, JSON.stringify(fixture) + '\n');
console.log(`Captured ${fixture.length} reference canvases.`);
