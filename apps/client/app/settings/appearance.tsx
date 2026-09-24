import { Pressable } from 'react-native';
import Head from 'expo-router/head';
import { useTheme } from '@/lib/theme';
import { usePreferences } from '@/components/preferences-provider';
import { THEME_CHOICES, type ThemePreference } from '@/lib/preferences';
import { CheckIcon } from '@/components/check-icon';
import { RowContent, Section, SettingsPage, rowStyle } from '@/components/settings-list';

export default function AppearanceSettings() {
  const theme = useTheme();
  const { preferences, setTheme } = usePreferences();
  return <>
    {process.env.EXPO_OS === 'web' && <Head><title>Appearance · Newsworthy</title></Head>}
    <SettingsPage>
      <Section testID="theme-options" role="radiogroup" label="Appearance">
        {THEME_CHOICES.map(({ value, label }, index) => {
          const checked = preferences.theme === value;
          return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked, selected: checked }}
            testID={`theme-${value}`} onPress={() => setTheme(value as ThemePreference)} style={rowStyle()}>
            <RowContent index={index} label={label} trailing={checked ? <CheckIcon color={theme.accent} /> : null} />
          </Pressable>;
        })}
      </Section>
    </SettingsPage>
  </>;
}
