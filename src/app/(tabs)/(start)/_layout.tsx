import { Stack } from 'expo-router';

import { useHeaderOptions } from '@/hooks/use-header-options';

export default function StartLayout() {
  // Tab roots draw their own ledger header (date line, condensed title, heavy rule).
  return (
    <Stack screenOptions={useHeaderOptions()}>
      <Stack.Screen name="index" options={{ title: 'Workout', headerShown: false }} />
    </Stack>
  );
}
