import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { fromByteArray } from 'base64-js';
import { readingGradientSvg } from '@/lib/reading-gradient';

export function ReadingGradient({ score, dark }: { score?: number; dark: boolean }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const uri = useMemo(() => {
    const svg = readingGradientSvg(score, dark, size.width, size.height);
    if (!svg) return null;
    // Android's expo-image data URL fetcher decodes every payload as base64.
    // The generated SVG contains ASCII markup and numeric/color attributes.
    return process.env.EXPO_OS === 'android'
      ? `data:image/svg+xml;base64,${fromByteArray(Uint8Array.from(svg, char => char.charCodeAt(0)))}`
      : `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }, [score, dark, size.width, size.height]);
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    testID="reading-gradient" style={{ position: 'absolute', inset: 0 }}
    onLayout={({ nativeEvent: { layout } }) => setSize(current => current.width === layout.width && current.height === layout.height ? current : { width: layout.width, height: layout.height })}>
    {uri && <Image source={{ uri }} contentFit="fill" style={{ position: 'absolute', inset: 0 }} />}
  </View>;
}
