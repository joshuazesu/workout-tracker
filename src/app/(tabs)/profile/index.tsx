import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ConsistencyCard, RemindersPrompt } from '@/components/cards';
import { Icon } from '@/components/icon';
import { Row, RowIconInset, Section } from '@/components/list';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CHALLENGES, useWorkoutStore } from '@/lib/workouts';

export default function ProfileScreen() {
  const theme = useTheme();
  const { profile, trophies } = useWorkoutStore();
  const details = [
    profile.heightCm && `${profile.heightCm} cm`,
    profile.weightKg && `${profile.weightKg} kg`,
  ].filter(Boolean);
  const openSettings = () => router.push('/profile/settings');

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={openSettings}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={styles.headerButton}>
              <Icon name={{ ios: 'gearshape', md: 'settings' }} size={22} color={theme.accent} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <Avatar profile={profile} size={88} />
          {profile.name ? (
            <>
              <ThemedText type="title1" style={styles.center}>
                {profile.name}
              </ThemedText>
              {details.length > 0 && (
                <ThemedText type="subheadline" themeColor="textSecondary">
                  {details.join(' · ')}
                </ThemedText>
              )}
            </>
          ) : (
            <Button label="Add Your Name" variant="tinted" size="small" onPress={openSettings} style={styles.addName} />
          )}
        </View>

        <ConsistencyCard />

        <Section title="Trophies" trailing={trophies.length > 0 ? String(trophies.length) : undefined} inset={RowIconInset}>
          {trophies.length === 0 ? (
            <Row
              label="No trophies yet"
              detail="Finish a challenge to earn your first one."
              icon={{ ios: 'trophy', md: 'trophy' }}
              iconColor={theme.textSecondary}
            />
          ) : (
            trophies.map((t, i) => (
              <Row
                key={i}
                label={CHALLENGES[t.id].title}
                icon={{ ios: 'trophy.fill', md: 'trophy' }}
                trailing={
                  <ThemedText type="subheadline" themeColor="textSecondary">
                    {new Date(t.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </ThemedText>
                }
              />
            ))
          )}
        </Section>

        <RemindersPrompt />
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
  headerButton: {
    paddingHorizontal: Spacing.one,
  },
  identity: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  center: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  addName: {
    marginTop: Spacing.three,
  },
});
