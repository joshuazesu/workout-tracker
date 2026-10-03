import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { EASE_OUT, EASE_OUT_CSS } from '@/constants/motion';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTapGuard } from '@/hooks/use-tap-guard';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { formatMinutes, relativeDay, summarizeSets } from '@/lib/format';
import { type Workout, workoutActions, workoutVolume } from '@/lib/workouts';

/**
 * One finished workout as a list row: name, when, how long and how much. Tap to expand the sets,
 * long-press to delete. Sits inside a `Section`.
 */
export function WorkoutSummary({ workout, initiallyOpen = false }: { workout: Workout; initiallyOpen?: boolean }) {
  const theme = useTheme();
  const now = useNow(60_000);
  const reduceMotion = useReducedMotion();
  const tap = useTapGuard();
  const [open, setOpen] = useState(initiallyOpen);
  const started = new Date(workout.startedAt);
  const time = started.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const duration = formatMinutes((workout.endedAt ?? workout.startedAt) - workout.startedAt);
  const volume = Math.round(workoutVolume(workout));

  return (
    <Pressable
      onPressIn={tap.onPressIn}
      onPress={(e) => !tap.moved(e) && setOpen(!open)}
      onLongPress={() =>
        confirm('Delete workout', 'This workout will be removed from your history.', 'Delete', () =>
          workoutActions.deleteFromHistory(workout.id)
        )
      }
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityHint="Shows every set. Long-press to delete."
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.fill }]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <ThemedText type="title1" numberOfLines={1}>
            {workout.name || 'Workout'}
          </ThemedText>
          <ThemedText type="subheadline" themeColor="textSecondary" numeric numberOfLines={1}>
            {relativeDay(workout.startedAt, now)}, {time} · {duration}
            {volume > 0 ? ` · ${volume.toLocaleString()} kg` : ''}
          </ThemedText>
        </View>
        <Animated.View
          style={{
            transform: [{ rotate: open ? '90deg' : '0deg' }],
            transitionProperty: 'transform',
            transitionDuration: reduceMotion ? 0 : 200,
            transitionTimingFunction: EASE_OUT_CSS,
          }}>
          <Icon name={{ ios: 'chevron.right', md: 'chevron_right' }} size={14} color={theme.textSecondary} weight="semibold" />
        </Animated.View>
      </View>

      {open ? (
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(180).easing(EASE_OUT)} style={styles.details}>
          {workout.exercises.map((e) => (
            <View key={e.id} style={styles.exercise}>
              <ThemedText type="subheadline" style={styles.exerciseName} numberOfLines={1}>
                {e.name}
              </ThemedText>
              <ThemedText type="subheadline" themeColor="textSecondary" numeric style={styles.flex}>
                {summarizeSets(e.sets)}
              </ThemedText>
            </View>
          ))}
        </Animated.View>
      ) : (
        <ThemedText type="footnote" themeColor="textSecondary" numberOfLines={1}>
          {workout.exercises.map((e) => e.name).join(', ')}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    paddingVertical: Spacing.three - 2,
    gap: Spacing.one,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  details: {
    gap: Spacing.one,
    paddingTop: Spacing.one,
  },
  exercise: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  exerciseName: {
    width: '42%',
    fontWeight: 600,
  },
});
