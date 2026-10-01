import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { preloadSounds } from '@/lib/feedback';
import { syncReminders } from '@/lib/reminders';
import { useWorkoutStore } from '@/lib/workouts';

SplashScreen.preventAutoHideAsync();
preloadSounds();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { onboarded, history, challenge, appearance } = useWorkoutStore();
  const dark = colorScheme === 'dark';
  const colors = Colors[dark ? 'dark' : 'light'];
  // Headers match the grouped background so large titles sit on the same grey as the content.
  const navTheme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(dark ? DarkTheme : DefaultTheme).colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.separator,
    },
  };

  // Native chrome (tab bar, alerts, keyboard, status bar) follows the Settings choice too.
  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
  }, [appearance]);

  // Every logged workout (or challenge change) pushes the reminder schedule forward.
  useEffect(() => {
    syncReminders(history, challenge).catch(() => {});
  }, [history, challenge]);

  return (
    // Needed for swipe gestures (swipe a set to delete it).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navTheme}>
        <AnimatedSplashOverlay />
        <StatusBar style={dark ? "light" : "dark"} />
        <Stack>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
          </Stack.Protected>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="workout" options={{ title: 'Workout', headerBackTitle: 'Back' }} />
            <Stack.Screen
              name="add-exercise"
              options={{
                title: 'Add Exercise',
                presentation: 'modal',
                headerStyle: { backgroundColor: colors.backgroundPlain },
              }}
            />
            <Stack.Screen name="routine" options={{ presentation: 'modal' }} />
            <Stack.Screen
              name="complete"
              options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
            />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
