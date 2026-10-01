import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { preloadSounds } from '@/lib/feedback';
import { syncReminders } from '@/lib/reminders';
import { useWorkoutStore } from '@/lib/workouts';

SplashScreen.preventAutoHideAsync();
preloadSounds();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { onboarded, history, challenge } = useWorkoutStore();

  // Every logged workout (or challenge change) pushes the reminder schedule forward.
  useEffect(() => {
    syncReminders(history, challenge).catch(() => {});
  }, [history, challenge]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <StatusBar style="auto" />
      <Stack>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="workout" options={{ title: 'Workout', headerBackTitle: 'Back' }} />
          <Stack.Screen
            name="add-exercise"
            options={{ title: 'Add Exercise', presentation: 'modal' }}
          />
          <Stack.Screen name="routine" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="complete"
            options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
          />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
