import { Pressable, Text, View } from 'react-native';
import Head from 'expo-router/head';
import { Link } from 'expo-router';
import { useTheme } from '@/lib/theme';
import { PUBLISHER, PUBLISHER_COPY } from '@/lib/publisher';
import { RowContent, Section, SettingsPage, Trailing, rowStyle } from '@/components/settings-list';

// A paragraph inside a settings group, inset like the rows around it.
function Paragraph({ children, testID }: { children: string; testID?: string }) {
  const theme = useTheme();
  return <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
    <Text testID={testID} style={{ color: theme.ink, fontSize: 17, lineHeight: 24 }}>{children}</Text>
  </View>;
}

export default function PublisherSettings() {
  return <>
    {process.env.EXPO_OS === 'web' && <Head><title>Publisher · Newsworthy</title></Head>}
    <SettingsPage>
      <Section title="Publisher" testID="publisher-info">
        <Paragraph testID="publisher-published">{PUBLISHER_COPY.published}</Paragraph>
        <Paragraph testID="publisher-readings">{PUBLISHER_COPY.readings}</Paragraph>
      </Section>
      <Section title="Contact" testID="publisher-contact">
        <Paragraph>{PUBLISHER_COPY.contact}</Paragraph>
        <Link href={`mailto:${PUBLISHER.email}?subject=Newsworthy`} asChild>
          <Pressable testID="publisher-email" accessibilityRole="link" accessibilityLabel={`Email ${PUBLISHER.email}`}
            accessibilityHint="Opens your email app" style={rowStyle()}>
            <RowContent index={1} label={PUBLISHER.email} trailing={<Trailing to="external" />} />
          </Pressable>
        </Link>
      </Section>
    </SettingsPage>
  </>;
}
