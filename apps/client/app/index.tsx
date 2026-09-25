import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, Share, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { AppIcon } from '@/components/app-icon';
import { Glyph } from '@/components/glyph';
import { BrandMark } from '@/components/brand-mark';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';
import { useCurrentReading } from '@/components/reading-provider';
import { ReadingGradient } from '@/components/reading-gradient';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { displayExplanation, explanationParts } from '@/lib/story-age';
import { website, privacyUrl, supportUrl } from '@/lib/config';
import { Timeline } from '@/components/timeline';
import { useTimeline } from '@/lib/use-timeline';
import { usePreferences } from '@/components/preferences-provider';
import { layout, leading, motion, opacity, scaleCap, scoreFont as fontFor, size, space, stroke, surfaces, touchTarget, type, weight } from '@/lib/design';
import { readingLayout } from '@/lib/layout';
import { CLOCK_TICK_MS, updatedAge } from '@/lib/timeline';

export default function Home() {
  const theme = useTheme();
  const router = useRouter();
  const scoreFont = fontFor(process.env.EXPO_OS ?? 'web');
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  // Sizes, columns and the gutter follow from the window; see lib/layout.js.
  const { width, height, fontScale, landscape, scoreSize, sentenceSize, denominatorSize, gutter: horizontal, column, sentenceColumn } = readingLayout(useWindowDimensions());
  const { reading, failed, loading, refresh } = useCurrentReading();
  const [now, setNow] = useState(Date.now());
  const [shareNotice, setShareNotice] = useState('');
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS); return () => clearInterval(timer); }, []);
  const relative = reading ? updatedAge(reading.created_at, now) : '';
  // A new development's sentence leads with a bold "New:" for two hours; nothing else is styled.
  const parts = reading ? explanationParts(reading, now) : null;
  const explanation = parts ? (parts.label ? <><Text testID="rating-new-label" style={{ fontWeight: weight.bold }}>{parts.label}</Text>{` ${parts.body}`}</> : parts.body) : null;
  // Off unless chosen in Settings; off, the screen is the reading alone. The
  // server leaves out the development this reading reports, so nothing here repeats it.
  const { preferences } = usePreferences();
  const developments = useTimeline(preferences.timeline, reading?.created_at);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scroller = useRef<any>(null);
  // Prototype. Two resting positions: the reading, and the top of the
  // timeline. Between them the reading fades out as the timeline fades in,
  // and a flick either way settles on one of the two.
  // At rest the timeline is announced by a quiet cue alone.
  const [timelineTop, setTimelineTop] = useState(0);
  // The scroll view's own height, not the window's: on the web export the
  // window dimensions can stay at the static-render fallback, which sized the
  // reading taller than the screen and pushed the cue below the fold.
  const [viewport, setViewport] = useState(0);
  const screen = viewport || height;
  const hasTimeline = Boolean(reading) && developments.length > 0;
  // Where the timeline rests: its first entry a comfortable distance below the header.
  const snap = hasTimeline && timelineTop ? Math.max(1, timelineTop - headerHeight - layout.timeline.snapBelowHeader) : 0;
  const span = snap || screen;
  // The reading is gone before any of it can reach the header, so in the
  // timeline the score and top story are entirely out of view, mid-scroll too.
  const readingGone = Math.min(span * layout.timeline.readingGoneRatio, layout.timeline.readingGoneMax);
  const readingFade = scrollY.interpolate({ inputRange: [0, readingGone], outputRange: [1, 0], extrapolate: 'clamp' });
  const timelineFade = scrollY.interpolate({ inputRange: [readingGone * layout.timeline.fadeInStart, span * layout.timeline.fadeInEnd], outputRange: [0, 1], extrapolate: 'clamp' });
  const cueFade = scrollY.interpolate({ inputRange: [0, layout.timeline.cueFadeDistance], outputRange: [1, 0], extrapolate: 'clamp' });
  // Native snaps with snapToOffsets. The web uses the browser's own CSS scroll
  // snap: a script that waited for the scroll to go quiet and then scrolled
  // itself fought iOS momentum, drifting and then jumping. The timeline is one
  // snap area taller than the screen, so inside it the page scrolls freely.
  const webSnap = process.env.EXPO_OS === 'web' && snap > 0;
  const scrollTo = (y: number) => scroller.current?.scrollTo({ y, animated: true });
  const showTimeline = () => scrollTo(snap);
  const shareReading = async () => {
    if (!reading) return;
    const message = `${reading.score}/10 · ${displayExplanation(reading)}\nUpdated ${new Date(reading.created_at).toLocaleString()}\n${website}`;
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
  // With a timeline below, a tap anywhere in the header returns to the
  // reading, the way a status-bar tap does on iOS. The wordmark's button
  // stretches across the header up to Share and Settings, which keep their
  // own jobs: an overlay would not work, since on iOS the native bar takes
  // touches in its own area rather than passing them to the screen. Without one there is nowhere to return from,
  // so it stays plain text rather than a button that does nothing.
  const toReading = () => scrollTo(0);
  // Up to Share and Settings, one touch target each. Web lays the bar out
  // itself, with its own end inset; native bars add item insets, estimated.
  const headerEnd = process.env.EXPO_OS === 'web' ? layout.header.webEndInset : 0;
  const headerTapWidth = Math.max(layout.header.minimumTapWidth,
    width - touchTarget - (reading ? touchTarget : 0) - (process.env.EXPO_OS === 'web' ? layout.header.webEndInset : layout.header.nativeItemInset));
  const control = { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' } as const;
  const brand = hasTimeline ? <Pressable accessibilityRole="button" accessibilityLabel="Newsworthy, back to the reading" onPress={toReading}
    style={({ pressed }) => ({ width: headerTapWidth, minHeight: touchTarget, justifyContent: 'center', alignItems: 'flex-start', opacity: pressed ? opacity.pressed : 1 })}>
    <BrandMark />
  </Pressable> : <BrandMark />;
  const shareButton = reading ? <Pressable accessibilityRole="button" accessibilityLabel="Share this reading" onPress={shareReading} style={control}>
    <AppIcon color={theme.accent} />
  </Pressable> : null;
  const settingsButton = <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={{ ...control, marginRight: headerEnd }}>
    <Glyph name="settings" color={theme.accent} size={size.headerIcon} />
  </Pressable>;
  const headerRight = <View style={{ flexDirection: 'row', alignItems: 'center' }}>{shareButton}{settingsButton}</View>;
  return <>
    {process.env.EXPO_OS === 'web' && <Head>
      <title>Newsworthy</title>
      {/* Privacy and Support are reached from Settings; these keep them discoverable from the front page for crawlers and store reviewers. */}
      <link rel="privacy-policy" href={privacyUrl} />
      <link rel="help" href={supportUrl} />
    </Head>}
    <Stack.Screen options={{ headerTransparent: true, headerStyle: { backgroundColor: 'transparent' }, headerTitle: '',
      headerLeft: () => brand, headerRight: () => headerRight,
      // iOS 26+ draws glass around header items. The wordmark stays out of it —
      // a text mark in a capsule reads as a button — while share and settings
      // share one capsule, which is what the glass is for.
      unstable_headerLeftItems: process.env.EXPO_OS === 'ios' ? () => [
        { type: 'custom', element: brand, hidesSharedBackground: true },
      ] : undefined,
      unstable_headerRightItems: process.env.EXPO_OS === 'ios' ? () => [
        ...(shareButton ? [{ type: 'custom' as const, element: shareButton, hidesSharedBackground: false }] : []),
        { type: 'custom' as const, element: settingsButton, hidesSharedBackground: false },
      ] : undefined }} />
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
    <ReadingGradient score={reading?.score} dark={theme.dark} />
    <Animated.ScrollView ref={scroller} key={fontScale} contentInsetAdjustmentBehavior="never"
      onLayout={(event) => setViewport(event.nativeEvent.layout.height)} style={{ flex: 1, backgroundColor: 'transparent', ...(webSnap ? { scrollSnapType: 'y mandatory' } as object : null) }}
      scrollEventThrottle={motion.scrollThrottle} snapToOffsets={snap ? [0, snap] : undefined} snapToEnd={false} decelerationRate={snap ? 'fast' : 'normal'}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: process.env.EXPO_OS !== 'web',
      })}
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingHorizontal: horizontal, paddingBottom: hasTimeline ? 0 : insets.bottom + (landscape ? space[4] : space[8]) }}>
      {/* With a timeline the reading keeps exactly the first screen; without one it
          fills the scroll view and nothing scrolls, as before the timeline. */}
      <Animated.View style={{ ...(hasTimeline ? { minHeight: screen } : { flex: 1 }), ...(webSnap ? { scrollSnapAlign: 'start' } as object : null), justifyContent: 'center', maxWidth: column, width: '100%', alignItems: 'center', opacity: hasTimeline ? readingFade : 1, paddingTop: headerHeight + (landscape ? space[4] : space[6]), paddingBottom: landscape ? space[4] : space[14] }}>
        <View accessible accessibilityRole="header" accessibilityLabel={reading ? `${reading.score} out of 10` : 'Rating unavailable'} accessibilityLiveRegion="polite"
          style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', maxWidth: '100%' }}>
          <Text selectable accessible={false} adjustsFontSizeToFit minimumFontScale={scaleCap.fitMinimum} maxFontSizeMultiplier={scaleCap.score} numberOfLines={1} testID="rating-score"
            style={{ color: theme.ink, fontSize: scoreSize, lineHeight: scoreSize * leading.tight, flexShrink: 1, fontWeight: weight.light, fontFamily: scoreFont, fontVariant: ['tabular-nums'], letterSpacing: scoreSize * surfaces.reading.trackingEm }}>
            {reading?.score ?? '–'}
          </Text>
          <Text accessible={false} numberOfLines={1} maxFontSizeMultiplier={scaleCap.label} style={{ color: theme.muted, fontSize: denominatorSize, fontWeight: weight.light, fontFamily: scoreFont, marginLeft: surfaces.reading.denominatorGap }}>∕10</Text>
        </View>
        <Text selectable testID="rating-explanation" style={{ color: theme.ink, fontSize: sentenceSize, lineHeight: sentenceSize * leading.relaxed, textAlign: 'center', maxWidth: sentenceColumn, marginTop: landscape ? space[3] : space[6] }}>{explanation ?? (failed && !loading ? 'The latest rating is unavailable.' : '')}</Text>
        {reading && <Text selectable style={{ color: theme.muted, fontSize: type.caption, textAlign: 'center', marginTop: landscape ? space[2.5] : space[4.5] }}>Updated {relative}</Text>}
        {shareNotice !== '' && <Text accessibilityLiveRegion="polite" style={{ color: theme.muted, fontSize: type.note, textAlign: 'center', marginTop: space[3] }}>{shareNotice}</Text>}
        {!reading && failed && !loading && <Pressable accessibilityRole="button" onPress={refresh} style={{ padding: space[3], minWidth: touchTarget, minHeight: touchTarget }}><Text style={{ color: theme.accent }}>Try again</Text></Pressable>}
        {hasTimeline && <Animated.View style={{ position: 'absolute', bottom: insets.bottom + space[2], opacity: cueFade }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Earlier developments" onPress={showTimeline}
            style={control}>
            <View style={{ width: size.cue, height: size.cue, borderRightWidth: stroke.cue, borderBottomWidth: stroke.cue, borderColor: theme.muted, transform: [{ rotate: '45deg' }], marginTop: -space[1] }} />
          </Pressable>
        </Animated.View>}
      </Animated.View>
      {/* Shares the sentence's column, so it has no margin of its own. At least
          a screen tall below the header, so however short, its top can reach
          the snap offset; a fixed padding left one entry short of it. */}
      {reading && <View onLayout={(event) => setTimelineTop(event.nativeEvent.layout.y)}
        style={{ maxWidth: sentenceColumn, width: '100%', minHeight: hasTimeline ? screen - headerHeight - layout.timeline.snapBelowHeader : 0,
          // Its bottom padding is inside it, so the snap area runs to the end of the scroll.
          paddingBottom: hasTimeline ? insets.bottom + space[12] : 0,
          ...(webSnap ? { scrollSnapAlign: 'start', scrollMarginTop: headerHeight + layout.timeline.snapBelowHeader } as object : null) }}>
        <Timeline developments={developments} opacity={timelineFade} theme={theme} now={now} scrollY={scrollY} offset={timelineTop} fadeAt={headerHeight} />
      </View>}
    </Animated.ScrollView>
    </View>
  </>;
}
