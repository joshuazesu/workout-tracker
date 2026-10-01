import { router } from 'expo-router';
import { View } from 'react-native';

import { ExerciseList } from '@/components/exercise-list';
import { useTheme } from '@/hooks/use-theme';

export default function ExercisesScreen() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundPlain }}>
      <ExerciseList
        headerSearch
        onSelect={(name) => router.push({ pathname: '/exercises/[name]', params: { name } })}
      />
    </View>
  );
}
