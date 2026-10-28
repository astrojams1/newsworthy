#!/usr/bin/env python3
from pathlib import Path
import subprocess
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1]
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
for id,start,end,name in [('A-AntiFeed',2.8,4.2,'A-silence-cut'),('C-FullStop',3.4,4.8,'C-period-wipe'),('C-FullStop',18.6,20.2,'C-period-to-dash')]:
 times=[round(start+i*.1,2) for i in range(round((end-start)*10))]
 sheet=Image.new('RGB',(270*5,510*((len(times)+4)//5)),'#d7d5d0');d=ImageDraw.Draw(sheet)
 for i,t in enumerate(times):
  out=root/'qa/motion-temp.png';subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(root/'output'/f'{id}-1080x1920.mp4'),'-frames:v','1','-vf','scale=270:480',str(out)],check=True)
  x=i%5*270;y=i//5*510;sheet.paste(Image.open(out),(x,y));d.text((x+8,y+486),str(t)+'s',fill='black',font=font)
 sheet.save(root/'qa'/f'{name}.jpg',quality=94);out.unlink()
