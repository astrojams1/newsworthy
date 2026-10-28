import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const hooks=JSON.parse(await readFile('src/b-hooks.json','utf8'));
const zones=JSON.parse(await readFile('qa/safe-zones.json','utf8'));
const types={'.html':'text/html','.js':'application/javascript','.json':'application/json','.mp4':'video/mp4','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.wav':'audio/wav'};
async function serve(dir){
 const server=createServer(async(req,res)=>{
  try{
   let requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(requested==='/')requested='/index.html';
   const file=path.resolve(dir,'.'+requested);if(!file.startsWith(dir+path.sep))throw new Error('Bad path');
   const s=await stat(file);const match=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
   const start=match?Number(match[1]):0,end=match&&match[2]?Math.min(Number(match[2]),s.size-1):s.size-1;
   const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Content-Length':end-start+1};
   if(match)headers['Content-Range']=`bytes ${start}-${end}/${s.size}`;
   res.writeHead(match?206:200,headers);createReadStream(file,{start,end}).pipe(res);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));return {server,url:`http://127.0.0.1:${server.address().port}`};
}
const review=await serve(root),bundle=await serve(path.join(root,'.cache/b-hooks/bundle'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
try{
 const layout=[];
 for(const hook of hooks){
  // A fresh render page prevents frame/prop state leaking between compositions.
  const page=await browser.newPage({viewport:{width:1080,height:1920}});
  await page.goto(bundle.url);await page.waitForFunction(()=>typeof window.remotion_setBundleMode==='function');
  await page.evaluate(h=>window.remotion_setBundleMode({type:'composition',compositionName:h.id,serializedResolvedPropsWithSchema:JSON.stringify({openingHeadline:h.headline}),compositionDurationInFrames:660,compositionFps:30,compositionHeight:1920,compositionWidth:1080}),hook);
  await page.waitForTimeout(300);await page.evaluate(()=>document.fonts.ready);
  for(const frame of [0,9,30,60,89,90,99]){
   await page.evaluate(({frame,id})=>window.remotion_setFrame(frame,id),{frame,id:hook.id});
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const boxes=await page.evaluate(()=>[...document.querySelectorAll('[data-safe]')].map(el=>{
    let opacity=1;for(let e=el;e;e=e.parentElement)opacity*=Number(getComputedStyle(e).opacity);
    const range=document.createRange();range.selectNodeContents(el);const r=range.getBoundingClientRect();return {text:el.textContent,opacity,x:r.x,y:r.y,right:r.right,bottom:r.bottom};
   }).filter(b=>b.opacity>.5));
   if(frame<90&&!boxes.some(b=>b.text===hook.headline))throw new Error(`${hook.id}: missing opening headline`);
   for(const b of boxes){const z=b.bottom<=1020?zones.safeAboveRail:zones.safe;if(b.x<z.x-1||b.y<z.y-1||b.right>z.x+z.width+1||b.bottom>z.y+z.height+1)throw new Error(`${hook.id} frame ${frame}: outside safe area: ${b.text}`);}
   const headline=boxes.find(b=>b.text===hook.headline);if(headline&&headline.bottom-headline.y>40)throw new Error(`${hook.id}: wrapped headline`);
   layout.push({id:hook.id,frame,boxes});
  }
  await page.close();
 }
 await writeFile('qa/b-hooks/layout-check.json',JSON.stringify({failures:[],samples:layout},null,2)+'\n');
 const viewer=await browser.newPage({viewport:{width:1600,height:1100}});await viewer.goto(review.url+'/b-hooks.html');
 const playbacks=[];
 for(const hook of hooks){
  const result=await viewer.evaluate(async id=>{
   const v=document.querySelector(`video[data-id="${id}"]`);v.muted=true;
   const events=[];for(const event of ['playing','stalled','error','ended'])v.addEventListener(event,()=>events.push({event,time:v.currentTime,error:v.error?.message}));
   let frames=0;if(v.requestVideoFrameCallback){const callback=()=>{frames++;if(!v.ended)v.requestVideoFrameCallback(callback)};v.requestVideoFrameCallback(callback);}
   const complete=new Promise((resolve,reject)=>{v.addEventListener('ended',resolve,{once:true});v.addEventListener('error',()=>reject(new Error(v.error.message)),{once:true});setTimeout(()=>reject(new Error('Playback timeout')),35000);});
   await v.play();await complete;const q=v.getVideoPlaybackQuality();return {id,duration:v.duration,ended:v.ended,events,frameCallbacks:frames,totalVideoFrames:q.totalVideoFrames,droppedVideoFrames:q.droppedVideoFrames};
  },hook.id);
  playbacks.push(result);console.log(hook.id,'playback ended',result.frameCallbacks,'frame callbacks');
 }
 await viewer.evaluate(()=>{for(const v of document.querySelectorAll('video')){v.pause();v.currentTime=.3;}});await viewer.waitForTimeout(400);
 await viewer.screenshot({path:'qa/b-hooks/viewing-page.png',fullPage:true});
 await writeFile('qa/b-hooks/playback-check.json',JSON.stringify({method:'Sequential muted real-time Chromium playback of finished MP4s; no audio audition',videos:playbacks},null,2)+'\n');
 console.log('Safe-zone, single-line headline and playback checks passed.');
}finally{await browser.close();review.server.close();bundle.server.close();}
