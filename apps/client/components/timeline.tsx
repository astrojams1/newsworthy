import { useState } from 'react';
import { Animated, Text, View } from 'react-native';
import type { Development } from '@/lib/use-timeline';
import { timelineAge, timelineLabels } from '@/lib/timeline';

type Theme = { ink: string; muted: string };

// A line starts to fade this far below the header and is gone this far above
// its lower edge. At the snap offset the first entry sits 32pt below the
// header, just outside the fade, so the resting timeline is at full strength.
const FADE_BELOW = 28;
const FADE_ABOVE = 16;
const ENTRY_GAP = 44;
const TAG_GAP = 10;
/** Between a sentence and its update: clearly apart, still one entry. */
const UPDATE_GAP = 16;

/**
 * The developments behind the front page, newest first by when each was
 * first covered, each tagged with its story. Left-aligned, and nothing but the tag, the age and the
 * sentence: order and space carry the timeline.
 *
 * A development with a story update keeps its place and its sentence, and
 * the update goes below it (owner, 2026-11-14) as its own quieter block, so
 * the two never read as one paragraph (owner: "a bit of visual hierarchy"):
 * indented behind a thin muted rule, a small caption ("Update · 3h ago",
 * the word in ink, its age muted), then the update's sentence a size smaller
 * than the rated one. An update carries no score.
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
        accessibilityLabel={`${age}${label ? `, ${label}` : ''}. ${development.explanation}${update
          ? ` Updated ${timelineAge(update.at, now)}: ${update.explanation}` : ''}`}
        style={{ marginTop: index === 0 ? 0 : ENTRY_GAP }}>
        {hasTag && <Animated.View onLayout={measure(tagKey)} style={{ opacity: fade(at(tagTop)), marginBottom: TAG_GAP }}>
          <Text maxFontSizeMultiplier={1.5} style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>
            {[labels[index].story, labels[index].age].filter(Boolean).join('  ·  ')}
          </Text>
        </Animated.View>}
        <Animated.View style={{ opacity: fade(at(sentenceTop)) }}>
          <Text selectable style={{ color: theme.ink, fontSize: 17, lineHeight: 27 }}>{development.explanation}</Text>
          {update && <View testID="timeline-update" style={{ flexDirection: 'row', marginTop: UPDATE_GAP }}>
            <View testID="timeline-update-rule" style={{ width: 2, borderRadius: 1, backgroundColor: theme.muted, opacity: 0.45 }} />
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text maxFontSizeMultiplier={1.5} style={{ fontSize: 13, lineHeight: 18 }}>
                <Text testID="timeline-update-label" style={{ color: theme.ink, fontWeight: '600' }}>Update</Text>
                <Text style={{ color: theme.muted }}>{`  ·  ${timelineAge(update.at, now)}`}</Text>
              </Text>
              <Text selectable style={{ color: theme.ink, fontSize: 15, lineHeight: 23, marginTop: 4 }}>{update.explanation}</Text>
            </View>
          </View>}
        </Animated.View>
      </View>;
    })}
  </Animated.View>;
}
