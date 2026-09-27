// Renders each iteration (and the current palette) to PNG with Chromium.
// node store/design/gradient-iterations/render.mjs
// The shots were rendered before Temperature shipped, so "Current" in them is
// the old mint-to-rose palette; re-running now labels the shipped palette.
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { iterations, oklchToHex, hexToOklab } from './palettes.mjs';

const here = new URL('.', import.meta.url).pathname;
const palette = JSON.parse(readFileSync(new URL('../../../design/palette.json', import.meta.url)));
const look = palette.appearance;
const scores = [...Array(10)].map((_, i) => i + 1);

const current = {
  id: 'current', name: 'Current (for comparison)', texture: 'none',
  idea: 'Sage, mint, sea glass, olive, gold, honey, apricot, coral, rose. The hue doubles back between 1 and 3 and jumps at 4.',
  levels: palette.levels.map(l => ({ primary: l.primary, companion: l.companion })),
};
const sets = [current, ...iterations.map(it => ({
  ...it, levels: scores.map(s => ({ primary: oklchToHex(it.primary((s - 1) / 9)), companion: oklchToHex(it.companion((s - 1) / 9)) })),
}))];

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',');
const step = (a, b) => { const x = hexToOklab(a), y = hexToOklab(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) * 100; };

const svg = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
const noise = (freq, oct, extra = '') => svg(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${oct}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/>${extra}</filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`);
const textures = {
  none: () => '',
  grain: dark => `<i class="tx" style="background-image:${noise('.85', 3)};mix-blend-mode:${dark ? 'screen' : 'multiply'};opacity:${dark ? .07 : .16}"></i>`,
  paper: dark => `<i class="tx" style="background-image:${noise('.008 .35', 4)};mix-blend-mode:${dark ? 'screen' : 'multiply'};opacity:${dark ? .08 : .2}"></i>`
    + `<i class="tx" style="background-image:${noise('.7', 2)};mix-blend-mode:${dark ? 'screen' : 'multiply'};opacity:${dark ? .05 : .1}"></i>`,
  halftone: dark => `<i class="tx half" style="--dot:${dark ? '255,255,255' : '20,20,40'};opacity:${dark ? .10 : .14}"></i>`,
  stone: dark => `<i class="tx" style="background-image:${noise('.012', 5)};background-size:600px;mix-blend-mode:soft-light;opacity:${dark ? .5 : .75}"></i>`
    + `<i class="tx" style="background-image:${noise('.9', 2)};mix-blend-mode:${dark ? 'screen' : 'multiply'};opacity:${dark ? .05 : .09}"></i>`,
  linen: dark => `<i class="tx linen" style="--th:${dark ? '255,255,255' : '40,30,20'};opacity:${dark ? .5 : .8}"></i>`
    + `<i class="tx" style="background-image:${noise('.02 .9', 2)};mix-blend-mode:${dark ? 'screen' : 'multiply'};opacity:${dark ? .05 : .1}"></i>`,
};

const sentence = {
  1: 'Markets are quiet ahead of the weekend with no major releases due.',
  2: 'A quiet day: modest trading and no surprises from central banks.',
  3: 'The Fed held rates steady, as widely expected.',
  4: 'Oil rose after a pipeline outage in Canada tightened supply.',
  5: 'A weak jobs report raised odds of a rate cut next month.',
  6: 'China announced new export limits on rare earth metals.',
  7: 'A major US bank said it faces losses on commercial property loans.',
  8: 'Shipping through the Strait of Hormuz halted after strikes on tankers.',
  9: 'Stock markets fell sharply as a large lender reportedly failed.',
  10: 'Trading was halted on US exchanges after an unprecedented crash.',
};

function card(level, score, dark, big) {
  const t = look[dark ? 'dark' : 'light'];
  const p = rgb(level.primary), c = rgb(level.companion);
  return `<div class="card ${big ? 'big' : ''} ${dark ? 'dark' : ''}" style="background:${t.surface};color:${t.ink}">
  <i class="tx" style="background:
    radial-gradient(ellipse at 5% 0%, rgba(${c},${t.glow}), transparent 62%),
    radial-gradient(ellipse at 100% 100%, rgba(${p},${t.wash}), transparent 72%),
    radial-gradient(ellipse at 0% 100%, rgba(${c},${t.veil}), transparent 60%),
    linear-gradient(160deg, transparent 25%, rgba(${p},${t.veil}))"></i>
  ${textures[CUR.texture](dark)}
  <header>NEWSWORTHY</header>
  <div class="num">${score}<small>∕10</small></div>
  ${big ? `<p>${sentence[score]}</p><footer style="color:${t.gradientMuted}">Checked 4 min ago</footer>` : ''}
</div>`;
}
let CUR;

function page(set) {
  CUR = set;
  const hexes = set.levels.map(l => l.primary);
  const steps = hexes.slice(1).map((h, i) => step(hexes[i], h));
  const max = Math.max(...steps, 9);
  return `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#F4F4F2;font:14px ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#16161A;padding:36px 40px;width:1560px}
  h1{font-weight:400;font-size:30px;margin:0 0 6px;letter-spacing:.01em} .idea{color:#52545D;margin:0 0 22px;font-size:16px;max-width:1100px}
  .row{display:flex;gap:14px;margin-bottom:14px} .lbl{font-size:11px;letter-spacing:.12em;color:#626570;margin:18px 0 8px;text-transform:uppercase}
  .card{position:relative;overflow:hidden;width:142px;height:250px;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.12);isolation:isolate}
  .card.big{width:292px;height:560px;border-radius:24px}
  .tx{position:absolute;inset:0;z-index:0;pointer-events:none}
  .half{background-image:radial-gradient(circle at center, rgba(var(--dot),1) 0 1.1px, transparent 1.4px);background-size:5px 5px;transform:rotate(15deg) scale(1.6);
    -webkit-mask-image:linear-gradient(160deg, transparent 20%, #000 95%);mask-image:linear-gradient(160deg, transparent 20%, #000 95%)}
  .linen{background-image:repeating-linear-gradient(0deg, rgba(var(--th),.05) 0 1px, transparent 1px 3px),repeating-linear-gradient(90deg, rgba(var(--th),.04) 0 1px, transparent 1px 4px)}
  .card header{position:relative;z-index:1;font-size:8px;letter-spacing:.16em;padding:14px 12px}
  .big header{font-size:11px;padding:24px 22px}
  .num{position:relative;z-index:1;text-align:center;font:300 64px ui-monospace,SFMono-Regular,Menlo,monospace;margin-top:34px}
  .num small{font-size:12px;margin-left:2px}
  .big .num{font-size:130px;margin-top:120px} .big .num small{font-size:18px}
  .card p{position:relative;z-index:1;text-align:center;font-size:16px;line-height:1.45;margin:14px 26px 12px}
  .card footer{position:relative;z-index:1;text-align:center;font-size:11px}
  .ramp{display:flex;height:34px;border-radius:8px;overflow:hidden;width:1560px} .ramp div{flex:1}
  .cont{height:18px;border-radius:6px;width:1560px;margin-top:6px;background:linear-gradient(90deg,${hexes.join(',')})}
  .steps{display:flex;width:1560px;align-items:flex-end;height:60px;margin-top:10px;padding-left:78px;box-sizing:border-box;gap:0}
  .steps div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;font-size:10px;color:#626570}
  .steps b{display:block;width:26px;background:#9A9CA5;border-radius:3px 3px 0 0;margin-top:3px}
  .swl{display:flex;width:1560px} .swl span{flex:1;text-align:center;font-size:11px;color:#626570;padding-top:4px}
  </style><body>
  <h1>${set.name}</h1><p class="idea">${set.idea}${set.texture !== 'none' ? ` <br>Texture: <b>${set.texture}</b>.` : ''}</p>
  <div class="row">${[2, 5, 8, 10].map(s => card(set.levels[s - 1], s, false, true)).join('')}
  ${card(set.levels[7], 8, true, true)}</div>
  <div class="lbl">Light, 1 to 10</div><div class="row">${scores.map(s => card(set.levels[s - 1], s, false)).join('')}</div>
  <div class="lbl">Dark, 1 to 10</div><div class="row">${scores.map(s => card(set.levels[s - 1], s, true)).join('')}</div>
  <div class="lbl">Primary swatches and step size between neighbours (OKLab ΔE×100; even bars = smooth)</div>
  <div class="ramp">${hexes.map(h => `<div style="background:${h}"></div>`).join('')}</div>
  <div class="swl">${hexes.map((h, i) => `<span>${i + 1} · ${h}</span>`).join('')}</div>
  <div class="cont"></div>
  <div class="steps">${steps.map(s => `<div>${s.toFixed(1)}<b style="height:${s / max * 40}px"></b></div>`).join('')}<div style="flex:.5"></div></div>
  </body>`;
}

function overview() {
  return `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#F4F4F2;font:14px ui-sans-serif,system-ui,sans-serif;color:#16161A;padding:30px 36px;width:1200px}
  h2{font-weight:400;font-size:17px;margin:18px 0 6px} .r{display:flex;height:46px;border-radius:8px;overflow:hidden} .r div{flex:1;display:flex;align-items:flex-end;justify-content:center;font-size:11px;padding-bottom:4px;color:rgba(0,0,0,.55)}
  .c{height:12px;border-radius:5px;margin-top:4px} .s{font-size:11px;color:#626570;margin-top:3px}
  </style><body><h1 style="font-weight:400;font-size:26px;margin:0 0 4px">Level palettes, 1 → 10</h1>
  ${sets.map(set => { const h = set.levels.map(l => l.primary); const st = h.slice(1).map((c, i) => step(h[i], c));
    return `<h2>${set.name}</h2><div class="r">${h.map((c, i) => `<div style="background:${c}">${i + 1}</div>`).join('')}</div>
    <div class="c" style="background:linear-gradient(90deg,${h.join(',')})"></div>
    <div class="s">Step sizes: ${st.map(x => x.toFixed(1)).join(' · ')} &nbsp; (spread ${(Math.max(...st) - Math.min(...st)).toFixed(1)})</div>`; }).join('')}
  </body>`;
}

mkdirSync(here + 'shots', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const tab = await browser.newPage({ deviceScaleFactor: 1.5 });
const shoot = async (html, name) => {
  writeFileSync(here + `shots/${name}.html`, html);
  await tab.setContent(html, { waitUntil: 'load' });
  await tab.waitForTimeout(150);
  await tab.screenshot({ path: here + `shots/${name}.png`, fullPage: true });
};
await shoot(overview(), '0-overview');
for (const [i, set] of sets.entries()) await shoot(page(set), `${i}-${set.id}`);
await browser.close();
console.log('done');
