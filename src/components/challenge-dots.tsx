import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

/**
 * One dot per required workout day. `animateLatest` pops the newest filled dot in,
 * which is how the summary screen shows "you just earned this one".
 */
export function ChallengeDots({
  done,
  total,
  animateLatest = false,
  size = 14,
}: {
  done: number;
  total: number;
  animateLatest?: boolean;
  size?: number;
}) {
  // Long challenges get smaller dots so they still fit on one or two rows.
  const dot = total > 7 ? Math.min(size, 12) : size;
  return (
    <View style={[styles.row, { gap: dot * 0.6 }]}>
      {Array.from({ length: total }, (_, i) => (
        <Dot key={i} filled={i < done} pop={animateLatest && i === done - 1} size={dot} />
      ))}
    </View>
  );
}

function Dot({ filled, pop, size }: { filled: boolean; pop: boolean; size: number }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(pop && !reduceMotion ? 0 : 1);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!pop || reduceMotion) return;
    fill.set(withDelay(500, withTiming(1, { duration: 200 })));
    scale.set(withDelay(500, withSequence(withSpring(1.6, { damping: 6 }), withSpring(1, { damping: 10 }))));
  }, [pop, reduceMotion, fill, scale]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.get(), transform: [{ scale: scale.get() }] }));

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.backgroundSelected,
      }}>
      {filled && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: theme.accent }, fillStyle]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
