import { Stack } from 'expo-router';

export default function HistoryLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'History', headerLargeTitleEnabled: true }} />
      <Stack.Screen name="calendar" options={{ title: 'Calendar', presentation: 'modal' }} />
    </Stack>
  );
}
