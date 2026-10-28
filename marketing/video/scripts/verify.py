#!/usr/bin/env python3
"""Verify delivery files, decode final frames, and save provenance. No app requests."""
import hashlib,json,subprocess,re
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
DURATIONS={'A-AntiFeed':22,'B-OneDollar':22,'C-FullStop':24}
TIMES={'A-AntiFeed':[0,1.5,3.3,3.6,4.6,7.2,8.5,11.8,14.6,16.5,20.5], 'B-OneDollar':[.3,3.8,6.5,8.5,10.3,12,14.5,19.5], 'C-FullStop':[.3,2.7,3.8,4.7,7.2,9,12.3,14.5,16.5,17.8,19.5,22.5]}
def run(args):
 return subprocess.run(args,check=True,capture_output=True,text=True)
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
qa=ROOT/'qa';previews=ROOT/'previews';qa.mkdir(exist_ok=True);previews.mkdir(exist_ok=True)
zones=json.loads((ROOT/'qa/safe-zones.json').read_text())
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
report={'delivery':{},'inputs':{},'limitations':['Native screenshots are historical captures, not a fresh iOS verification.','Audio measured objectively; not auditioned by ear.','Desktop safe-zone checks do not establish each social app overlay on every phone.']}
for id,seconds in DURATIONS.items():
 video=ROOT/'output'/f'{id}-1080x1920.mp4'
 meta=json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(video)]).stdout)
 v=next(s for s in meta['streams'] if s['codec_type']=='video');a=next(s for s in meta['streams'] if s['codec_type']=='audio')
 assert (v['width'],v['height'],v['r_frame_rate'],v['codec_name'],v['pix_fmt'])==(1080,1920,'30/1','h264','yuv420p')
 assert abs(float(meta['format']['duration'])-seconds)<.1
 assert v.get('color_space')=='bt709'
 assert a['codec_name']=='aac' and a['channels']==2 and a['sample_rate']=='48000'
 decode=run(['ffmpeg','-v','error','-i',str(video),'-f','null','-'])
 assert not decode.stderr,decode.stderr
 loud=run(['ffmpeg','-hide_banner','-i',str(video),'-af','loudnorm=I=-17:TP=-2:LRA=11:print_format=json','-f','null','-']).stderr
 stats=json.loads(loud[loud.rfind('{'):loud.rfind('}')+1]);assert float(stats['input_tp'])<=-2
 report['delivery'][id]={'file':str(video.relative_to(ROOT)),'bytes':video.stat().st_size,'sha256':digest(video),'duration':float(meta['format']['duration']),'width':v['width'],'height':v['height'],'fps':v['r_frame_rate'],'codec':v['codec_name'],'pixel_format':v['pix_fmt'],'profile':v.get('profile'),'color_space':v.get('color_space'),'audio':{'codec':a['codec_name'],'sample_rate':a['sample_rate'],'channels':a['channels'],'integrated_lufs':stats['input_i'],'true_peak_dbtp':stats['input_tp'],'loudness_range_lu':stats['input_lra']},'full_decode':'passed'}
 times=TIMES[id];sheet=Image.new('RGB',(1080,414*((len(times)+4)//5)),'#d7d5d0');d=ImageDraw.Draw(sheet)
 for i,t in enumerate(times):
  dest=previews/f'{id}-{t:.1f}.png'
  run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(video),'-frames:v','1',str(dest)])
  im=Image.open(dest).convert('RGB').resize((216,384));x=i%5*216;y=i//5*414;sheet.paste(im,(x,y));d.text((x+6,y+390),f'{t:.1f}s',font=font,fill='black')
 sheet.save(previews/f'{id}-contact-sheet.jpg',quality=92)
 cover=previews/f'{id}-{times[0]:.1f}.png';Image.open(cover).convert('RGB').save(previews/f'{id}-cover.jpg',quality=94)
 # Overlay measured keep-outs on final decoded frames, at half-second intervals.
 tiles=[]
 for i in range(seconds*2):
  t=i/2;dest=qa/f'{id}-sample.jpg'
  run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(video),'-frames:v','1','-vf','scale=270:480',str(dest)])
  im=Image.open(dest).convert('RGBA');overlay=Image.new('RGBA',im.size);od=ImageDraw.Draw(overlay)
  for z in zones['keepOut']:
   od.rectangle((z['x']/4,z['y']/4,(z['x']+z['width'])/4,(z['y']+z['height'])/4),fill=(180,0,0,45))
  z=zones['safe'];od.rectangle((z['x']/4,z['y']/4,(z['x']+z['width'])/4,(z['y']+z['height'])/4),outline=(0,150,70,200),width=1)
  im=Image.alpha_composite(im,overlay).convert('RGB');tiles.append((im,t))
 sheet=Image.new('RGB',(270*6,510*((len(tiles)+5)//6)),'#d7d5d0');d=ImageDraw.Draw(sheet)
 for i,(im,t) in enumerate(tiles):
  x=i%6*270;y=i//6*510;sheet.paste(im,(x,y));d.text((x+6,y+486),f'{t:.1f}s',font=font,fill='black')
 sheet.save(qa/f'{id}-safe-zones.jpg',quality=91);dest.unlink()
 print(id,'verified',stats['input_i'],'LUFS',flush=True)
for folder in ['src','public','scripts']:
 for p in sorted((ROOT/folder).rglob('*')):
  if p.is_file():report['inputs'][str(p.relative_to(ROOT))]=digest(p)
for name in ['package.json','package-lock.json']:report['inputs'][name]=digest(ROOT/name)
(qa/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
