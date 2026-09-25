import type { ReactNode } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';
import { Glyph, type GlyphName } from '@/components/glyph';
import { layout, radius, size, space, stroke, type, weight } from '@/lib/design';
import { gutter } from '@/lib/layout';

// One minimum for every row, whatever it carries: rows match at the default
// text size and grow together when text is enlarged.
export const ROW_MIN_HEIGHT = size.rowMinHeight;
// Sizes from design/tokens.json (`size`). Every trailing mark (chevron, link
// arrow, check) sits in one slot so they share a column, drawn at a size whose
// ink matches the label's cap height: the link arrow at 18 drew 8.7 points of
// ink beside 11.7-point capitals and read as small and floating above the
// baseline.
export const ICON_SIZE = size.rowIcon;
export const TRAILING_SLOT = size.trailingSlot;
export const TRAILING_SIZE = size.trailing;
const ICON_GAP = space[3.5];
const INSET = space[4];

// The page every settings screen sits on: neutral, centred, scrolling.
export function SettingsPage({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontal = gutter(width || layout.fallbackViewport.width);
  return <ScrollView style={{ flex: 1, backgroundColor: theme.tinted }} contentInsetAdjustmentBehavior="automatic"
    contentContainerStyle={{ paddingHorizontal: horizontal, paddingTop: space[4], paddingBottom: insets.bottom + space[8], alignItems: 'center' }}>
    <View style={{ width: '100%', maxWidth: layout.column.settings, gap: space[7] }}>{children}</View>
  </ScrollView>;
}

// A titled group of rows. The title is sentence case in the muted ink, level
// with the row icons, so it names the group without competing with it.
export function Section({ title, children, testID, role, label }: {
  title?: string; children: ReactNode; testID?: string; role?: 'radiogroup'; label?: string;
}) {
  const theme = useTheme();
  return <View accessibilityRole={role} accessibilityLabel={label}>
    {title && <Text accessibilityRole="header" style={{ color: theme.muted, fontSize: type.subhead, fontWeight: weight.semibold, marginBottom: space[2], marginHorizontal: INSET }}>{title}</Text>}
    <View testID={testID} style={{ backgroundColor: theme.elevated, borderRadius: radius.card, borderWidth: stroke.hairline, borderColor: theme.rule, overflow: 'hidden' }}>{children}</View>
  </View>;
}

// The visible part of a row: an optional leading icon, the label, then
// whatever trails it. The separator above every row but the first starts at
// the label, as iOS lists draw it, so icons read as one column.
export function RowContent({ index, icon, label, trailing }: { index: number; icon?: GlyphName; label: string; trailing?: ReactNode }) {
  const theme = useTheme();
  return <>
    {icon && <View style={{ marginRight: ICON_GAP }}><Glyph name={icon} color={theme.accent} size={ICON_SIZE} /></View>}
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: space[3], minHeight: ROW_MIN_HEIGHT, paddingRight: INSET,
      borderTopWidth: index === 0 ? 0 : stroke.hairline, borderTopColor: theme.rule }}>
      <Text style={{ color: theme.ink, fontSize: type.body, flex: 1, paddingVertical: space[1] }}>{label}</Text>
      {trailing}
    </View>
  </>;
}

// The pressable surface of a row. It carries no separator of its own, so the
// separator can start at the label; the minimum height is on both.
export function rowStyle() {
  return { minHeight: ROW_MIN_HEIGHT, flexDirection: 'row', alignItems: 'center', paddingLeft: INSET } as const;
}

// A trailing mark in its shared slot.
export function TrailingMark({ name, color }: { name: keyof typeof TRAILING_SIZE; color: string }) {
  return <View style={{ width: TRAILING_SLOT, alignItems: 'center', justifyContent: 'center' }}>
    <Glyph name={name} color={color} size={TRAILING_SIZE[name]} />
  </View>;
}

// What sits at a row's end: the current value, and where the row goes.
export function Trailing({ value, to }: { value?: string; to?: 'page' | 'external' }) {
  const theme = useTheme();
  return <>
    {value !== undefined && <Text numberOfLines={1} style={{ color: theme.muted, fontSize: type.body, flexShrink: 1 }}>{value}</Text>}
    {to && <TrailingMark name={to === 'page' ? 'chevron' : 'external'} color={theme.muted} />}
  </>;
}
