import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { feedback } from '@/lib/feedback';
import { formatDuration, useWorkoutStore, workoutActions } from '@/lib/workouts';

/** Height of the bar above the safe area, so the workout list can leave room for it. */
export const REST_BAR_HEIGHT = 112;

/**
 * Countdown pinned to the bottom of the workout screen after a set is ticked, in thumb reach.
 * Ends with a chime and buzz, then hides itself.
 */
export function RestTimer() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { active, restSeconds } = useWorkoutStore();
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

  const progress = Math.min(1, remaining / (restSeconds * 1000));

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.duration(200)}
      exiting={reduceMotion ? undefined : FadeOutDown.duration(150)}
      accessibilityLiveRegion="polite"
      style={[
        styles.bar,
        { backgroundColor: theme.surface, borderTopColor: theme.separator, paddingBottom: insets.bottom + Spacing.two },
      ]}>
      <View style={[styles.track, { backgroundColor: theme.fill }]}>
        <View style={[styles.fill, { backgroundColor: theme.accent, width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.row}>
        <AdjustButton label="−15" accessibilityLabel="15 seconds less rest" onPress={() => workoutActions.adjustRest(-15)} />
        <View style={styles.center}>
          <ThemedText type="footnote" themeColor="textSecondary">
            Rest
          </ThemedText>
          <ThemedText type="title1" numeric accessibilityLabel={`${Math.ceil(remaining / 1000)} seconds of rest left`}>
            {formatDuration(remaining + 999)}
          </ThemedText>
        </View>
        <AdjustButton label="+15" accessibilityLabel="15 seconds more rest" onPress={() => workoutActions.adjustRest(15)} />
        <Pressable
          onPress={() => {
            feedback.tap();
            workoutActions.skipRest();
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.skip, { backgroundColor: theme.accentSoft, opacity: pressed ? 0.7 : 1 }]}>
          <ThemedText type="subheadline" style={{ color: theme.accent, fontWeight: 600 }}>
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
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.adjust, { backgroundColor: pressed ? theme.fillStrong : theme.fill }]}>
      <ThemedText type="subheadline" numeric style={styles.adjustText}>
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
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  adjust: {
    width: 56,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustText: {
    fontWeight: 600,
  },
  skip: {
    height: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
