import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ConsistencyCard, RemindersPrompt } from '@/components/cards';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CHALLENGES, useWorkoutStore } from '@/lib/workouts';

export default function ProfileScreen() {
  const theme = useTheme();
  const { profile, history, trophies } = useWorkoutStore();
  const details = [
    profile.heightCm && `${profile.heightCm} cm`,
    profile.weightKg && `${profile.weightKg} kg`,
  ].filter(Boolean);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/profile/settings')}
              hitSlop={10}
              accessibilityLabel="Settings"
              style={styles.headerButton}>
              <SymbolView
                name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
                tintColor={theme.accent}
                size={24}
                fallback={<ThemedText style={{ fontSize: 20 }}>⚙️</ThemedText>}
              />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <Avatar profile={profile} size={104} />
          <ThemedText style={styles.name}>{profile.name || 'Your name'}</ThemedText>
          {details.length > 0 && (
            <ThemedText themeColor="textSecondary">{details.join(' · ')}</ThemedText>
          )}
          {!profile.name && (
            <Pressable onPress={() => router.push('/profile/settings')}>
              <ThemedText style={{ color: theme.accent, fontWeight: 700 }}>Set up your profile</ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.tiles}>
          <Tile value={history.length} label={history.length === 1 ? 'Workout' : 'Workouts'} />
          <Tile value={trophies.length} label={trophies.length === 1 ? 'Trophy' : 'Trophies'} />
        </View>

        {trophies.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              TROPHIES
            </ThemedText>
            {trophies.map((t, i) => (
              <ThemedText key={i}>
                🏆 {CHALLENGES[t.id].title}
                <ThemedText themeColor="textSecondary">
                  {'  '}
                  {new Date(t.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </ThemedText>
              </ThemedText>
            ))}
          </View>
        )}

        <ConsistencyCard />
        <RemindersPrompt />
      </ScrollView>
    </>
  );
}

function Tile({ value, label }: { value: number; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={[styles.tileValue, { color: theme.accent }]}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headerButton: {
    paddingHorizontal: Spacing.one,
  },
  identity: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  name: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 800,
    marginTop: Spacing.two,
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  tile: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  tileValue: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: 800,
    fontVariant: ['tabular-nums'],
  },
  card: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
    borderCurve: 'continuous',
  },
});
