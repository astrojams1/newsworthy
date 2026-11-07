// Renders the App Store header and search creative from the palette: the ten-step temperature scale under one phrase.
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const { scale } = JSON.parse(readFileSync(new URL('../../design/palette.json', import.meta.url)));
const steps = Array.from({ length: 10 }, (_, index) => {
  const at = index / 9 * (scale.primary.length - 1);
  const low = Math.min(Math.floor(at), scale.primary.length - 2);
  const mix = at - low;
  const [l, c, h] = scale.primary[low].map((value, part) => value + (scale.primary[low + 1][part] - value) * mix);
  return `oklch(${l} ${c} ${h})`;
});
const page = (title, disc, gap, space) => `<!doctype html><body style="margin:0;height:100vh;background:#F7F4EF;display:flex;
  flex-direction:column;align-items:center;justify-content:center;gap:${space}px">
  <div style="font:400 ${title}px Georgia,serif;color:#16161A;letter-spacing:-.01em">World news, rated.</div>
  <div style="display:flex;gap:${gap}px">${steps.map(colour => `<i style="width:${disc}px;height:${disc}px;border-radius:50%;background:${colour}"></i>`).join('')}</div>`;

const out = new URL('../assets/apple/creative/', import.meta.url);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
for (const [file, width, height, html] of [
  ['header-temperature.png', 3840, 1646, page(190, 96, 40, 110)],
  ['search-temperature.png', 1920, 1280, page(170, 96, 36, 100)],
]) {
  const tab = await browser.newPage({ viewport: { width, height } });
  await tab.setContent(html);
  await tab.screenshot({ path: new URL(file, out).pathname, omitBackground: false });
  await tab.close();
}
await browser.close();
