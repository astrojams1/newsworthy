import { Text, View } from 'react-native';
import { useTheme } from '@/lib/theme';

export function BrandMark() {
  const theme = useTheme();
  return <View style={{ minHeight: 48, justifyContent: 'center', paddingLeft: process.env.EXPO_OS === 'web' ? 24 : 4 }}>
    <Text maxFontSizeMultiplier={1.5} style={{ color: theme.accent, fontSize: 13, letterSpacing: 1.6 }}>NEWSWORTHY</Text>
  </View>;
}
