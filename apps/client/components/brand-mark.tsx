import { Text, View } from 'react-native';
import { useTheme } from '@/lib/theme';
import { layout, scaleCap, touchTarget, tracking, type } from '@/lib/design';

export function BrandMark() {
  const theme = useTheme();
  return <View style={{ minHeight: touchTarget, justifyContent: 'center', paddingLeft: process.env.EXPO_OS === 'web' ? layout.header.brandInsetWeb : layout.header.brandInsetNative }}>
    <Text maxFontSizeMultiplier={scaleCap.label} style={{ color: theme.accent, fontSize: type.footnote, letterSpacing: type.footnote * tracking.wordmark }}>NEWSWORTHY</Text>
  </View>;
}
