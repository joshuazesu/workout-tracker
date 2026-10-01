import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Section } from '@/components/list';
import { ThemedText } from '@/components/themed-text';
import { WorkoutSummary } from '@/components/workout-summary';
import { Gutter, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { feedback } from '@/lib/feedback';
import { dayKey, startOfDay, useWorkoutStore } from '@/lib/workouts';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Month grid, Monday first. Null cells pad the first week. */
function monthCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1)),
  ];
}

export default function CalendarScreen() {
  const theme = useTheme();
  const { history } = useWorkoutStore();
  const now = useNow();
  const today = new Date(now);
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(() => startOfDay(now));

  const workedDays = new Set(history.map((w) => dayKey(w.startedAt)));
  const selectedWorkouts = history.filter((w) => dayKey(w.startedAt) === dayKey(selected));
  const cells = monthCells(view.year, view.month);
  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const workoutsThisMonth = history.filter((w) => {
    const d = new Date(w.startedAt);
    return d.getFullYear() === view.year && d.getMonth() === view.month;
  });
  const daysThisMonth = new Set(workoutsThisMonth.map((w) => dayKey(w.startedAt))).size;

  const shiftMonth = (delta: number) => {
    feedback.tap();
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <View style={styles.monthRow}>
          <Pressable
            onPress={() => shiftMonth(-1)}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            style={styles.arrow}>
            <Icon name={{ ios: 'chevron.left', md: 'chevron_left' }} size={18} color={theme.accent} weight="semibold" />
          </Pressable>
          <View style={styles.monthTitle}>
            <ThemedText type="headline">{monthLabel}</ThemedText>
            <ThemedText type="footnote" themeColor="textSecondary" numeric>
              {daysThisMonth} {daysThisMonth === 1 ? 'day' : 'days'} trained
            </ThemedText>
          </View>
          <Pressable
            onPress={() => shiftMonth(1)}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            style={styles.arrow}>
            <Icon name={{ ios: 'chevron.right', md: 'chevron_right' }} size={18} color={theme.accent} weight="semibold" />
          </Pressable>
        </View>

        <View style={styles.grid}>
          {WEEKDAYS.map((d, i) => (
            <ThemedText key={i} type="caption" themeColor="textSecondary" style={styles.weekday}>
              {d}
            </ThemedText>
          ))}
          {cells.map((date, i) => {
            if (!date) return <View key={`pad-${i}`} style={styles.cell} />;
            const ts = date.getTime();
            const worked = workedDays.has(dayKey(ts));
            const isSelected = ts === selected;
            const isToday = dayKey(ts) === dayKey(now);
            return (
              <Pressable
                key={ts}
                onPress={() => {
                  feedback.tap();
                  setSelected(ts);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${date.toDateString()}${worked ? ', worked out' : ''}`}
                style={styles.cell}>
                <View
                  style={[
                    styles.day,
                    worked && { backgroundColor: theme.accentFill },
                    isSelected && { borderColor: worked ? theme.text : theme.outline },
                  ]}>
                  <ThemedText
                    numeric
                    style={[
                      styles.dayText,
                      worked
                        ? { color: theme.onAccent, fontWeight: 600 }
                        : isToday && { color: theme.accent, fontWeight: 700 },
                    ]}>
                    {date.getDate()}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ThemedText type="title3" style={styles.dayTitle} accessibilityRole="header">
        {new Date(selected).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </ThemedText>
      {selectedWorkouts.length === 0 ? (
        <Section padded>
          <View style={styles.rest}>
            <Icon name={{ ios: 'moon.zzz', md: 'bedtime' }} size={20} color={theme.textSecondary} />
            <ThemedText type="subheadline" themeColor="textSecondary">
              Rest day. No workout logged.
            </ThemedText>
          </View>
        </Section>
      ) : (
        <Section>
          {selectedWorkouts.map((w) => (
            <WorkoutSummary key={w.id} workout={w} initiallyOpen />
          ))}
        </Section>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Gutter,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  card: {
    borderRadius: Radius,
    padding: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
    borderCurve: 'continuous',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthTitle: {
    alignItems: 'center',
  },
  arrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontWeight: 600,
    paddingVertical: Spacing.one,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 4,
  },
  day: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayText: {
    textAlign: 'center',
  },
  dayTitle: {
    fontWeight: 700,
    paddingHorizontal: Spacing.one,
    marginTop: Spacing.two,
  },
  rest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
