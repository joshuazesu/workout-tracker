import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function ExercisesLayout() {
  const theme = useTheme();
  // A–Z lists and the guide are plain (white) screens, not grouped ones.
  const plain = { headerStyle: { backgroundColor: theme.backgroundPlain }, contentStyle: { backgroundColor: theme.backgroundPlain } };
  return (
    <Stack screenOptions={plain}>
      <Stack.Screen name="index" options={{ title: 'Exercises', headerLargeTitleEnabled: true }} />
      <Stack.Screen name="[name]" options={{ title: '', headerBackTitle: 'Exercises' }} />
    </Stack>
  );
}
