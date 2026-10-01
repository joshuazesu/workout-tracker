import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ConsistencyCard, RemindersPrompt } from '@/components/cards';
import { Icon } from '@/components/icon';
import { Section } from '@/components/list';
import { CompactTitle, ScreenHeader, useCollapsingTitle } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Gutter, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { CHALLENGES, challengeProgress, useWorkoutStore, weekStreak } from '@/lib/workouts';

export default function ProfileScreen() {
  const theme = useTheme();
  const { profile, history, trophies, challenge } = useWorkoutStore();
  const now = useNow();
  const details = [
    profile.heightCm && `${profile.heightCm} cm`,
    profile.weightKg && `${profile.weightKg} kg`,
  ].filter(Boolean);
  const openSettings = () => router.push('/profile/settings');
  const streak = weekStreak(history, now);
  // The trophy being worked towards, shown as a dashed "still to win" card.
  const progress = challenge && !challenge.completedAt ? challengeProgress(challenge, history, now) : null;
  const chasing = progress && !progress.expired ? progress : null;
  const collapse = useCollapsingTitle();

  return (
    <>
      <Animated.ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        onScroll={collapse.onScroll}
        scrollEventThrottle={16}>
        <ScreenHeader
          collapse={collapse}
          title={profile.name || 'Profile'}
          subtitle={details.length > 0 ? details.join(' · ') : undefined}
          right={
            <View style={styles.headerRight}>
              {profile.photoUri && <Avatar profile={profile} size={52} />}
              <Pressable
                onPress={openSettings}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Settings"
                style={styles.iconButton}>
                <Icon name={{ ios: 'gearshape', md: 'settings' }} size={24} color={theme.text} />
              </Pressable>
            </View>
          }
        />
        {!profile.name && (
          <Button label="Add your name" variant="tinted" size="small" onPress={openSettings} style={styles.addName} />
        )}

        <Section>
          <Total label="Workouts" value={String(history.length)} />
          <Total label="Week streak" value={String(streak)} accent={streak > 0} />
        </Section>

        <ConsistencyCard />

        <Section title="Trophies" padded>
          <View style={styles.trophies}>
            {trophies.map((t, i) => (
              <View
                key={i}
                style={[styles.trophy, { backgroundColor: theme.surface, borderColor: theme.separator }]}>
                <Icon name={{ ios: 'trophy.fill', md: 'trophy' }} size={28} color={theme.accent} />
                <ThemedText type="headline" style={styles.trophyTitle}>
                  {CHALLENGES[t.id].title}
                </ThemedText>
                <ThemedText type="footnote" themeColor="textSecondary">
                  {new Date(t.completedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </ThemedText>
              </View>
            ))}
            {chasing && (
              <View style={[styles.trophy, styles.locked, { borderColor: theme.outline }]}>
                <Icon name={{ ios: 'trophy', md: 'trophy' }} size={28} color={theme.outline} />
                <ThemedText type="headline" themeColor="textSecondary" style={styles.trophyTitle}>
                  {chasing.title}
                </ThemedText>
                <ThemedText type="footnote" themeColor="textSecondary">
                  {chasing.days - chasing.done} {chasing.days - chasing.done === 1 ? 'day' : 'days'} to go
                </ThemedText>
              </View>
            )}
          </View>
          {trophies.length === 0 && !chasing && (
            <ThemedText type="subheadline" themeColor="textSecondary">
              Finish a challenge to earn your first trophy.
            </ThemedText>
          )}
        </Section>

        <RemindersPrompt />
      </Animated.ScrollView>
      <CompactTitle title={profile.name || 'Profile'} collapse={collapse} />
    </>
  );
}

function Total({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.total}>
      <ThemedText>{label}</ThemedText>
      <ThemedText type="title2" numeric themeColor={accent ? 'accent' : 'text'}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Gutter,
    paddingBottom: Spacing.five,
    gap: Spacing.four + 2,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  addName: {
    alignSelf: 'flex-start',
    marginTop: -Spacing.three,
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 10,
  },
  trophies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  trophy: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: Radius,
    borderWidth: 1,
    padding: Spacing.three - 2,
    gap: Spacing.two,
  },
  locked: {
    borderStyle: 'dashed',
  },
  trophyTitle: {
    fontWeight: 700,
  },
});
