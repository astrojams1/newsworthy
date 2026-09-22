import { useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { useTheme } from '@/lib/theme';

// An iOS-style switch on every platform: a 51×31 pill, a white thumb that
// slides across it, green when on. Android's and the web's stock switches look
// nothing like it, so the settings screen draws its own.
export const TRACK_WIDTH = 51;
export const TRACK_HEIGHT = 31;
export const THUMB_SIZE = 27;
export const ON_COLOR = '#34C759';
const PAD = (TRACK_HEIGHT - THUMB_SIZE) / 2;

export function Toggle({ value, onValueChange, disabled = false, accessibilityLabel, testID }: {
  value: boolean; onValueChange(next: boolean): void; disabled?: boolean; accessibilityLabel: string; testID?: string;
}) {
  const theme = useTheme();
  const position = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(position, { toValue: value ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [value, position]);
  const translateX = position.interpolate({ inputRange: [0, 1], outputRange: [PAD, TRACK_WIDTH - THUMB_SIZE - PAD] });
  const backgroundColor = position.interpolate({ inputRange: [0, 1], outputRange: [theme.dark ? '#39393D' : '#E9E9EB', ON_COLOR] });
  return <Pressable accessibilityRole="switch" accessibilityLabel={accessibilityLabel} accessibilityState={{ checked: value, disabled }}
    disabled={disabled} testID={testID} onPress={() => onValueChange(!value)}
    // The pill is shorter than a 48-point target; the slop makes up the difference.
    hitSlop={{ top: 9, bottom: 9, left: 8, right: 8 }} style={{ opacity: disabled ? 0.5 : 1 }}>
    <Animated.View style={{ width: TRACK_WIDTH, height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, backgroundColor, justifyContent: 'center' }}>
      <Animated.View style={{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2, backgroundColor: '#FFFFFF', transform: [{ translateX }],
        shadowColor: '#000000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 3 }, elevation: 3 }} />
    </Animated.View>
  </Pressable>;
}
