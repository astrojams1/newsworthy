// Render the Google Play listing artwork from a verified native capture set:
// phone screenshots, the 1024×500 feature graphic and the 512×512 icon.
// Apple manifest entries are preserved; Android entries are replaced.
import sharp from 'sharp';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import tokens from '../../public/tokens.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const plan = JSON.parse(await readFile(resolve(root, 'google-play-gallery-15.json')));
const evidence = JSON.parse(await readFile(resolve(root, plan.captureEvidence)));
if (evidence.status !== 'verified' || evidence.applicationSourceCommit !== plan.applicationSourceCommit || evidence.versionCode !== plan.versionCode) {
  throw new Error('Native capture verification does not match the gallery plan.');
}
const frames = JSON.parse(await readFile(resolve(root, plan.widgetFrames)));
if (frames.versionCode !== plan.versionCode) throw new Error('Widget frames come from a different versionCode.');
const frame = label => frames.frames.find(f => f.label === label) ?? (() => { throw new Error(`Missing widget frame ${label}`); })();

// Every source must be an original PNG whose hash matches its capture record.
const originals = new Map();
const sources = [...plan.captures.filter(c => c.source).map(c => `source/android-phone/${c.source}`), ...frames.frames.map(f => f.file)];
for (const source of new Set(sources)) {
  const data = await readFile(resolve(root, source));
  const metadata = await sharp(data).metadata();
  const recorded = evidence.captures.find(c => c.file === source);
  if (metadata.format !== 'png' || metadata.width !== 1080 || metadata.height !== 2400) throw new Error(`Expected a 1080×2400 native PNG: ${source}`);
  if (!recorded || recorded.sha256 !== createHash('sha256').update(data).digest('hex')) throw new Error(`Capture does not match its native verification record: ${source}`);
  originals.set(source, { data, metadata });
}
for (const f of frames.frames) {
  if (![f.x, f.y, f.width, f.height, f.radius].every(Number.isFinite) || f.x < 0 || f.y < 0 || f.x + f.width > 1080 || f.y + f.height > 2400) {
    throw new Error(`Widget viewport outside original capture: ${f.label}`);
  }
}

const xml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const text = (x, y, size, value, fill, extra = '') => `<text x="${x}" y="${y}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="${size}" fill="${fill}" ${extra}>${xml(value)}</text>`;
const href = source => `data:image/png;base64,${originals.get(source).data.toString('base64')}`;
const widget = (f, x, y, scale, id) => `<svg x="${x}" y="${y}" width="${f.width * scale}" height="${f.height * scale}" viewBox="${f.x} ${f.y} ${f.width} ${f.height}"><defs><clipPath id="${id}"><rect x="${f.x}" y="${f.y}" width="${f.width}" height="${f.height}" rx="${f.radius}"/></clipPath></defs><image width="1080" height="2400" href="${href(f.file)}" clip-path="url(#${id})"/></svg>`;
const header = (brand, headline, caption) => `
  <rect x="72" y="62" width="34" height="5" rx="2.5" fill="${brand.muted}"/>
  ${text(126, 75, 24, 'NEWSWORTHY', brand.muted, 'letter-spacing="5"')}
  ${headline.map((line, i) => text(72, 176 + i * 80, 74, line, brand.ink, 'font-weight="500" letter-spacing="-2"')).join('')}
  ${text(75, 316, 30, caption, brand.muted)}`;

const assets = [];
async function save(file, svg, used, attributes) {
  const layout = `source/layouts/google-play-${file.split('/').pop().replace('.png', '.svg')}`;
  let editable = svg;
  for (const source of used) editable = editable.replaceAll(href(source), relative(dirname(resolve(root, layout)), resolve(root, source)));
  await mkdir(dirname(resolve(root, file)), { recursive: true });
  await writeFile(resolve(root, layout), editable);
  await sharp(Buffer.from(svg)).removeAlpha().png({ compressionLevel: 9 }).toFile(resolve(root, file));
  assets.push({ file, sources: used, platform: 'android', versionCode: String(plan.versionCode), ...attributes });
}

