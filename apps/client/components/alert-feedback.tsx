import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useTheme } from '@/lib/theme';
import { usePreferences } from '@/components/preferences-provider';

const NOTICES = {
  denied: 'Notifications are turned off for Newsworthy in your device settings.',
  unavailable: 'Notifications are not available on this device.',
  offline: 'Newsworthy could not be reached. Check your connection and try again.',
};
type NoticeReason = keyof typeof NOTICES;

// The alert switch and the threshold page change the same registration. The
// registration itself is the provider's: its queue outlives these screens, so
// a request still in flight when one closes is finished in order with
// whatever the next one asks. Each screen keeps only its own failure notice.
export function useAlertChanges() {
  const { preferences, subscription, savingNotifications: busy } = usePreferences();
  const { enabled, threshold } = preferences.notifications;
  const [notice, setNotice] = useState<'' | NoticeReason>('');
  const settle = (result: { ok: true } | { ok: false; reason: NoticeReason }) => { if (!result.ok) setNotice(result.reason); };
  const toggle = async (next: boolean) => {
    setNotice('');
    settle(await (next ? subscription.enable() : subscription.disable()));
  };
  const choose = async (next: number) => {
    if (next === threshold) return;
    setNotice('');
    settle(await subscription.choose(next));
  };
  return { enabled, threshold, busy, notice, toggle, choose };
}

export const noteStyle = (muted: string) => ({ color: muted, fontSize: 14, lineHeight: 20, marginTop: 12, marginHorizontal: 16 } as const);

// What sits under the controls: "Saving…" while a change is on its way, and
// a failure when one comes back. Nothing restates the controls' own state.
export function AlertFeedback({ busy, notice }: { busy: boolean; notice: '' | NoticeReason }) {
  const theme = useTheme();
  const note = noteStyle(theme.muted);
  return <>
    <Text testID="notifications-status" accessibilityLiveRegion="polite" style={note}>{busy ? 'Saving…' : ''}</Text>
    {notice !== '' && <View accessibilityLiveRegion="polite" style={{ marginTop: 4 }}>
      <Text style={{ ...note, color: theme.danger }}>{NOTICES[notice]}</Text>
      {notice === 'denied' && <Pressable accessibilityRole="button" accessibilityLabel="Open device settings" testID="open-device-settings" onPress={() => Linking.openSettings()}
        style={{ alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', marginHorizontal: 16 }}>
        <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '600' }}>Open device settings</Text>
      </Pressable>}
    </View>}
  </>;
}
