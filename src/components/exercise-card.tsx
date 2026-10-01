import { memo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { feedback } from '@/lib/feedback';
import { workoutActions, type WorkoutExercise, type WorkoutSet } from '@/lib/workouts';

export const ExerciseCard = memo(function ExerciseCard({ exercise }: { exercise: WorkoutExercise }) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.titleRow}>
        <ThemedText style={[styles.title, { color: theme.accent }]} numberOfLines={1}>
          {exercise.name}
        </ThemedText>
        <Pressable
          hitSlop={10}
          accessibilityLabel={`Remove ${exercise.name}`}
          onPress={() =>
            confirm('Remove exercise', `Remove ${exercise.name} and its sets?`, 'Remove', () =>
              workoutActions.removeExercise(exercise.id)
            )
          }>
          <ThemedText themeColor="textSecondary" style={styles.remove}>
            ✕
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.row}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.colSet}>
          SET
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.colInput}>
          KG
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.colInput}>
          REPS
        </ThemedText>
        <View style={styles.colCheck} />
      </View>

      {exercise.sets.map((set, index) => (
        <SetRow key={set.id} exerciseId={exercise.id} set={set} index={index} />
      ))}

      <Pressable
        onPress={() => {
          feedback.tap();
          workoutActions.addSet(exercise.id);
        }}
        style={({ pressed }) => [
          styles.addSet,
          { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
        ]}>
        <ThemedText type="smallBold">+ Add set</ThemedText>
      </Pressable>
    </View>
  );
});

function SetRow({ exerciseId, set, index }: { exerciseId: string; set: WorkoutSet; index: number }) {
  const theme = useTheme();
  const inputStyle = [
    styles.input,
    {
      color: theme.text,
      backgroundColor: set.done ? 'transparent' : theme.backgroundSelected,
    },
  ];

  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  const toggleDone = () => {
    if (!set.done && !(Number(set.reps) > 0)) {
      feedback.error();
      if (!reduceMotion) {
        // A quick shake says "add reps first" without a dialog.
        pop.set(withSequence(withTiming(0.85, { duration: 60 }), withSpring(1, { damping: 4 })));
      }
      return;
    }
    if (set.done) {
      feedback.tap();
    } else {
      feedback.setDone();
      if (!reduceMotion) pop.set(withSequence(withTiming(1.3, { duration: 90 }), withSpring(1, { damping: 7 })));
    }
    workoutActions.updateSet(exerciseId, set.id, { done: !set.done });
  };

  return (
    <View style={[styles.row, styles.setRow, set.done && { backgroundColor: theme.accent + '33' }]}>
      <Pressable
        style={styles.colSet}
        accessibilityLabel={`Set ${index + 1}. Long-press to remove`}
        onLongPress={() =>
          confirm('Remove set', `Remove set ${index + 1}?`, 'Remove', () =>
            workoutActions.removeSet(exerciseId, set.id)
          )
        }>
        <ThemedText type="smallBold" style={styles.setNumber}>
          {index + 1}
        </ThemedText>
      </Pressable>
      <TextInput
        value={set.weight}
        onChangeText={(weight) =>
          workoutActions.updateSet(exerciseId, set.id, { weight: weight.replace(',', '.') })
        }
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
        selectTextOnFocus
        accessibilityLabel={`Set ${index + 1} weight in kilograms`}
        style={[styles.colInput, inputStyle]}
      />
      <TextInput
        value={set.reps}
        onChangeText={(reps) =>
          workoutActions.updateSet(exerciseId, set.id, { reps: reps.replace(/\D/g, '') })
        }
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
        selectTextOnFocus
        accessibilityLabel={`Set ${index + 1} reps`}
        style={[styles.colInput, inputStyle]}
      />
      <Pressable
        onPress={toggleDone}
        hitSlop={6}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.done }}
        accessibilityLabel={`Complete set ${index + 1}`}
        style={styles.colCheck}>
        <Animated.View
          style={[
            styles.check,
            { backgroundColor: set.done ? theme.accent : theme.backgroundSelected },
            popStyle,
          ]}>
          <ThemedText
            style={[styles.checkMark, { color: set.done ? theme.onAccent : theme.textSecondary }]}>
            ✓
          </ThemedText>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    gap: Spacing.one,
    borderCurve: 'continuous',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    marginBottom: Spacing.one,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 700,
  },
  remove: {
    fontSize: 16,
    paddingLeft: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  setRow: {
    borderRadius: 10,
    paddingVertical: Spacing.one,
  },
  colSet: {
    width: 36,
    alignItems: 'center',
    textAlign: 'center',
  },
  setNumber: {
    textAlign: 'center',
  },
  colInput: {
    flex: 1,
    // Web inputs have an intrinsic width and won't shrink to fit without this.
    minWidth: 0,
    textAlign: 'center',
  },
  colCheck: {
    width: 40,
  },
  input: {
    height: 36,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
  },
  check: {
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: 800,
  },
  addSet: {
    marginTop: Spacing.two,
    marginHorizontal: Spacing.two,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
