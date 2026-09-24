import { Link, Redirect } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Head from 'expo-router/head';
import { pushSupported } from '@/lib/push';
import { useTheme } from '@/lib/theme';
import { Toggle } from '@/components/toggle';
import { AlertFeedback, noteStyle, useAlertChanges } from '@/components/alert-feedback';
import { RowContent, Section, SettingsPage, Trailing, rowStyle } from '@/components/settings-list';

export default function NotificationSettings() {
  const theme = useTheme();
  const { enabled, threshold, busy, notice, toggle } = useAlertChanges();
  // Alerts are a native feature; a shared or typed link on the web lands on
  // the overview rather than on controls that cannot register anything.
  if (!pushSupported) return <Redirect href="/settings" />;
  return <>
    {process.env.EXPO_OS === 'web' && <Head><title>Notifications · Newsworthy</title></Head>}
    <SettingsPage>
      <View>
        <Section testID="alert-options">
          <Pressable testID="notifications-row" accessibilityRole="switch" accessibilityLabel="High-score alerts"
            accessibilityState={{ checked: enabled, disabled: busy }} disabled={busy} onPress={() => toggle(!enabled)} style={rowStyle()}>
            <RowContent index={0} label="High-score alerts"
              trailing={<Toggle testID="notifications-switch" accessibilityLabel="High-score alerts" value={enabled} disabled={busy} onValueChange={toggle} />} />
          </Pressable>
          {/* The threshold can be chosen while alerts are off, so turning them on means something definite. */}
          <Link href="/settings/threshold" asChild>
            <Pressable testID="threshold-row" accessibilityRole="button" accessibilityLabel={`Threshold, ${threshold} or higher`} style={rowStyle()}>
              <RowContent index={1} label="Threshold" trailing={<Trailing value={`${threshold} or higher`} to="page" />} />
            </Pressable>
          </Link>
        </Section>
        <Text style={noteStyle(theme.muted)}>Get an alert when the displayed score reaches your threshold, once per development.</Text>
        <AlertFeedback busy={busy} notice={notice} />
      </View>
    </SettingsPage>
  </>;
}
