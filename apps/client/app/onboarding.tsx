import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { fromByteArray } from 'base64-js';
import tokens from '../../../public/tokens.js';
import { useTheme } from '@/lib/theme';
import { usePreferences } from '@/components/preferences-provider';
import { useCurrentReading } from '@/components/reading-provider';
import { ReadingGradient } from '@/components/reading-gradient';
import { onboardingSlides, type SlideArt } from '@/lib/onboarding';
import { displayExplanation } from '@/lib/story-age';
import { readingGradientSvg } from '@/lib/reading-gradient';
import { themeForLevel } from '@/lib/palette';

type Theme = ReturnType<typeof useTheme>;
const platform = process.env.EXPO_OS === 'ios' ? 'ios' : 'android';
const scoreFont = platform === 'ios' ? 'ui-monospace' : 'monospace';
// Every slide is the same stack of fixed heights — the illustration, one line
// of title, room for three of description — centred as a whole, so the title
// sits at the same height on every slide and does not jump as the reader swipes.
const ART_HEIGHT = 290;
const TITLE_LINE = 32;
const BODY_LINE = 25;
const BODY_LINES = 3;
const TEXT_BLOCK = TITLE_LINE + 12 + BODY_LINE * BODY_LINES;

// The introduction belongs to the phone apps. The website has no route to it,
// and a typed or shared link lands on the reading.
export default function Onboarding() {
  return process.env.EXPO_OS === 'web' ? <Redirect href="/" /> : <Introduction />;
}

// Four slides, swiped or stepped with Next. The apps open it once on first
// launch; Settings replays it. It is marked seen as soon as it opens, so
// closing it any way at all — Skip, Done, the system back gesture — does not
// bring it back on the next launch.
function Introduction() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dimensions = useWindowDimensions();
  const width = dimensions.width || 390;
  const { setOnboarded } = usePreferences();
  const { reading } = useCurrentReading();
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
  // The reading's own canvas, as on the reading screen behind it.
  return <View testID="onboarding" style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top, paddingBottom: insets.bottom }}>
    <ReadingGradient score={reading?.score} dark={theme.dark} />
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
        style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 24 }}>
        <View style={{ height: ART_HEIGHT, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginBottom: 36 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Art art={slide.art} theme={theme} score={reading?.score} saved={reading?.created_at} explanation={reading ? displayExplanation(reading) : undefined} />
        </View>
        <View style={{ width: column, height: TEXT_BLOCK, alignItems: 'center' }}>
          <Text testID="onboarding-title" accessibilityRole="header" style={{ color: theme.ink, fontSize: 26, lineHeight: TITLE_LINE, minHeight: TITLE_LINE, fontWeight: '600', textAlign: 'center' }}>{slide.title}</Text>
          <Text testID="onboarding-body" style={{ color: theme.muted, fontSize: 17, lineHeight: BODY_LINE, minHeight: BODY_LINE * BODY_LINES, textAlign: 'center', marginTop: 12 }}>{slide.body}</Text>
        </View>
      </View>)}
    </ScrollView>
    <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, gap: 24 }}>
      <View accessible accessibilityLabel={`Page ${index + 1} of ${slides.length}`} style={{ flexDirection: 'row', gap: 8 }}>
        {slides.map((slide, position) => <View key={slide.key}
          // On the reading's gradient the hairline rule color disappears, so
          // the inactive dots are the muted ink, faded.
          style={{ width: position === index ? 20 : 8, height: 8, borderRadius: 4, backgroundColor: position === index ? theme.accent : theme.muted, opacity: position === index ? 1 : 0.3 }} />)}
      </View>
      <Pressable testID="onboarding-next" accessibilityRole="button" accessibilityLabel={last ? 'Done' : 'Next'} onPress={() => last ? close() : go(index + 1)}
        style={({ pressed }) => ({ width: column, minHeight: 52, borderRadius: 14, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
        <Text style={{ color: theme.tinted, fontSize: 17, fontWeight: '600' }}>{last ? 'Done' : 'Next'}</Text>
      </Pressable>
    </View>
  </View>;
}

// Illustrations are drawn from what the app and its widgets actually show: the
// score type, each level's own colors, the widget's layout and the
// notification's title. Where a score appears it is the current one, so the
// widget pictured is the widget the reader would add; before any reading has
// arrived it shows the dash the app and the widget show.
type Palette = { start: string; center: string; end: string; ink: string; gradientMuted: string };
function palette(score: number | undefined, dark: boolean): Palette {
  const level = score && score >= 1 && score <= 10 ? tokens.levels[score - 1] : tokens.brand;
  return (level as any)[dark ? 'dark' : 'light'];
}

// The widgets' background: three stops from the top-left corner to the
// bottom-right (LinearGradient .topLeading → .bottomTrailing on iOS,
// android:angle="315" on Android), clipped to the widget's corners.
function Diagonal({ colors, radius, children, style, testID }: { colors: Palette; radius: number; children?: React.ReactNode; style: object; testID?: string }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const svg = size.width > 0 ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors.start}"/><stop offset=".5" stop-color="${colors.center}"/><stop offset="1" stop-color="${colors.end}"/></linearGradient></defs><rect width="${size.width}" height="${size.height}" rx="${radius}" fill="url(#g)"/></svg>` : null;
  const uri = svg && svgUri(svg);
  return <View testID={testID} style={{ ...style, borderRadius: radius, overflow: 'hidden' }}
    onLayout={({ nativeEvent: { layout } }) => setSize(current => current.width === layout.width && current.height === layout.height ? current : { width: layout.width, height: layout.height })}>
    {uri && <Image source={{ uri }} contentFit="fill" style={{ position: 'absolute', inset: 0 }} />}
    {children}
  </View>;
}

// The widgets' own timestamp: the time alone for a reading saved today, the
// date before it otherwise. iOS joins them with a dot; Android prefixes
// "Updated" and uses its short date.
function widgetTime(saved: string | undefined) {
  const date = saved ? new Date(saved) : new Date();
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const today = date.toDateString() === new Date().toDateString();
  if (platform === 'android') return `Updated ${today ? time : `${date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' })} ${time}`}`;
  return today ? time : `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${time}`;
}

// The reading screen's own wording for its update time.
function relative(saved: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(saved)) / 60000));
  return minutes < 1 ? 'just now' : minutes < 60 ? `${minutes} min ago` : minutes < 1440 ? `${Math.floor(minutes / 60)} hr ago` : `${Math.floor(minutes / 1440)} days ago`;
}

