import {
  ArchivoNarrow_400Regular,
  ArchivoNarrow_500Medium,
  ArchivoNarrow_600SemiBold,
  ArchivoNarrow_700Bold,
} from '@expo-google-fonts/archivo-narrow';
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/archivo';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHeaderOptions } from '@/hooks/use-header-options';
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
  const headerOptions = useHeaderOptions();
  const [fontsLoaded, fontError] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    ArchivoNarrow_400Regular,
    ArchivoNarrow_500Medium,
    ArchivoNarrow_600SemiBold,
    ArchivoNarrow_700Bold,
  });
  // Headers sit on the same paper as the content.
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

  // The splash screen stays up until the fonts are ready (the overlay hides it once it mounts).
  if (!fontsLoaded && !fontError) return null;

  return (
    // Needed for swipe gestures (swipe a set to delete it).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navTheme}>
        <AnimatedSplashOverlay />
        <StatusBar style={dark ? "light" : "dark"} />
        {/* The tab group never gets a root header (it would read "(tabs)"): tab screens draw their own
            ScreenHeader and CompactTitle. Set here as well as on the screen so it can't be missed. */}
        <Stack
          screenOptions={({ route }) =>
            route.name === '(tabs)' ? { ...headerOptions, headerShown: false, title: '' } : headerOptions
          }>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
          </Stack.Protected>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '' }} />
            <Stack.Screen name="workout" options={{ title: 'Workout', headerBackTitle: 'Back' }} />
            <Stack.Screen
              name="add-exercise"
              options={{
                title: 'Add Exercise',
                presentation: 'modal',
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
