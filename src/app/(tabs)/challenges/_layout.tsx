import { Stack } from 'expo-router';

import { useHeaderOptions } from '@/hooks/use-header-options';

export default function ChallengesLayout() {
  return (
    <Stack screenOptions={useHeaderOptions()}>
      <Stack.Screen name="index" options={{ title: 'Challenges', headerShown: false }} />
    </Stack>
  );
}
