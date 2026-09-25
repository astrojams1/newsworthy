import { useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { useTheme } from '@/lib/theme';
import { control, motion, opacity, shadow, size, space, touchTarget } from '@/lib/design';

// An iOS-style switch on every platform: a 51×31 pill (`size.switch`), a white
// thumb that slides across it, the accent when on — the same colour that marks
// the chosen appearance and score beside it. Android's and the web's stock
// switches look nothing like it, so the settings screen draws its own.
export const { trackWidth: TRACK_WIDTH, trackHeight: TRACK_HEIGHT, thumb: THUMB_SIZE } = size.switch;
const PAD = (TRACK_HEIGHT - THUMB_SIZE) / 2;
const SLOP = (touchTarget - TRACK_HEIGHT) / 2;

export function Toggle({ value, onValueChange, disabled = false, accessibilityLabel, testID }: {
  value: boolean; onValueChange(next: boolean): void; disabled?: boolean; accessibilityLabel: string; testID?: string;
}) {
  const theme = useTheme();
  const position = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(position, { toValue: value ? 1 : 0, duration: motion.switch, useNativeDriver: false }).start();
  }, [value, position]);
  const translateX = position.interpolate({ inputRange: [0, 1], outputRange: [PAD, TRACK_WIDTH - THUMB_SIZE - PAD] });
  const backgroundColor = position.interpolate({ inputRange: [0, 1], outputRange: [control[theme.dark ? 'dark' : 'light'].trackOff, theme.accent] });
  return <Pressable accessibilityRole="switch" accessibilityLabel={accessibilityLabel} accessibilityState={{ checked: value, disabled }}
    disabled={disabled} testID={testID} onPress={() => onValueChange(!value)}
    // The pill is shorter than a touch target; the slop makes up the difference.
    hitSlop={{ top: SLOP, bottom: SLOP, left: space[2], right: space[2] }} style={{ opacity: disabled ? opacity.disabled : 1 }}>
    <Animated.View style={{ width: TRACK_WIDTH, height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, backgroundColor, justifyContent: 'center' }}>
      <Animated.View style={{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2, backgroundColor: control.thumb, transform: [{ translateX }],
        shadowColor: control.shadow, shadowOpacity: shadow.thumb.opacity, shadowRadius: shadow.thumb.radius, shadowOffset: { width: 0, height: shadow.thumb.offsetY }, elevation: shadow.thumb.elevation }} />
    </Animated.View>
  </Pressable>;
}
