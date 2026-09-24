import { Stack } from 'expo-router';
import { useTheme } from '@/lib/theme';

// Settings is its own stack inside the sheet, so Appearance and Notifications
// open within it rather than over the reading. A reload or shared link on a
// subpage still gets the overview behind it, so its back button exists.
export const unstable_settings = { initialRouteName: 'index' };

export default function SettingsLayout() {
  const theme = useTheme();
  return <Stack screenOptions={{ headerStyle: { backgroundColor: theme.tinted }, headerTintColor: theme.accent, headerShadowVisible: false,
    headerTitleStyle: { color: theme.ink }, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: theme.tinted } }}>
    {/* The overview has no visible title: the sheet it sits in and its rows say
        what it is. Its only way out is its X, not a back arrow inherited from
        the reading behind it. */}
    <Stack.Screen name="index" options={{ title: 'Settings', headerTitle: '', headerBackVisible: false, headerLeft: () => null }} />
    <Stack.Screen name="appearance" options={{ title: 'Appearance' }} />
    <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
    <Stack.Screen name="threshold" options={{ title: 'Threshold' }} />
  </Stack>;
}