// The reading screen in small, on its own canvas: the score, its sentence and
// when it was updated, laid out as the reading screen lays them out.
function ReadingCard({ theme, score, saved, explanation }: { theme: Theme; score?: number; saved?: string; explanation?: string }) {
  // As wide as the scale beneath it: ten 30-point tiles and nine 4-point gaps.
  const width = 10 * 30 + 9 * 4, height = 226;
  const svg = score ? readingGradientSvg(score, theme.dark, width, height) : null;
  return <View testID="onboarding-reading" style={{ width, height, borderRadius: 28, overflow: 'hidden', backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.rule, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26 }}>
    {svg && <Image source={{ uri: svgUri(svg) }} contentFit="fill" style={{ position: 'absolute', inset: 0 }} />}
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={{ color: theme.ink, fontSize: 72, lineHeight: 80, fontWeight: '300', fontFamily: scoreFont, letterSpacing: -72 * 0.055 }}>{score ?? '–'}</Text>
      <Text style={{ color: theme.muted, fontSize: 14, fontWeight: '300', fontFamily: scoreFont, marginLeft: 2 }}>∕10</Text>
    </View>
    {explanation
      ? <Text numberOfLines={4} style={{ color: theme.ink, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 6 }}>{explanation}</Text>
      : <View style={{ gap: 7, alignItems: 'center', marginTop: 14 }}>{[170, 130].map(w => <View key={w} style={{ width: w, height: 7, borderRadius: 4, backgroundColor: theme.muted, opacity: 0.2 }} />)}</View>}
    {saved && <Text style={{ color: theme.muted, fontSize: 10, marginTop: 8 }}>Updated {relative(saved)}</Text>}
  </View>;
}

