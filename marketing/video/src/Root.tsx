import React from 'react';
import {Composition} from 'remotion';
import {AntiFeed,OneDollar,FullStop} from './Films';
import bHooks from './b-hooks.json';
export const Root=()=> <>
<Composition id="A-AntiFeed" component={AntiFeed} width={1080} height={1920} fps={30} durationInFrames={660}/>
<Composition id="B-OneDollar" component={OneDollar} width={1080} height={1920} fps={30} durationInFrames={660}/>
<Composition id="C-FullStop" component={FullStop} width={1080} height={1920} fps={30} durationInFrames={720}/>
{bHooks.map(({id,headline})=><Composition key={id} id={id} component={OneDollar} defaultProps={{openingHeadline:headline}} width={1080} height={1920} fps={30} durationInFrames={660}/>)}
</>;
