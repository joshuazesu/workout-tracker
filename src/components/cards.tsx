import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
import { ChallengeDots } from '@/components/challenge-dots';
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
  const cardStyle = [cardStyles.card, { backgroundColor: theme.backgroundElement }];

  if (!challenge) {
    const lastTrophy = trophies.at(-1);
    const offer = lastTrophy ? CHALLENGES[lastTrophy.id].next : 'kickstart';
    return (
      <View style={cardStyle}>
        <ThemedText style={cardStyles.title}>🔥 {CHALLENGES[offer].title}</ThemedText>
        <ThemedText themeColor="textSecondary">{CHALLENGES[offer].blurb}</ThemedText>
        <Button label="Start challenge" onPress={() => workoutActions.startChallenge(offer)} />
      </View>
    );
  }

  const p = challengeProgress(challenge, history, now);
  const next = CHALLENGES[challenge.id].next;

  if (p.complete) {
    return (
      <View style={cardStyle}>
        <ThemedText style={cardStyles.title}>🏆 {p.title} complete</ThemedText>
        <ThemedText themeColor="textSecondary">
          {trophies.length} {trophies.length === 1 ? 'trophy' : 'trophies'} earned. Ready for the next one?
        </ThemedText>
        <Button label={`Start ${CHALLENGES[next].title}`} onPress={() => workoutActions.startChallenge(next)} />
      </View>
    );
  }

  if (p.expired) {
    return (
      <View style={cardStyle}>
        <ThemedText style={cardStyles.title}>{p.title} ended</ThemedText>
        <ThemedText themeColor="textSecondary">
          You got {p.done} of {p.days} days. That still counts. Run it back?
        </ThemedText>
        <Button label="Try again" onPress={() => workoutActions.startChallenge(challenge.id)} />
      </View>
    );
  }

  return (
    <View style={cardStyle}>
      <View style={cardStyles.header}>
        <ThemedText style={cardStyles.title}>🔥 {p.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {p.daysLeft} {p.daysLeft === 1 ? 'day' : 'days'} left
        </ThemedText>
      </View>
      <ChallengeDots done={p.done} total={p.days} size={20} />
      <ThemedText themeColor="textSecondary">
        {p.done} of {p.days} workout days.{' '}
        {p.doneToday ? '✓ Today’s done.' : 'Work out today to stay on track.'}
      </ThemedText>
    </View>
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
  const cell = Math.min(24, Math.floor((inner - gap * (WEEKS - 1)) / WEEKS));
  const firstWeek = new Date(startOfWeek(now));
  firstWeek.setDate(firstWeek.getDate() - (WEEKS - 1) * 7);
  const today = startOfDay(now);

  const thisWeek = history.filter((w) => w.startedAt >= startOfWeek(now)).length;
  const streak = weekStreak(history, now);

  return (
    <View style={[cardStyles.card, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={cardStyles.title}>Consistency</ThemedText>
      <View style={cardStyles.statsRow}>
        <Stat label="This week" value={String(thisWeek)} />
        <Stat label="Week streak" value={streak > 0 ? `${streak} 🔥` : '0'} />
        <Stat label="Last 12 weeks" value={String(history.filter((w) => w.startedAt >= firstWeek.getTime()).length)} />
      </View>
      <View style={[cardStyles.grid, { gap }]}>
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
                    backgroundColor: future
                      ? 'transparent'
                      : count === 0
                        ? theme.backgroundSelected
                        : theme.accent,
                    opacity: count === 1 ? 0.6 : 1,
                    borderWidth: ts === today ? 2 : 0,
                    borderColor: theme.text,
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
      <View style={cardStyles.gridLegend}>
        <ThemedText type="small" themeColor="textSecondary">
          {WEEKS} weeks ago
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          This week
        </ThemedText>
      </View>
    </View>
  );
}

/** Shown only while notifications are off, since reminders are the main way people come back. */
export function RemindersPrompt() {
  const theme = useTheme();
  const [enabled, turnOn] = useRemindersEnabled();
  if (Platform.OS === 'web' || enabled !== false) return null;
  return (
    <View style={[cardStyles.card, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={cardStyles.title}>🔔 Stay on track</ThemedText>
      <ThemedText themeColor="textSecondary">
        Turn on reminders and we’ll nudge you when it’s been a while since your last workout.
      </ThemedText>
      <Button label="Turn on reminders" variant="secondary" onPress={turnOn} />
    </View>
  );
}

export const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.three,
    borderCurve: 'continuous',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
