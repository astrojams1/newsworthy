import React from 'react';
import {AbsoluteFill, Img, interpolate, Easing, staticFile} from 'remotion';
export const INK='#16161A', PAPER='#F4F2ED', MUTED='#74736E', STONE='#B6B4AC';
export const ease=Easing.bezier(.22,1,.36,1);
export const p=(t:number,a:number,b:number)=>interpolate(t,[a,b],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:ease});
export const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
export const Fonts=()=> <style>{`@font-face{font-family:Inter;font-weight:100 900;src:url('${staticFile('fonts/inter-latin-opsz-normal.woff2')}')}@font-face{font-family:Mono;src:url('${staticFile('fonts/roboto-mono-latin-300-normal.woff2')}');font-weight:300}*{box-sizing:border-box}body{margin:0}`}</style>;
export const Canvas:React.FC<{dark?:boolean;children:React.ReactNode}>=({dark=false,children})=><AbsoluteFill style={{background:dark?INK:PAPER,color:dark?PAPER:INK,fontFamily:'Inter',fontWeight:400}}><Fonts/>{children}</AbsoluteFill>;
export const Label:React.FC<{children:React.ReactNode;y?:number;dark?:boolean;style?:React.CSSProperties}>=({children,y=340,dark=false,style})=><div data-safe style={{position:'absolute',left:120,top:y,width:720,fontSize:22,lineHeight:1.35,letterSpacing:3,textTransform:'uppercase',color:dark?STONE:MUTED,...style}}>{children}</div>;
export const Text:React.FC<{children:React.ReactNode;x?:number;y:number;size?:number;w?:number;style?:React.CSSProperties}>=({children,x=120,y,size=112,w=744,style})=><div data-safe style={{position:'absolute',left:x,top:y,width:w,fontSize:size,letterSpacing:-size*.055,lineHeight:1.04,fontWeight:450,...style}}>{children}</div>;
export const Reveal:React.FC<{children:React.ReactNode;t:number;at:number;duration?:number}>=({children,t,at,duration=.75})=>{const v=p(t,at,at+duration);return <div style={{opacity:v,transform:`translateY(${(1-v)*34}px)`,filter:`blur(${(1-v)*3}px)`}}>{children}</div>};
export const Dash:React.FC<{x?:number;y?:number;width?:number;color?:string}>=({x=120,y=490,width=74,color=INK})=><div style={{position:'absolute',left:x,top:y,width,height:12,background:color}}/>;
// Unretouched native simulator captures. The date label sits OUTSIDE the device.
export const Device:React.FC<{t:number;at?:number;dark?:boolean;timeline?:boolean;caption:string;zoom?:boolean}>=({t,at=0,dark=false,timeline=false,caption,zoom=true})=>{
 const e=p(t,at,at+1.15);const s=zoom?lerp(1.065,1,e):1;
 return <>
 <Text y={300} size={55} style={{letterSpacing:-2.2,fontWeight:430}}>{caption}</Text>
 <div style={{position:'absolute',left:143,top:407,width:674,height:1448,borderRadius:78,background:'#08080A',padding:7,overflow:'hidden',transform:`translateY(${(1-e)*70}px) scale(${s})`,transformOrigin:'50% 40%',opacity:e,boxShadow:'0 5px 0 #7A7976, 0 28px 58px #16161a18'}}>
 <div style={{borderRadius:72,overflow:'hidden',width:660,height:1434,background:dark?'#101014':'#fff'}}>
 <Img src={staticFile(`ui/${timeline?'timeline':dark?'reading-dark':'reading-light'}.png`)} style={{width:660,height:'auto',display:'block'}}/>
 </div></div>
 <Label y={372} style={{left:120,width:720,fontSize:21,letterSpacing:1.4,color:dark?'#D0CEC7':'#52524E',opacity:e}}>Recorded 1 Oct 2026</Label>
 </>;
};
export const EndCard:React.FC<{t:number;at:number;dark?:boolean;line?:string}>=({t,at,dark=false,line='World news, rated\nby significance.'})=>{
 const e=p(t,at,at+.65);
 return <AbsoluteFill style={{background:dark?INK:PAPER,color:dark?PAPER:INK,opacity:e}}>
 <Dash x={120} y={530} width={78} color={dark?PAPER:INK}/>
 <Text y={594} size={100} style={{fontWeight:450,letterSpacing:-5}}>Newsworthy.</Text>
 <Text y={779} size={46} style={{whiteSpace:'pre-line',letterSpacing:-1.6,lineHeight:1.18,fontWeight:400}}>{line}</Text>
 <div data-safe style={{position:'absolute',left:120,top:1030,display:'flex',alignItems:'center',gap:30}}><span style={{fontSize:116,letterSpacing:-7,lineHeight:1}}>$1</span><span style={{fontSize:23,letterSpacing:1.7,lineHeight:1.5}}>ONE TIME.<br/>US PRICE.</span></div>
 <div style={{position:'absolute',left:120,top:1210,width:720,height:1,background:dark?'#565650':'#C4C2BB'}}/>
 <Text y={1250} size={40} style={{letterSpacing:-.8}}>Get it on the App Store <svg width="29" height="29" viewBox="0 0 24 24" style={{marginLeft:13}}><path d="M5 19L19 5M5 5h14v14" fill="none" stroke="currentColor" strokeWidth="1.6"/></svg></Text>
 <Text y={1320} size={28} style={{letterSpacing:0,color:dark?STONE:'#62625E'}}>Search “Newsworthy: Calm News”</Text>
 </AbsoluteFill>;
};
