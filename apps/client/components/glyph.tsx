import { Image } from 'expo-image';
import { fromByteArray } from 'base64-js';

// Settings' row and control icons, drawn like the header icons: an SF Symbol
// on iOS and a stroked SVG elsewhere, tinted with the colour they are given.
export const GLYPHS = {
  appearance: { sf: 'circle.lefthalf.filled', svg: (c: string) => `<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="${c}"/>` },
  notifications: { sf: 'bell', svg: () => '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>' },
  privacy: { sf: 'hand.raised', svg: () => '<path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>' },
  support: { sf: 'questionmark.circle', svg: () => '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>' },
  chevron: { sf: 'chevron.right', svg: () => '<path d="m9 18 6-6-6-6"/>' },
  external: { sf: 'arrow.up.right', svg: () => '<path d="M7 17 17 7M7 7h10v10"/>' },
  timeline: { sf: 'list.bullet', svg: () => '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>' },
  close: { sf: 'xmark', svg: () => '<path d="M18 6 6 18M6 6l12 12"/>' },
} as const;

export type GlyphName = keyof typeof GLYPHS;

export function Glyph({ name, color, size = 22 }: { name: GlyphName; color: string; size?: number }) {
  const glyph = GLYPHS[name];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${glyph.svg(color)}</svg>`;
  const source = process.env.EXPO_OS === 'ios'
    ? `sf:${glyph.sf}`
    : { uri: process.env.EXPO_OS === 'android'
      ? `data:image/svg+xml;base64,${fromByteArray(Uint8Array.from(svg, char => char.charCodeAt(0)))}`
      : `data:image/svg+xml,${encodeURIComponent(svg)}` };
  return <Image source={source} tintColor={color} accessibilityElementsHidden importantForAccessibility="no" style={{ width: size, height: size }} />;
}
