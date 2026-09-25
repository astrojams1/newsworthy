import { Stack } from 'expo-router';
import { HeaderBackButton } from 'expo-router/react-navigation';
import { useTheme } from '@/lib/theme';
import { Glyph } from '@/components/glyph';
import { size } from '@/lib/design';

// On the web the navigator tints its back arrow through an SVG filter whose id
// never changes, and a browser can keep painting the arrow in the colour it had
// when the page opened: choosing Dark on Appearance left a dark arrow on the
// dark header. The app's own arrow carries its colour in the image itself, as
// the check and gear icons do, so a new theme is a new image. Native headers
// tint their own arrow and keep it.
function webBackButton(color: string) {
  return process.env.EXPO_OS === 'web'
    ? { headerLeft: (props: React.ComponentProps<typeof HeaderBackButton> & { canGoBack?: boolean }) => props.canGoBack
      ? <HeaderBackButton {...props} backImage={() => <Glyph name="back" color={color} size={size.headerIcon} />} />
      : null }
    : {};
}

// Settings is its own stack inside the sheet, so Appearance and Notifications
// open within it rather than over the reading. A reload or shared link on a
// subpage still gets the overview behind it, so its back button exists.
export const unstable_settings = { initialRouteName: 'index' };

export default function SettingsLayout() {
  const theme = useTheme();
  return <Stack screenOptions={{ headerStyle: { backgroundColor: theme.tinted }, headerTintColor: theme.accent, headerShadowVisible: false,
    headerTitleStyle: { color: theme.ink }, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: theme.tinted }, ...webBackButton(theme.accent) }}>
    {/* The overview has no visible title: the sheet it sits in and its rows say
        what it is. Its only way out is its X, not a back arrow inherited from
        the reading behind it. */}
    <Stack.Screen name="index" options={{ title: 'Settings', headerTitle: '', headerBackVisible: false, headerLeft: () => null }} />
    <Stack.Screen name="appearance" options={{ title: 'Appearance' }} />
    <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
    <Stack.Screen name="threshold" options={{ title: 'Threshold' }} />
  </Stack>;
}
