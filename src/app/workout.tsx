import { router, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ExerciseCard } from '@/components/exercise-card';
import { Icon } from '@/components/icon';
import { REST_BAR_HEIGHT, RestTimer } from '@/components/rest-timer';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing, TextStyles } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { formatDuration, lastSets, workoutActions, workoutVolume, useWorkoutStore } from '@/lib/workouts';

export default function WorkoutScreen() {
  const theme = useTheme();
  const { active, history } = useWorkoutStore();
  // Set when finishing, so the celebration screen replaces this one instead of popping home.
  const finishing = useRef(false);

  // Leave once the workout is finished or discarded (or if opened with none active).
  useEffect(() => {
    if (!active && !finishing.current && router.canGoBack()) router.back();
  }, [active]);

  if (!active) return null;

  const completedSets = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const volume = Math.round(workoutVolume(active));

  const finish = () => {
    if (completedSets === 0) {
      confirm(
        'No completed sets',
        'Tick off at least one set to save this workout. Discard it instead?',
        'Discard',
        workoutActions.discard
      );
      return;
    }
    finishing.current = true;
    const id = workoutActions.finish();
    if (id) router.replace({ pathname: '/complete', params: { id } });
  };

  const discard = () =>
    confirm('Discard workout', 'All sets in this workout will be lost.', 'Discard', workoutActions.discard);

  return (
    <>
      <Stack.Screen
        options={{
          // The live timer is the title; the name is edited in the body.
          headerTitle: () => <Elapsed startedAt={active.startedAt} />,
          headerRight: () => (
            <Pressable onPress={finish} hitSlop={10} accessibilityRole="button" style={styles.finishButton}>
              <ThemedText type="headline" style={{ color: theme.accent }}>
                Finish
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.content, active.restUntil ? { paddingBottom: REST_BAR_HEIGHT + Spacing.five } : null]}>
          <View style={styles.titleBlock}>
            <TextInput
              value={active.name ?? ''}
              onChangeText={workoutActions.rename}
              placeholder="Workout"
              placeholderTextColor={theme.textSecondary}
              returnKeyType="done"
              accessibilityLabel="Workout name"
              style={[styles.nameInput, { color: theme.text }]}
            />
            {completedSets > 0 && (
              <ThemedText type="subheadline" themeColor="textSecondary" numeric>
                {completedSets} {completedSets === 1 ? 'set' : 'sets'} · {volume.toLocaleString()} kg
              </ThemedText>
            )}
          </View>

          {active.exercises.length === 0 && (
            <View style={styles.empty}>
              <Icon name={{ ios: 'dumbbell', md: 'fitness_center' }} size={40} color={theme.textSecondary} />
              <ThemedText type="title3" style={styles.emptyTitle}>
                Add your first exercise
              </ThemedText>
              <ThemedText type="subheadline" themeColor="textSecondary" style={styles.center}>
                Log each set’s weight and reps, then tick it off.
              </ThemedText>
            </View>
          )}

          {active.exercises.map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} previous={lastSets(exercise.name, history)} />
          ))}

          <View style={styles.actions}>
            <Button
              label="Add Exercise"
              variant={active.exercises.length === 0 ? 'primary' : 'tinted'}
              icon={{ ios: 'plus', md: 'add' }}
              onPress={() => router.push('/add-exercise')}
            />
            {completedSets > 0 && <Button label="Finish Workout" onPress={finish} />}
            <Button label="Discard Workout" variant="destructive" onPress={discard} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <RestTimer />
    </>
  );
}

function Elapsed({ startedAt }: { startedAt: number }) {
  const now = useNow(1000);
  return (
    <ThemedText type="headline" numeric accessibilityLabel={`Elapsed ${formatDuration(now - startedAt)}`}>
      {formatDuration(now - startedAt)}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  titleBlock: {
    paddingHorizontal: Spacing.one,
    gap: 2,
  },
  nameInput: {
    ...TextStyles.title1,
    paddingVertical: 0,
    // Web inputs have an intrinsic width and won't shrink to fit without this.
    minWidth: 0,
  },
  finishButton: {
    paddingHorizontal: Spacing.two,
    minHeight: 44,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  emptyTitle: {
    fontWeight: 700,
    marginTop: Spacing.one,
  },
  center: {
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
