import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { useWorkoutStore } from '@/lib/workouts';

const subscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * A light/dark choice made in Settings overrides the browser's.
 */
export function useColorScheme() {
  // false during static rendering and hydration, true once running on the client
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const colorScheme = useRNColorScheme();
  const { appearance } = useWorkoutStore();

  if (!hasHydrated) return 'light';
  return appearance === 'system' ? colorScheme : appearance;
}
