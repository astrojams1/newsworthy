import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const store = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(store, 'design/drafts');
const frames = [
  { platform: 'ios', source: 'source/iphone-6.9/07-notifications-v21.png', name: 'iphone-notifications-v21', width: 1320, height: 2868, nativeWidth: 1320, nativeHeight: 2868, crop: { x: 48, y: 1028, width: 1224, height: 556 } },
  { platform: 'android', source: 'source/android-phone/17-notifications-v12.png', name: 'android-notifications-v12', width: 1080, height: 1920, nativeWidth: 1080, nativeHeight: 2400, crop: { x: 40, y: 846, width: 1000, height: 502 } },
];
await mkdir(output, { recursive: true });
const manifest = [];
for (const frame of frames) {
  const source = await readFile(resolve(store, frame.source));
  const metadata = await sharp(source).metadata();
  if (metadata.width !== frame.nativeWidth || metadata.height !== frame.nativeHeight) throw new Error(`Unexpected native dimensions: ${frame.source}`);
  const { x, y, width, height } = frame.crop;
  if (x < 0 || y < 0 || x + width > metadata.width || y + height > metadata.height) throw new Error(`Invalid viewport: ${frame.source}`);
  const phone = frame.platform === 'ios';
  const margin = phone ? 104 : 72;
  const shownWidth = frame.width - margin * 2;
  const shownHeight = shownWidth * height / width;
  const captureY = phone ? 1070 : 705;
  const labelY = phone ? 996 : 648;
  const text = (x, y, size, value, extra = '') => `<text x="${x}" y="${y}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="${size}" fill="#172C25" ${extra}>${value}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}">
    <rect width="100%" height="100%" fill="#F4F3EF"/>
    <rect x="${margin}" y="${phone ? 120 : 70}" width="38" height="5" fill="#59685F"/>
    ${text(margin + 60, phone ? 135 : 83, phone ? 29 : 24, 'NEWSWORTHY', 'letter-spacing="5"')}
    ${text(margin, phone ? 365 : 248, phone ? 104 : 78, 'Choose when', 'font-weight="500" letter-spacing="-3"')}
    ${text(margin, phone ? 487 : 341, phone ? 104 : 78, 'to be notified.', 'font-weight="500" letter-spacing="-3"')}
    ${text(margin + 2, phone ? 607 : 434, phone ? 36 : 29, 'Optional notifications for readings')}
    ${text(margin + 2, phone ? 663 : 478, phone ? 36 : 29, 'at your chosen score.')}
    ${text(margin, labelY, phone ? 27 : 24, 'IN SETTINGS', 'letter-spacing="4"')}
    <svg x="${margin}" y="${captureY}" width="${shownWidth}" height="${shownHeight}" viewBox="${x} ${y} ${width} ${height}">
      <image width="${frame.nativeWidth}" height="${frame.nativeHeight}" href="data:image/png;base64,${source.toString('base64')}"/>
    </svg>
    <path d="M${margin} ${phone ? 1720 : 1270} H${frame.width - margin}" stroke="#D5D9D0" stroke-width="2"/>
    ${text(margin, phone ? 1890 : 1410, phone ? 42 : 34, 'Off by default.')}
    ${text(margin, phone ? 1970 : 1475, phone ? 36 : 29, 'Choose a minimum score from 5 to 10.')}
    ${text(margin, phone ? 2210 : 1635, phone ? 36 : 29, 'Tap a notification to open the current reading.')}
    ${text(margin, frame.height - (phone ? 110 : 70), phone ? 27 : 24, 'World news, rated by significance.')}
  </svg>`;
  const path = resolve(output, `${frame.name}.png`);
  await writeFile(resolve(output, `${frame.name}.svg`), svg);
  await sharp(Buffer.from(svg)).removeAlpha().png({ compressionLevel: 9 }).toFile(path);
  manifest.push({ ...frame, file: `design/drafts/${frame.name}.png`, status: 'draft', composition: 'Unchanged native notification controls shown through a viewport; About is outside the viewport. Original full capture is preserved.' });
}
await writeFile(resolve(output, 'notification-drafts.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Rendered ${manifest.length} notification drafts in ${output}; upload manifest unchanged.`);
