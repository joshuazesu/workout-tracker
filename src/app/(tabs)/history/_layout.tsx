import { Stack } from 'expo-router';

import { useHeaderOptions } from '@/hooks/use-header-options';

export default function HistoryLayout() {
  return (
    <Stack screenOptions={useHeaderOptions()}>
      <Stack.Screen name="index" options={{ title: 'History', headerShown: false }} />
      <Stack.Screen name="calendar" options={{ title: 'Calendar', presentation: 'modal' }} />
    </Stack>
  );
}
