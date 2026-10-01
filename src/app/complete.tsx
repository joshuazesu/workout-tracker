import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ChallengeDots } from '@/components/challenge-dots';
import { Confetti } from '@/components/confetti';
import { Icon } from '@/components/icon';
import { Row, RowIconInset, Section, Separator } from '@/components/list';
import { Stat } from '@/components/stat';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { feedback } from '@/lib/feedback';
import { formatMinutes } from '@/lib/format';
import {
  CHALLENGES,
  challengeProgress,
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
  const volume = Math.round(workoutVolume(workout));
  const records = personalRecords(workout, history);
  const thisWeek = history.filter((w) => w.startedAt >= startOfWeek(now)).length;
  // The last time this template was done, so the summary can say what changed.
  const previous = workout.name
    ? history.find((w) => w.id !== workout.id && w.name === workout.name && w.startedAt < workout.startedAt)
    : undefined;
  const volumeDelta = previous ? volume - Math.round(workoutVolume(previous)) : 0;

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <Badge trophy={wonChallenge} />

          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.center}>
            <ThemedText type="largeTitle" style={styles.centerText}>
              {wonChallenge ? 'Challenge Complete' : 'Workout Complete'}
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary" style={styles.centerText}>
              {wonChallenge && progress
                ? `You finished the ${progress.title}. Trophy ${trophies.length} is yours.`
                : thisWeek > 1
                  ? `That’s ${thisWeek} workouts this week. Keep stacking them.`
                  : `${workout.name ?? 'Workout'} logged. Nice work.`}
            </ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(300)}>
            <Section padded>
              <View style={styles.stats}>
                <Stat
                  label="Duration"
                  value={formatMinutes((workout.endedAt ?? workout.startedAt) - workout.startedAt)}
                />
                <Stat label="Volume" value={`${volume.toLocaleString()} kg`} />
                <Stat label="Sets" value={String(sets)} />
              </View>
              {/* Only say what improved; a shorter session isn't a failure. */}
              {previous && volumeDelta > 0 && (
                <>
                  <Separator inset={0} />
                  <View style={styles.compare}>
                    <Icon name={{ ios: 'arrow.up.right', md: 'trending_up' }} size={16} color={theme.accent} weight="semibold" />
                    <ThemedText type="subheadline" themeColor="textSecondary" numeric style={styles.flex}>
                      {volumeDelta.toLocaleString()} kg more volume than your last {workout.name}
                    </ThemedText>
                  </View>
                </>
              )}
            </Section>
          </Animated.View>

          {records.length > 0 && (
            <Animated.View entering={FadeInDown.delay(400).duration(300)}>
              <Section title="Personal Records" inset={RowIconInset}>
                {records.map((r) => (
                  <Row
                    key={r.name}
                    label={r.name}
                    detail={`Previous best ${r.previous} kg`}
                    icon={{ ios: 'medal.fill', md: 'military_tech' }}
                    trailing={
                      <View style={styles.recordValue}>
                        <ThemedText type="headline" numeric>
                          {r.weight} kg
                        </ThemedText>
                        <ThemedText type="footnote" numeric style={{ color: theme.accent, fontWeight: 600 }}>
                          +{Math.round((r.weight - r.previous) * 10) / 10} kg
                        </ThemedText>
                      </View>
                    }
                  />
                ))}
              </Section>
            </Animated.View>
          )}

          {countsTowardChallenge && progress && (
            <Animated.View entering={FadeInDown.delay(500).duration(300)}>
              <Section title={progress.title} padded>
                <ChallengeDots done={progress.done} total={progress.days} animateLatest size={20} />
                <ThemedText type="subheadline" themeColor="textSecondary" numeric>
                  {progress.complete
                    ? `${progress.days} of ${progress.days} days. Done!`
                    : `${progress.done} of ${progress.days} days. ${progress.days - progress.done} to go, ${progress.daysLeft} ${progress.daysLeft === 1 ? 'day' : 'days'} left.`}
                </ThemedText>
              </Section>
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
              <Button label="Not Now" variant="plain" onPress={done} />
            </>
          ) : (
            <Button label="Done" onPress={done} />
          )}
        </View>
      </SafeAreaView>
      {wonChallenge && <Confetti count={120} />}
    </View>
  );
}

/** A checkmark (or trophy) that springs in once: the one big moment on this screen. */
function Badge({ trophy }: { trophy: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.6);

  useEffect(() => {
    if (!reduceMotion) scale.set(withSpring(1, { damping: 11, stiffness: 180 }));
  }, [reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }], opacity: Math.min(1, scale.get()) }));

  return (
    <Animated.View style={[styles.badge, style]}>
      <Icon
        name={trophy ? { ios: 'trophy.circle.fill', md: 'trophy' } : { ios: 'checkmark.circle.fill', md: 'check_circle' }}
        size={96}
        color={theme.accent}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.three,
    paddingTop: Spacing.five,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  center: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
  badge: {
    alignSelf: 'center',
  },
  stats: {
    flexDirection: 'row',
  },
  compare: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  recordValue: {
    alignItems: 'flex-end',
  },
  footer: {
    padding: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.one,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
