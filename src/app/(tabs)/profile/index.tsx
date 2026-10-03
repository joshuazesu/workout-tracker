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
import { WeightCard, WeightDelta } from '@/components/weight';
import { Gutter, MaxContentWidth, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { bmi, formatBodyWeight, formatHeight } from '@/lib/units';
import { useWorkoutStore, weekStreak } from '@/lib/workouts';

export default function ProfileScreen() {
  const theme = useTheme();
  const { profile, units, history, showBmi } = useWorkoutStore();
  const now = useNow();
  const bodyMassIndex = showBmi ? bmi(profile.heightCm, profile.weightKg) : null;
  const details = [
    formatHeight(profile.heightCm, units),
    formatBodyWeight(profile.weightKg, units),
    bodyMassIndex !== null ? `BMI ${bodyMassIndex}` : '',
  ].filter(Boolean);
  const openSettings = () => router.push('/profile/settings');
  const streak = weekStreak(history, now);
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
          }>
          <WeightDelta />
        </ScreenHeader>
        {!profile.name && (
          <Button label="Add your name" variant="tinted" size="small" onPress={openSettings} style={styles.addName} />
        )}

        <Section>
          <Total label="Workouts" value={String(history.length)} />
          <Total label="Week streak" value={String(streak)} accent={streak > 0} />
        </Section>

        <WeightCard />

        <ConsistencyCard />

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
});
