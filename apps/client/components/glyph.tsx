import { Image } from 'expo-image';
import { fromByteArray } from 'base64-js';
import { size as sizes, stroke } from '@/lib/design';

// Every app-drawn icon except the header's share mark (see app-icon.tsx, which
// has its own per-platform glyph and optical lift): an SF Symbol on iOS and a
// stroked 24-unit SVG elsewhere, tinted with the colour it is given. Sizes are
// chosen by the caller from design/tokens.json (`size`), not here.
type GlyphSpec = { sf: string; svg: (color: string) => string; weight?: 'check' };

export const GLYPHS = {
  // Header and navigation.
  settings: { sf: 'gearshape', svg: () => '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>' },
  back: { sf: 'chevron.left', svg: () => '<path d="M19 12H5M12 19l-7-7 7-7"/>' },
  close: { sf: 'xmark', svg: () => '<path d="M18 6 6 18M6 6l12 12"/>' },
  // Settings rows: leading icons.
  appearance: { sf: 'circle.lefthalf.filled', svg: (c: string) => `<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="${c}"/>` },
  notifications: { sf: 'bell', svg: () => '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>' },
  timeline: { sf: 'list.bullet', svg: () => '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>' },
  privacy: { sf: 'hand.raised', svg: () => '<path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>' },
  support: { sf: 'questionmark.circle', svg: () => '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>' },
  // Settings rows: trailing marks.
  chevron: { sf: 'chevron.right', svg: () => '<path d="m9 18 6-6-6-6"/>' },
  external: { sf: 'arrow.up.right', svg: () => '<path d="M7 17 17 7M7 7h10v10"/>' },
  check: { sf: 'checkmark', svg: () => '<path d="M5 12.5l4.5 4.5L19 7"/>', weight: 'check' },
} as const satisfies Record<string, GlyphSpec>;

export type GlyphName = keyof typeof GLYPHS;

export function Glyph({ name, color, size = sizes.rowIcon }: { name: GlyphName; color: string; size?: number }) {
  const glyph: GlyphSpec = GLYPHS[name];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke[glyph.weight ?? 'icon']}" stroke-linecap="round" stroke-linejoin="round">${glyph.svg(color)}</svg>`;
  const source = process.env.EXPO_OS === 'ios'
    ? `sf:${glyph.sf}`
    : { uri: process.env.EXPO_OS === 'android'
      ? `data:image/svg+xml;base64,${fromByteArray(Uint8Array.from(svg, char => char.charCodeAt(0)))}`
      : `data:image/svg+xml,${encodeURIComponent(svg)}` };
  return <Image source={source} tintColor={color} accessibilityElementsHidden importantForAccessibility="no" style={{ width: size, height: size }} />;
}
