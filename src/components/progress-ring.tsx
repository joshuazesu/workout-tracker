import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { EASE_OUT } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * A ring that fills clockwise from 12 o'clock, with a count in the middle (e.g. "2 of 13" sets).
 * The arc glides to its new length when a set is ticked or added; the count changes at once.
 */
export function ProgressRing({
  value,
  total,
  size = 68,
  stroke = 8,
}: {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = total > 0 ? Math.min(1, value / total) : 0;

  // Starts at the current value, so opening the workout doesn't sweep the ring in from empty.
  const shown = useSharedValue(progress);
  useEffect(() => {
    shown.set(reduceMotion ? progress : withTiming(progress, { duration: 300, easing: EASE_OUT }));
  }, [progress, reduceMotion, shown]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - shown.get()),
    // A round cap on a zero-length arc would still draw a dot.
    strokeOpacity: shown.get() > 0.001 ? 1 : 0,
  }));

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityLabel={`${value} of ${total} sets done`}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.fill} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          animatedProps={arcProps}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <ThemedText type="title3" numeric style={styles.value}>
          {value}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numeric>
          of {total}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    lineHeight: 22,
  },
});
