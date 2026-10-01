import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { findExercise } from '@/constants/exercises';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutStore } from '@/lib/workouts';

export default function ExerciseDetailScreen() {
  const theme = useTheme();
  const { name } = useLocalSearchParams<{ name: string }>();
  const info = findExercise(name);
  const { history } = useWorkoutStore();
  const reduceMotion = useReducedMotion();
  // Alternating start and end positions every second reads as the movement itself.
  const tick = useNow(1000);
  const frame = reduceMotion ? 0 : Math.floor(tick / 1000) % 2;

  const logged = history.flatMap((w) =>
    w.exercises.filter((e) => e.name === name).map((e) => ({ at: w.startedAt, sets: e.sets }))
  );
  const best = Math.max(0, ...logged.flatMap((l) => l.sets.map((s) => Number(s.weight) || 0)));

  return (
    <>
      <Stack.Screen options={{ title: name }} />
      <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
        {info ? (
          <View style={[styles.media, { backgroundColor: theme.backgroundElement }]}>
            <Image
              source={info.images[frame]}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={350}
              accessibilityLabel={`${name} demonstration`}
            />
            <View style={styles.frameDots}>
              {[0, 1].map((i) => (
                <View key={i} style={[styles.frameDot, { opacity: i === frame ? 1 : 0.4 }]} />
              ))}
            </View>
          </View>
        ) : (
          <View style={[styles.media, styles.noMedia, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.noMediaEmoji}>🏋️</ThemedText>
            <ThemedText themeColor="textSecondary">Custom exercise, no guide available.</ThemedText>
          </View>
        )}

        {info && (
          <View style={styles.chips}>
            {[...info.muscles, info.equipment].map((label) => (
              <View key={label} style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">{label}</ThemedText>
              </View>
            ))}
          </View>
        )}

        {info && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>How to do it</ThemedText>
            {info.steps.map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
                  <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                    {i + 1}
                  </ThemedText>
                </View>
                <ThemedText style={styles.stepText}>{step}</ThemedText>
              </View>
            ))}
          </View>
        )}

        {logged.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              YOUR HISTORY
            </ThemedText>
            <ThemedText>
              Logged {logged.length} {logged.length === 1 ? 'time' : 'times'}
              {best > 0 ? ` · Best ${best} kg` : ''}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Last done {new Date(logged[0].at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  media: {
    aspectRatio: 3 / 2,
    borderRadius: 20,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  noMedia: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  noMediaEmoji: {
    fontSize: 44,
    lineHeight: 52,
  },
  frameDots: {
    position: 'absolute',
    bottom: Spacing.two,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  frameDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: -Spacing.two,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  section: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
  },
  card: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.one,
    borderCurve: 'continuous',
  },
});
