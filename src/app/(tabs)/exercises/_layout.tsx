import { Stack } from 'expo-router';

export default function ExercisesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Exercises', headerLargeTitleEnabled: true }} />
      <Stack.Screen name="[name]" options={{ title: '', headerBackTitle: 'Exercises' }} />
    </Stack>
  );
}
