import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LayoutAnimationConfig } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { ExerciseCard, rowLayout } from '@/components/exercise-card';
import { ProgressRing } from '@/components/progress-ring';
import { Icon } from '@/components/icon';
import { REST_BAR_HEIGHT, RestTimer } from '@/components/rest-timer';
import { ChoiceDialog } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { EASE_OUT } from '@/constants/motion';
import { Gutter, MaxContentWidth, Spacing, textStyle } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import {
  formatDuration,
  lastSets,
  routineActions,
  templateSetChanges,
  workoutActions,
  workoutVolume,
  useWorkoutStore,
} from '@/lib/workouts';

/** Wait for the add-exercise modal to finish closing, so the new card arrives where you can see it. */
const CARD_DELAY = 250;
const cardEntering = FadeInDown.duration(220)
  .delay(CARD_DELAY)
  .easing(EASE_OUT)
  .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] });
const cardExiting = FadeOut.duration(150).easing(EASE_OUT);

export default function WorkoutScreen() {
  const theme = useTheme();
  const { active, history, routines } = useWorkoutStore();
  // Set when finishing, so the celebration screen replaces this one instead of popping home.
  const finishing = useRef(false);
  const [askTemplate, setAskTemplate] = useState(false);
  const scroll = useRef<ScrollView>(null);

  // Leave once the workout is finished or discarded (or if opened with none active).
  useEffect(() => {
    if (!active && !finishing.current && router.canGoBack()) router.back();
  }, [active]);

  // A newly added exercise lands at the bottom, often off-screen: bring it into view once the
  // add-exercise modal has gone.
  const exerciseCount = active?.exercises.length ?? 0;
  const previousCount = useRef(exerciseCount);
  useEffect(() => {
    const added = exerciseCount > previousCount.current;
    previousCount.current = exerciseCount;
    if (!added) return;
    const timer = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), CARD_DELAY);
    return () => clearTimeout(timer);
  }, [exerciseCount]);

  if (!active) return null;

  const completedSets = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const volume = Math.round(workoutVolume(active));
  const totalSets = active.exercises.reduce((n, e) => n + e.sets.length, 0);
  // The first exercise that still has an unticked set.
  const next = active.exercises.find((e) => e.sets.some((s) => !s.done));
  const templateChanges = templateSetChanges(active, routines);

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
    // Set counts changed against the template: ask whether to keep them before saving.
    if (templateChanges && !askTemplate) {
      setAskTemplate(true);
      return;
    }
    save();
  };

  const save = () => {
    finishing.current = true;
    const id = workoutActions.finish();
    if (id) router.replace({ pathname: '/complete', params: { id } });
  };

  const answerTemplate = (update: boolean) => {
    if (update && templateChanges) {
      routineActions.updateSetCounts(
        templateChanges.routine.id,
        Object.fromEntries(templateChanges.changes.map((c) => [c.name, c.to]))
      );
    }
    setAskTemplate(false);
    // iOS can't present the next screen while this modal is still fading out.
    setTimeout(save, 300);
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
            <Pressable
              onPress={finish}
              hitSlop={6}
              accessibilityRole="button"
              style={({ pressed }) => [styles.finishButton, { backgroundColor: theme.text, opacity: pressed ? 0.8 : 1 }]}>
              <ThemedText type="headline" themeColor="onText">
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
          ref={scroll}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.content, active.restUntil ? { paddingBottom: REST_BAR_HEIGHT + Spacing.five } : null]}>
          {/* Status band: sets done as a ring, the name (editable), and what's lifted and next. */}
          <View style={[styles.titleBlock, { borderBottomColor: theme.text }]}>
            {totalSets > 0 && <ProgressRing value={completedSets} total={totalSets} />}
            <View style={styles.flex}>
              <TextInput
                value={active.name ?? ''}
                onChangeText={workoutActions.rename}
                placeholder="Workout"
                placeholderTextColor={theme.textSecondary}
                returnKeyType="done"
                accessibilityLabel="Workout name"
                style={[styles.nameInput, { color: theme.text }]}
              />
              {totalSets > 0 && (
                <ThemedText type="subheadline" themeColor="textSecondary" numeric numberOfLines={1}>
                  {volume.toLocaleString()} kg lifted{next ? ` · ${next.name} next` : ' · all sets done'}
                </ThemedText>
              )}
            </View>
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

          {/* Cards already there when the screen opens don't animate in; ones added later do. */}
          <LayoutAnimationConfig skipEntering>
            {active.exercises.map((exercise) => (
              // Entrance and reflow on separate views. Reanimated web collapses a view that mounts with an
              // entrance behind a modal, so on web the card just appears.
              <Animated.View key={exercise.id} exiting={cardExiting} layout={rowLayout}>
                <Animated.View entering={Platform.OS === 'web' ? undefined : cardEntering}>
                  <ExerciseCard exercise={exercise} previous={lastSets(exercise.name, history)} />
                </Animated.View>
              </Animated.View>
            ))}
          </LayoutAnimationConfig>

          <Animated.View layout={rowLayout} style={styles.actions}>
            <Button
              label="Add exercise"
              variant={active.exercises.length === 0 ? 'primary' : 'tinted'}
              icon={{ ios: 'plus', md: 'add' }}
              onPress={() => router.push('/add-exercise')}
            />
            {completedSets > 0 && <Button label="Finish workout" onPress={finish} />}
            <Button label="Discard workout" variant="destructive" onPress={discard} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      <RestTimer />
      {templateChanges && (
        <ChoiceDialog
          visible={askTemplate}
          title={`Update “${templateChanges.routine.name}”?`}
          message="You changed the number of sets. Save the new counts to the template for next time?"
          confirmLabel="Update template"
          cancelLabel="Keep template as is"
          onConfirm={() => answerTemplate(true)}
          onCancel={() => answerTemplate(false)}>
          <View style={[styles.changes, { backgroundColor: theme.fill }]}>
            {templateChanges.changes.map((c) => (
              <View key={c.name} style={styles.change}>
                <ThemedText type="subheadline" style={styles.flex} numberOfLines={1}>
                  {c.name}
                </ThemedText>
                <ThemedText type="subheadline" themeColor="textSecondary" numeric>
                  {c.from} → <ThemedText type="subheadline" numeric style={styles.changeTo}>{c.to} sets</ThemedText>
                </ThemedText>
              </View>
            ))}
          </View>
        </ChoiceDialog>
      )}
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
    paddingHorizontal: Gutter,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.three - 2,
    borderBottomWidth: 2,
  },
  nameInput: {
    ...textStyle('display'),
    fontSize: 44,
    lineHeight: 48,
    paddingVertical: 0,
    // Web inputs have an intrinsic width and won't shrink to fit without this.
    minWidth: 0,
  },
  finishButton: {
    paddingHorizontal: Spacing.three + 2,
    height: 38,
    borderRadius: 19,
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
  changes: {
    borderRadius: 10,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three - 4,
    gap: Spacing.two,
  },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  changeTo: {
    fontWeight: 600,
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
