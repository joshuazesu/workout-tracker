import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
import { ChallengeDots } from '@/components/challenge-dots';
import { Icon } from '@/components/icon';
import { Section } from '@/components/list';
import { Stat } from '@/components/stat';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { useRemindersEnabled } from '@/lib/reminders';
import {
  CHALLENGES,
  challengeProgress,
  dayKey,
  startOfDay,
  startOfWeek,
  useWorkoutStore,
  weekStreak,
  workoutActions,
} from '@/lib/workouts';

/** Current challenge progress, or an offer to start the next one. */
export function ChallengeCard() {
  const theme = useTheme();
  const { history, challenge, trophies } = useWorkoutStore();
  const now = useNow();

  if (!challenge) {
    const lastTrophy = trophies.at(-1);
    const offer = lastTrophy ? CHALLENGES[lastTrophy.id].next : 'kickstart';
    return (
      <Section title="Challenge" padded>
        <View style={styles.text}>
          <ThemedText type="headline">{CHALLENGES[offer].title}</ThemedText>
          <ThemedText type="subheadline" themeColor="textSecondary">
            {CHALLENGES[offer].blurb}
          </ThemedText>
        </View>
        <Button label="Start Challenge" variant="tinted" onPress={() => workoutActions.startChallenge(offer)} />
      </Section>
    );
  }

  const p = challengeProgress(challenge, history, now);
  const next = CHALLENGES[challenge.id].next;

  if (p.complete) {
    return (
      <Section title="Challenge" padded>
        <View style={styles.titleRow}>
          <Icon name={{ ios: 'trophy.fill', md: 'trophy' }} size={20} color={theme.accent} />
          <ThemedText type="headline">{p.title} complete</ThemedText>
        </View>
        <ThemedText type="subheadline" themeColor="textSecondary">
          {trophies.length} {trophies.length === 1 ? 'trophy' : 'trophies'} earned. Ready for the next one?
        </ThemedText>
        <Button
          label={`Start ${CHALLENGES[next].title}`}
          variant="tinted"
          onPress={() => workoutActions.startChallenge(next)}
        />
      </Section>
    );
  }

  if (p.expired) {
    return (
      <Section title="Challenge" padded>
        <View style={styles.text}>
          <ThemedText type="headline">{p.title} ended</ThemedText>
          <ThemedText type="subheadline" themeColor="textSecondary">
            You got {p.done} of {p.days} days. That still counts. Run it back?
          </ThemedText>
        </View>
        <Button label="Try Again" variant="tinted" onPress={() => workoutActions.startChallenge(challenge.id)} />
      </Section>
    );
  }

  return (
    <Section title="Challenge" trailing={`${p.daysLeft} ${p.daysLeft === 1 ? 'day' : 'days'} left`} padded>
      <ThemedText type="headline">{p.title}</ThemedText>
      <ChallengeDots done={p.done} total={p.days} size={18} />
      <View style={styles.titleRow}>
        {p.doneToday && (
          <Icon name={{ ios: 'checkmark.circle.fill', md: 'check_circle' }} size={16} color={theme.accent} />
        )}
        <ThemedText type="subheadline" themeColor="textSecondary" numeric>
          {p.done} of {p.days} days. {p.doneToday ? 'Today’s done.' : 'Work out today to stay on track.'}
        </ThemedText>
      </View>
    </Section>
  );
}

const WEEKS = 12;

/** GitHub-style grid of the last 12 weeks: one column per week, one cell per day. */
export function ConsistencyCard() {
  const theme = useTheme();
  const { history } = useWorkoutStore();
  const { width } = useWindowDimensions();
  const now = useNow();

  const perDay = new Map<string, number>();
  for (const w of history) perDay.set(dayKey(w.startedAt), (perDay.get(dayKey(w.startedAt)) ?? 0) + 1);

  const gap = 4;
  const inner = Math.min(width, MaxContentWidth) - Spacing.three * 4;
  const cell = Math.min(22, Math.floor((inner - gap * (WEEKS - 1)) / WEEKS));
  const firstWeek = new Date(startOfWeek(now));
  firstWeek.setDate(firstWeek.getDate() - (WEEKS - 1) * 7);
  const today = startOfDay(now);

  const thisWeek = history.filter((w) => w.startedAt >= startOfWeek(now)).length;
  const streak = weekStreak(history, now);

  return (
    <Section title="Consistency" padded>
      <View style={styles.statsRow}>
        <Stat label="This week" value={String(thisWeek)} />
        <Stat label="Week streak" value={String(streak)} />
        <Stat label="All time" value={String(history.length)} />
      </View>
      <View style={[styles.grid, { gap }]}>
        {Array.from({ length: WEEKS }, (_, week) => (
          <View key={week} style={{ gap }}>
            {Array.from({ length: 7 }, (_, day) => {
              // Step by calendar days, not 24h, so DST changes don't skip or repeat a day.
              const date = new Date(firstWeek);
              date.setDate(date.getDate() + week * 7 + day);
              const ts = date.getTime();
              const count = perDay.get(dayKey(ts)) ?? 0;
              const future = ts > today;
              return (
                <View
                  key={day}
                  style={{
                    width: cell,
                    height: cell,
                    borderRadius: cell / 4,
                    backgroundColor: future ? 'transparent' : count === 0 ? theme.fill : theme.accent,
                    opacity: count === 1 ? 0.65 : 1,
                    borderWidth: ts === today ? 1.5 : 0,
                    borderColor: theme.textSecondary,
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.gridLegend}>
        <ThemedText type="caption" themeColor="textSecondary">
          {WEEKS} weeks ago
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          This week
        </ThemedText>
      </View>
      {history.length === 0 && (
        <ThemedText type="subheadline" themeColor="textSecondary">
          Each square is a day. Finish a workout and today’s square fills in.
        </ThemedText>
      )}
    </Section>
  );
}

/** Shown only while notifications are off, since reminders are the main way people come back. */
export function RemindersPrompt() {
  const theme = useTheme();
  const [enabled, turnOn] = useRemindersEnabled();
  if (Platform.OS === 'web' || enabled !== false) return null;
  return (
    <Section title="Reminders" padded>
      <View style={styles.titleRow}>
        <Icon name={{ ios: 'bell.badge', md: 'notifications_active' }} size={20} color={theme.accent} />
        <ThemedText type="subheadline" themeColor="textSecondary" style={styles.flex}>
          Get a nudge when it’s been a while since your last workout.
        </ThemedText>
      </View>
      <Button label="Turn On Reminders" variant="tinted" onPress={turnOn} />
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  text: {
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statsRow: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    alignSelf: 'center',
  },
  gridLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -Spacing.two,
  },
});
