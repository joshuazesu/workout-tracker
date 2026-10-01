import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChallengeCard } from '@/components/cards';
import { Icon } from '@/components/icon';
import { Row, RowIconInset, Section } from '@/components/list';
import { SwipeAction } from '@/components/swipe-action';
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
  type Workout,
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

  const deleteTemplate = (r: Routine) =>
    confirm('Delete template', `Delete “${r.name}”? Your logged history is kept.`, 'Delete', () =>
      routineActions.delete(r.id)
    );

  const menuOptions = (r: Routine): MenuOption[] => [
    { label: 'Rename', onPress: () => setRenaming(r) },
    { label: 'Edit Exercises', onPress: () => edit(r.id) },
    { label: 'Duplicate', onPress: () => routineActions.duplicate(r.id) || limitReached() },
    {
      label: 'Delete',
      destructive: true,
      onPress: () => deleteTemplate(r),
    },
  ];

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        {active && <ResumeCard workout={active} />}

        <ChallengeCard />

        <Section title="Templates" trailing={`${routines.length} of ${MAX_ROUTINES}`}>
          {routines.map((r) => (
            <SwipeAction key={r.id} label="Delete" onAction={() => deleteTemplate(r)}>
              <TemplateRow
                routine={r}
                canStart={!active}
                onStart={() => start(r.id)}
                onMenu={() => setMenuFor(r)}
                onDelete={() => deleteTemplate(r)}
              />
            </SwipeAction>
          ))}
          <Row
            key="new"
            label={atLimit ? `Limit of ${MAX_ROUTINES} reached` : 'New Template'}
            icon={{ ios: 'plus.circle.fill', md: 'add_circle' }}
            iconColor={atLimit ? theme.textSecondary : theme.accent}
            color={atLimit ? theme.textSecondary : theme.accent}
            onPress={() => edit()}
          />
        </Section>
        {routines.length === 0 && (
          <ThemedText type="footnote" themeColor="textSecondary" style={styles.hint}>
            Templates are workouts you repeat, like “Push Day”. Create one to start it in a tap.
          </ThemedText>
        )}

        {!active && (
          <Section inset={RowIconInset}>
            <Row
              label="Start Empty Workout"
              detail="Add exercises as you go"
              icon={{ ios: 'square.and.pencil', md: 'edit_square' }}
              // A navigation row, not a primary action, so the tint stays rationed to the Start buttons.
              iconColor={theme.textSecondary}
              onPress={() => start()}
              chevron
            />
          </Section>
        )}
      </ScrollView>

      <ActionMenu title={menuFor?.name} options={menuFor ? menuOptions(menuFor) : null} onClose={() => setMenuFor(null)} />
      <PromptDialog
        title="Rename Template"
        visible={renaming !== null}
        initialValue={renaming?.name ?? ''}
        onSubmit={(name) => renaming && routineActions.renameSaved(renaming.id, name)}
        onClose={() => setRenaming(null)}
      />
    </>
  );
}

/**
 * The workout in progress. While one runs, this is the only filled button on the screen.
 * Swipe it left to discard the workout.
 */
function ResumeCard({ workout }: { workout: Workout }) {
  const now = useNow(1000);
  const sets = workout.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const discard = () =>
    confirm('Discard workout', 'All sets in this workout will be lost.', 'Discard', workoutActions.discard);
  return (
    <Section title="In Progress">
      <SwipeAction label="Discard" icon={{ ios: 'xmark.bin', md: 'delete_forever' }} onAction={discard}>
        <View
          style={styles.resume}
          accessibilityActions={[{ name: 'discard', label: 'Discard workout' }]}
          onAccessibilityAction={(e) => e.nativeEvent.actionName === 'discard' && discard()}>
          <View style={styles.resumeRow}>
            <View style={styles.flex}>
              <ThemedText type="headline" numberOfLines={1}>
                {workout.name || 'Workout'}
              </ThemedText>
              <ThemedText type="subheadline" themeColor="textSecondary" numeric>
                {sets} {sets === 1 ? 'set' : 'sets'} done
              </ThemedText>
            </View>
            <ThemedText type="title2" numeric accessibilityLabel={`Elapsed ${formatDuration(now - workout.startedAt)}`}>
              {formatDuration(now - workout.startedAt)}
            </ThemedText>
          </View>
          <Button label="Resume Workout" icon={{ ios: 'play.fill', md: 'play_arrow' }} onPress={() => router.push('/workout')} />
        </View>
      </SwipeAction>
    </Section>
  );
}

function TemplateRow({
  routine,
  canStart,
  onStart,
  onMenu,
  onDelete,
}: {
  routine: Routine;
  canStart: boolean;
  onStart: () => void;
  onMenu: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={styles.template}
      accessibilityActions={[{ name: 'delete', label: 'Delete template' }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete()}>
      <View style={styles.flex}>
        <ThemedText type="headline" numberOfLines={1}>
          {routine.name}
        </ThemedText>
        <ThemedText type="footnote" themeColor="textSecondary" numberOfLines={2}>
          {routine.exercises.join(', ')}
        </ThemedText>
      </View>
      <Pressable
        onPress={onMenu}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`${routine.name} options`}
        style={({ pressed }) => [styles.menuButton, pressed && { backgroundColor: theme.fillStrong }]}>
        <Icon name={{ ios: 'ellipsis', md: 'more_horiz' }} size={18} color={theme.textSecondary} weight="semibold" />
      </Pressable>
      {canStart && (
        <Button
          label="Start"
          size="small"
          variant="tinted"
          icon={{ ios: 'play.fill', md: 'play_arrow' }}
          onPress={onStart}
          accessibilityLabel={`Start ${routine.name}`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  hint: {
    marginTop: -Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  resume: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  template: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 12,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.three - 4,
    minHeight: 64,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
