/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useMemo } from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { accentTokens } from '@/lib/accent';
import { useWorkoutStore } from '@/lib/workouts';

/** The colour tokens for the current scheme, with the tint swapped for the one picked in Settings. */
export function useTheme() {
  const scheme = useColorScheme();
  const { accent } = useWorkoutStore();
  const theme = scheme === 'unspecified' ? 'light' : scheme;

  return useMemo(
    () => (accent ? { ...Colors[theme], ...accentTokens(accent, theme) } : Colors[theme]),
    [theme, accent]
  );
}
