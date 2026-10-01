import { router, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ExerciseCard } from '@/components/exercise-card';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { formatDuration, workoutActions, workoutVolume, useWorkoutStore } from '@/lib/workouts';

export default function WorkoutScreen() {
  const theme = useTheme();
  const { active } = useWorkoutStore();
  const now = useNow(1000);
  // Set when finishing, so the celebration screen replaces this one instead of popping home.
  const finishing = useRef(false);

  // Leave once the workout is finished or discarded (or if opened with none active).
  useEffect(() => {
    if (!active && !finishing.current && router.canGoBack()) router.back();
  }, [active]);

  if (!active) return null;

  const completedSets = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

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

  return (
    <>
      <Stack.Screen
        options={{
          title: active.name || 'Workout',
          headerRight: () => (
            <Pressable onPress={finish} hitSlop={10} style={styles.finishButton}>
              <ThemedText style={[styles.finishText, { color: theme.accent }]}>Finish</ThemedText>
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
          contentContainerStyle={styles.content}>
          <TextInput
            value={active.name ?? ''}
            onChangeText={workoutActions.rename}
            placeholder="Name this workout"
            placeholderTextColor={theme.textSecondary}
            returnKeyType="done"
            accessibilityLabel="Workout name"
            style={[styles.nameInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
          <View style={styles.stats}>
            <Stat label="Duration" value={formatDuration(now - active.startedAt)} />
            <Stat label="Volume" value={`${Math.round(workoutVolume(active)).toLocaleString()} kg`} />
            <Stat label="Sets" value={String(completedSets)} />
          </View>

          {active.exercises.length === 0 && (
            <View style={styles.empty}>
              <ThemedText style={styles.emptyTitle}>Get started</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                Add an exercise, then log each set’s weight and reps and tick it off.
              </ThemedText>
            </View>
          )}

          {active.exercises.map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} />
          ))}

          <Pressable
            onPress={() => router.push('/add-exercise')}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText style={[styles.primaryText, { color: theme.onAccent }]}>
              + Add exercise
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() =>
              confirm('Discard workout', 'All sets in this workout will be lost.', 'Discard', workoutActions.discard)
            }
            style={({ pressed }) => [styles.discardButton, { opacity: pressed ? 0.6 : 1 }]}>
            <ThemedText style={styles.discardText}>Discard workout</ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
    </View>
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
  nameInput: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    fontSize: 18,
    fontWeight: 700,
  },
  finishButton: {
    paddingHorizontal: Spacing.two,
  },
  finishText: {
    fontWeight: 700,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 700,
  },
  emptyText: {
    textAlign: 'center',
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  primaryText: {
    fontSize: 16,
    fontWeight: 700,
  },
  discardButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  discardText: {
    color: '#E5484D',
    fontWeight: 600,
  },
});
