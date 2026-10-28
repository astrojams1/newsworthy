import React from 'react';
import {AbsoluteFill,Audio,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {Canvas,Text,Label,Dash,Device,EndCard,Reveal,p,lerp,INK,PAPER,STONE} from './design';
export type FilmProps={hook?:'alternate';openingHeadline?:string};
export const AntiFeed:React.FC<FilmProps>=({hook})=>{
 const f=useCurrentFrame(),{fps}=useVideoConfig(),t=f/fps;
 const feedShift=105*t+42*t*t+35*t*t*t;
 return <Canvas dark={t<3.5||(t>=14&&t<18)}><Audio src={staticFile('audio/A.wav')}/>
 {t<3.5&&<AbsoluteFill style={{overflow:'hidden'}}>
 <div style={{position:'absolute',left:100,top:0,width:2,height:1920,background:'#43433E'}}/>
 <div style={{position:'absolute',left:884,top:0,width:2,height:1920,background:'#43433E'}}/>
 {Array.from({length:20},(_,i)=><div key={i} style={{position:'absolute',left:120,top:330+i*274-feedShift,fontSize:252,lineHeight:1,letterSpacing:-16,fontWeight:550,color:i%4===0?PAPER:'#A9A79F',filter:t>2.2?`blur(${(t-2.2)*1.8}px)`:'none'}}>MORE<span style={{color:STONE}}>.</span></div>)}
 <div style={{position:'absolute',left:120,top:1190,width:744,height:185,background:INK,paddingTop:27,borderTop:'1px solid #77766F'}}><span data-safe style={{fontSize:36,letterSpacing:-1}}>{hook?'How much news is enough?':'The feed never says enough.'}</span></div>
 </AbsoluteFill>}
 {t>=3.5&&t<7&&<><Label>Newsworthy / A different kind of news app</Label><Reveal t={t} at={3.85}><Text y={730} size={176}>Enough.</Text></Reveal><div style={{position:'absolute',left:125,top:952,width:lerp(0,92,p(t,4.2,5.4)),height:11,background:INK}}/></>}
 {t>=7&&t<14&&<Device t={t} at={7} caption={t<11?'World news. Rated.':'One score. One sentence.'}/>}
 {t>=14&&t<18&&<><Label dark>Stay informed. Keep your attention.</Label><Text y={650} size={101}>Stay informed.</Text><Reveal t={t} at={15.25}><Text y={790} size={101} style={{color:STONE}}>Not addicted.</Text></Reveal><Dash y={1058} color={STONE}/></>}
 {t>=18&&<EndCard t={t} at={18}/>}
 </Canvas>;
};
export const OneDollar:React.FC<FilmProps>=({hook,openingHeadline})=>{
 const t=useCurrentFrame()/useVideoConfig().fps;
 return <Canvas dark={t>=10}><Audio src={staticFile('audio/B.wav')}/>
 {t<3&&<><Label style={{fontSize:28,letterSpacing:1.5}}>{openingHeadline ?? (hook?'A small price for a smaller news habit.':'Your attention is worth more.')}</Label><Text y={500} size={500} style={{fontWeight:400,letterSpacing:-32}}>$1<span style={{fontSize:160,letterSpacing:-8}}>.</span></Text><Text y={1100} size={55} style={{letterSpacing:-2}}>Pay with a dollar.</Text></>}
 {t>=3&&t<6&&<><Label>One-time purchase</Label><Text y={675} size={184} style={{fontWeight:420}}>Once.</Text><Reveal t={t} at={3.65}><Text y={1015} size={54} style={{letterSpacing:-2}}>Not every month.</Text></Reveal></>}
 {t>=6&&t<10&&<>
 <div style={{position:'absolute',left:120,top:366,width:720,height:2,background:INK}}/>
 <Label y={405} style={{color:INK,fontSize:25}}>Newsworthy / What you get</Label>
 {['World news, rated.','No subscription.','No ads.'].map((line,i)=><Reveal key={line} t={t} at={6+i*.72}><Text y={570+i*167} size={57} style={{letterSpacing:-2,fontWeight:400}}>{line}<span style={{float:'right',fontSize:35,paddingTop:10}}>—</span></Text></Reveal>)}
 <div style={{position:'absolute',left:120,top:1100,width:720,height:2,background:INK}}/>
 <Text y={1150} size={42} style={{letterSpacing:-1}}>Total<span style={{float:'right',fontSize:95,lineHeight:.9,letterSpacing:-5}}>$1</span></Text>
 <Label y={1320} style={{fontSize:19,letterSpacing:2}}>USD · One-time paid download</Label>
 </>}
 {t>=10&&t<17&&<Device t={t} at={10} dark caption={t<13?'A small app. A clear purpose.':'A score. A sentence. No feed.'}/>}
 {t>=17&&<EndCard t={t} at={17} dark line={'Pay once.\nKeep your attention.'}/>}
 </Canvas>;
};
export const FullStop:React.FC<FilmProps>=({hook})=>{
 const t=useCurrentFrame()/useVideoConfig().fps;
 const dotTravel=p(t,2.5,3.8);
 const u=p(t,18.7,20),dotX=(1-u)**3*600+3*(1-u)**2*u*950+3*(1-u)*u*u*950+u**3*120;
 const dotY=(1-u)**3*870+3*(1-u)**2*u*870+3*(1-u)*u*u*530+u**3*530;
 return <Canvas dark={t>=4&&t<7}><Audio src={staticFile('audio/C.wav')}/>
 {t<4&&<>
 <Label>{hook?'The most radical thing in news.':'A news app with an ending.'}</Label>
 <Text y={570} size={225} style={{fontWeight:440,letterSpacing:-13,opacity:1-p(t,3.45,3.95)}}>The<br/>end</Text>
 <div style={{position:'absolute',left:lerp(480,776,dotTravel),top:lerp(989,1138,dotTravel),width:28,height:28,borderRadius:'50%',background:INK,transform:`scale(${1+p(t,3.65,4)*90})`}}/>
 </>}
 {t>=4&&t<7&&<>
 <Label dark>Newsworthy</Label>
 <Reveal t={t} at={4.1}><Text y={610} size={112}>News doesn’t<br/>have to be<br/>endless.</Text></Reveal>
 <div style={{position:'absolute',left:120,top:1138,width:690,height:2,background:'#6E6C64'}}/>
 <div style={{position:'absolute',left:lerp(120,795,p(t,4.35,6.3)),top:1126,width:28,height:28,borderRadius:'50%',background:PAPER}}/>
 </>}
 {t>=7&&t<12&&<Device t={t} at={7} caption="First, a score and a sentence."/>}
 {t>=12&&t<14&&<Device t={t} at={12} timeline caption="The past week, in one list."/>}
 {t>=14&&t<17&&<>
 <Label>The timeline / One week</Label>
 <Text y={585} size={169}>7 days.</Text>
 <Text y={835} size={62} style={{letterSpacing:-2.5}}>A list that ends.</Text>
 <div style={{position:'absolute',left:125,top:1100,width:690*p(t,14,16.2),height:2,background:INK}}/>
 {Array.from({length:7},(_,i)=><div key={i} style={{position:'absolute',left:125+i*115,top:1084,width:2,height:34,background:INK,opacity:p(t,14+i*.22,14.3+i*.22)}}/>)}
 <div style={{position:'absolute',left:lerp(113,803,p(t,14,16.2)),top:1088,width:26,height:26,borderRadius:'50%',background:'#9F5D47'}}/>
 </>}
 {t>=17&&t<20&&<>
 <Text y={610} size={145}>News.<br/>Full stop</Text>
 <Label y={1105}>World news, rated by significance.</Label>
 <div style={{position:'absolute',left:dotX,top:dotY,width:lerp(24,78,p(t,18.7,20)),height:lerp(24,12,p(t,18.7,20)),borderRadius:lerp(12,0,p(t,18.7,20)),background:INK}}/>
 </>}
 {t>=20&&<EndCard t={t} at={19.4} line={'A little perspective.\nA place to stop.'}/>}
 </Canvas>;
};
