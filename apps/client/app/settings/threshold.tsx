import { Redirect } from 'expo-router';
import { Pressable, View } from 'react-native';
import Head from 'expo-router/head';
import { pushSupported } from '@/lib/push';
import { useTheme } from '@/lib/theme';
import { THRESHOLD_CHOICES } from '@/lib/preferences';
import { CheckIcon } from '@/components/check-icon';
import { AlertFeedback, useAlertChanges } from '@/components/alert-feedback';
import { RowContent, Section, SettingsPage, rowStyle } from '@/components/settings-list';

export default function ThresholdSettings() {
  const theme = useTheme();
  const { threshold, busy, notice, choose } = useAlertChanges();
  if (!pushSupported) return <Redirect href="/settings" />;
  return <>
    {process.env.EXPO_OS === 'web' && <Head><title>Threshold · Newsworthy</title></Head>}
    <SettingsPage>
      <View>
        <Section testID="threshold-options" role="radiogroup" label="Alert threshold">
          {THRESHOLD_CHOICES.map((value, index) => {
            const checked = value === threshold;
            return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`Alert at ${value} or higher`}
              accessibilityState={{ checked, selected: checked, disabled: busy }} testID={`threshold-${value}`} disabled={busy}
              onPress={() => choose(value)} style={rowStyle()}>
              <RowContent index={index} label={`${value} or higher`} trailing={checked ? <CheckIcon color={theme.accent} /> : null} />
            </Pressable>;
          })}
        </Section>
        <AlertFeedback busy={busy} notice={notice} />
      </View>
    </SettingsPage>
  </>;
}
