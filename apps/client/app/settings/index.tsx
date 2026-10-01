import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Head from 'expo-router/head';
import { Link, Stack, useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme';
import { usePreferences } from '@/components/preferences-provider';
import { THEME_CHOICES } from '@/lib/preferences';
import { pushSupported } from '@/lib/push';
import { privacyUrl, supportUrl } from '@/lib/config';
import { GLYPHS, Glyph, HEADER_ICON_SIZE, barButton, type GlyphName } from '@/components/glyph';
import { RowContent, Section, SettingsPage, Trailing, rowStyle } from '@/components/settings-list';
import { Toggle } from '@/components/toggle';
import { useCurrentReading } from '@/components/reading-provider';
import { checkedAgo } from '@/lib/story-age';

const ABOUT_LINKS = [['Privacy', privacyUrl, 'privacy'], ['Support', supportUrl, 'support']] as const;
// Opens over Settings; closing it returns here. The phone apps only: the
// website has no introduction.
const INTRODUCTION_INDEX = ABOUT_LINKS.length;

export default function Settings() {
  const theme = useTheme();
  const router = useRouter();
  const { preferences, setTimeline } = usePreferences();
  const { enabled, threshold } = preferences.notifications;
  const appearance = THEME_CHOICES.find(choice => choice.value === preferences.theme)?.label ?? 'Follow device';
  // Prototype: when the news was last checked, moved here from under the reading.
  const { reading } = useCurrentReading();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  const checked = reading ? checkedAgo(reading, now) : '';
  const notifications = enabled ? `${threshold} or higher` : 'Off';
  // Closing returns to the reading in one step, however Settings was reached.
  // A back action was not enough: a web link to an alerts page redirects here
  // and left a second overview behind, so the first Close only popped that.
  // dismissTo pops to the reading, or replaces with it when none is behind.
  const close = () => router.dismissTo('/');
  const closeButton = <Pressable testID="settings-close" accessibilityRole="button" accessibilityLabel="Close settings" onPress={close}
    style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginRight: process.env.EXPO_OS === 'web' ? 12 : 0 }}>
    <Glyph name="close" color={theme.ink} size={HEADER_ICON_SIZE} />
  </Pressable>;
  const pages: { href: '/settings/appearance' | '/settings/notifications'; icon: GlyphName; label: string; value: string; testID: string }[] = [
    { href: '/settings/appearance', icon: 'appearance', label: 'Appearance', value: appearance, testID: 'appearance-row' },
    ...(pushSupported ? [{ href: '/settings/notifications' as const, icon: 'notifications' as const, label: 'Notifications', value: notifications, testID: 'notifications-link' }] : []),
  ];
  return <>
    {process.env.EXPO_OS === 'web' && <Head><title>Settings · Newsworthy</title></Head>}
    {/* iOS 26+ draws the close button in glass, like the header's other controls:
        the system's own bar button, a circle. An app view in that glass was an oval. */}
    <Stack.Screen options={{ headerRight: () => closeButton,
      unstable_headerRightItems: process.env.EXPO_OS === 'ios' ? () => [barButton('Close', 'Close settings', GLYPHS.close.sf, theme.ink, close)] : undefined }} />
    <SettingsPage>
      <Section title="Preferences" testID="preference-links">
        {pages.map(({ href, icon, label, value, testID }, index) => <Link key={href} href={href} asChild>
          <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} style={rowStyle()}>
            <RowContent index={index} icon={icon} label={label} trailing={<Trailing value={value} to="page" />} />
          </Pressable>
        </Link>)}
        {/* Off by default: the reading alone is the product; the timeline is an addition. */}
        <Pressable testID="timeline-row" accessibilityRole="switch" accessibilityLabel="Show timeline"
          accessibilityState={{ checked: preferences.timeline }} onPress={() => setTimeline(!preferences.timeline)} style={rowStyle()}>
          <RowContent index={pages.length} icon="timeline" label="Show timeline"
            trailing={<Toggle testID="timeline-switch" accessibilityLabel="Show timeline" value={preferences.timeline} onValueChange={setTimeline} />} />
        </Pressable>
      </Section>
      {checked !== '' && <Section title="News" testID="news-status">
        <View testID="checked-row" accessible accessibilityLabel={`Last checked, ${checked}`} style={rowStyle()}>
          <RowContent index={0} icon="checked" label="Last checked" trailing={<Trailing value={checked} />} />
        </View>
      </Section>}
      <Section title="About" testID="about-links">
        {ABOUT_LINKS.map(([name, url, icon], index) => <Link key={name} href={url} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={name} accessibilityHint="Opens in your browser" testID={`link-${name.toLowerCase()}`} style={rowStyle()}>
            <RowContent index={index} icon={icon} label={name} trailing={<Trailing to="external" />} />
          </Pressable>
        </Link>)}
        {process.env.EXPO_OS !== 'web' && <Link href="/onboarding" asChild>
          <Pressable testID="introduction-row" accessibilityRole="button" accessibilityLabel="Introduction" accessibilityHint="Replays the introduction" style={rowStyle()}>
            <RowContent index={INTRODUCTION_INDEX} icon="introduction" label="Introduction" trailing={<Trailing to="page" />} />
          </Pressable>
        </Link>}
      </Section>
    </SettingsPage>
  </>;
}
