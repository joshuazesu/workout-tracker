import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ExerciseList } from '@/components/exercise-list';
import { ScreenHeader } from '@/components/screen-header';
import { TabSwipe } from '@/components/tab-swipe';
import { EXERCISE_CATALOG } from '@/constants/exercises';
import { Gutter } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ExercisesScreen() {
  const theme = useTheme();
  return (
    <TabSwipe tab="exercises">
      <View style={[styles.flex, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <ScreenHeader title="Exercises" subtitle={`${EXERCISE_CATALOG.length} with step-by-step guides`} />
        </View>
        <ExerciseList onSelect={(name) => router.push({ pathname: '/exercises/[name]', params: { name } })} />
      </View>
    </TabSwipe>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Gutter,
  },
});
