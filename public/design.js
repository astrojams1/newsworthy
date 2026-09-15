import { validLevel, levelPalette, faviconSvg } from './favicon.js';
export { validLevel, levelPalette, faviconSvg } from './favicon.js';

let currentScore = null;
function updateChrome() {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let icon = document.querySelector('link[rel="icon"]');
  if (!icon) { icon = document.createElement('link'); icon.rel = 'icon'; document.head.appendChild(icon); }
  icon.type = 'image/svg+xml';
  icon.href = 'data:image/svg+xml,' + encodeURIComponent(faviconSvg(currentScore, dark));
  let chrome = document.querySelector('meta[name="theme-color"]');
  if (!chrome) { chrome = document.createElement('meta'); chrome.name = 'theme-color'; document.head.appendChild(chrome); }
  chrome.content = levelPalette(currentScore)[dark ? 'dark' : 'light'].center;
}

export function applyLevel(score) {
  currentScore = validLevel(score) ? score : null;
  if (currentScore === null) delete document.body.dataset.level;
  else document.body.dataset.level = String(currentScore);
  updateChrome();
}

// CSS handles all page colors. Refresh data-URL favicons explicitly because
// browsers don't reliably reevaluate their internal media queries in-place.
if (typeof window !== 'undefined') {
  const appearance = window.matchMedia('(prefers-color-scheme: dark)');
  if (appearance.addEventListener) appearance.addEventListener('change', updateChrome);
  else appearance.addListener(updateChrome);
}
