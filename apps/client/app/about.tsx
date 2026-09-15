import { ScrollView, Text, Pressable, useWindowDimensions } from 'react-native';
import { Stack, Link, useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme';
import { privacyUrl, supportUrl } from '@/lib/config';
export default function About() {
  const theme = useTheme(); const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const paragraphs = [
    'A calm global status indicator. A number out of 10 and one sentence explaining why.',
    'Stay connected to the world without getting pulled into the feed. Check in, then get on with your day.',
    'No doomscrolling. No subscription. No in-app purchases. No ads. No engagement, addiction or growth-hacking tactics.',
    'An AI model rates how worthwhile it is to check the news. Higher means more consequential; the score fades as developments age.',
    'Ratings can be wrong. When a connection is unavailable, the last saved reading is shown with its original update time.',
  ];
  return <>
    <Stack.Screen options={{ headerRight: () => <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ padding: 10, minWidth: 48, minHeight: 48, justifyContent: 'center' }}><Text style={{ color: theme.ink }}>Done</Text></Pressable> }} />
    <ScrollView key={fontScale} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 28, paddingBottom: 50, gap: 22, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
      {paragraphs.map(text => <Text key={text} selectable style={{ color: theme.ink, fontSize: 17, lineHeight: 27 }}>{text}</Text>)}
      {[['Privacy policy', privacyUrl], ['Support', supportUrl]].map(([label, url]) => <Link key={label} href={url} asChild><Pressable accessibilityRole="link" style={{ paddingVertical: 12, minHeight: 48 }}><Text style={{ color: theme.accent, fontSize: 16 }}>{label}</Text></Pressable></Link>)}
    </ScrollView>
  </>;
}
