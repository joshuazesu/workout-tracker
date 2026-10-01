import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { Stat } from '@/components/stat';
import { ThemedText } from '@/components/themed-text';
import { findExercise } from '@/constants/exercises';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
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
      <ScrollView style={{ backgroundColor: theme.backgroundPlain }} contentContainerStyle={styles.content}>
        {info ? (
          <View style={[styles.media, { backgroundColor: theme.fill }]}>
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
          <View style={[styles.media, styles.noMedia, { backgroundColor: theme.fill }]}>
            <Icon name={{ ios: 'dumbbell', md: 'fitness_center' }} size={40} color={theme.textSecondary} />
            <ThemedText type="subheadline" themeColor="textSecondary">
              Custom exercise, so there’s no guide.
            </ThemedText>
          </View>
        )}

        {info && (
          <View style={styles.chips}>
            {[...info.muscles, info.equipment].map((label) => (
              <View key={label} style={[styles.chip, { backgroundColor: theme.fill }]}>
                <ThemedText type="subheadline" style={styles.chipText}>
                  {label}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {info && (
          <View style={styles.section}>
            <ThemedText type="title3" style={styles.sectionTitle} accessibilityRole="header">
              How to Do It
            </ThemedText>
            {info.steps.map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: theme.fill }]}>
                  <ThemedText type="subheadline" numeric style={styles.stepNumberText}>
                    {i + 1}
                  </ThemedText>
                </View>
                <ThemedText style={styles.stepText}>{step}</ThemedText>
              </View>
            ))}
          </View>
        )}

        {logged.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="title3" style={styles.sectionTitle} accessibilityRole="header">
              Your History
            </ThemedText>
            <View style={[styles.card, { backgroundColor: theme.fill }]}>
              <Stat label="Logged" value={`${logged.length}×`} />
              <Stat label="Best" value={best > 0 ? `${best} kg` : '–'} />
              <Stat
                label="Last done"
                value={new Date(logged[0].at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              />
            </View>
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
    borderRadius: Radius,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  noMedia: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
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
    paddingHorizontal: Spacing.three - 4,
    paddingVertical: Spacing.one + 1,
  },
  chipText: {
    fontWeight: 500,
  },
  section: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontWeight: 700,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontWeight: 600,
  },
  stepText: {
    flex: 1,
    // Centres the first line on the 28 pt number circle.
    paddingTop: 3,
  },
  card: {
    flexDirection: 'row',
    borderRadius: Radius,
    padding: Spacing.three,
    borderCurve: 'continuous',
  },
});
