// Refresh Apple artwork from a complete, verified native capture set.
// Android assets retain their separately recorded build and platform provenance.
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import tokens from '../../public/tokens.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const plan = JSON.parse(await readFile(resolve(root, 'apple-gallery-26.json')));
const evidence = JSON.parse(await readFile(resolve(root, plan.captureEvidence)));
if (evidence.status !== 'verified' || evidence.applicationSourceCommit !== plan.applicationSourceCommit) {
  throw new Error('Native capture verification or application source does not match the gallery plan.');
}
const frames = JSON.parse(await readFile(resolve(root, plan.widgetFrames)));
if (frames.releaseBuild !== plan.releaseBuild || frames.frames.length !== 2 || frames.frames.map(x => x.label).join() !== 'SMALL,MEDIUM') {
  throw new Error('Expected measured current small and medium widget frames.');
}
const originals = new Map();
const sources = [...plan.captures.map(c => `source/${c.family}/${c.source}`), ...frames.frames.map(f => f.file)];
for (const source of new Set(sources)) {
  const data = await readFile(resolve(root, source));
  const metadata = await sharp(data).metadata();
  if (metadata.format !== 'png') throw new Error(`Expected original native PNG: ${source}`);
  const recorded = evidence.captures?.find(c => c.file === source);
  if (!recorded || recorded.sha256 !== createHash('sha256').update(data).digest('hex')) {
    throw new Error(`Capture does not match its native verification record: ${source}`);
  }
  originals.set(source, { data, metadata });
}
for (const capture of plan.captures) {
  const { metadata } = originals.get(`source/${capture.family}/${capture.source}`);
  const [width, height] = capture.family === 'ipad-13' ? [2064, 2752] : [1320, 2868];
  if (metadata.width !== width || metadata.height !== height) throw new Error(`Unexpected native dimensions: ${capture.source}`);
}
for (const frame of frames.frames) {
  const { width, height } = originals.get(frame.file).metadata;
  if (![frame.x, frame.y, frame.width, frame.height, frame.radius].every(Number.isFinite) || frame.x < 0 || frame.y < 0 || frame.width <= 0 || frame.height <= 0 || frame.x + frame.width > width || frame.y + frame.height > height) {
    throw new Error(`Widget viewport outside original capture: ${frame.file}`);
  }
}
const xml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const text = (x, y, size, value, fill, extra = '') => `<text x="${x}" y="${y}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="${size}" fill="${fill}" ${extra}>${xml(value)}</text>`;
const href = source => `data:image/png;base64,${originals.get(source).data.toString('base64')}`;
const assets = [];
async function save(file, svg, sources, attributes) {
  const layout = `source/layouts/${file.split('/').slice(-2).join('-').replace('.png', '.svg')}`;
  let editable = svg;
  for (const source of sources) editable = editable.replaceAll(href(source), relative(dirname(resolve(root, layout)), resolve(root, source)));
  await mkdir(dirname(resolve(root, file)), { recursive: true });
  await mkdir(dirname(resolve(root, layout)), { recursive: true });
  await writeFile(resolve(root, layout), editable);
  await sharp(Buffer.from(svg)).removeAlpha().png({ compressionLevel: 9 }).toFile(resolve(root, file));
  assets.push({ file, sources, platform: 'ios', releaseBuild: plan.releaseBuild, ...attributes });
}

for (const capture of plan.captures) {
  const tablet = capture.family === 'ipad-13';
  const [width, height] = tablet ? [2064, 2752] : [1320, 2868];
  const x = tablet ? 302 : 194, y = tablet ? 550 : 700;
  const screenWidth = width - 2 * x, screenHeight = screenWidth * height / width;
  const brand = tokens.brand[capture.dark ? 'dark' : 'light'];
  const ink = brand.ink;
  const muted = brand.muted;
  const source = `source/${capture.family}/${capture.source}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${brand.start}"/><stop offset="0.52" stop-color="${brand.center}"/><stop offset="1" stop-color="${brand.end}"/></linearGradient><clipPath id="screen"><rect x="${x}" y="${y}" width="${screenWidth}" height="${screenHeight}" rx="${tablet ? 35 : 78}"/></clipPath></defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect x="${tablet ? 118 : 96}" y="112" width="42" height="6" rx="3" fill="${muted}"/>
    ${text(tablet ? 182 : 160, 128, 30, 'NEWSWORTHY', muted, 'letter-spacing="6"')}
    ${capture.headline.map((line, i) => text(tablet ? 118 : 96, (tablet ? 294 : 294) + i * 125, tablet ? 96 : 104, line, ink, 'font-weight="500" letter-spacing="-3"')).join('')}
    ${text(tablet ? 120 : 98, tablet ? 400 : 505, tablet ? 42 : 36, capture.caption, muted)}
    <rect x="${x - 22}" y="${y - 22}" width="${screenWidth + 44}" height="${screenHeight + 44}" rx="${tablet ? 56 : 98}" fill="#101514"/>
    <image x="${x}" y="${y}" width="${screenWidth}" height="${screenHeight}" href="${href(source)}" clip-path="url(#screen)"/>
    ${text(width / 2, height - 70, tablet ? 32 : 29, 'World news, rated by significance.', muted, 'text-anchor="middle"')}
  </svg>`;
  await save(`assets/apple/${capture.family}/${capture.output}`, svg, [source], { width, height, displayType: tablet ? 'APP_IPAD_PRO_3GEN_129' : 'APP_IPHONE_67' });
}

