import { Stack } from 'expo-router';

export default function StartLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Start Workout', headerLargeTitleEnabled: true }} />
    </Stack>
  );
}
