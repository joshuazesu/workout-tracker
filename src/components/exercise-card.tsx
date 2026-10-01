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

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { feedback } from '@/lib/feedback';
import { workoutActions, type WorkoutExercise, type WorkoutSet } from '@/lib/workouts';

export const ExerciseCard = memo(function ExerciseCard({ exercise }: { exercise: WorkoutExercise }) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.titleRow}>
        <ThemedText type="headline" numberOfLines={1} style={styles.flex}>
          {exercise.name}
        </ThemedText>
        <Pressable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${exercise.name}`}
          style={styles.iconButton}
          onPress={() =>
            confirm('Remove exercise', `Remove ${exercise.name} and its sets?`, 'Remove', () =>
              workoutActions.removeExercise(exercise.id)
            )
          }>
          <Icon name={{ ios: 'xmark.circle.fill', md: 'cancel' }} size={22} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.row}>
        <ThemedText type="caption" themeColor="textSecondary" style={[styles.colSet, styles.header]}>
          SET
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" style={[styles.colInput, styles.header]}>
          KG
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" style={[styles.colInput, styles.header]}>
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
        accessibilityRole="button"
        style={({ pressed }) => [styles.addSet, { opacity: pressed ? 0.6 : 1 }]}>
        <Icon name={{ ios: 'plus', md: 'add' }} size={15} color={theme.accent} weight="semibold" />
        <ThemedText type="subheadline" style={{ color: theme.accent, fontWeight: 600 }}>
          Add Set
        </ThemedText>
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
      backgroundColor: set.done ? 'transparent' : theme.fill,
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
      if (!reduceMotion) pop.set(withSequence(withTiming(1.2, { duration: 90 }), withSpring(1, { damping: 8 })));
    }
    workoutActions.updateSet(exerciseId, set.id, { done: !set.done });
  };

  return (
    <View style={[styles.row, styles.setRow, set.done && { backgroundColor: theme.accentSoft }]}>
      <Pressable
        style={styles.colSet}
        accessibilityLabel={`Set ${index + 1}. Long-press to remove`}
        onLongPress={() =>
          confirm('Remove set', `Remove set ${index + 1}?`, 'Remove', () =>
            workoutActions.removeSet(exerciseId, set.id)
          )
        }>
        <ThemedText type="subheadline" numeric style={styles.setNumber}>
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
            set.done
              ? { backgroundColor: theme.accent, borderColor: theme.accent }
              : { backgroundColor: 'transparent', borderColor: theme.outline },
            popStyle,
          ]}>
          {set.done && <Icon name={{ ios: 'checkmark', md: 'check' }} size={18} color={theme.onAccent} weight="bold" />}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    borderRadius: Radius,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
    paddingHorizontal: Spacing.two,
    gap: Spacing.one,
    borderCurve: 'continuous',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.two,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  header: {
    fontWeight: 600,
    textAlign: 'center',
  },
  setRow: {
    borderRadius: 10,
    paddingVertical: Spacing.one,
  },
  colSet: {
    width: 32,
    alignItems: 'center',
  },
  setNumber: {
    textAlign: 'center',
    fontWeight: 600,
  },
  colInput: {
    flex: 1,
    // Web inputs have an intrinsic width and won't shrink to fit without this.
    minWidth: 0,
    textAlign: 'center',
  },
  colCheck: {
    width: 44,
    alignItems: 'center',
  },
  input: {
    height: 36,
    borderRadius: 8,
    fontSize: 17,
    fontWeight: 600,
    fontVariant: ['tabular-nums'],
  },
  check: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 44,
  },
});
