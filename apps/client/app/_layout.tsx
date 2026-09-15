import { useEffect } from 'react';
import { ReadingProvider, useCurrentReading } from '@/components/reading-provider';
import { faviconSvg } from '../../../public/favicon';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/lib/theme';
import { BrandLink } from '@/components/brand-link';
export default function Layout() {
  return <ReadingProvider><ThemedLayout /></ReadingProvider>;
}
function ThemedLayout() {
  const theme = useTheme();
  const { reading } = useCurrentReading();
  useEffect(() => {
    if (process.env.EXPO_OS !== 'web') return;
    if (reading) document.documentElement.dataset.level = String(reading.score);
    else delete document.documentElement.dataset.level;
    let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) { icon = document.createElement('link'); icon.rel = 'icon'; document.head.appendChild(icon); }
    icon.type = 'image/svg+xml';
    icon.href = `data:image/svg+xml,${encodeURIComponent(faviconSvg(reading?.score, theme.dark))}`;
    let chrome = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!chrome) { chrome = document.createElement('meta'); chrome.name = 'theme-color'; document.head.appendChild(chrome); }
    chrome.content = theme.center;
  }, [reading?.score, theme.dark, theme.center]);
  return <>
    <StatusBar style={theme.dark ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerStyle: { backgroundColor: theme.tinted }, headerTintColor: theme.accent,
      headerShadowVisible: false, contentStyle: { backgroundColor: theme.tinted } }}>
      <Stack.Screen name="index" options={{ title: 'Newsworthy', headerTitle: () => null, headerTransparent: false, headerLeft: () => <BrandLink /> }} />
      <Stack.Screen name="about" options={{ title: 'About Newsworthy', presentation: 'modal' }} />
    </Stack>
  </>;
}
