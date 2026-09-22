import { useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Head from 'expo-router/head';
import { Stack, useRouter } from 'expo-router';
import { BackIcon } from '@/components/back-icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';
import { usePreferences } from '@/components/preferences-provider';
import { Toggle } from '@/components/toggle';
import { THEME_CHOICES, THRESHOLD_CHOICES, type ThemePreference } from '@/lib/preferences';
import { CheckIcon } from '@/components/check-icon';
import { disablePush, enablePush, pushSupported, updatePushThreshold } from '@/lib/push';

const ROW_HEIGHT = 56;

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
  const { preferences, setTheme, setNotifications } = usePreferences();
  const { enabled, threshold, token } = preferences.notifications;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const toggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true); setNotice('');
    try {
      if (next) {
        const result = await enablePush(threshold);
        if (result.ok) setNotifications({ enabled: true, token: result.token });
        else setNotice(NOTICES[result.reason]);
      } else if (!token || await disablePush(token)) {
        setNotifications({ enabled: false, token: null });
      } else setNotice(NOTICES.offline);
    } finally { setBusy(false); }
  };
  const choose = async (next: number) => {
    if (next === threshold || busy) return;
    setNotice('');
    setNotifications({ threshold: next });
    if (enabled && token && !(await updatePushThreshold(token, next))) {
      setNotifications({ threshold });
      setNotice(NOTICES.offline);
    }
  };
  const label = { color: theme.ink, fontSize: 17 } as const;
  const heading = { color: theme.muted, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 } as const;
  const card = { backgroundColor: theme.elevated, borderRadius: 16, borderWidth: 1, borderColor: theme.rule, overflow: 'hidden' } as const;
  // One height for every setting, whatever control it carries.
  const row = (index: number) => ({ height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, gap: 16,
    borderTopWidth: index === 0 ? 0 : 1, borderTopColor: theme.rule } as const);
  const note = { color: theme.muted, fontSize: 14, lineHeight: 20, marginTop: 12 } as const;
  // Reached with nothing behind it — a reload on web, a deep link the
  // navigator could not anchor — the screen still needs a way out.
  const stranded = !router.canGoBack();
  return <>
    {process.env.EXPO_OS === 'web' && <Head><title>Settings · Newsworthy</title></Head>}
    {stranded && <Stack.Screen options={{ headerLeft: () => <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.replace('/')}
      style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginLeft: process.env.EXPO_OS === 'web' ? 4 : 0 }}>
      <BackIcon color={theme.accent} />
    </Pressable> }} />}
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
                <Text style={label}>{name}</Text>
                {checked && <CheckIcon color={theme.accent} />}
              </Pressable>;
            })}
          </View>
        </View>
        {pushSupported && <View>
          <Text accessibilityRole="header" style={heading}>Notifications</Text>
          <View style={card}>
            <View testID="notifications-row" style={row(0)}>
              <Text style={{ ...label, flex: 1 }}>Notify me about high readings</Text>
              <Toggle testID="notifications-switch" accessibilityLabel="Notify me about high readings" value={enabled} disabled={busy} onValueChange={toggle} />
            </View>
            {enabled && <>
              <View testID="threshold-row" accessibilityRole="radiogroup" accessibilityLabel="Minimum score" style={{ ...row(1), gap: 4, paddingHorizontal: 8 }}>
                {THRESHOLD_CHOICES.map(value => {
                  const checked = value === threshold;
                  return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`Minimum score ${value} out of 10`} accessibilityState={{ checked, selected: checked }}
                    testID={`threshold-${value}`} onPress={() => choose(value)}
                    style={{ flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: checked ? theme.accent : 'transparent' }}>
                    <Text style={{ color: checked ? theme.tinted : theme.ink, fontSize: 17, fontWeight: checked ? '600' : '400',
                      fontFamily: process.env.EXPO_OS === 'ios' ? 'ui-monospace' : 'monospace', fontVariant: ['tabular-nums'] }}>{value}</Text>
                  </Pressable>;
                })}
              </View>
            </>}
          </View>
          {enabled && <Text style={note}>New developments rated {threshold} or higher.</Text>}
          {notice !== '' && <Text accessibilityLiveRegion="polite" style={{ ...note, color: theme.danger }}>{notice}</Text>}
        </View>}
      </View>
    </ScrollView>
  </>;
}
