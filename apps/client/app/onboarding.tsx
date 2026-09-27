import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tokens from '../../../public/tokens.js';
import { useTheme } from '@/lib/theme';
import { usePreferences } from '@/components/preferences-provider';
import { onboardingSlides, type SlideArt } from '@/lib/onboarding';

type Theme = ReturnType<typeof useTheme>;
const platform = process.env.EXPO_OS === 'ios' || process.env.EXPO_OS === 'android' ? process.env.EXPO_OS : 'web';
const scoreFont = platform === 'ios' ? 'ui-monospace' : 'monospace';
// Every slide is the same stack of fixed heights — the illustration, one line
// of title, four lines of body — centred as a whole, so the title sits at the
// same height on every slide and does not jump as the reader swipes.
const ART_HEIGHT = 220;
const TITLE_LINE = 32;
const BODY_LINE = 25;
const BODY_LINES = 4;

// The introduction: three slides on the web, five in the apps, swiped or stepped with Next. The phone apps
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
  const slides = onboardingSlides(platform);
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
          <View style={{ height: ART_HEIGHT, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Art art={slide.art} theme={theme} />
          </View>
          <Text testID="onboarding-title" accessibilityRole="header" style={{ color: theme.ink, fontSize: 26, lineHeight: TITLE_LINE, minHeight: TITLE_LINE, fontWeight: '600', textAlign: 'center' }}>{slide.title}</Text>
          <Text style={{ color: theme.muted, fontSize: 17, lineHeight: BODY_LINE, minHeight: BODY_LINE * BODY_LINES, textAlign: 'center', marginTop: 14 }}>{slide.body}</Text>
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
// palette, the widget and launcher mark — so they read as the app rather than as art.
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
  if (art === 'widget') return <HomeScreen theme={theme} />;
  return <Notification theme={theme} />;
}

// The app's launcher mark: a dash, dark on white or white on near-black.
function LauncherIcon({ theme, size }: { theme: Theme; size: number }) {
  const identity = tokens.identity[theme.dark ? 'dark' : 'light'];
  return <View style={{ width: size, height: size, borderRadius: platform === 'android' ? size / 2 : size * 0.225, backgroundColor: identity.surface,
    borderWidth: 1, borderColor: theme.rule, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.36, height: Math.max(2, size * 0.07), borderRadius: 1, backgroundColor: identity.ink }} />
  </View>;
}

// A home screen with the small widget in the top-left two-by-two, drawn in the
// brand palette with a dash, as the widget shows before it has a reading.
// iOS icons are rounded squares and the widget's corners match them; Android
// launchers draw round icons and a more rounded widget.
function HomeScreen({ theme }: { theme: Theme }) {
  const brand = tokens.brand[theme.dark ? 'dark' : 'light'];
  const cell = 52, gap = 18, widget = cell * 2 + gap;
  const icon = (key: string) => <View key={key} style={{ width: cell, height: cell, borderRadius: platform === 'android' ? cell / 2 : 12, backgroundColor: theme.rule }} />;
  return <View style={{ padding: 18, borderRadius: 28, borderWidth: 1, borderColor: theme.rule, backgroundColor: theme.elevated, gap }}>
    <View style={{ flexDirection: 'row', gap }}>
      <View style={{ width: widget, height: widget, borderRadius: platform === 'android' ? 24 : 22, backgroundColor: brand.end, padding: 14, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: brand.ink, fontSize: 54, lineHeight: 60, fontWeight: '300', fontFamily: scoreFont }}>–</Text>
          <Text style={{ color: brand.gradientMuted, fontSize: 12, fontFamily: scoreFont, marginLeft: 2, marginTop: 14 }}>∕10</Text>
        </View>
        <View style={{ width: 52, height: 6, borderRadius: 3, backgroundColor: brand.gradientMuted, opacity: 0.45 }} />
      </View>
      <View style={{ gap }}>{[0, 1].map(row => <View key={row} style={{ flexDirection: 'row', gap }}>{icon(`a${row}`)}{icon(`b${row}`)}</View>)}</View>
    </View>
    <View style={{ flexDirection: 'row', gap }}>{['c', 'd', 'e', 'f'].map(icon)}</View>
  </View>;
}

// A notification as each platform draws one: iOS a rounded banner with the
// app icon beside the text, Android a card led by a small icon and the app name.
// The text is placeholder bars, so it cannot read as a real alert.
function Notification({ theme }: { theme: Theme }) {
  const bar = (width: number, opacity = 1) => <View style={{ width, height: 8, borderRadius: 4, backgroundColor: theme.rule, opacity }} />;
  if (platform === 'android') return <View style={{ width: 290, borderRadius: 24, backgroundColor: theme.elevated, borderWidth: 1, borderColor: theme.rule, padding: 16, gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <LauncherIcon theme={theme} size={22} />
      <Text style={{ color: theme.muted, fontSize: 13 }}>Newsworthy · now</Text>
    </View>
    <View style={{ gap: 8 }}>{bar(210)}{bar(170, 0.7)}</View>
  </View>;
  return <View style={{ width: 300, borderRadius: 22, backgroundColor: theme.elevated, borderWidth: 1, borderColor: theme.rule, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
    <LauncherIcon theme={theme} size={40} />
    <View style={{ flex: 1, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: theme.ink, fontSize: 15, fontWeight: '600' }}>Newsworthy</Text>
        <Text style={{ color: theme.muted, fontSize: 13 }}>now</Text>
      </View>
      {bar(180)}{bar(140, 0.7)}
    </View>
  </View>;
}