for (const capture of plan.captures) {
  const brand = tokens.brand[capture.dark ? 'dark' : 'light'];
  const target = `assets/google-play/phone/${capture.output}`;
  if (capture.widgets) {
    // Actual widget surfaces at one scale on a neutral canvas close to the
    // capture wallpaper, so the native antialiased corners stay clean.
    const light = frame('COMPACT_LIGHT'), dark = frame('COMPACT_DARK'), expanded = frame('EXPANDED');
    const scale = 0.85, x = Math.round((1080 - expanded.width * scale) / 2);
    const gap = expanded.width * scale - 2 * light.width * scale;
    const used = [...new Set([light.file, dark.file, expanded.file])];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
      <rect width="100%" height="100%" fill="${tokens.brand.companion}"/>
      ${header(brand, capture.headline, capture.caption)}
      ${text(x, 418, 24, 'COMPACT · LIGHT OR DARK', brand.muted, 'letter-spacing="4"')}
      ${widget(light, x, 442, scale, 'compact-light')}
      ${widget(dark, x + light.width * scale + gap, 442, scale, 'compact-dark')}
      ${text(x, 1012, 24, 'LARGER · WITH THE SENTENCE', brand.muted, 'letter-spacing="4"')}
      ${widget(expanded, x, 1036, scale, 'expanded')}
      ${text(540, 1878, 26, 'Each widget has its own appearance setting.', brand.muted, 'text-anchor="middle"')}
    </svg>`;
    await save(target, svg, used, { width: 1080, height: 1920, composition: 'Actual native widget viewports at one scale on a neutral canvas; original home screens retained.' });
    continue;
  }
  const source = `source/android-phone/${capture.source}`;
  const sx = 200, sy = 352, sw = 680, sh = sw * 2400 / 1080;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${brand.start}"/><stop offset="0.52" stop-color="${brand.center}"/><stop offset="1" stop-color="${brand.end}"/></linearGradient><clipPath id="screen"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="36"/></clipPath></defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    ${header(brand, capture.headline, capture.caption)}
    <rect x="${sx - 14}" y="${sy - 14}" width="${sw + 28}" height="${sh + 28}" rx="50" fill="#101514"/>
    <image x="${sx}" y="${sy}" width="${sw}" height="${sh}" href="${href(source)}" clip-path="url(#screen)"/>
  </svg>`;
  await save(target, svg, [source], { width: 1080, height: 1920 });
}

// Feature graphic: the listing's own words beside an actual compact widget.
const featureWidget = frame(plan.featureGraphic.widget);
const brand = tokens.brand.light;
const fScale = 0.64, fw = featureWidget.width * fScale, fh = featureWidget.height * fScale;
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500">
  <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${brand.start}"/><stop offset="0.52" stop-color="${brand.center}"/><stop offset="1" stop-color="${brand.end}"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="72" y="86" width="30" height="4" rx="2" fill="${brand.muted}"/>
  ${text(118, 97, 20, 'NEWSWORTHY', brand.muted, 'letter-spacing="4"')}
  ${plan.featureGraphic.headline.map((line, i) => text(70, 196 + i * 62, 52, line, brand.ink, 'font-weight="500" letter-spacing="-1.5"')).join('')}
  ${plan.featureGraphic.caption.map((line, i) => text(72, 352 + i * 36, 25, line, brand.muted)).join('')}
  ${widget(featureWidget, 1024 - 72 - fw, (500 - fh) / 2, fScale, 'feature-widget')}
</svg>`;
await writeFile(resolve(root, 'source/feature-graphic.svg'), feature.replaceAll(href(featureWidget.file), relative(resolve(root, 'source'), resolve(root, featureWidget.file))));
await sharp(Buffer.from(feature)).removeAlpha().png({ compressionLevel: 9 }).toFile(resolve(root, 'assets/google-play/feature-graphic.png'));
await sharp(resolve(root, '../apps/client/assets/icon.png')).resize(512, 512).removeAlpha().png({ compressionLevel: 9 }).toFile(resolve(root, 'assets/google-play/icon.png'));

// Retire the September gallery, which predates the Stone palette and timeline.
for (const name of ['01-at-a-glance-v9', '02-dark-mode-v9', '03-widget-sizes-v9']) {
  await rm(resolve(root, `assets/google-play/phone/${name}.png`), { force: true });
  await rm(resolve(root, `source/layouts/android-${name}.svg`), { force: true });
}
assets.sort((a, b) => a.file.localeCompare(b.file));
const previous = JSON.parse(await readFile(resolve(root, 'assets/manifest.json')));
await writeFile(resolve(root, 'assets/manifest.json'), JSON.stringify([...previous.filter(a => a.platform !== 'android'), ...assets], null, 2) + '\n');
await sharp({ create: { width: assets.length * 330, height: 587, channels: 3, background: tokens.brand.light.center } })
  .composite(await Promise.all(assets.map(async (a, i) => ({ input: await sharp(resolve(root, a.file)).resize(330).toBuffer(), left: i * 330, top: 0 }))))
  .png().toFile(resolve(root, 'preview-android.png'));
console.log(`Rendered ${assets.length} Google Play screenshots, the feature graphic and the icon from versionCode ${plan.versionCode}.`);
