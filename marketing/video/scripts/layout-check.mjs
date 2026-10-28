import {chromium} from 'playwright-core';
import {readFile,writeFile} from 'node:fs/promises';
const zones=JSON.parse(await readFile(new URL('../qa/safe-zones.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1080,height:1920}});
await page.goto('http://127.0.0.1:8766/index.html');
await page.waitForFunction(()=>typeof window.remotion_setBundleMode==='function');
const result=[];
for(const [id,n] of [['A-AntiFeed',660],['B-OneDollar',660],['C-FullStop',720]]){
 await page.evaluate(({id,n})=>window.remotion_setBundleMode({type:'composition',compositionName:id,serializedResolvedPropsWithSchema:'{}',compositionDurationInFrames:n,compositionFps:30,compositionHeight:1920,compositionWidth:1080}),{id,n});
 await page.waitForTimeout(500);
 for(let f=0;f<n;f+=6){
  await page.evaluate(({f,id})=>window.remotion_setFrame(f,id),{f,id});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const boxes=await page.evaluate(()=>[...document.querySelectorAll('[data-safe]')].map(el=>{
   let visible=1;for(let a=el;a;a=a.parentElement)visible*=Number(getComputedStyle(a).opacity);
   const range=document.createRange();range.selectNodeContents(el);const r=range.getBoundingClientRect();
   return {text:el.textContent,opacity:visible,x:r.x,y:r.y,right:r.right,bottom:r.bottom};
  }).filter(r=>r.opacity>.5));
  for(const b of boxes){const z=b.bottom<=1020?zones.safeAboveRail:zones.safe;if(b.x<z.x-1||b.y<z.y-1||b.right>z.x+z.width+1||b.bottom>z.y+z.height+1)result.push({id,frame:f,...b});}
 }
}
await writeFile('qa/layout-check.json',JSON.stringify({sampleIntervalFrames:6,scope:'Visible editorial text bounds; native screenshot content visually reviewed separately',failures:result},null,2));
console.log(JSON.stringify(result.slice(0,20),null,2));console.log('Failures:',result.length);
await browser.close();
if(result.length)process.exitCode=1;
