#!/usr/bin/env python3
"""Check the new hook films against the immutable winning control, frame by frame."""
import hashlib,json,subprocess
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parents[1]
HOOKS=json.loads((ROOT/'src/b-hooks.json').read_text())
BASE=json.loads((ROOT/'qa/verification.json').read_text())['delivery']
CONTROL=ROOT/BASE['B-OneDollar']['file']
QA=ROOT/'qa/b-hooks';PREVIEWS=ROOT/'previews/b-hooks'
QA.mkdir(exist_ok=True);PREVIEWS.mkdir(exist_ok=True)
def run(args,binary=False):
 return subprocess.run(args,check=True,capture_output=True,text=not binary)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def media(p):return json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]).stdout)
def frames(p):
 output=run(['ffmpeg','-v','error','-i',str(p),'-map','0:v:0','-f','framemd5','-']).stdout
 return [line.split(',')[-1].strip() for line in output.splitlines() if line and not line.startswith('#')]
def audio_hash(p,encoded=False):
 options=['-c:a','copy','-f','adts'] if encoded else ['-c:a','pcm_s16le','-f','s16le']
 return hashlib.sha256(run(['ffmpeg','-v','error','-i',str(p),'-map','0:a:0',*options,'-'],binary=True).stdout).hexdigest()
for item in BASE.values():assert digest(ROOT/item['file'])==item['sha256'],item['file']+' was changed'
control_frames=frames(CONTROL);assert len(control_frames)==660
control_audio=audio_hash(CONTROL);control_aac=audio_hash(CONTROL,True)
report={'control':{'file':str(CONTROL.relative_to(ROOT)),'sha256':digest(CONTROL),'frames':len(control_frames),'decoded_audio_sha256':control_audio,'aac_payload_sha256':control_aac},'changed_interval':'[0,3) seconds; only headline content differs in source','variants':[],'inputs':{}}
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
# Contact includes the control for a like-for-like review of the copy.
comparison=Image.new('RGB',(1080,550),'#d7d5d0');cd=ImageDraw.Draw(comparison)
for index,(id,video) in enumerate([('B-Control',CONTROL)]+[(h['id'],ROOT/'output/b-hooks'/f"{h['id']}-1080x1920.mp4") for h in HOOKS]):
 capture=PREVIEWS/f'{id}-0.3.png'
 run(['ffmpeg','-v','error','-y','-ss','0.3','-i',str(video),'-frames:v','1',str(capture)])
 comparison.paste(Image.open(capture).convert('RGB').resize((270,480)),(index*270,0));cd.text((index*270+12,495),id,fill='black',font=font)
comparison.save(PREVIEWS/'opening-comparison.jpg',quality=94)
for hook in HOOKS:
 id=hook['id'];video=ROOT/'output/b-hooks'/f'{id}-1080x1920.mp4'
 meta=media(video);v=next(x for x in meta['streams'] if x['codec_type']=='video');a=next(x for x in meta['streams'] if x['codec_type']=='audio')
 assert (v['width'],v['height'],v['r_frame_rate'],v['codec_name'],v['pix_fmt'],v.get('color_space'))==(1080,1920,'30/1','h264','yuv420p','bt709')
 assert a['codec_name']=='aac' and a['sample_rate']=='48000' and a['channels']==2
 assert abs(float(meta['format']['duration'])-float(media(CONTROL)['format']['duration']))<.001
 decoded=run(['ffmpeg','-v','error','-i',str(video),'-f','null','-']);assert not decoded.stderr,decoded.stderr
 hashes=frames(video);assert len(hashes)==660,(id,len(hashes))
 assert hashes[:90]!=control_frames[:90],id+' opening did not change'
 assert hashes[90:]==control_frames[90:],id+' differs from the control after 3s'
 assert audio_hash(video)==control_audio,id+' decoded audio changed'
 assert audio_hash(video,True)==control_aac,id+' AAC payload changed'
 raw=video.read_bytes();assert 0<raw.find(b'moov')<raw.find(b'mdat'),id+' not faststart'
 times=[0,.3,2.9,3,3.1,8,12,17,20.5]
 sheet=Image.new('RGB',(1080,414*2),'#d7d5d0');d=ImageDraw.Draw(sheet)
 for i,t in enumerate(times):
  dest=PREVIEWS/f'{id}-{t:.1f}.png'
  run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(video),'-frames:v','1',str(dest)])
  im=Image.open(dest).convert('RGB').resize((216,384));x=i%5*216;y=i//5*414;sheet.paste(im,(x,y));d.text((x+8,y+388),f'{t:.1f}s',fill='black',font=font)
 sheet.save(PREVIEWS/f'{id}-contact-sheet.jpg',quality=92)
 Image.open(PREVIEWS/f'{id}-0.3.png').convert('RGB').save(PREVIEWS/f'{id}-cover.jpg',quality=94)
 report['variants'].append({**hook,'file':str(video.relative_to(ROOT)),'bytes':video.stat().st_size,'sha256':digest(video),'duration':float(meta['format']['duration']),'video':{'width':v['width'],'height':v['height'],'fps':v['r_frame_rate'],'codec':v['codec_name'],'pixel_format':v['pix_fmt'],'color_space':v['color_space'],'frames':len(hashes)},'decode':'passed','identical_frames_from_3s':570,'decoded_audio_identical':True,'aac_payload_identical':True,'faststart':True})
 print(id,'passed: 570 identical tail frames; entire audio identical.',flush=True)
for folder in ['src','scripts','public']:
 for file in sorted((ROOT/folder).rglob('*')):
  if file.is_file():report['inputs'][str(file.relative_to(ROOT))]=digest(file)
for name in ['package.json','package-lock.json','tsconfig.json']:report['inputs'][name]=digest(ROOT/name)
(QA/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
