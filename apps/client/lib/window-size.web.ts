import { useSyncExternalStore } from 'react';
type Size = { width: number; height: number; fontScale: number };
function subscribe(notify: () => void) {
  window.addEventListener('resize', notify);
  window.addEventListener('orientationchange', notify);
  return () => { window.removeEventListener('resize', notify); window.removeEventListener('orientationchange', notify); };
}
// One object per size, so an unchanged window is the same snapshot.
let last: Size = { width: 0, height: 0, fontScale: 1 };
const snapshot = () => {
  const width = document.documentElement.clientWidth || window.innerWidth;
  const height = document.documentElement.clientHeight || window.innerHeight;
  if (width !== last.width || height !== last.height) last = { width, height, fontScale: 1 };
  return last;
};
// Static HTML has no window. Hydrate that same empty size first, then React
// applies the real one: sizing from the window during hydration left a page
// opened in landscape with the portrait layout, because React keeps the
// static HTML's styles where the first client render disagrees with them.
const serverSize: Size = { width: 0, height: 0, fontScale: 1 };
const serverSnapshot = () => serverSize;
export function useWindowSize() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
