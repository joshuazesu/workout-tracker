import type { ExtendedStackNavigationOptions as NativeStackNavigationOptions } from 'expo-router/build/layouts/StackClient';

import { font } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Native header styling shared by every stack: paper background, no shadow, Archivo titles. */
export function useHeaderOptions(): NativeStackNavigationOptions {
  const theme = useTheme();
  return {
    headerStyle: { backgroundColor: theme.background },
    headerShadowVisible: false,
    headerTintColor: theme.text,
    headerTitleStyle: { ...font(700), fontSize: 17, color: theme.text } as NativeStackNavigationOptions['headerTitleStyle'],
    headerBackButtonDisplayMode: 'minimal',
    contentStyle: { backgroundColor: theme.background },
  };
}
