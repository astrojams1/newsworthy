// Measure this release's native corner silhouettes; do not redraw the widgets.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../source/iphone-6.9');
const framesPath = resolve(root, 'widget-frames-v26.json');
const frames = JSON.parse(await readFile(framesPath));
const light = await sharp(resolve(root, '05-small-widget-v26.png')).removeAlpha().raw().toBuffer();
const dark = await sharp(resolve(root, '06-medium-widget-v26.png')).removeAlpha().raw().toBuffer();
const pixel = (data, x, y) => {
  const index = (y * 1320 + x) * 3;
  return [data[index], data[index + 1], data[index + 2]];
};
// Keep endpoints and each change in the measured outline.
const compact = points => points.filter((point, index) =>
  !index || index === points.length - 1 ||
  point[0] !== points[index - 1][0] || point[0] !== points[index + 1][0]);

for (const frame of frames.frames) {
  const rows = [];
  for (let y = 1; y < frame.height - 1; y++) {
    const inside = x => {
      const a = pixel(light, frame.x + x, frame.y + y);
      if (frame.label === 'SMALL') return a.reduce((sum, value) => sum + value, 0) / 3 > 185;
      const b = pixel(dark, frame.x + x, frame.y + y);
      return a.reduce((sum, value, channel) => sum + Math.abs(value - b[channel]), 0) / 3 > 145;
    };
    // Native corners are symmetric. The right-side gradients converge, so a
    // separate brightness scan there can mistake native content for wallpaper.
    let left = 1;
    while (left < 150 && !inside(left)) left++;
    if (left === 150) throw new Error(`Native silhouette not found: ${frame.label}, row ${y}`);
    rows.push({ y, left: left + 1, right: frame.width - left - 2 });
  }
  frame.clipPolygon = [
    ...compact(rows.map(row => [row.left, row.y])),
    ...compact([...rows].reverse().map(row => [row.right, row.y])),
  ];
}
frames.method = frames.method.split(' Native corner silhouettes')[0] +
  ' Native corner silhouettes measured on the left from Small light/background contrast and Medium light/dark capture differences, then mirrored across each symmetric native container. A one-pixel interior boundary excludes wallpaper antialiasing. Only the silhouette is masked; native text and gradients remain unchanged.';
await writeFile(framesPath, JSON.stringify(frames, null, 2) + '\n');
