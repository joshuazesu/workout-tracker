import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ExerciseList } from '@/components/exercise-list';
import { useTheme } from '@/hooks/use-theme';
import { routineActions, workoutActions } from '@/lib/workouts';

export default function AddExerciseScreen() {
  const theme = useTheme();
  // Shared by the live workout and the routine editor.
  const { target } = useLocalSearchParams<{ target?: 'routine' }>();

  const pick = (name: string) => {
    if (target === 'routine') routineActions.addExercise(name);
    else workoutActions.addExercise(name);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundPlain }}>
      <ExerciseList onSelect={pick} allowCustom autoFocus />
    </View>
  );
}
