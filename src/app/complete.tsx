import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ChallengeDots } from '@/components/challenge-dots';
import { Confetti } from '@/components/confetti';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { feedback } from '@/lib/feedback';
import {
  CHALLENGES,
  challengeProgress,
  formatDuration,
  personalRecords,
  startOfWeek,
  useWorkoutStore,
  workoutActions,
  workoutVolume,
} from '@/lib/workouts';

export default function CompleteScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { history, challenge, trophies } = useWorkoutStore();
  const workout = history.find((w) => w.id === id);
  const now = useNow();

  // Only celebrate the challenge on the workout that actually won it.
  const wonChallenge = Boolean(workout && challenge?.completedByWorkoutId === workout.id);
  const progress = challenge ? challengeProgress(challenge, history, now) : null;
  const countsTowardChallenge = progress && !progress.expired && (!challenge?.completedAt || wonChallenge);

  useEffect(() => {
    if (wonChallenge) feedback.challengeDone();
    else feedback.workoutDone();
    // Play once on arrival, not on every store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!workout) return null;

  const done = () => router.back();
  const sets = workout.exercises.reduce((n, e) => n + e.sets.length, 0);
  const records = personalRecords(workout, history);
  const thisWeek = history.filter((w) => w.startedAt >= startOfWeek(now)).length;

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <Badge emoji={wonChallenge ? '🏆' : '💪'} />

          <Animated.View entering={FadeInDown.delay(250)} style={styles.center}>
            <ThemedText style={styles.title}>
              {wonChallenge ? 'Challenge complete!' : 'Workout complete!'}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {wonChallenge && progress
                ? `You crushed the ${progress.title}. Trophy #${trophies.length} is yours.`
                : thisWeek > 1
                  ? `That’s ${thisWeek} workouts this week. Keep stacking them.`
                  : `${workout.name ?? 'Workout'} logged. Nice work.`}
            </ThemedText>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(400)}
            style={[styles.card, styles.stats, { backgroundColor: theme.backgroundElement }]}>
            <Stat label="Duration" value={formatDuration((workout.endedAt ?? workout.startedAt) - workout.startedAt)} />
            <Stat label="Volume" value={`${Math.round(workoutVolume(workout)).toLocaleString()} kg`} />
            <Stat label="Sets" value={String(sets)} />
          </Animated.View>

          {records.length > 0 && (
            <Animated.View entering={FadeInDown.delay(550)} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                NEW PERSONAL BESTS
              </ThemedText>
              {records.map((r) => (
                <ThemedText key={r.name}>
                  ⭐️ {r.name} · <ThemedText style={{ fontWeight: 800 }}>{r.weight} kg</ThemedText>
                </ThemedText>
              ))}
            </Animated.View>
          )}

          {countsTowardChallenge && progress && (
            <Animated.View entering={FadeInDown.delay(700)} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {progress.title.toUpperCase()}
              </ThemedText>
              <ChallengeDots done={progress.done} total={progress.days} animateLatest size={22} />
              <ThemedText>
                {progress.complete
                  ? `${progress.days} of ${progress.days} days. Done!`
                  : `${progress.done} of ${progress.days} days. ${progress.days - progress.done} to go, ${progress.daysLeft} ${progress.daysLeft === 1 ? 'day' : 'days'} left.`}
              </ThemedText>
            </Animated.View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {wonChallenge && challenge ? (
            <>
              <Button
                label={`Start the ${CHALLENGES[CHALLENGES[challenge.id].next].title}`}
                onPress={() => {
                  workoutActions.startChallenge(CHALLENGES[challenge.id].next);
                  done();
                }}
              />
              <Button label="Not now" variant="plain" onPress={done} />
            </>
          ) : (
            <Button label="Done" onPress={done} />
          )}
        </View>
      </SafeAreaView>
      <Confetti count={wonChallenge ? 120 : 60} />
    </View>
  );
}

function Badge({ emoji }: { emoji: string }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    scale.set(withSpring(1, { damping: 9, stiffness: 160 }));
    rotate.set(
      withDelay(
        300,
        withSequence(withTiming(-12, { duration: 90 }), withTiming(12, { duration: 120 }), withSpring(0, { damping: 8 }))
      )
    );
  }, [reduceMotion, scale, rotate]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }, { rotate: `${rotate.get()}deg` }],
  }));

  return (
    <Animated.View style={[styles.badge, { backgroundColor: theme.accent }, style]}>
      <ThemedText style={styles.badgeEmoji}>{emoji}</ThemedText>
    </Animated.View>
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
    padding: Spacing.four,
    paddingTop: Spacing.six,
    gap: Spacing.three,
    alignItems: 'stretch',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  center: {
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  badge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  badgeEmoji: {
    fontSize: 60,
    lineHeight: 72,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: 800,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    textAlign: 'center',
  },
  card: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
    borderCurve: 'continuous',
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    padding: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
