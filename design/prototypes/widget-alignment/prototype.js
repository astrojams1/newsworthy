import { alignmentMetrics } from './metrics.js';
const $ = id => document.getElementById(id);
const family = getComputedStyle(document.body).fontFamily;
const context = document.createElement('canvas').getContext('2d');
function render() {
  const scale = Number($('scale').value), lineHeight = 20 * scale, bodySize = 14 * scale;
  const lines = Number($('lines').value), score = $('score').value;
  context.font = `400 ${bodySize}px ${family}`;
  const body = context.measureText('H');
  const inkTop = (lineHeight - body.fontBoundingBoxAscent - body.fontBoundingBoxDescent) / 2 + body.fontBoundingBoxAscent - body.actualBoundingBoxAscent;
  context.font = `300 100px ${family}`;
  const unit = context.measureText(score);
  const metrics = alignmentMetrics({ lines, lineHeight, bodyInkHeight: body.actualBoundingBoxAscent, numberInkAt100: unit.actualBoundingBoxAscent + unit.actualBoundingBoxDescent });
  context.font = `300 ${metrics.fontSize}px ${family}`;
  const digit = context.measureText(score), width = Math.max(digit.width, digit.actualBoundingBoxLeft + digit.actualBoundingBoxRight);
  const denominatorSize = 12 * scale;
  context.font = `300 ${denominatorSize}px ${family}`;
  const denominatorWidth = context.measureText('∕ 10').width;
  const denominatorX = width + 6;
  const runWidth = digit.actualBoundingBoxLeft + denominatorX + denominatorWidth;
  document.body.classList.toggle('guides', $('guides').checked);
  document.body.classList.toggle('wrap', $('layout').value === 'wrap');
  for (const widget of document.querySelectorAll('.widget')) {
    widget.dataset.level = score; widget.dataset.appearance = $('theme').value.toLowerCase();
    for (const [key,value] of Object.entries({ '--line':`${lineHeight}px`, '--body-size':`${bodySize}px`, '--span':lines, '--score-width':`${runWidth}px`, '--ink-top':`${inkTop}px` })) widget.style.setProperty(key,value);
    widget.querySelector('.score').setAttribute('aria-label', `${score} out of 10`);
    const svg = widget.querySelector('svg'), text = svg.querySelector('.numeral'), denominator = svg.querySelector('.denominator');
    svg.setAttribute('width', runWidth); svg.setAttribute('height', metrics.inkHeight);
    svg.setAttribute('viewBox', `${-digit.actualBoundingBoxLeft} ${-digit.actualBoundingBoxAscent} ${runWidth} ${digit.actualBoundingBoxAscent + digit.actualBoundingBoxDescent}`);
    text.textContent = score; text.setAttribute('fill','currentColor'); text.style.font = `300 ${metrics.fontSize}px ${family}`;
    denominator.setAttribute('x', denominatorX);
    denominator.setAttribute('y', 0);
    denominator.style.font = `300 ${denominatorSize}px ${family}`;
    widget.querySelector('.description').textContent = $('sentence').value;
  }
  $('alignment-copy').textContent = `The top of the numeral meets the top of the first line. Its foot meets the bottom of line ${lines}. ${$('layout').value === 'column' ? 'The sentence keeps a straight left edge.' : 'The sentence continues beneath the score after clearing the numeral.'}`;
  $('body-metric').textContent = `${bodySize.toFixed(0)} / ${lineHeight.toFixed(0)} px`;
  $('span-metric').textContent = `${lineHeight} × ${lines} = ${metrics.lineBoxHeight} px`;
  $('ink-metric').textContent = `${metrics.inkHeight.toFixed(1)} px`;
  $('font-metric').textContent = `${metrics.fontSize.toFixed(1)} px`;
}
document.querySelector('form').addEventListener('change', render);
document.querySelector('form').addEventListener('submit', event => event.preventDefault());
$('sentence').addEventListener('input', render);
$('short').addEventListener('click', () => { $('sentence').value = 'Talks resume as aid deliveries continue.'; render(); });
$('long').addEventListener('click', () => { $('sentence').value = 'Negotiators have agreed to resume talks after several days of discussion, while aid deliveries continue to reach communities affected by flooding and transport links gradually reopen across the region.'; render(); });
await document.fonts.ready;
render();
