import {bundle} from '@remotion/bundler';
import {renderMedia,renderStill,selectComposition} from '@remotion/renderer';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const args=process.argv.slice(2);
for(const arg of args)if(!['--stills','--render','--only=B1','--only=B2','--only=B3'].includes(arg))throw new Error(`Unknown argument: ${arg}`);
if(args.includes('--stills')===args.includes('--render'))throw new Error('Choose exactly one: --stills or --render');
const only=args.find(x=>x.startsWith('--only='))?.slice(7);
const hooks=JSON.parse(await readFile('src/b-hooks.json','utf8')).filter(x=>!only||x.id.startsWith(only));
const control='output/B-OneDollar-1080x1920.mp4';
const sha=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
const expected=JSON.parse(await readFile('qa/verification.json','utf8')).delivery['B-OneDollar'].sha256;
if(await sha(control)!==expected)throw new Error('The winning control changed. Refusing to use an unverified control.');
const keyframes=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-skip_frame','nokey','-show_entries','frame=best_effort_timestamp_time','-of','json',control],{encoding:'utf8'})).frames;
if(!keyframes.some(x=>Math.abs(Number(x.best_effort_timestamp_time)-3)<.00001))throw new Error('Control must have a keyframe exactly at 3s to preserve its tail.');
for(const dir of ['output/b-hooks','previews/b-hooks','qa/b-hooks','.cache/b-hooks'])await mkdir(dir,{recursive:true});
const serveUrl=await bundle({entryPoint:path.join(root,'src/index.ts'),publicDir:path.join(root,'public'),outDir:path.join(root,'.cache/b-hooks/bundle')});
const common={serveUrl,browserExecutable:process.env.CHROMIUM_PATH||'/usr/bin/chromium',chromiumOptions:{gl:'angle'},logLevel:'error'};
const ffmpeg=args=>execFileSync('ffmpeg',['-hide_banner','-v','error','-y',...args],{stdio:'pipe'});
const controlTail=path.join(root,'.cache/b-hooks/control-tail.mp4');
if(args.includes('--render'))ffmpeg(['-ss','3','-i',control,'-map','0:v:0','-an','-c:v','copy',controlTail]);
const report={control,controlSha256:expected,method:'Remotion frames 0–89 + stream-copy of control video from keyframe 3s; full control AAC track copied unchanged',variants:[]};
for(const hook of hooks){
 const composition=await selectComposition({...common,id:hook.id,inputProps:{}});
 if(args.includes('--stills')){
  for(const time of [.3,2.9,3]){
   const output=path.join(root,`previews/b-hooks/${hook.id}-${time.toFixed(1)}.png`);
   await renderStill({...common,composition,inputProps:{},frame:Math.round(time*30),imageFormat:'png',output});
   console.log(output);
  }
  continue;
 }
 const intro=path.join(root,`.cache/b-hooks/${hook.id}-intro.mp4`);
 let last=-1;
 await renderMedia({...common,composition,inputProps:{},frameRange:[0,89],muted:true,codec:'h264',pixelFormat:'yuv420p',colorSpace:'bt709',imageFormat:'png',crf:16,x264Preset:'medium',concurrency:3,outputLocation:intro,onProgress:({progress})=>{const n=Math.floor(progress*4);if(n!==last){last=n;console.log(hook.id,`${n*25}%`);}}});
 const concatList=path.join(root,`.cache/b-hooks/${hook.id}-concat.txt`);
 const concatPath=p=>p.replaceAll("'","'\\''");
 await writeFile(concatList,`file '${concatPath(intro)}'\nduration 3\nfile '${concatPath(controlTail)}'\n`);
 const visuals=path.join(root,`.cache/b-hooks/${hook.id}-visuals.mp4`);
 ffmpeg(['-f','concat','-safe','0','-i',concatList,'-map','0:v:0','-c:v','copy',visuals]);
 const temp=path.join(root,`.cache/b-hooks/${hook.id}-complete.mp4`);
 ffmpeg(['-i',visuals,'-i',control,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',temp]);
 const output=`output/b-hooks/${hook.id}-1080x1920.mp4`;
 await rename(temp,output);
 report.variants.push({...hook,output,sha256:await sha(output)});
 console.log('Finished',output);
}
if(args.includes('--render')){
 if(await sha(control)!==expected)throw new Error('Control changed during render.');
 await writeFile(`qa/b-hooks/render${only?'-'+only:''}.json`,JSON.stringify(report,null,2)+'\n');
}
