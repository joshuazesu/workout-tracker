import { router } from 'expo-router';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Separator } from '@/components/list';
import { CompactTitle, ScreenHeader, useCollapsingTitle } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { WorkoutSummary } from '@/components/workout-summary';
import { Gutter, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutStore, type Workout } from '@/lib/workouts';

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList<Workout, { title: string }>);

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
  const collapse = useCollapsingTitle();

  return (
    <>
      <AnimatedSectionList
        sections={byMonth(history)}
        onScroll={collapse.onScroll}
        scrollEventThrottle={16}
        keyExtractor={(w) => w.id}
        stickySectionHeadersEnabled={false}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <ScreenHeader
            collapse={collapse}
            title="History"
            subtitle={history.length > 0 ? `${history.length} ${history.length === 1 ? 'workout' : 'workouts'} logged` : undefined}
            right={
              <Pressable
                onPress={() => router.push('/history/calendar')}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Open calendar"
                style={styles.headerButton}>
                <Icon name={{ ios: 'calendar', md: 'calendar_month' }} size={24} color={theme.text} />
              </Pressable>
            }
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { borderBottomColor: theme.text }]}>
            <ThemedText type="title3" accessibilityRole="header">
              {section.title}
            </ThemedText>
          </View>
        )}
        renderItem={({ item, index }) => (
          <View>
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
            <Button label="Start a workout" variant="tinted" onPress={() => router.navigate('/')} style={styles.emptyButton} />
          </View>
        }
      />
      <CompactTitle title="History" collapse={collapse} />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Gutter,
    paddingBottom: Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sectionHeader: {
    paddingTop: Spacing.four + 2,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  emptyTitle: {
    marginTop: Spacing.one,
  },
  center: {
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: Spacing.two,
  },
});
