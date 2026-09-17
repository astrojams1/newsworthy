import { samples, previewReading } from './model.js';
const $ = id => document.getElementById(id);
for (let score = 1; score <= 10; score++) $('score').add(new Option(String(score), String(score), false, score === 3));
$('custom-sentence').value = samples.standard;
let custom;
function render() {
  const reading = previewReading(Number($('score').value), $('sentence').value, custom);
  const scale = $('text-size').value;
  for (const surface of document.querySelectorAll('.surface')) {
    surface.dataset.appearance = $('appearance').value;
    if (reading.level === null) delete surface.dataset.level;
    else surface.dataset.level = String(reading.level);
    surface.style.setProperty('--text-scale', scale);
  }
  for (const number of document.querySelectorAll('[data-score]')) {
    number.textContent = reading.number;
    number.setAttribute('aria-label', reading.label);
  }
  for (const explanation of document.querySelectorAll('[data-explanation]')) explanation.textContent = reading.explanation;
  for (const time of document.querySelectorAll('[data-time]')) time.textContent = reading.timestamp;
  document.body.classList.toggle('hide-name', !$('show-name').checked);
  document.body.classList.toggle('large-text', scale !== '1');
}
$('sentence').addEventListener('change', () => {
  custom = undefined;
  $('custom-sentence').value = samples[$('sentence').value];
});
document.querySelector('.controls').addEventListener('change', render);
document.querySelector('.controls').addEventListener('submit', event => event.preventDefault());
$('custom-sentence').addEventListener('input', () => { custom = $('custom-sentence').value; render(); });
render();
