import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { EASE_OUT } from '@/constants/motion';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const WIDTH = 340;
const LOG = 84;
const RULE = 4;
/** How far the log rolls in from, and how far it turns on the way (distance ÷ radius). */
const TRAVEL = 420;
const TURN = 590;
const ROLL_MS = 1700;
const NAME_DELAY = 1400;
const NAME_MS = 500;
/** When the hint below can appear: once the log has stopped and the name is in. */
export const WELCOME_SETTLED_MS = NAME_DELAY + NAME_MS + 300;

/** The LogMyLift lockup: a log rolls in along the heavy rule, laying it down, and the name rises in beside it. */
export function WelcomeMark() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  // Shrinks on narrow phones so the name and log stay on one line.
  const scale = Math.min(1, (width - Spacing.four * 2) / WIDTH);

  const roll = useSharedValue(reduceMotion ? 1 : 0);
  const name = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    roll.value = withTiming(1, { duration: ROLL_MS, easing: EASE_OUT });
    name.value = withDelay(NAME_DELAY, withTiming(1, { duration: NAME_MS, easing: EASE_OUT }));
  }, [reduceMotion, roll, name]);

  // The rule ends at the log's leading edge, so the log appears to lay it down as it rolls.
  const ruleStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: roll.value }] }));
  const logStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -TRAVEL * (1 - roll.value) }, { rotate: `${-TURN * (1 - roll.value)}deg` }],
  }));
  const nameStyle = useAnimatedStyle(() => ({
    opacity: name.value,
    transform: [{ translateY: 6 * (1 - name.value) }],
  }));

  return (
    <View style={[styles.box, { transform: [{ scale }] }]}>
      <Animated.View style={[styles.rule, { backgroundColor: theme.text }, ruleStyle]} />
      <Animated.View style={[styles.name, nameStyle]}>
        <ThemedText type="display" style={styles.nameText}>
          LogMyLift
        </ThemedText>
      </Animated.View>
      <Animated.View style={[styles.log, logStyle]}>
        <Svg width={LOG} height={LOG} viewBox="0 0 84 84">
          <Circle cx={42} cy={42} r={39} fill={theme.bark} stroke={theme.woodOutline} strokeWidth={5} />
          <Circle cx={42} cy={42} r={30.5} fill={theme.wood} stroke={theme.woodOutline} strokeWidth={2} />
          <Circle cx={42} cy={42} r={22} fill="none" stroke={theme.woodRing} strokeWidth={1.6} />
          <Circle cx={42} cy={42} r={14} fill="none" stroke={theme.woodRing} strokeWidth={1.6} />
          <Circle cx={42} cy={42} r={6.5} fill="none" stroke={theme.woodRing} strokeWidth={1.6} />
          <Path
            d="M42 14 L46 24 L41 33"
            fill="none"
            stroke={theme.woodPith}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={42} cy={42} r={3} fill={theme.accent} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: WIDTH,
    height: LOG + RULE + 4,
    overflow: 'hidden',
  },
  rule: {
    position: 'absolute',
    // Spans from where the log's leading edge starts (off to the left) to where it stops.
    left: WIDTH - TRAVEL,
    width: TRAVEL,
    bottom: 0,
    height: RULE,
    transformOrigin: 'left',
  },
  name: {
    position: 'absolute',
    left: 0,
    bottom: RULE + 8,
  },
  // A deliberate brand size, larger than `display`.
  nameText: {
    fontSize: 60,
    lineHeight: 62,
    letterSpacing: -1.2,
  },
  log: {
    position: 'absolute',
    left: WIDTH - LOG,
    bottom: RULE,
    width: LOG,
    height: LOG,
  },
});
