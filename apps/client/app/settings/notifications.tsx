import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import Head from 'expo-router/head';
import { Redirect } from 'expo-router';
import { pushSupported } from '@/lib/push';
import { useTheme } from '@/lib/theme';
import { usePreferences } from '@/components/preferences-provider';
import { Toggle } from '@/components/toggle';
import { THRESHOLD_CHOICES } from '@/lib/preferences';
import { RowContent, Section, SettingsPage, rowStyle } from '@/components/settings-list';

const NOTICES = {
  denied: 'Notifications are turned off for Newsworthy in your device settings.',
  unavailable: 'Notifications are not available on this device.',
  offline: 'Newsworthy could not be reached. Check your connection and try again.',
};

export default function NotificationSettings() {
  const theme = useTheme();
  const { preferences, subscription, savingNotifications: busy } = usePreferences();
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
  // Alerts are a native feature; a shared or typed link on the web lands on
  // the overview rather than on controls that cannot register anything.
  if (!pushSupported) return <Redirect href="/settings" />;
  const note = { color: theme.muted, fontSize: 14, lineHeight: 20, marginTop: 12, marginHorizontal: 16 } as const;
  return <>
    {process.env.EXPO_OS === 'web' && <Head><title>Notifications · Newsworthy</title></Head>}
    <SettingsPage>
      <View>
        <Section>
          <Pressable testID="notifications-row" accessibilityRole="switch" accessibilityLabel="High-score alerts"
            accessibilityState={{ checked: enabled, disabled: busy }} disabled={busy} onPress={() => toggle(!enabled)} style={rowStyle()}>
            <RowContent index={0} label="High-score alerts"
              trailing={<Toggle testID="notifications-switch" accessibilityLabel="High-score alerts" value={enabled} disabled={busy} onValueChange={toggle} />} />
          </Pressable>
        </Section>
        <Text style={note}>Get an alert when the displayed score reaches your threshold, once per development.</Text>
      </View>
      {/* The score can be chosen while alerts are off, so turning them on means something definite. */}
      <View>
        <Section title="Threshold">
          <View testID="threshold-row" accessibilityRole="radiogroup" accessibilityLabel="Alert threshold"
            style={{ ...rowStyle(), paddingLeft: 8, paddingRight: 8, gap: 4 }}>
            {THRESHOLD_CHOICES.map(value => {
              const checked = value === threshold;
              return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`Alert at ${value} or higher`} accessibilityState={{ checked, selected: checked, disabled: busy }}
                testID={`threshold-${value}`} disabled={busy} onPress={() => choose(value)}
                style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: checked ? theme.accent : 'transparent' }}>
                <Text style={{ color: checked ? theme.tinted : theme.ink, fontSize: 17, fontWeight: checked ? '600' : '400',
                  fontFamily: process.env.EXPO_OS === 'ios' ? 'ui-monospace' : 'monospace', fontVariant: ['tabular-nums'] }}>{value}</Text>
              </Pressable>;
            })}
          </View>
        </Section>
        <Text testID="notifications-status" accessibilityLiveRegion="polite" style={note}>
          {busy ? 'Saving…' : `Alerts at ${threshold} or higher are ${enabled ? 'on' : 'off'}.`}
        </Text>
        {notice !== '' && <View accessibilityLiveRegion="polite" style={{ marginTop: 4 }}>
          <Text style={{ ...note, color: theme.danger }}>{NOTICES[notice]}</Text>
          {notice === 'denied' && <Pressable accessibilityRole="button" accessibilityLabel="Open device settings" testID="open-device-settings" onPress={() => Linking.openSettings()}
            style={{ alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', marginHorizontal: 16 }}>
            <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '600' }}>Open device settings</Text>
          </Pressable>}
        </View>}
      </View>
    </SettingsPage>
  </>;
}
