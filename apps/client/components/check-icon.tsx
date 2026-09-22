import { Image } from 'expo-image';
import { fromByteArray } from 'base64-js';

// The mark beside a chosen option, drawn like the header icons: an SF Symbol
// on iOS and a stroked SVG elsewhere, so it never depends on a text glyph.
export function CheckIcon({ color }: { color: string }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>`;
  const source = process.env.EXPO_OS === 'ios'
    ? 'sf:checkmark'
    : { uri: process.env.EXPO_OS === 'android'
      ? `data:image/svg+xml;base64,${fromByteArray(Uint8Array.from(svg, char => char.charCodeAt(0)))}`
      : `data:image/svg+xml,${encodeURIComponent(svg)}` };
  return <Image source={source} tintColor={color} accessibilityElementsHidden importantForAccessibility="no" style={{ width: 20, height: 20 }} />;
}
