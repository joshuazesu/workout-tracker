import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Section } from '@/components/list';
import { ThemedText } from '@/components/themed-text';
import { Gutter, MaxContentWidth, Spacing } from '@/constants/theme';
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
  workoutActions,
} from '@/lib/workouts';

/**
 * One box per workout day the challenge needs: ink with a tick once earned, outlined in blue for
 * today's slot while it's still open, empty for the rest.
 */
export function DayBoxes({ done, total, doneToday }: { done: number; total: number; doneToday: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={styles.days}
      accessible
      accessibilityLabel={`${done} of ${total} workout days done${doneToday ? ', including today' : ''}`}>
      {Array.from({ length: total }, (_, i) => {
        const earned = i < done;
        const today = !doneToday && i === done;
        return (
          <View key={i} style={styles.day}>
            <View
              style={[
                styles.box,
                earned
                  ? { backgroundColor: theme.text }
                  : today
                    ? { borderWidth: 2, borderColor: theme.accent }
                    : { borderWidth: 1, borderColor: theme.outline },
              ]}>
              {earned && <Icon name={{ ios: 'checkmark', md: 'check' }} size={16} color={theme.onText} weight="bold" />}
            </View>
            <ThemedText
              type="footnote"
              themeColor={today ? 'accent' : 'textSecondary'}
              style={today ? styles.todayLabel : undefined}
              numeric>
              {today ? 'Today' : i + 1}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

/** Current challenge progress, or an offer to start the next one. */
export function ChallengeCard() {
  const theme = useTheme();
  const { history, challenge, trophies } = useWorkoutStore();
  const now = useNow();

  if (!challenge) {
    const lastTrophy = trophies.at(-1);
    const offer = lastTrophy ? CHALLENGES[lastTrophy.id].next : 'kickstart';
    return (
      <Section title={CHALLENGES[offer].title} padded>
        <ThemedText type="subheadline" themeColor="textSecondary">
          {CHALLENGES[offer].blurb}
        </ThemedText>
        <Button label="Start challenge" variant="tinted" onPress={() => workoutActions.startChallenge(offer)} />
      </Section>
    );
  }

  const p = challengeProgress(challenge, history, now);
  const next = CHALLENGES[challenge.id].next;

  if (p.complete) {
    return (
      <Section title={`${p.title} complete`} padded>
        <View style={styles.row}>
          <Icon name={{ ios: 'trophy.fill', md: 'trophy' }} size={22} color={theme.accent} />
          <ThemedText type="subheadline" themeColor="textSecondary" style={styles.flex}>
            {trophies.length} {trophies.length === 1 ? 'trophy' : 'trophies'} earned. Ready for the next one?
          </ThemedText>
        </View>
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
      <Section title={`${p.title} ended`} padded>
        <ThemedText type="subheadline" themeColor="textSecondary">
          You got {p.done} of {p.days} days. That still counts. Run it back?
        </ThemedText>
        <Button label="Try again" variant="tinted" onPress={() => workoutActions.startChallenge(challenge.id)} />
      </Section>
    );
  }

  return (
    <Section title={p.title} trailing={`${p.daysLeft} ${p.daysLeft === 1 ? 'day' : 'days'} left`} padded>
      <DayBoxes done={p.done} total={p.days} doneToday={p.doneToday} />
    </Section>
  );
}

const WEEKS = 12;

/**
 * The habit grid: the last 12 weeks, one column per week and one square per day, shaded in blue by
 * how many workouts that day had. Today is outlined.
 */
export function ConsistencyCard() {
  const theme = useTheme();
  const { history } = useWorkoutStore();
  const { width } = useWindowDimensions();
  const now = useNow();

  const perDay = new Map<string, number>();
  for (const w of history) perDay.set(dayKey(w.startedAt), (perDay.get(dayKey(w.startedAt)) ?? 0) + 1);

  const gap = 4;
  const inner = Math.min(width, MaxContentWidth) - Gutter * 2;
  const cell = Math.min(26, Math.floor((inner - gap * (WEEKS - 1)) / WEEKS));
  const firstWeek = new Date(startOfWeek(now));
  firstWeek.setDate(firstWeek.getDate() - (WEEKS - 1) * 7);
  const today = startOfDay(now);
  const thisWeek = history.filter((w) => w.startedAt >= startOfWeek(now)).length;
  const shade = (count: number) => (count === 0 ? theme.fill : count === 1 ? theme.accentMid : theme.accent);

  return (
    <Section title={`Last ${WEEKS} weeks`} trailing={`${thisWeek} this week`} padded>
      <View style={[styles.grid, { gap }]}>
        {Array.from({ length: WEEKS }, (_, week) => (
          <View key={week} style={{ gap }}>
            {Array.from({ length: 7 }, (_, day) => {
              // Step by calendar days, not 24h, so DST changes don't skip or repeat a day.
              const date = new Date(firstWeek);
              date.setDate(date.getDate() + week * 7 + day);
              const ts = date.getTime();
              const future = ts > today;
              return (
                <View
                  key={day}
                  style={{
                    width: cell,
                    height: cell,
                    borderRadius: 4,
                    backgroundColor: future ? 'transparent' : shade(perDay.get(dayKey(ts)) ?? 0),
                    borderWidth: ts === today ? 2 : 0,
                    borderColor: theme.text,
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <ThemedText type="footnote" themeColor="textSecondary">
          {WEEKS} weeks ago
        </ThemedText>
        <View style={styles.key} accessible accessibilityLabel="Lighter squares mean fewer workouts that day">
          <ThemedText type="footnote" themeColor="textSecondary">
            Less
          </ThemedText>
          {[0, 1, 2].map((n) => (
            <View key={n} style={[styles.swatch, { backgroundColor: shade(n) }]} />
          ))}
          <ThemedText type="footnote" themeColor="textSecondary">
            More
          </ThemedText>
        </View>
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
      <View style={styles.row}>
        <Icon name={{ ios: 'bell.badge', md: 'notifications_active' }} size={22} color={theme.accent} />
        <ThemedText type="subheadline" themeColor="textSecondary" style={styles.flex}>
          Get a nudge when it’s been a while since your last workout.
        </ThemedText>
      </View>
      <Button label="Turn on reminders" variant="tinted" onPress={turnOn} />
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.two,
  },
  day: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    gap: 6,
  },
  box: {
    width: 36,
    height: 36,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayLabel: {
    fontWeight: 600,
  },
  grid: {
    flexDirection: 'row',
    alignSelf: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  key: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
});
