// Run in the prototype page using agent-browser eval --stdin.
(() => {
 const set = (id,value) => { const e=document.getElementById(id); e.value=String(value); e.dispatchEvent(new Event('change',{bubbles:true})); };
 const assert = (condition,message) => {if (!condition) throw Error(message)};
 function checkDenominator(widget) {
  const numeral=widget.querySelector('.numeral'), denominator=widget.querySelector('.denominator');
  const n=numeral.getBoundingClientRect(), d=denominator.getBoundingClientRect();
  assert(d.left>n.right, 'denominator must sit to the right of the numeral');
  assert(Math.abs(numeral.getStartPositionOfChar(0).y-denominator.getStartPositionOfChar(0).y)<.5, 'denominator must share the numeral baseline');
  assert(d.bottom<=n.bottom+1, 'denominator must not sit beneath the numeral');
 }
 let cases=0;
 document.getElementById('long').click();
 for(const score of [1,3,10]) for(const lines of [2,3,4]) for(const theme of ['Light','Dark']) for(const scale of [1,1.3,2]) for(const layout of ['column','wrap']) {
  set('score',score);set('lines',lines);set('theme',theme);set('scale',scale);set('layout',layout);
  for(const widget of document.querySelectorAll('.widget')) {
   checkDenominator(widget);
   const description=widget.querySelector('.description'), number=widget.querySelector('.score'), svg=widget.querySelector('svg');
   const range=document.createRange();range.selectNodeContents(description);
   const rects=[...range.getClientRects()], n=number.getBoundingClientRect(), ink=svg.getBoundingClientRect();
   const lh=parseFloat(getComputedStyle(description).lineHeight);
   assert(rects[0].left >= n.right+10,`first line not beside score: ${score},${lines},${scale}`);
   if(layout==='column') assert(rects.every(r=>Math.abs(r.left-rects[0].left)<.5),'description lost left alignment');
   assert(ink.height > (lines-1)*lh && ink.height < lines*lh,'number does not span intended lines');
   assert(Math.abs((ink.height-(lines-1)*lh)/(14*scale) - 0.72)<.2,'number ink calibration implausible');
   for(const r of rects) assert(r.top>=n.bottom || r.left>=n.right,'description overlaps number');
   assert(widget.scrollWidth<=widget.clientWidth+1,'widget horizontal overflow');
   assert(widget.scrollHeight<=widget.clientHeight+1,'widget vertical clipping');
   assert(number.getAttribute('aria-label')===`${score} out of 10`,'scale missing');
  }
  cases++;
 }
 set('score',3);set('lines',3);set('theme','Light');set('scale',1);set('layout','column');
 const denominator=document.querySelector('.denominator');
 denominator.setAttribute('y', 20);
 let belowRejected=false;
 try { checkDenominator(document.querySelector('.widget')); } catch { belowRejected=true; }
 denominator.setAttribute('y', 0);
 assert(belowRejected, 'regression guard must reject a denominator moved beneath the number');
 const description=document.querySelector('.description');
 description.style.textAlign='center';
 const r=document.createRange();r.selectNodeContents(description);
 assert([...r.getClientRects()].some(x=>Math.abs(x.left-r.getClientRects()[0].left)>.5),'regression fixture should detect centered lines');
 description.style.textAlign='';
 document.getElementById('sentence').value='<img src=x onerror=alert(1)> A literal sample.';
 document.getElementById('sentence').dispatchEvent(new Event('input',{bubbles:true}));
 assert(!document.querySelector('.description img'),'custom copy must be text');
 assert(document.documentElement.scrollWidth<=innerWidth+1,'page overflow');
 document.getElementById('long').click();
 return {cases,widgetsPerCase:2,viewport:innerWidth,centeredTextRegressionDetected:true,belowNumberRegressionDetected:belowRejected};
})();
