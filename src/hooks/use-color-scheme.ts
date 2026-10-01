import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useWorkoutStore } from '@/lib/workouts';

/** The phone's light/dark setting, unless the user picked one in Settings. */
export function useColorScheme() {
  const { appearance } = useWorkoutStore();
  const system = useSystemColorScheme();
  return appearance === 'system' ? system : appearance;
}
