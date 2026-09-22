import { Image } from 'expo-image';
import { fromByteArray } from 'base64-js';

export function AppIcon({ color }: { color: string }) {
  const path = process.env.EXPO_OS === 'android'
      ? '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4"/>'
      : '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  const source = process.env.EXPO_OS === 'ios'
    ? 'sf:square.and.arrow.up'
    : { uri: process.env.EXPO_OS === 'android'
      ? `data:image/svg+xml;base64,${fromByteArray(Uint8Array.from(svg, char => char.charCodeAt(0)))}`
      : `data:image/svg+xml,${encodeURIComponent(svg)}` };
  // iOS's square.and.arrow.up symbol carries more ink below its geometric
  // center; lift it to align optically with the capitals, keeping the hit area
  // still. The drawn tray glyph and Android's three-node glyph are balanced:
  // measured on the web export, the tray's ink centre matched the wordmark's
  // within half a point only once the lift was removed.
  const opticalOffsetY = process.env.EXPO_OS === 'ios' ? -2 : 0;
  return <Image source={source} tintColor={color} accessibilityElementsHidden importantForAccessibility="no" style={{ width: 24, height: 24, transform: [{ translateY: opticalOffsetY }] }} />;
}
