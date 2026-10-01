import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { WorkoutSummary } from '@/components/workout-summary';
import { MaxContentWidth, Spacing } from '@/constants/theme';
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
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.monthRow}>
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={12} accessibilityLabel="Previous month">
            <ThemedText style={[styles.arrow, { color: theme.accent }]}>‹</ThemedText>
          </Pressable>
          <View style={styles.monthTitle}>
            <ThemedText style={styles.monthText}>{monthLabel}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {daysThisMonth} {daysThisMonth === 1 ? 'day' : 'days'} trained
            </ThemedText>
          </View>
          <Pressable onPress={() => shiftMonth(1)} hitSlop={12} accessibilityLabel="Next month">
            <ThemedText style={[styles.arrow, { color: theme.accent }]}>›</ThemedText>
          </Pressable>
        </View>

        <View style={styles.grid}>
          {WEEKDAYS.map((d, i) => (
            <ThemedText key={i} type="smallBold" themeColor="textSecondary" style={styles.weekday}>
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
                accessibilityLabel={`${date.toDateString()}${worked ? ', worked out' : ''}`}
                style={styles.cell}>
                <View
                  style={[
                    styles.day,
                    worked && { backgroundColor: theme.accent + '40' },
                    isSelected && { borderColor: theme.text, borderWidth: 2 },
                  ]}>
                  <ThemedText style={[styles.dayText, isToday && { color: theme.accent, fontWeight: 800 }]}>
                    {date.getDate()}
                  </ThemedText>
                  {worked && (
                    <View style={[styles.tick, { backgroundColor: theme.accent }]}>
                      <ThemedText style={[styles.tickText, { color: theme.onAccent }]}>✓</ThemedText>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ThemedText type="smallBold" themeColor="textSecondary">
        {new Date(selected)
          .toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
          .toUpperCase()}
      </ThemedText>
      {selectedWorkouts.length === 0 ? (
        <ThemedText themeColor="textSecondary">No workout logged on this day.</ThemedText>
      ) : (
        selectedWorkouts.map((w) => <WorkoutSummary key={w.id} workout={w} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  card: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
    borderCurve: 'continuous',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
  },
  monthTitle: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: 700,
  },
  arrow: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: 600,
    paddingHorizontal: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    paddingVertical: Spacing.one,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 3,
  },
  day: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayText: {
    fontVariant: ['tabular-nums'],
  },
  tick: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickText: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: 900,
  },
});
