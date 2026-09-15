import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import tokens from '../public/tokens.js';
import { faviconSvg } from '../public/favicon.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = async (path, data) => { const target = resolve(root, path); await mkdir(dirname(target), { recursive: true }); await writeFile(target, data); };
const json = data => JSON.stringify(data, null, 2) + '\n';
function iconSvg(mode, { foreground = false, round = false, splash = false } = {}) {
  const theme = tokens.brand[mode];
  // The app identity stays deliberately uncolored. Only live reading
  // surfaces carry a level; launch marks can sit on the branded splash.
  const background = splash ? 'url(#brand)' : tokens.identity[mode].surface;
  const ink = splash ? theme.accent : tokens.identity[mode].ink;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><linearGradient id="brand" x2="1" y2="1"><stop stop-color="${theme.start}"/><stop offset=".45" stop-color="${theme.center}"/><stop offset="1" stop-color="${theme.end}"/></linearGradient></defs>${foreground ? '' : round ? `<circle cx="512" cy="512" r="512" fill="${background}"/>` : `<rect width="1024" height="1024" fill="${background}"/>`}<rect x="336" y="490" width="352" height="44" fill="${ink}"/></svg>`;
}
const png = async (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
for (const mode of ['light', 'dark']) await output(`public/brand/icon-${mode}.svg`, iconSvg(mode));
const inner = mode => faviconSvg(null, mode === 'dark').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replaceAll('id="level"', `id="${mode}"`).replaceAll('url(#level)', `url(#${mode})`);
await output('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>.dark{display:none}@media(prefers-color-scheme:dark){.light{display:none}.dark{display:block}}</style><g class="light">${inner('light')}</g><g class="dark">${inner('dark')}</g></svg>`);
for (const [file, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) await output('public/brand/' + file, await png(iconSvg('light'), size));
await output('public/manifest.webmanifest', json({ name: 'Newsworthy', short_name: 'Newsworthy', description: 'A calm global status indicator.', start_url: '/', display: 'standalone', background_color: tokens.brand.light.tinted, theme_color: tokens.brand.light.center, icons: [192, 512].map(size => ({ src: `/brand/icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any maskable' })) }));
const t = tokens.brand.light;
const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${t.start}"/><stop offset=".45" stop-color="${t.center}"/><stop offset="1" stop-color="${t.end}"/></linearGradient></defs><rect width="1200" height="630" fill="url(#bg)"/><g font-family="sans-serif" fill="${t.ink}"><text x="80" y="100" font-size="20" letter-spacing="5" fill="${t.accent}">NEWSWORTHY</text><text x="80" y="275" font-size="56">A calm global status indicator.</text><text x="80" y="360" font-size="48">Check in, then get on with your day.</text><text x="80" y="525" font-size="25" fill="${t.muted}">A number out of 10. One sentence. No doomscrolling.</text></g></svg>`;
await output('public/brand/share.png', await sharp(Buffer.from(social)).png().toBuffer());
await output('public/social-card.svg', social);
await output('public/social-card.png', await sharp(Buffer.from(social)).png().toBuffer());
// Expo source assets survive prebuild; native projects consume them through
// app.config.js and the existing widget config plugin.
await output('apps/client/assets/icon.png', await sharp(Buffer.from(iconSvg('light'))).removeAlpha().png().toBuffer());
await output('apps/client/assets/icon-dark.png', await sharp(Buffer.from(iconSvg('dark'))).removeAlpha().png().toBuffer());
await output('apps/client/assets/favicon.png', await png(iconSvg('light'), 64));
for (const mode of ['light', 'dark']) {
  await output(`apps/client/assets/adaptive-icon${mode === 'dark' ? '-dark' : ''}.png`, await png(iconSvg(mode, { foreground: true }), 432));
  await output(`apps/client/assets/splash${mode === 'light' ? '-light' : ''}.png`, await png(iconSvg(mode, { foreground: true, splash: true }), 240));
}
// Small baked gradient textures render consistently in Expo Go, native custom
// builds, and web without relying on experimental platform gradient support.
for (const level of tokens.levels) for (const mode of ['light', 'dark']) {
  const t = level[mode];
  const texture = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs><radialGradient id="a" cx="5%" cy="0%" r="95%"><stop stop-color="${level.companion}" stop-opacity="${t.glow}"/><stop offset="1" stop-color="${level.companion}" stop-opacity="0"/></radialGradient><radialGradient id="b" cx="100%" cy="100%" r="105%"><stop stop-color="${level.primary}" stop-opacity="${t.wash}"/><stop offset="1" stop-color="${level.primary}" stop-opacity="0"/></radialGradient><linearGradient id="c" x2="1" y2="1"><stop stop-color="${level.primary}" stop-opacity="0"/><stop offset="1" stop-color="${level.primary}" stop-opacity="${t.veil}"/></linearGradient></defs><rect width="512" height="512" fill="${t.surface}"/><rect width="512" height="512" fill="url(#c)"/><rect width="512" height="512" fill="url(#b)"/><rect width="512" height="512" fill="url(#a)"/></svg>`;
  await output(`apps/client/assets/gradients/${level.score}-${mode}.png`, await sharp(Buffer.from(texture)).png().toBuffer());
}
await output('apps/client/lib/gradient-images.ts', '// Generated by npm run design:assets. Static imports are required by Metro.\nexport const gradientImages = [\n' + tokens.levels.map(level => `  { light: require('../assets/gradients/${level.score}-light.png'), dark: require('../assets/gradients/${level.score}-dark.png') },`).join('\n') + '\n];\n');
const res = 'apps/client/plugins/widget-android/res';
for (const mode of ['light', 'dark']) for (const [density, factor] of [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]]) {
  const folder = `${res}/mipmap${mode === 'dark' ? '-night' : ''}-${density}`;
  for (const [name, foreground, round, size] of [['ic_launcher', false, false, 48], ['ic_launcher_round', false, true, 48], ['ic_launcher_foreground', true, false, 108]]) {
    await output(`${folder}/${name}.webp`, await sharp(Buffer.from(iconSvg(mode, { foreground, round }))).resize(Math.round(size * factor)).webp({ lossless: true }).toBuffer());
  }
  await output(`${res}/drawable${mode === 'dark' ? '-night' : ''}-${density}/splashscreen_logo.png`, await png(iconSvg(mode, { foreground: true, splash: true }), Math.round(80 * factor)));
}
await output(`${res}/drawable/launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by npm run design:assets. -->\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="@color/nw_identity_surface"/></shape>\n`);
await output(`${res}/drawable/launcher_monochrome.xml`, '<?xml version="1.0" encoding="utf-8"?>\n<!-- The system supplies the color for themed launcher icons. -->\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="#FFFFFFFF" android:pathData="M35.4375,51.6797 h37.125 v4.6406 h-37.125 Z"/></vector>\n');
for (const name of ['ic_launcher', 'ic_launcher_round']) {
  for (const version of [26, 33]) await output(`${res}/mipmap-anydpi-v${version}/${name}.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@drawable/launcher_background"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/>${version >= 33 ? '<monochrome android:drawable="@drawable/launcher_monochrome"/>' : ''}</adaptive-icon>\n`);
}
console.log('Generated web, iOS, and Android brand icons, splash marks, and share art.');
