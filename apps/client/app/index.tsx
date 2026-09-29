import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Pressable, Text, View, Share } from 'react-native';
import { useWindowSize } from '@/lib/window-size';
import { Stack, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { AppIcon } from '@/components/app-icon';
import { Glyph, HEADER_ICON_SIZE } from '@/components/glyph';
import { BrandMark } from '@/components/brand-mark';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';
import { useCurrentReading } from '@/components/reading-provider';
import { ReadingGradient } from '@/components/reading-gradient';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { checkedLine, displayExplanation, explanationParts, storyLine } from '@/lib/story-age';
import { website, privacyUrl, supportUrl } from '@/lib/config';
import { Timeline } from '@/components/timeline';
import { useTimeline } from '@/lib/use-timeline';
import { usePreferences } from '@/components/preferences-provider';

// The sentence and the timeline share one column, scaled with the text size:
// 320pt on an upright phone; 360pt turned, a little wider so the text sits
// naturally on the wider screen without spanning it; and 414pt on larger
// screens, where the sentence is 22pt, so a typical one takes three lines
// rather than four. Turned, the reading keeps the portrait rhythm between
// number, sentence, time and cue. A grid of timeline columns and CSS
// text-wrap were both tried and dropped (2026-09-28): WebKit's pretty, which
// every iOS browser uses, re-lays out the whole paragraph and read as balance.
const COLUMN = 320;
const LANDSCAPE_COLUMN = 360;
const WIDE_COLUMN = 414;
// How long the small line says when the news was checked, on opening, on
// returning to the app and after a tap, before it gives way to the story.
const CHECKED_MS = 4000;

export default function Home() {
  const theme = useTheme();
  const router = useRouter();
  // Light (300) needs a face that has one. Safari's generic monospace is Menlo,
  // which has only Regular and Bold, so the web drew the score at Regular;
  // ui-monospace is SF Mono there, which has Light.
  const scoreFont = process.env.EXPO_OS === 'ios' ? 'ui-monospace' : process.env.EXPO_OS === 'web' ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'monospace';
  const insets = useSafeAreaInsets();
  // On the web the reading is hidden under Settings, and its header measures 0
  // there; laid out with that, the reading came back 64pt high for a frame and
  // then dropped into place. The last real height stands in until it returns.
  const measuredHeader = useHeaderHeight();
  const lastHeader = useRef(measuredHeader);
  if (measuredHeader) lastHeader.current = measuredHeader;
  const headerHeight = measuredHeader || lastHeader.current;
  const dimensions = useWindowSize();
  // Static web rendering has no viewport; keep the initial content readable.
  const width = dimensions.width || 390;
  const height = dimensions.height || 844;
  const fontScale = dimensions.fontScale || 1;
  const landscape = height < 520;
  const scoreSize = landscape ? Math.min(height * 0.22, 224) : Math.max(64, Math.min(width * 0.42, height * 0.24, 224));
  const sentenceSize = landscape ? 17 : Math.max(18, Math.min(width * 0.045, 22));
  const horizontal = Math.max(20, Math.min(width * 0.05, 48));
  const column = (landscape ? LANDSCAPE_COLUMN : width < 600 ? COLUMN : WIDE_COLUMN) * fontScale;
  const { reading, failed, loading, refresh } = useCurrentReading();
  // Nothing is drawn until there is something to say: a placeholder dash, then
  // the reading, then the gradient was three layouts in the first second. Once
  // there is, it arrives in reading order, fading in place without moving: the
  // number (with its gradient and Share), then the sentence, then when it was
  // checked. A reading already at hand when the screen mounts is shown at once.
  const ready = Boolean(reading) || (failed && !loading);
  const reveal = useRef(new Animated.Value(ready ? 1 : 0)).current;
  const sentenceIn = useRef(new Animated.Value(ready ? 1 : 0)).current;
  const checkedIn = useRef(new Animated.Value(ready ? 1 : 0)).current;
  useEffect(() => {
    if (!ready) return;
    const fade = (value: Animated.Value) => Animated.timing(value, { toValue: 1, duration: 450, useNativeDriver: process.env.EXPO_OS !== 'web' });
    Animated.stagger(250, [fade(reveal), fade(sentenceIn), fade(checkedIn)]).start();
  }, [ready, reveal, sentenceIn, checkedIn]);
  const [now, setNow] = useState(Date.now());
  const [shareNotice, setShareNotice] = useState('');
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  // A new development's sentence leads with a bold "New:" for two hours.
  // Prototype: the story and its age on one line below the sentence; the
  // sentence drops its age prefix. "New:" stays.
  const story = reading ? storyLine(reading, now) : '';
  // On opening and on returning to the app the line first says when the news
  // was checked, "Checked 23m ago", then crossfades to the story and its age.
  // A tap brings the checked time back for a moment. Without a story line
  // there is nothing to give way to, so it stays.
  const checked = reading ? checkedLine(reading, now) : '';
  const [showChecked, setShowChecked] = useState(true);
  const line = (showChecked || !story) && checked ? checked : story;
  const lineSwap = useRef(new Animated.Value(1)).current;
  const lineTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const swapLine = (toChecked: boolean) => {
    const native = process.env.EXPO_OS !== 'web';
    Animated.timing(lineSwap, { toValue: 0, duration: 200, useNativeDriver: native }).start(({ finished }) => {
      // Interrupted by a return to the app, which has set the line itself.
      if (!finished) return;
      setShowChecked(toChecked);
      Animated.timing(lineSwap, { toValue: 1, duration: 250, useNativeDriver: native }).start();
    });
  };
  const holdChecked = (ms: number) => {
    clearTimeout(lineTimer.current);
    lineTimer.current = setTimeout(() => swapLine(false), ms);
  };
  const tapLine = () => {
    if (showChecked) { clearTimeout(lineTimer.current); swapLine(false); return; }
    swapLine(true);
    holdChecked(CHECKED_MS);
  };
  // First shown, the line fades in last, about a second after the number.
  useEffect(() => { if (ready) holdChecked(CHECKED_MS + 1000); }, [ready]);
  useEffect(() => {
    // The screen was out of sight, so the checked time is simply back. The
    // clock did not tick in the background, so "ago" is measured afresh.
    const foreground = () => { lineSwap.stopAnimation(); lineSwap.setValue(1); setNow(Date.now()); setShowChecked(true); holdChecked(CHECKED_MS); };
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active' && process.env.EXPO_OS !== 'web') foreground(); });
    const visible = () => { if (!document.hidden) foreground(); };
    if (process.env.EXPO_OS === 'web') document.addEventListener('visibilitychange', visible);
    return () => {
      subscription.remove(); clearTimeout(lineTimer.current);
      if (process.env.EXPO_OS === 'web') document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  // The age is on that line, so the sentence spends no budget on it.
  const parts = reading ? explanationParts(reading, now, { age: false }) : null;
  const explanation = parts ? (parts.label ? <><Text testID="rating-new-label" style={{ fontWeight: '700' }}>{parts.label}</Text>{` ${parts.body}`}</>
    : parts.body) : null;
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
  // reading taller than the screen and pushed the cue below the fold. Both
  // measurements ignore a height of 0: on the web the reading is hidden under
  // Settings and measures 0, and adopting that reflowed it on the way back.
  const [viewport, setViewport] = useState(0);
  const screen = viewport || height;
  const hasTimeline = Boolean(reading) && developments.length > 0;
  // The timeline arrives after the reading; its cue fades in rather than appearing.
  const cueIn = useRef(new Animated.Value(hasTimeline ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(cueIn, { toValue: hasTimeline ? 1 : 0, duration: 250, useNativeDriver: process.env.EXPO_OS !== 'web' }).start();
  }, [hasTimeline, cueIn]);
  // Where the timeline rests: its first entry a comfortable distance below the header.
  const snap = hasTimeline && timelineTop ? Math.max(1, timelineTop - headerHeight - 32) : 0;
  const span = snap || screen;
  // The reading is gone before any of it can reach the header, so in the
  // timeline the score and top story are entirely out of view, mid-scroll too.
  const readingGone = Math.min(span * 0.3, 160);
  const readingFade = scrollY.interpolate({ inputRange: [0, readingGone], outputRange: [1, 0], extrapolate: 'clamp' });
  const timelineFade = scrollY.interpolate({ inputRange: [readingGone * 0.5, span * 0.6], outputRange: [0, 1], extrapolate: 'clamp' });
  const cueFade = scrollY.interpolate({ inputRange: [0, 48], outputRange: [1, 0], extrapolate: 'clamp' });
  // Native snaps with snapToOffsets. The web uses the browser's own CSS scroll
  // snap: a script that waited for the scroll to go quiet and then scrolled
  // itself fought iOS momentum, drifting and then jumping. The timeline is one
  // snap area taller than the screen, so inside it the page scrolls freely.
  const webSnap = process.env.EXPO_OS === 'web' && snap > 0;
  const scrollTo = (y: number) => scroller.current?.scrollTo({ y, animated: true });
  const showTimeline = () => scrollTo(snap);
  const shareReading = async () => {
    if (!reading) return;
    const message = `${reading.score}/10 · ${displayExplanation(reading)}\nChecked ${new Date(reading.created_at).toLocaleString()}\n${website}`;
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
  // Up to Share and Settings, 48pt each. Web lays the bar out itself, with a
  // 12pt end margin; native bars add their own item insets, estimated at 40.
  const headerTapWidth = Math.max(120, width - (reading ? 96 : 48) - (process.env.EXPO_OS === 'web' ? 12 : 40));
  const brand = hasTimeline ? <Pressable accessibilityRole="button" accessibilityLabel="Newsworthy, back to the reading" onPress={toReading}
    style={({ pressed }) => ({ width: headerTapWidth, minHeight: 48, justifyContent: 'center', alignItems: 'flex-start', opacity: pressed ? 0.6 : 1 })}>
    <BrandMark />
  </Pressable> : <BrandMark />;
  const shareButton = reading ? <Pressable accessibilityRole="button" accessibilityLabel="Share this reading" onPress={shareReading} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
    <Animated.View style={{ opacity: reveal }}><AppIcon color={theme.accent} /></Animated.View>
  </Pressable> : null;
  const settingsButton = <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={{ minWidth: 48, minHeight: 48, marginRight: process.env.EXPO_OS === 'web' ? 12 : 0, alignItems: 'center', justifyContent: 'center' }}>
    <Glyph name="settings" color={theme.accent} size={HEADER_ICON_SIZE} />
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
    <Animated.View pointerEvents="none" style={{ position: 'absolute', inset: 0, opacity: reveal }}><ReadingGradient score={reading?.score} dark={theme.dark} /></Animated.View>
    <Animated.ScrollView ref={scroller} key={fontScale} contentInsetAdjustmentBehavior="never"
      onLayout={(event) => { if (event.nativeEvent.layout.height) setViewport(event.nativeEvent.layout.height); }} style={{ flex: 1, backgroundColor: 'transparent', ...(webSnap ? { scrollSnapType: 'y mandatory' } as object : null) }}
      scrollEventThrottle={16} snapToOffsets={snap ? [0, snap] : undefined} snapToEnd={false} decelerationRate={snap ? 'fast' : 'normal'}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: process.env.EXPO_OS !== 'web',
      })}
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingHorizontal: horizontal }}>
      {/* With a timeline the reading keeps exactly the first screen; without one it
          fills the scroll view and nothing scrolls, as before the timeline. Both
          are one screen with the same padding, so the reading does not move when
          the timeline arrives after it. */}
      {/* The timeline starts where the reading ends. Measured from the reading's
          height, which changes whenever the timeline moves: on the web onLayout
          fires only on a resize, and the timeline's own position went stale
          after a rotation, so its lines stopped fading under the header. */}
      <Animated.View onLayout={(event) => { if (event.nativeEvent.layout.height) setTimelineTop(event.nativeEvent.layout.y + event.nativeEvent.layout.height); }} style={{ ...(hasTimeline ? { minHeight: screen } : { flex: 1 }), ...(webSnap ? { scrollSnapAlign: 'start' } as object : null), justifyContent: 'center', maxWidth: Math.max(440, column), width: '100%', alignItems: 'center', opacity: hasTimeline ? readingFade : 1, paddingTop: headerHeight + (landscape ? 8 : 24), paddingBottom: insets.bottom + (landscape ? 48 : 56) }}>
        <Animated.View accessible accessibilityRole="header" accessibilityLabel={reading ? `${reading.score} out of 10` : 'Rating unavailable'} accessibilityLiveRegion="polite"
          style={{ opacity: reveal, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', maxWidth: '100%' }}>
          <Text selectable accessible={false} adjustsFontSizeToFit minimumFontScale={0.3} maxFontSizeMultiplier={1.2} numberOfLines={1} testID="rating-score"
            style={{ color: theme.ink, fontSize: scoreSize, lineHeight: scoreSize * 1.05, flexShrink: 1, fontWeight: '300', fontFamily: scoreFont, fontVariant: ['tabular-nums'], letterSpacing: -scoreSize * 0.055 }}>
            {reading?.score ?? '–'}
          </Text>
          <Text accessible={false} numberOfLines={1} maxFontSizeMultiplier={1.5} style={{ color: theme.muted, fontSize: landscape ? 17 : 20, fontWeight: '300', fontFamily: scoreFont, marginLeft: 3 }}>∕10</Text>
        </Animated.View>
        <Animated.Text selectable testID="rating-explanation" style={{ opacity: sentenceIn, color: theme.ink, fontSize: sentenceSize, lineHeight: sentenceSize * 1.5, textAlign: 'center', maxWidth: column, marginTop: landscape ? 20 : 24 }}>{explanation ?? (failed && !loading ? 'The latest rating is unavailable.' : '')}</Animated.Text>
        {/* Padded for a touch target and pulled back by as much, so the line
            sits where it did before it could be tapped. */}
        {line !== '' && <Pressable disabled={!story || !checked} onPress={tapLine}
          accessibilityRole={story && checked ? 'button' : undefined} accessibilityLabel={[story, checked].filter(Boolean).join('. ')}
          accessibilityHint={story && checked ? 'Shows when the news was last checked' : undefined}
          style={{ paddingVertical: 16, paddingHorizontal: 24, marginTop: (landscape ? 16 : 18) - 16, marginBottom: -16 }}>
          <Animated.Text testID="rating-story-line" style={{ opacity: Animated.multiply(checkedIn, lineSwap), color: theme.muted, fontSize: 12, textAlign: 'center' }}>{line}</Animated.Text>
        </Pressable>}
        {shareNotice !== '' && <Text accessibilityLiveRegion="polite" style={{ color: theme.muted, fontSize: 14, textAlign: 'center', marginTop: 12 }}>{shareNotice}</Text>}
        {!reading && failed && !loading && <Pressable accessibilityRole="button" onPress={refresh} style={{ padding: 12, minWidth: 48, minHeight: 48 }}><Text style={{ color: theme.accent }}>Try again</Text></Pressable>}
        {hasTimeline && <Animated.View style={{ position: 'absolute', bottom: insets.bottom + 8, opacity: Animated.multiply(cueIn, cueFade) }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Earlier developments" onPress={showTimeline}
            style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 9, height: 9, borderRightWidth: 1.25, borderBottomWidth: 1.25, borderColor: theme.muted, transform: [{ rotate: '45deg' }], marginTop: -4 }} />
          </Pressable>
        </Animated.View>}
      </Animated.View>
      {/* Shares the sentence's column, so it has no margin of its own. At least
          a screen tall below the header, so however short, its top can reach
          the snap offset; a fixed padding left one entry short of it. */}
      {reading && <View style={{ maxWidth: column, width: '100%', minHeight: hasTimeline ? screen - headerHeight - 32 : 0,
          // Its bottom padding is inside it, so the snap area runs to the end of the scroll.
          paddingBottom: hasTimeline ? insets.bottom + 48 : 0,
          ...(webSnap ? { scrollSnapAlign: 'start', scrollMarginTop: headerHeight + 32 } as object : null) }}>
        <Timeline developments={developments} opacity={timelineFade} theme={theme} now={now} scrollY={scrollY} offset={timelineTop} fadeAt={headerHeight} />
      </View>}
    </Animated.ScrollView>
    </View>
  </>;
}
