import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { WorkoutSummary } from '@/components/workout-summary';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutStore } from '@/lib/workouts';

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
              accessibilityLabel="Open calendar"
              style={styles.headerButton}>
              <SymbolView
                name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
                tintColor={theme.accent}
                size={24}
                fallback={<ThemedText style={{ fontSize: 20 }}>📅</ThemedText>}
              />
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={history}
        keyExtractor={(w) => w.id}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText style={styles.emptyEmoji}>🗓️</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              No workouts yet. Finish one and it’ll show up here with every set and rep.
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => <WorkoutSummary workout={item} />}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headerButton: {
    paddingHorizontal: Spacing.one,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  emptyEmoji: {
    fontSize: 44,
    lineHeight: 52,
  },
  emptyText: {
    textAlign: 'center',
  },
});
