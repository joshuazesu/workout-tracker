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
import { SwipeAction } from '@/components/swipe-action';
import { ThemedText } from '@/components/themed-text';
import { Spacing, textStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { feedback } from '@/lib/feedback';
import { workoutActions, type WorkoutExercise, type WorkoutSet } from '@/lib/workouts';

/** Last time's set as "70 × 8", or reps alone for bodyweight. */
function formatPrevious(set: WorkoutSet | undefined) {
  if (!set) return '–';
  return Number(set.weight) > 0 ? `${set.weight} × ${set.reps}` : `${set.reps} reps`;
}

/**
 * What to suggest for each empty field: the nearest earlier set in this workout with that field
 * filled, else the same set from last time.
 */
function suggestFor(sets: WorkoutSet[], index: number, previous?: WorkoutSet) {
  const earlier = sets.slice(0, index).reverse();
  return {
    weight: earlier.find((s) => s.weight)?.weight ?? previous?.weight ?? '',
    reps: earlier.find((s) => s.reps)?.reps ?? previous?.reps ?? '',
  };
}

export const ExerciseCard = memo(function ExerciseCard({
  exercise,
  previous,
}: {
  exercise: WorkoutExercise;
  /** Sets from the last time this exercise was logged; null if never. */
  previous: WorkoutSet[] | null;
}) {
  const theme = useTheme();

  return (
    <View>
      <View style={styles.titleRow}>
        <ThemedText type="title2" numberOfLines={1} style={styles.flex}>
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
          <Icon name={{ ios: 'xmark', md: 'close' }} size={18} color={theme.textSecondary} weight="semibold" />
        </Pressable>
      </View>

      <View style={[styles.row, styles.columns, { borderBottomColor: theme.text }]}>
        <ThemedText type="caption" themeColor="textSecondary" style={[styles.colSet, styles.header]}>
          SET
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" style={[styles.colPrevious, styles.header]}>
          LAST
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
        <SetRow
          key={set.id}
          exerciseId={exercise.id}
          set={set}
          index={index}
          previous={previous?.[index]}
          suggestion={suggestFor(exercise.sets, index, previous?.[index])}
        />
      ))}

      <Pressable
        onPress={() => {
          feedback.tap();
          workoutActions.addSet(exercise.id);
        }}
        accessibilityRole="button"
        style={({ pressed }) => [styles.addSet, { opacity: pressed ? 0.6 : 1 }]}>
        <Icon name={{ ios: 'plus', md: 'add' }} size={15} color={theme.accent} weight="semibold" />
        <ThemedText type="callout" style={{ color: theme.accent, fontWeight: 600 }}>
          Add set
        </ThemedText>
      </Pressable>
    </View>
  );
});

function SetRow({
  exerciseId,
  set,
  index,
  previous,
  suggestion,
}: {
  exerciseId: string;
  set: WorkoutSet;
  index: number;
  previous?: WorkoutSet;
  /** Shown as the placeholder of an empty field, and used if the set is ticked while empty. */
  suggestion?: { weight: string; reps: string };
}) {
  const theme = useTheme();
  // Open sets are underlined in the tint, like a blank on a log sheet; ticked ones are plain ink.
  const inputStyle = [
    styles.input,
    { color: theme.text, borderBottomColor: set.done ? 'transparent' : theme.accent },
  ];

  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  const toggleDone = () => {
    // Ticking an empty field accepts the suggestion shown in it.
    const reps = set.reps || suggestion?.reps || '';
    const weight = set.weight || suggestion?.weight || '';
    if (!set.done && !(Number(reps) > 0)) {
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
    workoutActions.updateSet(exerciseId, set.id, set.done ? { done: false } : { done: true, weight, reps });
    if (!set.done) workoutActions.startRest();
  };

  const remove = () => {
    feedback.tap();
    workoutActions.removeSet(exerciseId, set.id);
  };

  return (
    <SwipeAction label="Delete" onAction={remove} background={theme.background}>
      <View
        style={[styles.row, styles.setRow, { borderBottomColor: theme.separator }]}
        accessibilityActions={[{ name: 'delete', label: 'Delete set' }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && remove()}>
        <View style={styles.colSet}>
          <ThemedText type="headline" numeric style={styles.setNumber}>
            {index + 1}
          </ThemedText>
        </View>
        <Pressable
          style={styles.colPrevious}
          disabled={!previous || set.done}
          onPress={() => {
            if (!previous) return;
            feedback.tap();
            workoutActions.updateSet(exerciseId, set.id, { weight: previous.weight, reps: previous.reps });
          }}
          accessibilityRole={previous ? 'button' : undefined}
          accessibilityLabel={previous ? `Last time ${formatPrevious(previous)}. Tap to copy` : 'No previous set'}>
          <ThemedText type="footnote" themeColor="textSecondary" numeric numberOfLines={1} style={styles.previousText}>
            {formatPrevious(previous)}
          </ThemedText>
        </Pressable>
        <TextInput
          value={set.weight}
          onChangeText={(weight) =>
            workoutActions.updateSet(exerciseId, set.id, { weight: weight.replace(',', '.') })
          }
          keyboardType="decimal-pad"
          placeholder={suggestion?.weight || '0'}
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
          placeholder={suggestion?.reps || '0'}
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
                ? { backgroundColor: theme.text, borderColor: theme.text }
                : { backgroundColor: 'transparent', borderColor: theme.text },
              popStyle,
            ]}>
            {set.done && <Icon name={{ ios: 'checkmark', md: 'check' }} size={18} color={theme.onText} weight="bold" />}
          </Animated.View>
        </Pressable>
      </View>
    </SwipeAction>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  columns: {
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  header: {
    textAlign: 'center',
  },
  setRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  colSet: {
    width: 28,
    alignItems: 'flex-start',
  },
  setNumber: {
    fontWeight: 700,
  },
  colPrevious: {
    width: 64,
    justifyContent: 'center',
  },
  previousText: {
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
    alignItems: 'flex-end',
  },
  input: {
    ...textStyle('title2', 700),
    fontVariant: ['tabular-nums'],
    height: 38,
    borderBottomWidth: 1.5,
  },
  check: {
    width: 36,
    height: 36,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
  },
});
