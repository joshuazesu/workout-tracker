import { router, Stack } from 'expo-router';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Separator } from '@/components/list';
import { ThemedText } from '@/components/themed-text';
import { WorkoutSummary } from '@/components/workout-summary';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutStore, type Workout } from '@/lib/workouts';

/** History is newest first, so consecutive runs of the same month make the sections. */
function byMonth(history: Workout[]) {
  const sections: { title: string; data: Workout[] }[] = [];
  for (const w of history) {
    const title = new Date(w.startedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    if (sections.at(-1)?.title !== title) sections.push({ title, data: [] });
    sections.at(-1)!.data.push(w);
  }
  return sections;
}

export default function HistoryScreen() {
  const theme = useTheme();
  const { history } = useWorkoutStore();

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/history/calendar')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Open calendar"
              style={styles.headerButton}>
              <Icon name={{ ios: 'calendar', md: 'calendar_month' }} size={22} color={theme.accent} />
            </Pressable>
          ),
        }}
      />
      <SectionList
        sections={byMonth(history)}
        keyExtractor={(w) => w.id}
        contentInsetAdjustmentBehavior="automatic"
        stickySectionHeadersEnabled={false}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => (
          <ThemedText type="title3" style={styles.sectionTitle} accessibilityRole="header">
            {section.title}
          </ThemedText>
        )}
        renderItem={({ item, index, section }) => (
          // Each month reads as one inset group: round the first and last rows, hairlines between.
          <View
            style={[
              { backgroundColor: theme.surface },
              index === 0 && styles.first,
              index === section.data.length - 1 && styles.last,
            ]}>
            {index > 0 && <Separator />}
            <WorkoutSummary workout={item} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name={{ ios: 'clock.arrow.circlepath', md: 'history' }} size={44} color={theme.textSecondary} />
            <ThemedText type="title3" style={styles.emptyTitle}>
              No workouts yet
            </ThemedText>
            <ThemedText type="subheadline" themeColor="textSecondary" style={styles.center}>
              Finished workouts show up here with every set and rep.
            </ThemedText>
            <Button label="Start a Workout" variant="tinted" onPress={() => router.navigate('/')} style={styles.emptyButton} />
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headerButton: {
    paddingHorizontal: Spacing.one,
  },
  sectionTitle: {
    fontWeight: 700,
    paddingHorizontal: Spacing.one,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  first: {
    borderTopLeftRadius: Radius,
    borderTopRightRadius: Radius,
    overflow: 'hidden',
  },
  last: {
    borderBottomLeftRadius: Radius,
    borderBottomRightRadius: Radius,
    overflow: 'hidden',
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  emptyTitle: {
    fontWeight: 700,
    marginTop: Spacing.one,
  },
  center: {
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: Spacing.two,
  },
});
