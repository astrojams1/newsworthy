import { useSyncExternalStore } from 'react';
const query = '(prefers-color-scheme: dark)';
function subscribe(notify: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}
const snapshot = () => window.matchMedia(query).matches;
// Static HTML is rendered in light mode. Hydrate that same snapshot first,
// then React applies the system theme to every style, avoiding stale SSR ink.
const serverSnapshot = () => false;
export function useSystemAppearance() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
