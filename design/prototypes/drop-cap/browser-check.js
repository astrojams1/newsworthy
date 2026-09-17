// Run with agent-browser eval --stdin < design/prototypes/drop-cap/browser-check.js
// Real browser geometry: paragraphs must flow beside AND below the numeral.
(() => {
  const set = (id, value) => {
    const element = document.getElementById(id);
    if (element.type === 'checkbox') element.checked = value;
    else element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const assert = (value, message) => { if (!value) throw new Error(message); };
  let cases = 0;
  function checkWrap(widget, requireBelow) {
    const paragraph = widget.querySelector('.drop-paragraph');
    const number = widget.querySelector('.drop-cap');
    const explanation = widget.querySelector('[data-explanation]');
    const p = paragraph.getBoundingClientRect();
    const n = number.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(explanation);
    const lines = [...range.getClientRects()];
    assert(getComputedStyle(number).float === 'left', 'number must float');
    assert(lines.some(r => r.top < n.bottom && r.left >= n.right), 'text must sit beside number');
    for (const line of lines) {
      assert(line.right <= p.right + 1, 'sentence overflow');
      assert(line.top >= n.bottom || line.left >= n.right, 'sentence overlaps number');
    }
    if (requireBelow) assert(lines.some(r => r.top >= n.bottom && Math.abs(r.left - p.left) < 1), 'text must wrap under number');
    assert(widget.scrollWidth <= widget.clientWidth + 1, 'widget horizontal overflow');
    assert(widget.scrollHeight <= widget.clientHeight + 1, 'widget vertical clipping');
  }
  for (const score of ['1', '3', '10']) for (const mode of ['light', 'dark']) {
    for (const scale of ['1', '1.3', '2']) for (const name of [true, false]) {
      set('score', score); set('appearance', mode); set('text-size', scale); set('show-name', name); set('sentence', 'long');
      for (const widget of document.querySelectorAll('.expanded')) checkWrap(widget, true);
      assert([...document.querySelectorAll('[data-score]')].every(n => n.textContent === score), 'standalone score on every surface');
      assert(!document.querySelector('main').innerText.includes('/10'), 'visible denominator returned');
      cases++;
    }
  }
  set('sentence', 'empty');
  assert([...document.querySelectorAll('.surface')].every(s => !s.hasAttribute('data-level')), 'empty state has no score color');
  assert([...document.querySelectorAll('[data-score]')].every(s => s.textContent === '–'), 'empty state dash');
  set('score', '3'); set('appearance', 'light'); set('text-size', '1'); set('show-name', true); set('sentence', 'long');
  const number = document.querySelector('.drop-cap');
  number.style.float = 'none';
  let rejected = false;
  try { checkWrap(document.querySelector('.expanded'), true); } catch { rejected = true; }
  number.style.float = '';
  assert(rejected, 'geometry guard must reject lost drop cap');
  set('sentence', 'standard');
  assert(document.documentElement.scrollWidth <= innerWidth + 1, 'page horizontal overflow');
  return { cases, widgetsPerCase: 2, missingFloatRegressionRejected: rejected, viewport: innerWidth };
})();
