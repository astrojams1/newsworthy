import {bundle} from '@remotion/bundler';
import {renderMedia,renderStill,selectComposition} from '@remotion/renderer';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const args=process.argv.slice(2),stills=args.includes('--stills'),draft=args.includes('--draft');
const only=args.find(a=>a.startsWith('--only='))?.split('=')[1];
const alt=args.includes('--alternate');
for(const arg of args)if(!['--stills','--draft','--alternate','--only=A','--only=B','--only=C'].includes(arg))throw new Error(`Unknown argument: ${arg}`);
const ids=['A-AntiFeed','B-OneDollar','C-FullStop'].filter(x=>!only||x.startsWith(only));
await mkdir('output',{recursive:true});await mkdir('qa',{recursive:true});await mkdir('previews',{recursive:true});
const serveUrl=await bundle({entryPoint:path.join(root,'src/index.ts'),publicDir:path.join(root,'public'),outDir:path.join(root,'.cache/bundle')});
const common={serveUrl,browserExecutable:process.env.CHROMIUM_PATH||'/usr/bin/chromium',chromiumOptions:{gl:'angle',disableWebSecurity:false},inputProps:alt?{hook:'alternate'}:{}};
const samples={'A-AntiFeed':[0,1.5,3.3,3.6,4.6,7.2,8.5,11.8,14.6,16.5,20.5],'B-OneDollar':[.3,3.8,6.5,8.5,10.3,12,14.5,19.5],'C-FullStop':[.3,2.7,4.7,7.2,9,12.3,14.5,17.8,22.5]};
for(const id of ids){
 const composition=await selectComposition({...common,id});
 if(stills){
  for(const time of samples[id]){const name=`previews/${id}-${time.toFixed(1)}${alt?'-alt':''}.png`;await renderStill({...common,composition,frame:Math.round(time*30),output:path.join(root,name),imageFormat:'png',scale:1,logLevel:'error'});console.log(name);}
 }else{
  const output=draft?`qa/draft-${id}.mp4`:`output/${id}${alt?'-alt':''}-1080x1920.mp4`;
  let last=-1;const started=Date.now();
  await renderMedia({...common,composition,codec:'h264',audioCodec:'aac',audioBitrate:'320k',pixelFormat:'yuv420p',colorSpace:'bt709',imageFormat:'png',crf:draft?24:16,x264Preset:draft?'ultrafast':'medium',scale:draft?.5:1,concurrency:3,outputLocation:path.join(root,output),logLevel:'error',onProgress:({progress})=>{const n=Math.floor(progress*10);if(n!==last){last=n;console.log(id,`${n*10}%`,`${Math.round((Date.now()-started)/1000)}s`);}}});
  console.log('Finished',output);
 }
}
