import { Pressable } from 'react-native';
import Head from 'expo-router/head';
import { useTheme } from '@/lib/theme';
import { usePreferences } from '@/components/preferences-provider';
import { THEME_CHOICES, type ThemePreference } from '@/lib/preferences';
import { RowContent, Section, SettingsPage, rowStyle, TrailingMark } from '@/components/settings-list';

// Widgets are native only, and they sit on a home screen the app never sees,
// so the apps choose their appearance separately. The website has one choice
// and no section titles, because there is nothing to tell it apart from.
const widgets = process.env.EXPO_OS !== 'web';

function Choices({ id, label, title, value, onChoose }: {
  id: string; label: string; title?: string; value: ThemePreference; onChoose(value: ThemePreference): void;
}) {
  const theme = useTheme();
  return <Section testID={`${id}-options`} title={title} role="radiogroup" label={label}>
    {THEME_CHOICES.map(({ value: choice, label: name }, index) => {
      const checked = value === choice;
      return <Pressable key={choice} accessibilityRole="radio" accessibilityLabel={name} accessibilityState={{ checked, selected: checked }}
        testID={`${id}-${choice}`} onPress={() => onChoose(choice as ThemePreference)} style={rowStyle()}>
        <RowContent index={index} label={name} trailing={checked ? <TrailingMark name="check" color={theme.accent} /> : null} />
      </Pressable>;
    })}
  </Section>;
}

export default function AppearanceSettings() {
  const { preferences, setTheme, setWidgetTheme } = usePreferences();
  return <>
    {process.env.EXPO_OS === 'web' && <Head><title>Appearance · Newsworthy</title></Head>}
    <SettingsPage>
      <Choices id="theme" title={widgets ? 'App' : undefined} label={widgets ? 'App appearance' : 'Appearance'}
        value={preferences.theme} onChoose={setTheme} />
      {widgets && <Choices id="widget-theme" title="Widgets" label="Widget appearance"
        value={preferences.widgetTheme} onChoose={setWidgetTheme} />}
    </SettingsPage>
  </>;
}
