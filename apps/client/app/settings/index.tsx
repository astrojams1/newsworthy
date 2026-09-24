import { Pressable } from 'react-native';
import Head from 'expo-router/head';
import { Link, Stack, useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme';
import { usePreferences } from '@/components/preferences-provider';
import { THEME_CHOICES } from '@/lib/preferences';
import { pushSupported } from '@/lib/push';
import { privacyUrl, supportUrl } from '@/lib/config';
import { Glyph, type GlyphName } from '@/components/glyph';
import { RowContent, Section, SettingsPage, Trailing, rowStyle } from '@/components/settings-list';

const ABOUT_LINKS = [['Privacy', privacyUrl, 'privacy'], ['Support', supportUrl, 'support']] as const;

export default function Settings() {
  const theme = useTheme();
  const router = useRouter();
  const { preferences } = usePreferences();
  const { enabled, threshold } = preferences.notifications;
  const appearance = THEME_CHOICES.find(choice => choice.value === preferences.theme)?.label ?? 'Follow device';
  const notifications = enabled ? `${threshold} or higher` : 'Off';
  // Closing returns to the reading in one step, however Settings was reached.
  // A back action was not enough: a web link to an alerts page redirects here
  // and left a second overview behind, so the first Close only popped that.
  // dismissTo pops to the reading, or replaces with it when none is behind.
  const close = () => router.dismissTo('/');
  const closeButton = <Pressable testID="settings-close" accessibilityRole="button" accessibilityLabel="Close settings" onPress={close}
    style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginRight: process.env.EXPO_OS === 'web' ? 12 : 0 }}>
    <Glyph name="close" color={theme.ink} size={20} />
  </Pressable>;
  const pages: { href: '/settings/appearance' | '/settings/notifications'; icon: GlyphName; label: string; value: string; testID: string }[] = [
    { href: '/settings/appearance', icon: 'appearance', label: 'Appearance', value: appearance, testID: 'appearance-row' },
    ...(pushSupported ? [{ href: '/settings/notifications' as const, icon: 'notifications' as const, label: 'Notifications', value: notifications, testID: 'notifications-link' }] : []),
  ];
  return <>
    {process.env.EXPO_OS === 'web' && <Head><title>Settings · Newsworthy</title></Head>}
    {/* iOS 26+ draws the close button in glass, like the header's other controls. */}
    <Stack.Screen options={{ headerRight: () => closeButton,
      unstable_headerRightItems: process.env.EXPO_OS === 'ios' ? () => [{ type: 'custom', element: closeButton, hidesSharedBackground: false }] : undefined }} />
    <SettingsPage>
      <Section title="Preferences" testID="preference-links">
        {pages.map(({ href, icon, label, value, testID }, index) => <Link key={href} href={href} asChild>
          <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} style={rowStyle()}>
            <RowContent index={index} icon={icon} label={label} trailing={<Trailing value={value} to="page" />} />
          </Pressable>
        </Link>)}
      </Section>
      <Section title="About" testID="about-links">
        {ABOUT_LINKS.map(([name, url, icon], index) => <Link key={name} href={url} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={name} accessibilityHint="Opens in your browser" testID={`link-${name.toLowerCase()}`} style={rowStyle()}>
            <RowContent index={index} icon={icon} label={name} trailing={<Trailing to="external" />} />
          </Pressable>
        </Link>)}
      </Section>
    </SettingsPage>
  </>;
}
