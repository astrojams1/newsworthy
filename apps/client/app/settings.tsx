import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Head from 'expo-router/head';
import { Link, Stack, useRouter } from 'expo-router';
import { BackIcon } from '@/components/back-icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';
import { usePreferences } from '@/components/preferences-provider';
import { Toggle } from '@/components/toggle';
import { THEME_CHOICES, THRESHOLD_CHOICES, type ThemePreference } from '@/lib/preferences';
import { CheckIcon } from '@/components/check-icon';
import { pushSupported } from '@/lib/push';
import { privacyUrl, supportUrl } from '@/lib/config';

const ABOUT_LINKS = [['Privacy', privacyUrl], ['Support', supportUrl]] as const;

const ROW_MIN_HEIGHT = 56;

const NOTICES = {
  denied: 'Notifications are turned off for Newsworthy in your device settings.',
  unavailable: 'Notifications are not available on this device.',
  offline: 'Newsworthy could not be reached. Check your connection and try again.',
};

export default function Settings() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontal = Math.max(20, Math.min((width || 390) * 0.05, 48));
  const { preferences, setTheme, subscription, savingNotifications: busy } = usePreferences();
  const { enabled, threshold } = preferences.notifications;
  const [notice, setNotice] = useState<'' | keyof typeof NOTICES>('');
  // The registration itself is the provider's: its queue outlives this screen,
  // so a request still in flight when the screen closes is finished in order
  // with whatever the reopened screen asks next.
  const toggle = async (next: boolean) => {
    setNotice('');
    const result = await (next ? subscription.enable() : subscription.disable());
    if (!result.ok) setNotice(result.reason);
  };
  const choose = async (next: number) => {
    if (next === threshold) return;
    setNotice('');
    const result = await subscription.choose(next);
    if (!result.ok) setNotice(result.reason);
  };
  // Reached with nothing behind it — a reload on web, a deep link the
  // navigator could not anchor — the screen still needs a way out.
  // Explicitly clear that override once a back stack exists; unmounting
  // Stack.Screen alone leaves its old header callback (and color) installed.
  const stranded = !router.canGoBack();
  const label = { color: theme.ink, fontSize: 17 } as const;
  const heading = { color: theme.muted, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 } as const;
  const card = { backgroundColor: theme.elevated, borderRadius: 16, borderWidth: 1, borderColor: theme.rule, overflow: 'hidden' } as const;
  // One minimum for every setting, whatever control it carries: the rows match
  // at the default text size and grow together when text is enlarged.
  const row = (index: number) => ({ minHeight: ROW_MIN_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 4, gap: 16,
    borderTopWidth: index === 0 ? 0 : 1, borderTopColor: theme.rule } as const);
  const note = { color: theme.muted, fontSize: 14, lineHeight: 20, marginTop: 12 } as const;
  return <>
    {process.env.EXPO_OS === 'web' && <Head><title>Settings · Newsworthy</title></Head>}
    <Stack.Screen options={{ headerLeft: stranded ? () => <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.replace('/')}
      style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginLeft: process.env.EXPO_OS === 'web' ? 4 : 0 }}>
      <BackIcon color={theme.accent} />
    </Pressable> : undefined }} />
    <ScrollView style={{ flex: 1, backgroundColor: theme.tinted }} contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: horizontal, paddingTop: 24, paddingBottom: insets.bottom + 32, alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 440, gap: 28 }}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Appearance">
          <Text accessibilityRole="header" style={heading}>Appearance</Text>
          <View testID="theme-options" style={card}>
            {THEME_CHOICES.map(({ value, label: name }, index) => {
              const checked = preferences.theme === value;
              return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={name} accessibilityState={{ checked, selected: checked }}
                testID={`theme-${value}`} onPress={() => setTheme(value as ThemePreference)} style={row(index)}>
                <Text style={{ ...label, flex: 1 }}>{name}</Text>
                {checked && <CheckIcon color={theme.accent} />}
              </Pressable>;
            })}
          </View>
        </View>
        {pushSupported && <View>
          <Text accessibilityRole="header" style={heading}>Notifications</Text>
          <View style={card}>
            <Pressable testID="notifications-row" accessibilityRole="switch" accessibilityLabel="Notify me about high readings"
              accessibilityState={{ checked: enabled, disabled: busy }} disabled={busy} onPress={() => toggle(!enabled)} style={row(0)}>
              <Text style={{ ...label, flex: 1 }}>Notify me about high readings</Text>
              <Toggle testID="notifications-switch" accessibilityLabel="Notify me about high readings" value={enabled} disabled={busy} onValueChange={toggle} />
            </Pressable>
            <View testID="threshold-row" accessibilityRole="radiogroup" accessibilityLabel="Minimum score" style={{ ...row(1), gap: 4, paddingHorizontal: 8 }}>
              {THRESHOLD_CHOICES.map(value => {
                const checked = value === threshold;
                return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`Minimum score ${value} out of 10`} accessibilityState={{ checked, selected: checked, disabled: busy }}
                  testID={`threshold-${value}`} disabled={busy} onPress={() => choose(value)}
                  style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: checked ? theme.accent : 'transparent' }}>
                  <Text style={{ color: checked ? theme.tinted : theme.ink, fontSize: 17, fontWeight: checked ? '600' : '400',
                    fontFamily: process.env.EXPO_OS === 'ios' ? 'ui-monospace' : 'monospace', fontVariant: ['tabular-nums'] }}>{value}</Text>
                </Pressable>;
              })}
            </View>
          </View>
          <Text testID="notifications-status" accessibilityLiveRegion="polite" style={note}>
            {busy ? 'Saving…' : `Notify on readings ${threshold} or higher ${enabled ? 'enabled' : 'disabled'}.`}
          </Text>
          {notice !== '' && <View accessibilityLiveRegion="polite" style={{ marginTop: 4 }}>
            <Text style={{ ...note, color: theme.danger }}>{NOTICES[notice]}</Text>
            {notice === 'denied' && <Pressable accessibilityRole="button" accessibilityLabel="Open device settings" testID="open-device-settings" onPress={() => Linking.openSettings()}
              style={{ alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' }}>
              <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '600' }}>Open device settings</Text>
            </Pressable>}
          </View>}
        </View>}
        <View>
          <Text accessibilityRole="header" style={heading}>About</Text>
          <View testID="about-links" style={card}>
            {ABOUT_LINKS.map(([name, url], index) => <Link key={name} href={url} asChild>
              <Pressable accessibilityRole="link" accessibilityLabel={name} testID={`link-${name.toLowerCase()}`} style={row(index)}>
                <Text style={{ ...label, flex: 1 }}>{name}</Text>
              </Pressable>
            </Link>)}
          </View>
        </View>
      </View>
    </ScrollView>
  </>;
}
