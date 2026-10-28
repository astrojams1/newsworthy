import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:1280,height:1050}});await p.goto('http://127.0.0.1:8765');
const result=await p.evaluate(async()=>{
 const videos=[...document.querySelectorAll('video')];
 return Promise.all(videos.map(async(v)=>{
  v.muted=true;v.preload='auto';
  const result={src:v.currentSrc,observedFrames:[],events:[]};
  for(const evt of ['error','stalled','playing','ended'])v.addEventListener(evt,()=>result.events.push({event:evt,time:v.currentTime,error:v.error?.message}));
  if(v.requestVideoFrameCallback){const frame=(now,m)=>{result.observedFrames.push({time:m.mediaTime,presented:m.presentedFrames});if(!v.ended)v.requestVideoFrameCallback(frame)};v.requestVideoFrameCallback(frame);}
  const end=new Promise((r,reject)=>{v.addEventListener('ended',r,{once:true});v.addEventListener('error',()=>reject(new Error(v.error.message)),{once:true});setTimeout(()=>reject(new Error('Playback timed out')),45000)});
  await v.play();await end;return {...result,ended:v.ended,duration:v.duration,quality:v.getVideoPlaybackQuality()};
 }));
});
await p.screenshot({path:'qa/viewing-page.png',fullPage:true});
await writeFile('qa/playback-check.json',JSON.stringify({method:'Muted real-time H.264 playback in Chromium, video-frame callbacks collected; not human audio audition',videos:result},null,2));
console.log(result.map(x=>({src:x.src,frames:x.observedFrames.length,events:x.events,ended:x.ended,duration:x.duration})));
await b.close();
