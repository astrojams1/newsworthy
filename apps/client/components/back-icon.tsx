import { Image } from 'expo-image';
import { fromByteArray } from 'base64-js';

// The arrow for a back control drawn by this app rather than the navigator:
// an SF Symbol on iOS and a stroked SVG elsewhere, at the header icon size.
export function BackIcon({ color }: { color: string }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;
  const source = process.env.EXPO_OS === 'ios'
    ? 'sf:chevron.left'
    : { uri: process.env.EXPO_OS === 'android'
      ? `data:image/svg+xml;base64,${fromByteArray(Uint8Array.from(svg, char => char.charCodeAt(0)))}`
      : `data:image/svg+xml,${encodeURIComponent(svg)}` };
  return <Image source={source} tintColor={color} accessibilityElementsHidden importantForAccessibility="no" style={{ width: 24, height: 24 }} />;
}
