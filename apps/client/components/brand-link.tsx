import { Link } from 'expo-router';
import { Pressable, Text, useWindowDimensions } from 'react-native';
import { AppIcon } from '@/components/app-icon';
import { useTheme } from '@/lib/theme';

export function BrandLink() {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  return <Link href="/about" asChild>
    <Pressable accessibilityRole="link" accessibilityLabel="About Newsworthy"
      style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', paddingLeft: process.env.EXPO_OS === 'web' ? 24 : 4 }}>
      {fontScale > 1.5 ? <AppIcon name="about" color={theme.muted} /> : <Text style={{ color: theme.muted, fontSize: 13, letterSpacing: 1.6 }}>NEWSWORTHY</Text>}
    </Pressable>
  </Link>;
}
