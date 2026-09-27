// A picture of the current palette for review: every level in light and dark
// through the production CSS (public/tokens.css + public/levels.css), the step
// between neighbouring levels, and the brand's icons, splash marks and share
// card. Needs Chromium (CHROMIUM_PATH or the cloud image's copy).
//   npm run design:preview  ->  artifacts/design-preview.png
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import tokens from '../public/tokens.js';
import { step } from '../design/colors.js';

const root = new URL('../', import.meta.url);
const file = path => readFileSync(new URL(path, root));
const dataUrl = (path, type) => `data:${type};base64,${file(path).toString('base64')}`;
const css = file('public/tokens.css', 'utf8') + file('public/levels.css', 'utf8').toString().replace(/@import[^;]+;/, '');
const source = JSON.parse(file('design/palette.json'));

const card = (level, mode) => `<div class="card" data-appearance="${mode}"><div data-level="${level.score}" class="fill">
  <div class="level-gradient" style="position:absolute;transition:none"></div>
  <small>${level.name}</small><b>${level.score}<i>∕10</i></b><span></span><span></span><span class="short"></span></div></div>`;
const steps = tokens.levels.slice(1).map((level, i) => step(tokens.levels[i].primary, level.primary));
const icons = [['apps/client/assets/icon.png', '#DDE3E8', 22.5], ['apps/client/plugins/widget-android/res/mipmap-xxxhdpi/ic_launcher_round.webp', '#DDE3E8', 50],
  ['apps/client/assets/icon-dark.png', '#1C1C22', 22.5], ['apps/client/plugins/widget-android/res/mipmap-night-xxxhdpi/ic_launcher_round.webp', '#1C1C22', 50]];
const html = `<!doctype html><meta charset="utf-8"><style>${css}
  body{margin:0;padding:28px;width:1560px;background:#EEEEEC;font:14px ui-sans-serif,system-ui,sans-serif;color:#16161A}
  h1{font-weight:400;font-size:26px;margin:0 0 4px} p{margin:0 0 18px;color:#52545D} h2{font-weight:500;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#626570;margin:20px 0 8px}
  .row{display:flex;gap:12px} .card{width:145px;height:250px;border-radius:16px;overflow:hidden;position:relative;box-shadow:0 1px 3px rgba(0,0,0,.15)}
  .fill{position:absolute;inset:0;isolation:isolate;background:var(--surface);color:var(--ink);display:flex;flex-direction:column;align-items:center;padding-top:16px;box-sizing:border-box}
  .fill>*:not(.level-gradient){position:relative} small{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-on-gradient-muted)}
  b{font:300 64px ui-monospace,Menlo,monospace;margin-top:38px} b i{font-size:12px;font-style:normal}
  span{display:block;width:104px;height:6px;border-radius:3px;background:var(--ink);opacity:.16;margin-top:8px} span.short{width:70px}
  .ramp{display:flex;height:30px;border-radius:8px;overflow:hidden} .ramp div{flex:1;font-size:11px;display:flex;align-items:center;justify-content:center;color:rgba(0,0,0,.6)}
  .steps{display:flex;padding-left:78px;margin-top:6px;font-size:11px;color:#626570} .steps div{flex:1;text-align:center} .steps div:last-child{flex:.5}
  .brand{display:flex;gap:16px;align-items:center} .tile{width:170px;height:170px;display:flex;align-items:center;justify-content:center;border-radius:12px}
</style><body>
<h1>${source.scale.name} palette · brand ${tokens.brand.name}</h1>
<p>${source.scale.about ?? ''}</p>
<h2>Light</h2><div class="row">${tokens.levels.map(l => card(l, 'light')).join('')}</div>
<h2>Dark</h2><div class="row">${tokens.levels.map(l => card(l, 'dark')).join('')}</div>
<h2>Primary colours and the step between neighbours (OKLab ΔE × 100)</h2>
<div class="ramp">${tokens.levels.map(l => `<div style="background:${l.primary}">${l.score} · ${l.primary}</div>`).join('')}</div>
<div class="steps">${steps.map(s => `<div>${s.toFixed(1)}</div>`).join('')}<div></div></div>
<h2>Brand: share card, app icons, splash marks</h2>
<div class="brand"><img src="${dataUrl('public/social-card.png', 'image/png')}" width="420">
${icons.map(([path, bg, r]) => `<div class="tile" style="background:${bg}"><img src="${dataUrl(path, path.endsWith('webp') ? 'image/webp' : 'image/png')}" width="120" style="border-radius:${r}%"></div>`).join('')}
<div class="tile" style="background:${tokens.brand.light.tinted}"><img src="${dataUrl('apps/client/assets/splash-light.png', 'image/png')}" width="80"></div>
<div class="tile" style="background:${tokens.brand.dark.tinted}"><img src="${dataUrl('apps/client/assets/splash.png', 'image/png')}" width="80"></div></div>
</body>`;

mkdirSync(new URL('artifacts/', root), { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ deviceScaleFactor: 1.5, viewport: { width: 1616, height: 900 } });
await page.setContent(html, { waitUntil: 'load' });
const out = new URL('artifacts/design-preview.png', root).pathname;
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('Wrote ' + out);
