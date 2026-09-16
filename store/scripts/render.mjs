import sharp from 'sharp';
import { readFile, writeFile, mkdir, access, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = async (path, data) => {
  await mkdir(dirname(resolve(root, path)), { recursive: true });
  await writeFile(resolve(root, path), data);
};
const xml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const text = (x, y, size, value, fill = '#142C28', extra = '') =>
  `<text x="${x}" y="${y}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="${size}" fill="${fill}" ${extra}>${xml(value)}</text>`;

// Artboards are editable SVG; native captures are embedded without changing
// their content. No synthetic UI, sample score, or invented news is rendered.
const layouts = [
  ['iphone-6.9', '01-reading-light.png', '01-at-a-glance-v6.png', ['The world,', 'at a glance.'], 'A number out of 10. One sentence explaining why.', false],
  ['iphone-6.9', '02-reading-dark.png', '03-dark-mode-v6.png', ['A quieter way', 'to stay informed.'], 'Light and dark. The same calm perspective.', true],
  ['ipad-13', '01-reading-light.png', '01-at-a-glance-v6.png', ['The world, at a glance.'], 'A number out of 10. One sentence explaining why.', false],
  ['ipad-13', '02-reading-dark.png', '02-dark-mode-v6.png', ['A quieter way to stay informed.'], 'Light and dark. The same calm perspective.', true],
];
const manifest = [];
// Frame two observed native widgets in a neutral vector artboard. The original
// Home Screen remains intact on disk; viewports show only the widget surfaces.
const widgetSource = 'source/iphone-6.9/04-widget-sizes-native.png';
try {
  const png = (await readFile(resolve(root, widgetSource))).toString('base64');
  const href = `data:image/png;base64,${png}`;
  const widget = (id, x, y, w, h, sourceX, sourceY, sourceW, sourceH) => `
    <svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${sourceX} ${sourceY} ${sourceW} ${sourceH}">
      <defs><clipPath id="${id}"><rect x="${sourceX}" y="${sourceY}" width="${sourceW}" height="${sourceH}" rx="92"/></clipPath></defs>
      <image width="1320" height="2868" href="${href}" clip-path="url(#${id})"/>
    </svg>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="2868">
    <rect width="1320" height="2868" fill="#F4F3EF"/>
    <rect x="104" y="120" width="42" height="5" rx="2.5" fill="#59685F"/>
    ${text(166, 134, 29, 'NEWSWORTHY', '#59685F', 'letter-spacing="6"')}
    ${text(104, 327, 106, 'A little space.', '#172C25', 'font-weight="500" letter-spacing="-4"')}
    ${text(104, 451, 106, 'A clearer picture.', '#172C25', 'font-weight="500" letter-spacing="-4"')}
    ${text(108, 557, 36, 'Two sizes. One calm perspective.', '#59685F')}
    ${text(108, 748, 27, 'SMALL', '#59685F', 'letter-spacing="5"')}
    ${widget('small',108,803,510,510,114,918,510,510)}
    ${text(108, 1396, 37, 'The score, at a glance.', '#172C25')}
    <path d="M108 1510 H1212" stroke="#D5D9D0" stroke-width="2"/>
    ${text(108, 1658, 27, 'MEDIUM', '#59685F', 'letter-spacing="5"')}
    ${widget('medium',108,1713,1092,510,114,282,1092,510)}
    ${text(108, 2308, 37, 'More room for context.', '#172C25')}
    ${text(108, 2532, 31, 'A quiet check-in, right on your Home Screen.', '#59685F')}
    ${text(108, 2758, 27, 'No feed. No ads. No subscription.', '#59685F')}
  </svg>`;
  const target = 'assets/apple/iphone-6.9/02-widget-sizes-v2.png';
  await out('source/layouts/iphone-6.9-02-widget-sizes-v2.svg', svg.replaceAll(href, '../iphone-6.9/04-widget-sizes-native.png'));
  await out(target, await sharp(Buffer.from(svg)).removeAlpha().png({compressionLevel:9}).toBuffer());
  manifest.push({file:target,source:widgetSource,width:1320,height:2868,platform:'ios',displayType:'APP_IPHONE_67',composition:'Unchanged native widget viewports on a neutral vector canvas; not a full Home Screen screenshot.'});
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.warn('Pending native small/medium widget capture');
}
// The original widget capture had unrelated app icons. Keep it only as historic
// source evidence; the final gallery requires a clean native small/medium capture.
await rm(resolve(root, 'assets/apple/iphone-6.9/02-widget.png'), { force: true });
for (const [family, names] of [['iphone-6.9', ['01-at-a-glance','03-dark-mode']], ['ipad-13', ['01-at-a-glance','02-dark-mode']]]) {
  for (const name of names) {
    await rm(resolve(root, `assets/apple/${family}/${name}.png`), {force:true});
    await rm(resolve(root, `source/layouts/${family}-${name}.svg`), {force:true});
  }
}
await rm(resolve(root, 'source/layouts/iphone-6.9-02-widget.svg'), { force: true });
for (const [family, source, name, headline, caption, dark] of layouts) {
  try {
    await access(resolve(root, 'source', family, source));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    console.warn(`Pending native capture: ${family}/${source}`);
    continue;
  }
  const tablet = family === 'ipad-13';
  const width = tablet ? 2064 : 1320, height = tablet ? 2752 : 2868;
  const sx = tablet ? 262 : 194, sy = tablet ? 480 : 700;
  const sw = width - 2 * sx, sh = Math.round(sw * (tablet ? 2752 / 2064 : 2868 / 1320));
  const ink = dark ? '#F2F9F7' : '#142C28', muted = dark ? '#B5D4C9' : '#3F685E';
  const screen = (await readFile(resolve(root, 'source', family, source))).toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${dark ? '#101E1B' : '#EFF8F2'}"/><stop offset="1" stop-color="${dark ? '#27483F' : '#B6DCCA'}"/></linearGradient><clipPath id="screen"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="${tablet ? 35 : 78}"/></clipPath></defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect x="${tablet ? 118 : 96}" y="${tablet ? 98 : 112}" width="42" height="6" rx="3" fill="${muted}"/>
  ${text(tablet ? 182 : 160, tablet ? 114 : 128, 30, 'NEWSWORTHY', muted, 'letter-spacing="6"')}
  ${headline.map((line, i) => text(tablet ? 118 : 96, (tablet ? 274 : 294) + i * 125, tablet ? 99 : 112, line, ink, 'font-weight="500" letter-spacing="-4"')).join('')}
  ${text(tablet ? 120 : 98, tablet ? 353 : 505, tablet ? 42 : 36, caption, muted)}
  <rect x="${sx - 22}" y="${sy - 22}" width="${sw + 44}" height="${sh + 44}" rx="${tablet ? 56 : 98}" fill="#101514"/>
  <image x="${sx}" y="${sy}" width="${sw}" height="${sh}" clip-path="url(#screen)" xlink:href="data:image/png;base64,${screen}"/>
  ${text(width / 2, height - 70, tablet ? 32 : 29, 'No feed. No ads. No subscription.', muted, 'text-anchor="middle"')}
  </svg>`;
  const target = `assets/apple/${family}/${name}`;
  await out(`source/layouts/${family}-${name.replace('.png', '.svg')}`, svg.replace(`data:image/png;base64,${screen}`, `../${family}/${source}`));
  await out(target, await sharp(Buffer.from(svg)).removeAlpha().png({ compressionLevel: 9 }).toBuffer());
  manifest.push({ file: target, source: `source/${family}/${source}`, width, height, platform: 'ios', displayType: tablet ? 'APP_IPAD_PRO_3GEN_129' : 'APP_IPHONE_67' });
}

// Android viewports are measured from the corrected native captures. Missing
// evidence keeps the gallery provisional rather than rendering a mock widget.
try {
  const config = JSON.parse(await readFile(resolve(root, 'source/android-phone/widget-frames.json'), 'utf8'));
  const captures = await Promise.all(config.frames.map(async frame => ({...frame, href:`data:image/png;base64,${(await readFile(resolve(root,frame.file))).toString('base64')}`})));
  if (captures.length !== 2 || captures.map(x=>x.label).join() !== 'COMPACT,EXPANDED') throw new Error('Expected verified compact and expanded Android frames');
  const scale = Math.min(936 / Math.max(...captures.map(x=>x.width)), 430 / Math.max(...captures.map(x=>x.height)));
  const frames = captures.map((frame,i)=>{
    const y = i ? 1080 : 430;
    return `<svg x="72" y="${y}" width="${frame.width*scale}" height="${frame.height*scale}" viewBox="${frame.x} ${frame.y} ${frame.width} ${frame.height}"><defs><clipPath id="android-${i}"><rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" rx="${frame.radius}"/></clipPath></defs><image width="1080" height="2400" href="${frame.href}" clip-path="url(#android-${i})"/></svg>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <rect width="1080" height="1920" fill="#F4F3EF"/>
    <rect x="72" y="60" width="34" height="5" fill="#59685F"/>
    ${text(126,74,24,'NEWSWORTHY','#59685F','letter-spacing="5"')}
    ${text(72,184,76,'Room for','#172C25','font-weight="500" letter-spacing="-2"')}
    ${text(72,272,76,'perspective.','#172C25','font-weight="500" letter-spacing="-2"')}
    ${text(75,339,29,'A widget that fits your day.','#59685F')}
    ${text(72,395,24,'COMPACT','#59685F','letter-spacing="4"')}
    ${frames}
    ${text(72,927,29,'The score, at a glance.','#172C25')}
    <path d="M72 987 H1008" stroke="#D5D9D0" stroke-width="2"/>
    ${text(72,1045,24,'EXPANDED','#59685F','letter-spacing="4"')}
    ${text(72,1582,29,'More room for context.','#172C25')}
    ${text(72,1725,27,'A quiet check-in, right on your Home Screen.','#59685F')}
    ${text(72,1850,24,'No feed. No ads. No subscription.','#59685F')}
  </svg>`;
  const target='assets/google-play/phone/03-widget-sizes-v8.png';
  let editable=svg;
  for(const capture of captures) editable=editable.replaceAll(capture.href,`../../${capture.file}`);
  await out('source/layouts/android-03-widget-sizes-v8.svg',editable);
  await out(target,await sharp(Buffer.from(svg)).removeAlpha().png({compressionLevel:9}).toBuffer());
  manifest.push({file:target,source:'source/android-phone/widget-frames.json',sources:captures.map(x=>x.file),width:1080,height:1920,platform:'android',composition:'Actual native widget viewports on a neutral canvas.'});
} catch(error) {
  if(error.code !== 'ENOENT') throw error;
  console.warn('Pending corrected native Android compact/expanded frames');
}

const androidLayouts = [
  ['01-reading-light.png', '01-at-a-glance.png', ['The world,', 'at a glance.'], 'A number out of 10. One sentence explaining why.', false],
  ['02-reading-dark.png', '02-dark-mode.png', ['A quieter way', 'to stay informed.'], 'Light and dark. The same calm perspective.', true],
];
// Retire the obsolete About art even when rendering over an existing checkout.
await rm(resolve(root, 'assets/google-play/phone/03-about.png'), { force: true });
await rm(resolve(root, 'source/layouts/android-03-about.svg'), { force: true });
for (const [source, name, headline, caption, dark] of androidLayouts) {
  try {
    await access(resolve(root, 'source/android-phone', source));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    console.warn(`Pending native Android capture: ${source}`);
    continue;
  }
  const width = 1080, height = 1920, sx = 218, sy = 350, sw = 644, sh = Math.round(sw * 2400 / 1080);
  const ink = dark ? '#F2F9F7' : '#142C28', muted = dark ? '#B5D4C9' : '#3F685E';
  const screen = (await readFile(resolve(root, 'source/android-phone', source))).toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}">
  <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${dark ? '#101E1B' : '#EFF8F2'}"/><stop offset="1" stop-color="${dark ? '#27483F' : '#B6DCCA'}"/></linearGradient><clipPath id="screen"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="28"/></clipPath></defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect x="72" y="56" width="34" height="5" rx="2" fill="${muted}"/>
  ${text(126, 69, 24, 'NEWSWORTHY', muted, 'letter-spacing="5"')}
  ${headline.map((line,i)=>text(72, 160+i*78, 72, line, ink, 'font-weight="500" letter-spacing="-2"')).join('')}
  ${text(75, 292, 28, caption, muted)}
  <rect x="${sx-12}" y="${sy-12}" width="${sw+24}" height="${sh+24}" rx="40" fill="#101514"/>
  <image x="${sx}" y="${sy}" width="${sw}" height="${sh}" clip-path="url(#screen)" xlink:href="data:image/png;base64,${screen}"/>
  ${text(540, 1860, 25, 'No feed. No ads. No subscription.', muted, 'text-anchor="middle"')}
  </svg>`;
  const target = `assets/google-play/phone/${name}`;
  await out(`source/layouts/android-${name.replace('.png','.svg')}`, svg.replace(`data:image/png;base64,${screen}`, `../android-phone/${source}`));
  await out(target, await sharp(Buffer.from(svg)).removeAlpha().png({compressionLevel:9}).toBuffer());
  manifest.push({file:target,source:`source/android-phone/${source}`,width,height,platform:'android'});
}

// Google artwork extends the existing vector brand. It makes no claim to show
// an Android device; Android screenshots are captured and tracked separately.
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#EFF8F2"/><stop offset="1" stop-color="#B6DCCA"/></linearGradient></defs><rect width="1024" height="500" fill="url(#bg)"/><rect x="76" y="72" width="34" height="5" fill="#3F685E"/>${text(132, 84, 22, 'NEWSWORTHY', '#3F685E', 'letter-spacing="4"')}${text(76, 222, 58, 'The world, at a glance.', '#142C28', 'font-weight="500" letter-spacing="-2"')}${text(78, 298, 27, 'A number out of 10. One sentence explaining why.', '#3F685E')}${text(78, 416, 23, 'Check in, then get on with your day.', '#3F685E')}</svg>`;
await out('source/feature-graphic.svg', feature);
await out('assets/google-play/feature-graphic.png', await sharp(Buffer.from(feature)).removeAlpha().png().toBuffer());
await out('assets/google-play/icon.png', await sharp(resolve(root, '../apps/client/assets/icon.png')).resize(512).removeAlpha().png().toBuffer());
await out('assets/manifest.json', JSON.stringify(manifest, null, 2) + '\n');

const thumbs = await Promise.all(manifest.filter(x => x.width === 1320).map(async x => ({ input: await sharp(resolve(root, x.file)).resize(330).toBuffer() })));
if (thumbs.length) await out('preview.png', await sharp({create:{width:330*thumbs.length,height:717,channels:3,background:'#EFF8F2'}}).composite(thumbs.map((x,i)=>({...x,left:i*330,top:0}))).png().toBuffer());
const androidThumbs = await Promise.all(manifest.filter(x=>x.platform==='android').map(async x=>({input:await sharp(resolve(root,x.file)).resize(330).toBuffer()})));
if (androidThumbs.length) await out('preview-android.png', await sharp({create:{width:330*androidThumbs.length,height:587,channels:3,background:'#EFF8F2'}}).composite(androidThumbs.map((x,i)=>({...x,left:i*330,top:0}))).png().toBuffer());
console.log(`Rendered ${manifest.length} store screenshots, Google artwork, and previews.`);
