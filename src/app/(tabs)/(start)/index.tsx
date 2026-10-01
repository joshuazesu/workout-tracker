import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChallengeCard } from '@/components/cards';
import { ActionMenu, type MenuOption, PromptDialog } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { feedback } from '@/lib/feedback';
import {
  formatDuration,
  MAX_ROUTINES,
  type Routine,
  routineActions,
  useWorkoutStore,
  workoutActions,
} from '@/lib/workouts';

function limitReached() {
  const message = `You can have up to ${MAX_ROUTINES} templates. Delete or edit one to make room.`;
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert('Template limit reached', message);
}

export default function StartScreen() {
  const theme = useTheme();
  const { active, routines } = useWorkoutStore();
  const [menuFor, setMenuFor] = useState<Routine | null>(null);
  const [renaming, setRenaming] = useState<Routine | null>(null);
  const atLimit = routines.length >= MAX_ROUTINES;

  const start = (routineId?: string) => {
    feedback.tap();
    workoutActions.start(routineId);
    router.push('/workout');
  };

  const edit = (routineId?: string) => {
    if (!routineActions.edit(routineId)) return limitReached();
    router.push('/routine');
  };

  const menuOptions = (r: Routine): MenuOption[] => [
    { label: 'Rename', onPress: () => setRenaming(r) },
    { label: 'Edit exercises', onPress: () => edit(r.id) },
    { label: 'Duplicate', onPress: () => routineActions.duplicate(r.id) || limitReached() },
    {
      label: 'Delete',
      destructive: true,
      onPress: () =>
        confirm('Delete template', `Delete “${r.name}”? Your logged history is kept.`, 'Delete', () =>
          routineActions.delete(r.id)
        ),
    },
  ];

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        {active && (
          <Pressable
            onPress={() => router.push('/workout')}
            style={({ pressed }) => [styles.resume, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}>
            <ThemedText style={[styles.resumeText, { color: theme.onAccent }]}>
              Resume {active.name || 'workout'}
            </ThemedText>
            <Elapsed startedAt={active.startedAt} color={theme.onAccent} />
          </Pressable>
        )}

        <ChallengeCard />

        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            MY TEMPLATES
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {routines.length} of {MAX_ROUTINES}
          </ThemedText>
        </View>

        {routines.length === 0 && (
          <ThemedText themeColor="textSecondary">
            Templates are workouts you do often, like “Push Day”. Create one to start it in a tap.
          </ThemedText>
        )}

        {routines.map((r) => (
          <TemplateCard
            key={r.id}
            routine={r}
            disabled={Boolean(active)}
            onStart={() => start(r.id)}
            onMenu={() => setMenuFor(r)}
          />
        ))}

        <Button
          label={atLimit ? `Template limit reached (${MAX_ROUTINES})` : '+ Template'}
          variant="secondary"
          onPress={() => edit()}
          style={atLimit ? styles.dimmed : undefined}
        />
        {!active && <Button label="Start an empty workout" variant="plain" onPress={() => start()} />}
      </ScrollView>

      <ActionMenu title={menuFor?.name} options={menuFor ? menuOptions(menuFor) : null} onClose={() => setMenuFor(null)} />
      <PromptDialog
        title="Rename template"
        visible={renaming !== null}
        initialValue={renaming?.name ?? ''}
        onSubmit={(name) => renaming && routineActions.renameSaved(renaming.id, name)}
        onClose={() => setRenaming(null)}
      />
    </>
  );
}

function TemplateCard({
  routine,
  disabled,
  onStart,
  onMenu,
}: {
  routine: Routine;
  disabled: boolean;
  onStart: () => void;
  onMenu: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.cardHeader}>
        <ThemedText style={styles.cardTitle} numberOfLines={1}>
          {routine.name}
        </ThemedText>
        <Pressable
          onPress={onMenu}
          hitSlop={12}
          accessibilityLabel={`${routine.name} options`}
          style={({ pressed }) => [styles.more, { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' }]}>
          <ThemedText style={styles.moreText}>•••</ThemedText>
        </Pressable>
      </View>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
        {routine.exercises.join(' · ')}
      </ThemedText>
      <Button
        label={disabled ? 'Workout in progress' : 'Start'}
        onPress={disabled ? () => router.push('/workout') : onStart}
        variant={disabled ? 'secondary' : 'primary'}
        style={styles.startButton}
      />
    </View>
  );
}

function Elapsed({ startedAt, color }: { startedAt: number; color: string }) {
  const now = useNow(1000);
  return (
    <ThemedText type="small" style={{ color, opacity: 0.8 }}>
      In progress · {formatDuration(now - startedAt)}
    </ThemedText>
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
  resume: {
    borderRadius: 16,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  resumeText: {
    fontSize: 18,
    fontWeight: 700,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
    marginBottom: -Spacing.one,
  },
  card: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
    borderCurve: 'continuous',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 700,
  },
  more: {
    borderRadius: 12,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  moreText: {
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: 1,
  },
  startButton: {
    marginTop: Spacing.one,
    paddingVertical: 12,
  },
  dimmed: {
    opacity: 0.5,
  },
});
