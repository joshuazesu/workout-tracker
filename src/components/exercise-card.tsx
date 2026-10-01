import { memo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
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

/** Last time's set as "70 × 8", or reps alone for bodyweight. */
function formatPrevious(set: WorkoutSet | undefined) {
  if (!set) return '–';
  return Number(set.weight) > 0 ? `${set.weight} × ${set.reps}` : `${set.reps} reps`;
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
        <ThemedText type="caption" themeColor="textSecondary" style={[styles.colPrevious, styles.header]}>
          PREVIOUS
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
        <SetRow key={set.id} exerciseId={exercise.id} set={set} index={index} previous={previous?.[index]} />
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

function SetRow({
  exerciseId,
  set,
  index,
  previous,
}: {
  exerciseId: string;
  set: WorkoutSet;
  index: number;
  previous?: WorkoutSet;
}) {
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
    if (!set.done) workoutActions.startRest();
  };

  const remove = () => {
    feedback.tap();
    workoutActions.removeSet(exerciseId, set.id);
  };

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      // Opaque under the row so the delete action can't show through a ticked set's tint.
      childrenContainerStyle={[styles.swipeSurface, { backgroundColor: theme.surface }]}
      renderRightActions={() => (
        <Pressable
          onPress={remove}
          accessibilityRole="button"
          accessibilityLabel={`Delete set ${index + 1}`}
          style={[styles.deleteAction, { backgroundColor: theme.destructive }]}>
          <Icon name={{ ios: 'trash', md: 'delete' }} size={20} color="#FFFFFF" />
        </Pressable>
      )}>
      <View
        style={[styles.row, styles.setRow, set.done && { backgroundColor: theme.accentSoft }]}
        accessibilityActions={[{ name: 'delete', label: 'Delete set' }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && remove()}>
        <View style={styles.colSet}>
          <ThemedText type="subheadline" numeric style={styles.setNumber}>
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
    </ReanimatedSwipeable>
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
  swipeSurface: {
    borderRadius: 10,
  },
  colPrevious: {
    width: 64,
    justifyContent: 'center',
  },
  previousText: {
    textAlign: 'center',
  },
  deleteAction: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginLeft: Spacing.two,
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
