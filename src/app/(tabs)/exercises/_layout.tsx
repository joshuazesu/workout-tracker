import { Stack } from 'expo-router';

import { useHeaderOptions } from '@/hooks/use-header-options';

export default function ExercisesLayout() {
  return (
    <Stack screenOptions={useHeaderOptions()}>
      <Stack.Screen name="index" options={{ title: 'Exercises', headerShown: false }} />
      <Stack.Screen name="[name]" options={{ title: '' }} />
    </Stack>
  );
}