const scale = Math.min(1092 / Math.max(...frames.frames.map(f => f.width)), 510 / Math.max(...frames.frames.map(f => f.height)));
const widget = (frame, index) => {
  const { metadata } = originals.get(frame.file);
  return `<svg x="108" y="${index ? 1713 : 803}" width="${frame.width * scale}" height="${frame.height * scale}" viewBox="${frame.x} ${frame.y} ${frame.width} ${frame.height}"><defs><clipPath id="widget-${index}"><rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" rx="${frame.radius}"/></clipPath></defs><image width="${metadata.width}" height="${metadata.height}" href="${href(frame.file)}" clip-path="url(#widget-${index})"/></svg>`;
};
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="2868">
  <rect width="100%" height="100%" fill="${tokens.brand.light.center}"/>
  <rect x="104" y="120" width="42" height="5" rx="2.5" fill="${tokens.brand.light.muted}"/>
  ${text(166, 134, 29, 'NEWSWORTHY', tokens.brand.light.muted, 'letter-spacing="6"')}
  ${text(104, 327, 106, 'Small or medium.', tokens.brand.light.ink, 'font-weight="500" letter-spacing="-4"')}
  ${text(104, 451, 106, 'Light or dark.', tokens.brand.light.ink, 'font-weight="500" letter-spacing="-4"')}
  ${text(108, 557, 36, 'Each widget has its own appearance choice.', tokens.brand.light.muted)}
  ${text(108, 748, 27, 'SMALL', tokens.brand.light.muted, 'letter-spacing="5"')}
  ${widget(frames.frames[0], 0)}
  ${text(108, 1396, 37, 'The score, at a glance.', tokens.brand.light.ink)}
  <path d="M108 1510 H1212" stroke="${tokens.brand.light.rule}" stroke-width="2"/>
  ${text(108, 1658, 27, 'MEDIUM', tokens.brand.light.muted, 'letter-spacing="5"')}
  ${widget(frames.frames[1], 1)}
  ${text(108, 2308, 37, 'More room for context.', tokens.brand.light.ink)}
  ${text(108, 2532, 31, 'Show or hide the app name. Tap to open the reading.', tokens.brand.light.muted)}
  ${text(108, 2758, 27, 'World news, rated by significance.', tokens.brand.light.muted)}
</svg>`;
await save('assets/apple/iphone-6.9/02-widget-sizes-v26.png', svg, frames.frames.map(f => f.file), { width: 1320, height: 2868, displayType: 'APP_IPHONE_67', composition: 'Actual native widget viewports at one scale on a neutral canvas; original Home Screens retained.' });
assets.sort((a, b) => a.file.localeCompare(b.file));
const previous = JSON.parse(await readFile(resolve(root, 'assets/manifest.json')));
await writeFile(resolve(root, 'assets/manifest.json'), JSON.stringify([...assets, ...previous.filter(a => a.platform !== 'ios')], null, 2) + '\n');
const iphone = assets.filter(a => a.width === 1320);
await sharp({ create: { width: iphone.length * 330, height: 717, channels: 3, background: tokens.brand.light.center } })
  .composite(await Promise.all(iphone.map(async (a, i) => ({ input: await sharp(resolve(root, a.file)).resize(330).toBuffer(), left: i * 330, top: 0 }))))
  .png().toFile(resolve(root, 'preview.png'));
console.log(`Rendered ${assets.length} current Apple screenshots; Android manifest entries preserved.`);
