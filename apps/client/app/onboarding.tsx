import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tokens from '../../../public/tokens.js';
import { useTheme } from '@/lib/theme';
import { usePreferences } from '@/components/preferences-provider';
import { onboardingSlides, type SlideArt } from '@/lib/onboarding';
import { pushSupported } from '@/lib/push';
import { Glyph, type GlyphName } from '@/components/glyph';

type Theme = ReturnType<typeof useTheme>;
const scoreFont = process.env.EXPO_OS === 'ios' ? 'ui-monospace' : 'monospace';

// The introduction: four slides, swiped or stepped with Next. The phone apps
// open it once on first launch; Settings replays it. It is marked seen as soon
// as it opens, so closing it any way at all — Skip, Done, the system back
// gesture — does not bring it back on the next launch.
export default function Onboarding() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dimensions = useWindowDimensions();
  const width = dimensions.width || 390;
  const { setOnboarded } = usePreferences();
  useEffect(() => { setOnboarded(); }, [setOnboarded]);
  const slides = onboardingSlides({ push: pushSupported });
  const [index, setIndex] = useState(0);
  const pager = useRef<ScrollView>(null);
  const last = index === slides.length - 1;
  const close = () => { if (router.canGoBack()) router.back(); else router.replace('/'); };
  // While Next's own scroll is under way, the offsets it passes through are not
  // a page the reader chose: a second tap mid-animation read the old page back
  // and landed on the same slide again.
  const target = useRef<number | null>(null);
  const go = (next: number) => { target.current = next; setIndex(next); pager.current?.scrollTo({ x: next * width, animated: true }); };
  const scrolled = (x: number) => {
    const page = Math.round(x / width);
    if (target.current !== null) { if (page === target.current) target.current = null; return; }
    if (page !== index && page >= 0 && page < slides.length) setIndex(page);
  };
  const column = Math.min(width - 48, 400);
  return <View testID="onboarding" style={{ flex: 1, backgroundColor: theme.tinted, paddingTop: insets.top, paddingBottom: insets.bottom }}>
    {process.env.EXPO_OS === 'web' && <Head><title>Introduction · Newsworthy</title></Head>}
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, minHeight: 56, alignItems: 'center' }}>
      {!last && <Pressable testID="onboarding-skip" accessibilityRole="button" accessibilityLabel="Skip introduction" onPress={close}
        style={{ minWidth: 48, minHeight: 48, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.accent, fontSize: 17 }}>Skip</Text>
      </Pressable>}
    </View>
    <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEventThrottle={16} style={{ flex: 1 }}
      onScrollBeginDrag={() => { target.current = null; }} onScroll={event => scrolled(event.nativeEvent.contentOffset.x)}>
      {slides.map((slide, position) => <View key={slide.key} testID={`onboarding-slide-${slide.key}`} accessibilityElementsHidden={position !== index}
        importantForAccessibility={position === index ? 'auto' : 'no-hide-descendants'}
        style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ width: column, alignItems: 'center' }}>
          <View style={{ height: 220, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Art art={slide.art} theme={theme} />
          </View>
          <Text accessibilityRole="header" style={{ color: theme.ink, fontSize: 26, lineHeight: 32, fontWeight: '600', textAlign: 'center' }}>{slide.title}</Text>
          <Text style={{ color: theme.muted, fontSize: 17, lineHeight: 25, textAlign: 'center', marginTop: 14 }}>{slide.body}</Text>
        </View>
      </View>)}
    </ScrollView>
    <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 24 }}>
      <View accessible accessibilityLabel={`Page ${index + 1} of ${slides.length}`} style={{ flexDirection: 'row', gap: 8 }}>
        {slides.map((slide, position) => <View key={slide.key}
          style={{ width: position === index ? 20 : 8, height: 8, borderRadius: 4, backgroundColor: position === index ? theme.accent : theme.rule }} />)}
      </View>
      <Pressable testID="onboarding-next" accessibilityRole="button" accessibilityLabel={last ? 'Done' : 'Next'} onPress={() => last ? close() : go(index + 1)}
        style={({ pressed }) => ({ width: column, minHeight: 52, borderRadius: 14, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
        <Text style={{ color: theme.tinted, fontSize: 17, fontWeight: '600' }}>{last ? 'Done' : 'Next'}</Text>
      </Pressable>
    </View>
  </View>;
}

// Illustrations are drawn from the app's own parts — the score type, the level
// palette, the settings glyphs — so they read as the app rather than as art.
// None shows a real reading: a slide must not look like the current news.
function Art({ art, theme }: { art: SlideArt; theme: Theme }) {
  const mode = theme.dark ? 'dark' : 'light';
  const card = { backgroundColor: theme.elevated, borderRadius: 20, borderWidth: 1, borderColor: theme.rule } as const;
  if (art === 'scale') return <View style={{ ...card, width: 240, paddingVertical: 28, alignItems: 'center' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ color: theme.ink, fontSize: 72, lineHeight: 80, fontWeight: '300', fontFamily: scoreFont }}>–</Text>
      <Text style={{ color: theme.muted, fontSize: 18, fontWeight: '300', fontFamily: scoreFont, marginLeft: 4, marginTop: 20 }}>∕10</Text>
    </View>
    <View style={{ gap: 8, marginTop: 18, alignItems: 'center' }}>
      <View style={{ width: 176, height: 8, borderRadius: 4, backgroundColor: theme.rule }} />
      <View style={{ width: 132, height: 8, borderRadius: 4, backgroundColor: theme.rule }} />
    </View>
    <View style={{ width: 72, height: 6, borderRadius: 3, backgroundColor: theme.rule, opacity: 0.7, marginTop: 16 }} />
  </View>;
  if (art === 'levels') return <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 200 }}>
    {tokens.levels.map((level: any, i: number) => <View key={i} style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: 22, height: 36 + i * 14, borderRadius: 6, backgroundColor: level[mode].end }} />
      <Text style={{ color: theme.muted, fontSize: 12, fontFamily: scoreFont }}>{i + 1}</Text>
    </View>)}
  </View>;
  if (art === 'fade') return <View style={{ alignItems: 'center', gap: 22 }}>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 18 }}>
      {[8, 6, 4, 2].map((score, i) => <Text key={score}
        style={{ color: theme.ink, opacity: 1 - i * 0.24, fontSize: 64 - i * 12, fontWeight: '300', fontFamily: scoreFont }}>{score}</Text>)}
    </View>
    <View style={{ ...card, paddingHorizontal: 18, paddingVertical: 12 }}>
      <Text style={{ color: theme.ink, fontSize: 15 }}><Text style={{ fontWeight: '700' }}>New:</Text> first coverage of a development</Text>
    </View>
  </View>;
  const rows: [GlyphName, string][] = [['appearance', 'Appearance'], ...(pushSupported ? [['notifications', 'Notifications'] as [GlyphName, string]] : []), ['introduction', 'Introduction']];
  return <View style={{ ...card, width: 260, overflow: 'hidden' }}>
    {rows.map(([icon, label], i) => <View key={label} style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, minHeight: 52 }}>
      <View style={{ marginRight: 14 }}><Glyph name={icon} color={theme.accent} size={22} /></View>
      <View style={{ flex: 1, alignSelf: 'stretch', justifyContent: 'center', borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.rule }}>
        <Text style={{ color: theme.ink, fontSize: 17 }}>{label}</Text>
      </View>
    </View>)}
  </View>;
}
