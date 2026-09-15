import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/lib/theme';
import { BrandLink } from '@/components/brand-link';
export default function Layout() {
  const theme = useTheme();
  return <>
    <StatusBar style={theme.dark ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerStyle: { backgroundColor: theme.surface }, headerTintColor: theme.ink,
      headerShadowVisible: false, contentStyle: { backgroundColor: theme.surface } }}>
      <Stack.Screen name="index" options={{ title: 'Newsworthy', headerTitle: () => null, headerTransparent: false, headerLeft: () => <BrandLink /> }} />
      <Stack.Screen name="about" options={{ title: 'About Newsworthy', presentation: 'modal' }} />
    </Stack>
  </>;
}
