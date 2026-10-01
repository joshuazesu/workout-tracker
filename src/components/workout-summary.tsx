import { Pressable, StyleSheet, View } from 'react-native';

import { Stat } from '@/components/stat';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { formatDuration, type Workout, workoutActions, workoutVolume } from '@/lib/workouts';

/** A finished workout with every exercise and set. Long-press to delete it. */
export function WorkoutSummary({ workout }: { workout: Workout }) {
  const theme = useTheme();
  const started = new Date(workout.startedAt);
  const sets = workout.exercises.reduce((n, e) => n + e.sets.length, 0);

  return (
    <Pressable
      onLongPress={() =>
        confirm('Delete workout', 'This workout will be removed from your history.', 'Delete', () =>
          workoutActions.deleteFromHistory(workout.id)
        )
      }
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View>
        <ThemedText style={styles.title}>{workout.name || 'Workout'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {started.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} ·{' '}
          {started.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </ThemedText>
      </View>

      <View style={styles.stats}>
        <Stat label="Duration" value={formatDuration((workout.endedAt ?? workout.startedAt) - workout.startedAt)} />
        <Stat label="Volume" value={`${Math.round(workoutVolume(workout)).toLocaleString()} kg`} />
        <Stat label="Sets" value={String(sets)} />
      </View>

      {workout.exercises.map((e) => (
        <View key={e.id} style={[styles.exercise, { borderTopColor: theme.backgroundSelected }]}>
          <ThemedText style={[styles.exerciseName, { color: theme.accent }]}>{e.name}</ThemedText>
          {e.sets.map((set, i) => (
            <View key={set.id} style={styles.setRow}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.setIndex}>
                {i + 1}
              </ThemedText>
              <ThemedText type="small" style={styles.setValue}>
                {Number(set.weight) > 0 ? `${set.weight} kg × ${set.reps}` : `${set.reps} reps`}
              </ThemedText>
            </View>
          ))}
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.three,
    borderCurve: 'continuous',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.five,
  },
  exercise: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    gap: Spacing.half,
  },
  exerciseName: {
    fontWeight: 700,
    marginBottom: Spacing.half,
  },
  setRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  setIndex: {
    width: 16,
    fontVariant: ['tabular-nums'],
  },
  setValue: {
    fontVariant: ['tabular-nums'],
  },
});
