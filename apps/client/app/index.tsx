import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, Share, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { AppIcon } from '@/components/app-icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';
import { useCurrentReading } from '@/components/reading-provider';
import { ReadingGradient } from '@/components/reading-gradient';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { website } from '@/lib/config';

export default function Home() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const dimensions = useWindowDimensions();
  // Static web rendering has no viewport; keep the initial content readable.
  const width = dimensions.width || 390;
  const height = dimensions.height || 844;
  const fontScale = dimensions.fontScale || 1;
  const landscape = height < 520;
  const scoreSize = landscape ? Math.min(height * 0.26, 224) : Math.max(64, Math.min(width * 0.30, height * 0.30, 224));
  const sentenceSize = landscape ? 16 : Math.max(17, Math.min(width * 0.026, 22));
  const horizontal = Math.max(20, Math.min(width * 0.05, 48));
  const { reading, saved, failed, loading, refresh } = useCurrentReading();
  const [now, setNow] = useState(Date.now());
  const [shareNotice, setShareNotice] = useState('');
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  const minutes = reading ? Math.max(0, Math.floor((now - Date.parse(reading.created_at)) / 60000)) : 0;
  const relative = minutes < 1 ? 'just now' : minutes < 60 ? `${minutes} min ago` : minutes < 1440 ? `${Math.floor(minutes / 60)} hr ago` : `${Math.floor(minutes / 1440)} days ago`;
  const shareReading = async () => {
    if (!reading) return;
    const message = `${reading.score}/10 · ${reading.explanation}\nUpdated ${new Date(reading.created_at).toLocaleString()}\n${website}`;
    try {
      if (process.env.EXPO_OS === 'web') {
        if (navigator.share) await navigator.share({ title: 'Newsworthy', text: message });
        else { await navigator.clipboard.writeText(message); setShareNotice('Reading copied.'); }
      }
      else await Share.share({ title: 'Newsworthy', message });
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setShareNotice('Sharing is unavailable. Please try again.');
    }
  };
  return <>
    {process.env.EXPO_OS === 'web' && <Head><title>Newsworthy — A calm global status indicator</title></Head>}
    <Stack.Screen options={{ headerTransparent: true, headerStyle: { backgroundColor: 'transparent' }, headerTitle: '',
      headerRight: () => reading ? <Pressable accessibilityRole="button" accessibilityLabel="Share this reading" onPress={shareReading} style={{ minWidth: 48, minHeight: 48, marginRight: process.env.EXPO_OS === 'web' ? 12 : 0, alignItems: 'center', justifyContent: 'center' }}>
        <AppIcon name="share" color={theme.accent} />
      </Pressable> : null }} />
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
    <ReadingGradient score={reading?.score} dark={theme.dark} />
    <ScrollView key={fontScale} contentInsetAdjustmentBehavior="never" style={{ flex: 1, backgroundColor: 'transparent' }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: horizontal, paddingBottom: insets.bottom + (landscape ? 16 : 32), paddingTop: headerHeight + (landscape ? 16 : 24) }}>
      <View style={{ maxWidth: landscape ? 600 : 440, width: '100%', alignItems: 'center' }}>
        <Text selectable accessibilityRole="header" adjustsFontSizeToFit minimumFontScale={0.3} numberOfLines={1} testID="rating-score" accessibilityLabel={reading ? `${reading.score} out of 10` : 'Rating unavailable'} accessibilityLiveRegion="polite"
          style={{ color: theme.ink, fontSize: scoreSize, lineHeight: scoreSize * 1.12, maxWidth: '100%', textAlign: 'center', fontWeight: '300', fontVariant: ['tabular-nums'], letterSpacing: -scoreSize * 0.04 }}>
          {reading?.score ?? '–'}<Text style={{ color: theme.faint, fontSize: Math.max(18, Math.min(width * .04, height * .04, 32)), letterSpacing: 0 }}> /10</Text>
        </Text>
        <Text selectable testID="rating-explanation" style={{ color: theme.ink, fontSize: sentenceSize, lineHeight: sentenceSize * 1.45, textAlign: 'center', maxWidth: landscape ? 600 : sentenceSize * 17 * fontScale, marginTop: landscape ? 12 : Math.max(16, Math.min(width * .04, height * .03, 40)) }}>{reading?.explanation ?? (failed ? 'The latest rating is unavailable. Try again when you’re connected.' : 'Checking the latest rating.')}</Text>
        {reading && <Text selectable style={{ color: theme.faint, fontSize: 14, textAlign: 'center', marginTop: landscape ? 10 : 24 }}>{saved ? 'Saved reading · ' : ''}Updated {relative}</Text>}
        {shareNotice !== '' && <Text accessibilityLiveRegion="polite" style={{ color: theme.muted, fontSize: 14, textAlign: 'center', marginTop: 12 }}>{shareNotice}</Text>}
        {failed && <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={refresh} style={{ padding: 12, minWidth: 48, minHeight: 48 }}><Text style={{ color: theme.accent }}>{loading ? 'Checking…' : 'Try again'}</Text></Pressable>}
      </View>
    </ScrollView>
    </View>
  </>;
}
