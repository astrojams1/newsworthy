import type { ReactNode } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';
import { Glyph, type GlyphName } from '@/components/glyph';

// One minimum for every row, whatever it carries: rows match at the default
// text size and grow together when text is enlarged.
export const ROW_MIN_HEIGHT = 56;
// Sizes recorded in design/surfaces.json (`settings`). Leading icons are 22
// points. Every trailing mark (chevron, link arrow, check) sits in one 22-point
// slot so they share a column, drawn at a size whose ink matches the label's
// cap height: the link arrow at 18 drew 8.7 points of ink beside 11.7-point
// capitals and read as small and floating above the baseline.
export const ICON_SIZE = 22;
export const TRAILING_SLOT = 22;
export const TRAILING_SIZE = { chevron: 20, external: 22, check: 20 } as const;
const ICON_GAP = 14;
const INSET = 16;

// The page every settings screen sits on: neutral, centred, scrolling.
export function SettingsPage({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontal = Math.max(20, Math.min((width || 390) * 0.05, 48));
  return <ScrollView style={{ flex: 1, backgroundColor: theme.tinted }} contentInsetAdjustmentBehavior="automatic"
    contentContainerStyle={{ paddingHorizontal: horizontal, paddingTop: 16, paddingBottom: insets.bottom + 32, alignItems: 'center' }}>
    <View style={{ width: '100%', maxWidth: 440, gap: 28 }}>{children}</View>
  </ScrollView>;
}

// A titled group of rows. The title is sentence case in the muted ink, level
// with the row icons, so it names the group without competing with it.
export function Section({ title, children, testID, role, label }: {
  title?: string; children: ReactNode; testID?: string; role?: 'radiogroup'; label?: string;
}) {
  const theme = useTheme();
  return <View accessibilityRole={role} accessibilityLabel={label}>
    {title && <Text accessibilityRole="header" style={{ color: theme.muted, fontSize: 15, fontWeight: '600', marginBottom: 8, marginHorizontal: INSET }}>{title}</Text>}
    <View testID={testID} style={{ backgroundColor: theme.elevated, borderRadius: 16, borderWidth: 1, borderColor: theme.rule, overflow: 'hidden' }}>{children}</View>
  </View>;
}

// The visible part of a row: an optional leading icon, the label, then
// whatever trails it. The separator above every row but the first starts at
// the label, as iOS lists draw it, so icons read as one column.
export function RowContent({ index, icon, label, trailing }: { index: number; icon?: GlyphName; label: string; trailing?: ReactNode }) {
  const theme = useTheme();
  return <>
    {icon && <View style={{ marginRight: ICON_GAP }}><Glyph name={icon} color={theme.accent} size={ICON_SIZE} /></View>}
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 12, minHeight: ROW_MIN_HEIGHT, paddingRight: INSET,
      borderTopWidth: index === 0 ? 0 : 1, borderTopColor: theme.rule }}>
      <Text style={{ color: theme.ink, fontSize: 17, flex: 1, paddingVertical: 4 }}>{label}</Text>
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
    {value !== undefined && <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 17, flexShrink: 1 }}>{value}</Text>}
    {to && <TrailingMark name={to === 'page' ? 'chevron' : 'external'} color={theme.muted} />}
  </>;
}
