import { useState } from 'react';
import { Animated, Text, View } from 'react-native';
import type { Development } from '@/lib/use-timeline';
import { storyLabel, timelineAge, timelineLabels } from '@/lib/timeline';
import { layout, leading, lineHeight, scaleCap, space, type } from '@/lib/design';

type Theme = { ink: string; muted: string };

// A line starts to fade `lineFadeBelow` under the header and is gone
// `lineFadeAbove` past it. At the snap offset the first entry sits
// `snapBelowHeader` under the header, just outside the fade, so the resting
// timeline is at full strength.
const { lineFadeBelow: FADE_BELOW, lineFadeAbove: FADE_ABOVE } = layout.timeline;

/**
 * Prototype. The developments behind the front page, newest first, each
 * tagged with its story. Left-aligned, and nothing but the tag, the age and
 * the sentence: order and space carry the timeline.
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
  const [tops, setTops] = useState<Record<string, number>>({});
  if (!developments.length) return null;
  const labels = timelineLabels(developments, now);
  const place = (key: string) => (event: { nativeEvent: { layout: { y: number } } }) => {
    const y = event.nativeEvent.layout.y;
    setTops((known) => (known[key] === y ? known : { ...known, [key]: y }));
  };
  // Content y of a line → its opacity as it scrolls towards the header.
  const fade = (top: number | undefined) => top === undefined ? 1 : scrollY.interpolate({
    inputRange: [top - fadeAt - FADE_BELOW, top - fadeAt + FADE_ABOVE], outputRange: [1, 0], extrapolate: 'clamp',
  });
  return <Animated.View testID="timeline" accessibilityLabel="Earlier developments" style={{ width: '100%', opacity }}>
    {developments.map((development, index) => {
      const label = storyLabel(development.story);
      const age = timelineAge(development.since, now);
      const entry = tops[`e${development.root}`];
      const at = (key: string) => entry === undefined || tops[key] === undefined ? undefined : offset + entry + tops[key];
      const tagKey = `t${development.root}`;
      const sentenceKey = `s${development.root}`;
      return <View key={development.root} accessible onLayout={place(`e${development.root}`)}
        accessibilityLabel={`${age}${label ? `, ${label}` : ''}. ${development.explanation}`}
        style={{ marginTop: index === 0 ? 0 : space[11] }}>
        {(labels[index].story || labels[index].age) && <Animated.View onLayout={place(tagKey)} style={{ opacity: fade(at(tagKey)), marginBottom: space[2.5] }}>
          <Text maxFontSizeMultiplier={scaleCap.label} style={{ color: theme.muted, fontSize: type.footnote, lineHeight: lineHeight(type.footnote, leading.normal) }}>
            {[labels[index].story, labels[index].age].filter(Boolean).join('  ·  ')}
          </Text>
        </Animated.View>}
        <Animated.View onLayout={place(sentenceKey)} style={{ opacity: fade(at(sentenceKey)) }}>
          <Text selectable style={{ color: theme.ink, fontSize: type.body, lineHeight: lineHeight(type.body, leading.loose) }}>{development.explanation}</Text>
        </Animated.View>
      </View>;
    })}
  </Animated.View>;
}
