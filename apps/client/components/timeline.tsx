import { useState } from 'react';
import { Animated, Text, View } from 'react-native';
import type { Development } from '@/lib/use-timeline';
import { ratedPrefix, timelineAge, timelineLabels } from '@/lib/timeline';

type Theme = { ink: string; muted: string };

// A line starts to fade this far below the header and is gone this far above
// its lower edge. At the snap offset the first entry sits 32pt below the
// header, just outside the fade, so the resting timeline is at full strength.
const FADE_BELOW = 28;
const FADE_ABOVE = 16;
const ENTRY_GAP = 44;
const TAG_GAP = 10;

/**
 * The developments behind the front page, newest activity first, each tagged
 * with its story. Left-aligned, and nothing but the tag, the age and the
 * sentence: order and space carry the timeline.
 *
 * A development with a story update leads with it (design B, owner
 * 2026-11-14): "Update:" in bold and the update's sentence, then, muted, the
 * sentence its score was given for, dated on its own ("Rated 6h ago:"), since
 * the entry's place now comes from the update. An update carries no score.
 *
 * `opacity` is driven by the scroll position: the timeline fades in as the
 * reading above it fades out. Scrolled further, each tag line and sentence
 * fades out on its own as it nears the header, so text never runs under the
 * header at full strength and nothing needs a bar or a rule to hide it. React
 * Native cannot mask to a gradient without a native module, and a painted
 * gradient would not match the reading gradient behind it.
 */
export function Timeline({ developments, opacity, theme, now, scrollY, offset, fadeAt }: {
  developments: Development[]; opacity: Animated.AnimatedInterpolation<number>; theme: Theme; now: number;
  scrollY: Animated.Value; offset: number; fadeAt: number;
}) {
  // Heights, not positions: on the web onLayout fires only when a view is
  // resized, so a line moved by its neighbours (a rotation reflows them) kept
  // its old position and stopped fading, running under the header in
  // landscape. Positions are summed from the heights instead.
  const [heights, setHeights] = useState<Record<string, number>>({});
  if (!developments.length) return null;
  const labels = timelineLabels(developments, now);
  const measure = (key: string) => (event: { nativeEvent: { layout: { height: number } } }) => {
    const height = event.nativeEvent.layout.height;
    setHeights((known) => (known[key] === height ? known : { ...known, [key]: height }));
  };
  // Content y of a line → its opacity as it scrolls towards the header.
  const fade = (top: number | undefined) => top === undefined ? 1 : scrollY.interpolate({
    inputRange: [top - fadeAt - FADE_BELOW, top - fadeAt + FADE_ABOVE], outputRange: [1, 0], extrapolate: 'clamp',
  });
  let entryTop: number | undefined = 0;
  return <Animated.View testID="timeline" accessibilityLabel="Earlier developments" style={{ width: '100%', opacity }}>
    {developments.map((development, index) => {
      const label = labels[index].name;
      const age = timelineAge(development.since, now);
      const update = development.update ?? null;
      const rated = update ? ratedPrefix(development, now) : '';
      const tagKey = `t${development.root}`;
      const hasTag = Boolean(labels[index].story || labels[index].age);
      const entry = entryTop === undefined ? undefined : entryTop + (index === 0 ? 0 : ENTRY_GAP);
      const tagHeight = hasTag ? heights[tagKey] : 0;
      const tagTop = entry;
      const sentenceTop = entry === undefined || tagHeight === undefined ? undefined : entry + (hasTag ? tagHeight + TAG_GAP : 0);
      const entryHeight = heights[`e${development.root}`];
      entryTop = entry === undefined || entryHeight === undefined ? undefined : entry + entryHeight;
      const at = (top: number | undefined) => top === undefined ? undefined : offset + top;
      return <View key={development.root} accessible onLayout={measure(`e${development.root}`)}
        accessibilityLabel={update
          ? `${label ? `${label}, ` : ''}updated ${timelineAge(update.at, now)}. Update: ${update.explanation} ${rated} ${development.explanation}`
          : `${age}${label ? `, ${label}` : ''}. ${development.explanation}`}
        style={{ marginTop: index === 0 ? 0 : ENTRY_GAP }}>
        {hasTag && <Animated.View onLayout={measure(tagKey)} style={{ opacity: fade(at(tagTop)), marginBottom: TAG_GAP }}>
          <Text maxFontSizeMultiplier={1.5} style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>
            {[labels[index].story, labels[index].age].filter(Boolean).join('  ·  ')}
          </Text>
        </Animated.View>}
        <Animated.View style={{ opacity: fade(at(sentenceTop)) }}>
          {update ? <>
            <Text selectable testID="timeline-update" style={{ color: theme.ink, fontSize: 17, lineHeight: 27 }}>
              <Text testID="timeline-update-label" style={{ fontWeight: '700' }}>Update:</Text>{` ${update.explanation}`}
            </Text>
            <Text selectable testID="timeline-rated" style={{ color: theme.muted, fontSize: 14, lineHeight: 21, marginTop: 10 }}>
              {`${rated} ${development.explanation}`}
            </Text>
          </> : <Text selectable style={{ color: theme.ink, fontSize: 17, lineHeight: 27 }}>{development.explanation}</Text>}
        </Animated.View>
      </View>;
    })}
  </Animated.View>;
}
