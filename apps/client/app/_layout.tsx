import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { PreferencesProvider, usePreferences } from '@/components/preferences-provider';
import { ReadingProvider, useCurrentReading } from '@/components/reading-provider';
import { faviconSvg } from '../../../public/favicon';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/lib/theme';
export default function Layout() {
  return <PreferencesProvider><ReadingProvider><ThemedLayout /></ReadingProvider></PreferencesProvider>;
}
function ThemedLayout() {
  const theme = useTheme();
  const { reading } = useCurrentReading();
  const { preferences: { theme: appearance } } = usePreferences();
  useEffect(() => {
    // Native only — the website has no settings and follows the system. The
    // override reaches system surfaces too (share sheet, alerts), and
    // useColorScheme() reports it, so "System" restores the OS value.
    if (process.env.EXPO_OS === 'web') return;
    Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
  }, [appearance]);
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
      <Stack.Screen name="index" options={{ title: 'Newsworthy', headerTitle: () => null, headerTransparent: true, headerStyle: { backgroundColor: 'transparent' } }} />
      <Stack.Screen name="settings" options={{ title: 'Settings', headerBackTitle: 'Back', headerTitleStyle: { color: theme.ink } }} />
    </Stack>
  </>;
}
