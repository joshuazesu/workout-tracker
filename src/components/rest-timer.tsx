import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Gutter, MaxContentWidth, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { feedback } from '@/lib/feedback';
import { formatDuration, useWorkoutStore, workoutActions } from '@/lib/workouts';

/** Height of the bar above the safe area, so the workout list can leave room for it. */
export const REST_BAR_HEIGHT = 120;

/**
 * Countdown pinned to the bottom of the workout screen after a set is ticked, in thumb reach.
 * Ends with a chime and buzz, then hides itself.
 */
export function RestTimer() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { active } = useWorkoutStore();
  const now = useNow(250);
  const restUntil = active?.restUntil;
  const remaining = restUntil ? Math.max(0, restUntil - now) : 0;
  const finished = Boolean(restUntil) && remaining === 0;

  useEffect(() => {
    if (!finished) return;
    feedback.restDone();
    workoutActions.skipRest();
  }, [finished]);

  if (!restUntil || finished) return null;

  // The set the rest leads into: the first unticked set of the exercise you're on.
  const nextExercise = active?.exercises.find((e) => e.sets.some((x) => !x.done));
  const nextSet = nextExercise ? nextExercise.sets.findIndex((x) => !x.done) + 1 : 0;

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.duration(200)}
      exiting={reduceMotion ? undefined : FadeOutDown.duration(150)}
      accessibilityLiveRegion="polite"
      style={[styles.bar, { backgroundColor: theme.accentFill, paddingBottom: insets.bottom + Spacing.three }]}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <ThemedText type="subheadline" style={styles.label}>
            {nextSet ? `Rest · then set ${nextSet}` : 'Rest'}
          </ThemedText>
          <ThemedText
            type="display"
            numeric
            style={styles.time}
            accessibilityLabel={`${Math.ceil(remaining / 1000)} seconds of rest left`}>
            {formatDuration(remaining + 999)}
          </ThemedText>
        </View>
        <AdjustButton label="−15" accessibilityLabel="15 seconds less rest" onPress={() => workoutActions.adjustRest(-15)} />
        <AdjustButton label="+15" accessibilityLabel="15 seconds more rest" onPress={() => workoutActions.adjustRest(15)} />
        <Pressable
          onPress={() => {
            feedback.tap();
            workoutActions.skipRest();
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.skip, { opacity: pressed ? 0.8 : 1 }]}>
          <ThemedText type="headline" style={{ color: theme.accentFill, fontWeight: 700 }}>
            Skip
          </ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function AdjustButton({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.adjust, { backgroundColor: pressed ? 'rgba(255,255,255,0.18)' : 'transparent' }]}>
      <ThemedText type="subheadline" numeric style={styles.onBlue}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: Spacing.three,
    paddingHorizontal: Gutter,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  label: {
    color: '#FFFFFF',
    opacity: 0.9,
  },
  time: {
    color: '#FFFFFF',
    fontSize: 52,
    lineHeight: 54,
  },
  adjust: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onBlue: {
    color: '#FFFFFF',
    fontWeight: 600,
  },
  skip: {
    height: 52,
    paddingHorizontal: Spacing.three + 2,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