// A level as the reading screen draws it: the same canvas the app shows at
// that score (readingGradientSvg), in small, with the number in that level's
// ink. The widgets' three-stop diagonal reads well across a widget but turns
// into a hard stripe on a tile this size, so the tiles use the app's canvas.
function svgUri(svg: string) {
  return process.env.EXPO_OS === 'android'
    ? `data:image/svg+xml;base64,${fromByteArray(Uint8Array.from(svg, char => char.charCodeAt(0)))}`
    : `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
function LevelTile({ level, size, dark, current = false }: { level: number; size: number; dark: boolean; current?: boolean }) {
  const ink = themeForLevel(level, dark);
  const svg = readingGradientSvg(level, dark, size, size);
  // The current score's tile is ringed in its own ink, so the scale says where today sits.
  return <View testID={`onboarding-level-${level}`} style={{ width: size, height: size, borderRadius: Math.round(size * 0.26), overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', borderWidth: current ? 2 : 1, borderColor: current ? ink.ink : ink.rule }}>
    {svg && <Image source={{ uri: svgUri(svg) }} contentFit="fill" style={{ position: 'absolute', inset: 0 }} />}
    <Text style={{ color: ink.ink, fontSize: Math.round(size * 0.4), fontWeight: '300', fontFamily: scoreFont }}>{level}</Text>
  </View>;
}

// Lifts a card off the reading's gradient, which in light mode is close to the
// widget's own colors. The shadow sits on a wrapper: a clipped view cannot cast one.
const lifted = { borderRadius: 24, boxShadow: '0 10px 30px rgba(0, 0, 0, 0.14), 0 1px 3px rgba(0, 0, 0, 0.08)' } as const;

function Art({ art, theme, score, saved, explanation }: { art: SlideArt; theme: Theme; score?: number; saved?: string; explanation?: string }) {
  // The reading screen in small, above the scale it sits on: ten tiles, each
  // level in its own colors, the current score's ringed.
  if (art === 'scale') return <View style={{ alignItems: 'center', gap: 18 }}>
    <View style={lifted}><ReadingCard theme={theme} score={score} saved={saved} explanation={explanation} /></View>
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: 10 }, (_, i) => <LevelTile key={i} level={i + 1} size={30} dark={theme.dark} current={score === i + 1} />)}
    </View>
  </View>;
  if (art === 'widget') return <View style={lifted}><SmallWidget score={score} saved={saved} dark={theme.dark} /></View>;
  return <View style={lifted}><Notification theme={theme} /></View>;
}

// The small widget as it is drawn on each platform (NewsworthyWidget.swift,
// RatingWidget.java): the wordmark, the score and its denominator, then the
// update time, over the level's diagonal. Corners: iOS's system widget radius,
// Android's 20dp.
function SmallWidget({ score, saved, dark }: { score?: number; saved?: string; dark: boolean }) {
  const colors = palette(score, dark);
  return <Diagonal testID="onboarding-widget" colors={colors} radius={platform === 'android' ? 20 : 24}
    style={{ width: 176, height: 176, padding: 16, justifyContent: 'space-between' }}>
    <Text style={{ color: colors.ink, fontSize: 10, letterSpacing: 2 }}>NEWSWORTHY</Text>
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={{ color: colors.ink, fontSize: 69, lineHeight: 76, fontWeight: '300', fontFamily: scoreFont, letterSpacing: -69 * 0.04 }}>{score ?? '–'}</Text>
      <Text style={{ color: colors.gradientMuted, fontSize: 12, fontFamily: scoreFont, marginLeft: platform === 'android' ? 2 : 1 }}>∕10</Text>
    </View>
    <Text numberOfLines={1} style={{ color: colors.gradientMuted, fontSize: 11 }}>{widgetTime(saved)}</Text>
  </Diagonal>;
}
// The app's launcher mark: a dash, dark on white or white on near-black.
function LauncherIcon({ theme, size }: { theme: Theme; size: number }) {
  const identity = tokens.identity[theme.dark ? 'dark' : 'light'];
  return <View style={{ width: size, height: size, borderRadius: platform === 'android' ? size / 2 : size * 0.225, backgroundColor: identity.surface,
    borderWidth: 1, borderColor: theme.rule, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.36, height: Math.max(2, size * 0.07), borderRadius: 1, backgroundColor: identity.ink }} />
  </View>;
}

// A notification as each platform draws one: iOS a rounded banner with the
// app icon beside the text, Android a card led by a small icon and the app name.
// The title is the one sent ("Newsworthy · 8/10", 8 being the default
// score); the sentence is left as placeholder bars.
function Notification({ theme }: { theme: Theme }) {
  const bar = (width: number, opacity = 1) => <View style={{ width, height: 8, borderRadius: 4, backgroundColor: theme.rule, opacity }} />;
  if (platform === 'android') return <View style={{ width: 290, borderRadius: 24, backgroundColor: theme.elevated, borderWidth: 1, borderColor: theme.rule, padding: 16, gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <LauncherIcon theme={theme} size={22} />
      <Text style={{ color: theme.muted, fontSize: 13 }}>Newsworthy · now</Text>
    </View>
    <Text style={{ color: theme.ink, fontSize: 15, fontWeight: '600' }}>Newsworthy · 8/10</Text>
    <View style={{ gap: 8 }}>{bar(210)}{bar(170, 0.7)}</View>
  </View>;
  return <View style={{ width: 300, borderRadius: 22, backgroundColor: theme.elevated, borderWidth: 1, borderColor: theme.rule, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
    <LauncherIcon theme={theme} size={40} />
    <View style={{ flex: 1, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: theme.ink, fontSize: 15, fontWeight: '600' }}>Newsworthy · 8/10</Text>
        <Text style={{ color: theme.muted, fontSize: 13 }}>now</Text>
      </View>
      {bar(180)}{bar(140, 0.7)}
    </View>
  </View>;
}
