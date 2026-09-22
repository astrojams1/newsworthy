import { useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Head from 'expo-router/head';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';
import { usePreferences } from '@/components/preferences-provider';
import { Toggle } from '@/components/toggle';
import { MAX_THRESHOLD, MIN_THRESHOLD, THEME_CHOICES, clampThreshold, type ThemePreference } from '@/lib/preferences';
import { disablePush, enablePush, pushSupported, updatePushThreshold } from '@/lib/push';

const ROW_HEIGHT = 56;

const NOTICES = {
  denied: 'Notifications are turned off for Newsworthy in your device settings.',
  unavailable: 'Notifications are not available on this device.',
  offline: 'Newsworthy could not be reached. Check your connection and try again.',
};

export default function Settings() {
  const theme = useTheme();
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
  const step = async (delta: number) => {
    const next = clampThreshold(threshold + delta);
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
  return <>
    {process.env.EXPO_OS === 'web' && <Head><title>Settings · Newsworthy</title></Head>}
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
                <Text accessible={false} style={{ color: theme.accent, fontSize: 18, opacity: checked ? 1 : 0 }}>✓</Text>
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
              <View testID="threshold-row" style={row(1)}>
                <Text style={{ ...label, flex: 1 }}>Minimum score</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <StepButton glyph="−" name="Lower minimum score" testID="threshold-down" disabled={threshold <= MIN_THRESHOLD} onPress={() => step(-1)} />
                  <Text testID="threshold-value" accessibilityLiveRegion="polite" accessibilityLabel={`${threshold} out of 10`}
                    style={{ color: theme.ink, fontSize: 24, fontWeight: '300', minWidth: 56, textAlign: 'center',
                      fontFamily: process.env.EXPO_OS === 'ios' ? 'ui-monospace' : 'monospace', fontVariant: ['tabular-nums'] }}>{threshold}</Text>
                  <StepButton glyph="+" name="Raise minimum score" testID="threshold-up" disabled={threshold >= MAX_THRESHOLD} onPress={() => step(1)} />
                </View>
              </View>
            </>}
          </View>
          {notice !== '' && <Text accessibilityLiveRegion="polite" style={{ ...note, color: theme.danger }}>{notice}</Text>}
        </View>}
      </View>
    </ScrollView>
  </>;
}

function StepButton({ glyph, name, testID, disabled, onPress }: { glyph: string; name: string; testID: string; disabled: boolean; onPress(): void }) {
  const theme = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ disabled }} disabled={disabled} testID={testID} onPress={onPress}
    style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: theme.rule, opacity: disabled ? 0.35 : 1 }}>
    <Text style={{ color: theme.ink, fontSize: 22, fontWeight: '300' }}>{glyph}</Text>
  </Pressable>;
}
