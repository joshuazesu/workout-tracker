import { Stack } from 'expo-router';

import { useHeaderOptions } from '@/hooks/use-header-options';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={useHeaderOptions()}>
      <Stack.Screen name="index" options={{ title: 'Profile', headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal' }} />
    </Stack>
  );
}
