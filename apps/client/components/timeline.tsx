import { useState } from 'react';
import { Animated, Text, View } from 'react-native';
import type { Development } from '@/lib/use-timeline';
import { storyLabel, timelineAge, timelineLabels } from '@/lib/timeline';

type Theme = { ink: string; muted: string };

// A line starts to fade this far below the header and is gone this far above
// its lower edge. At the snap offset the first entry sits 32pt below the
// header, just outside the fade, so the resting timeline is at full strength.
const FADE_BELOW = 28;
const FADE_ABOVE = 16;
const ENTRY_GAP = 44;
const TAG_GAP = 10;

/**
 * Prototype. The developments behind the front page, newest first, each
 * tagged with its story. Left-aligned, and nothing but the tag, the age and
 * the sentence: order and space carry the timeline.
 *
 * On a screen wide enough for more than one sentence column, the entries form
 * a grid, read across and then down, each in the sentence's measure.
 *
 * `opacity` is driven by the scroll position: the timeline fades in as the
 * reading above it fades out. Scrolled further, each tag line and sentence
 * fades out on its own as it nears the header, so text never runs under the
 * header at full strength and nothing needs a bar or a rule to hide it. React
 * Native cannot mask to a gradient without a native module, and a painted
 * gradient would not match the reading gradient behind it.
 */
export function Timeline({ developments, opacity, theme, now, scrollY, offset, fadeAt, columns = 1, gap = 0 }: {
  developments: Development[]; opacity: Animated.AnimatedInterpolation<number>; theme: Theme; now: number;
  scrollY: Animated.Value; offset: number; fadeAt: number; columns?: number; gap?: number;
}) {
  // Heights, not positions: on the web onLayout fires only when a view is
  // resized, so a line moved by its neighbours (a rotation reflows them) kept
  // its old position and stopped fading, running under the header in
  // landscape. Positions are summed from the heights instead: a row is as
  // tall as its tallest entry, and every entry in it starts at its top.
  const [heights, setHeights] = useState<Record<string, number>>({});
  if (!developments.length) return null;
  const labels = timelineLabels(developments, now, columns);
  const measure = (key: string) => (event: { nativeEvent: { layout: { height: number } } }) => {
    const height = event.nativeEvent.layout.height;
    setHeights((known) => (known[key] === height ? known : { ...known, [key]: height }));
  };
  // Content y of a line → its opacity as it scrolls towards the header.
  const fade = (top: number | undefined) => top === undefined ? 1 : scrollY.interpolate({
    inputRange: [top - fadeAt - FADE_BELOW, top - fadeAt + FADE_ABOVE], outputRange: [1, 0], extrapolate: 'clamp',
  });
  const at = (top: number | undefined) => top === undefined ? undefined : offset + top;
  const rows: { development: Development; index: number }[][] = [];
  developments.forEach((development, index) => {
    if (index % columns === 0) rows.push([]);
    rows[rows.length - 1].push({ development, index });
  });
  let rowTop: number | undefined = 0;
  return <Animated.View testID="timeline" accessibilityLabel="Earlier developments" style={{ width: '100%', opacity }}>
    {rows.map((row, rowIndex) => {
      const top = rowTop === undefined ? undefined : rowTop + (rowIndex === 0 ? 0 : ENTRY_GAP);
      const rowKey = `r${row[0].development.root}`;
      const rowHeight = heights[rowKey];
      rowTop = top === undefined || rowHeight === undefined ? undefined : top + rowHeight;
      return <View key={rowKey} onLayout={measure(rowKey)} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: rowIndex === 0 ? 0 : ENTRY_GAP }}>
        {Array.from({ length: columns }, (_, slot) => {
          const cell = row[slot];
          // An unfilled slot in the last row keeps the columns the same width.
          if (!cell) return <View key={`empty${slot}`} style={{ flex: 1, flexBasis: 0, marginLeft: slot === 0 ? 0 : gap }} />;
          const { development, index } = cell;
          const label = storyLabel(development.story);
          const age = timelineAge(development.since, now);
          const tagKey = `t${development.root}`;
          const hasTag = Boolean(labels[index].story || labels[index].age);
          const tagHeight = hasTag ? heights[tagKey] : 0;
          const sentenceTop = top === undefined || tagHeight === undefined ? undefined : top + (hasTag ? tagHeight + TAG_GAP : 0);
          return <View key={development.root} accessible
            accessibilityLabel={`${age}${label ? `, ${label}` : ''}. ${development.explanation}`}
            style={{ flex: 1, flexBasis: 0, minWidth: 0, marginLeft: slot === 0 ? 0 : gap }}>
            {hasTag && <Animated.View onLayout={measure(tagKey)} style={{ opacity: fade(at(top)), marginBottom: TAG_GAP }}>
              <Text maxFontSizeMultiplier={1.5} style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>
                {[labels[index].story, labels[index].age].filter(Boolean).join('  ·  ')}
              </Text>
            </Animated.View>}
            <Animated.View style={{ opacity: fade(at(sentenceTop)) }}>
              <Text selectable style={{ color: theme.ink, fontSize: 17, lineHeight: 27 }}>{development.explanation}</Text>
            </Animated.View>
          </View>;
        })}
      </View>;
    })}
  </Animated.View>;
}
