import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/button';
import { ChallengeCard } from '@/components/cards';
import { Icon } from '@/components/icon';
import { Section } from '@/components/list';
import { CompactTitle, ScreenHeader, useCollapsingTitle } from '@/components/screen-header';
import { ActionMenu, type MenuOption, PromptDialog } from '@/components/sheet';
import { SortableList } from '@/components/sortable-list';
import { SwipeAction } from '@/components/swipe-action';
import { ThemedText } from '@/components/themed-text';
import { TabSwipe } from '@/components/tab-swipe';
import { Gutter, MaxContentWidth, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { feedback } from '@/lib/feedback';
import {
  defaultSetCount,
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

/** "Wed 1 Oct · Week 40" */
function todayLine(now: number) {
  const date = new Date(now);
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
  return `${date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · Week ${week}`;
}

export default function StartScreen() {
  const theme = useTheme();
  const { active, routines, history } = useWorkoutStore();
  const now = useNow(60_000);
  const [menuFor, setMenuFor] = useState<Routine | null>(null);
  const [renaming, setRenaming] = useState<Routine | null>(null);
  const [reordering, setReordering] = useState(false);
  const atLimit = routines.length >= MAX_ROUTINES;
  const collapse = useCollapsingTitle();

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
    { label: 'Delete', destructive: true, onPress: () => deleteTemplate(r) },
  ];

  return (
    <TabSwipe tab="(start)">
      <Animated.ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        onScroll={collapse.onScroll}
        scrollEventThrottle={16}
        // A held template is being dragged; the list shouldn't scroll out from under it.
        scrollEnabled={!reordering}>
        <ScreenHeader title="Today’s log" subtitle={todayLine(now)} collapse={collapse} />

        {active && <ResumeCard workout={active} />}

        <ChallengeCard />

        <Section title="Templates" trailing={`${routines.length} of ${MAX_ROUTINES}`}>
          {routines.length > 0 && (
            <SortableList
              key="templates"
              items={routines}
              keyOf={(r) => r.id}
              labelOf={(r) => r.name}
              onMove={routineActions.move}
              onDragChange={setReordering}
              renderItem={(r) => (
                <SwipeAction label="Delete" onAction={() => deleteTemplate(r)} background={theme.background}>
                  <TemplateRow
                    routine={r}
                    setCount={r.exercises.reduce((n, name) => n + defaultSetCount(r, name, history), 0)}
                    canStart={!active}
                    onStart={() => start(r.id)}
                    onMenu={() => setMenuFor(r)}
                    onDelete={() => deleteTemplate(r)}
                  />
                </SwipeAction>
              )}
            />
          )}
          <LinkRow
            key="new"
            label={atLimit ? `Limit of ${MAX_ROUTINES} reached` : 'New template'}
            color={atLimit ? theme.textSecondary : theme.accent}
            onPress={() => edit()}
          />
          {!active && <LinkRow key="empty" label="Empty workout" color={theme.accent} onPress={() => start()} />}
        </Section>
        {routines.length === 0 && (
          <ThemedText type="footnote" themeColor="textSecondary">
            Templates are workouts you repeat, like “Push Day”. Create one to start it in a tap.
          </ThemedText>
        )}
      </Animated.ScrollView>
      <CompactTitle title="Today’s log" collapse={collapse} />

      <ActionMenu title={menuFor?.name} options={menuFor ? menuOptions(menuFor) : null} onClose={() => setMenuFor(null)} />
      <PromptDialog
        title="Rename Template"
        visible={renaming !== null}
        initialValue={renaming?.name ?? ''}
        onSubmit={(name) => renaming && routineActions.renameSaved(renaming.id, name)}
        onClose={() => setRenaming(null)}
      />
    </TabSwipe>
  );
}

/**
 * The workout in progress. While one runs, Resume is the only filled button on the screen.
 * Swipe it left to discard the workout.
 */
function ResumeCard({ workout }: { workout: Workout }) {
  const theme = useTheme();
  const now = useNow(1000);
  const sets = workout.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const discard = () =>
    confirm('Discard workout', 'All sets in this workout will be lost.', 'Discard', workoutActions.discard);
  return (
    <Section title="In progress">
      <SwipeAction
        label="Discard"
        icon={{ ios: 'xmark.bin', md: 'delete_forever' }}
        onAction={discard}
        background={theme.background}>
        <View
          style={styles.resume}
          accessibilityActions={[{ name: 'discard', label: 'Discard workout' }]}
          onAccessibilityAction={(e) => e.nativeEvent.actionName === 'discard' && discard()}>
          <View style={styles.resumeRow}>
            <View style={styles.flex}>
              <ThemedText type="title1" numberOfLines={1}>
                {workout.name || 'Workout'}
              </ThemedText>
              <ThemedText type="subheadline" themeColor="textSecondary" numeric>
                {sets} {sets === 1 ? 'set' : 'sets'} done
              </ThemedText>
            </View>
            <ThemedText
              type="largeTitle"
              numeric
              accessibilityLabel={`Elapsed ${formatDuration(now - workout.startedAt)}`}>
              {formatDuration(now - workout.startedAt)}
            </ThemedText>
          </View>
          <Button
            label="Resume workout"
            icon={{ ios: 'play.fill', md: 'play_arrow' }}
            onPress={() => router.push('/workout')}
          />
        </View>
      </SwipeAction>
    </Section>
  );
}

function TemplateRow({
  routine,
  setCount,
  canStart,
  onStart,
  onMenu,
  onDelete,
}: {
  routine: Routine;
  setCount: number;
  canStart: boolean;
  onStart: () => void;
  onMenu: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const exercises = routine.exercises.length;
  return (
    <View
      style={styles.template}
      accessibilityActions={[{ name: 'delete', label: 'Delete template' }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete()}>
      <View style={styles.flex}>
        <ThemedText type="title1" numberOfLines={1}>
          {routine.name}
        </ThemedText>
        <ThemedText type="subheadline" themeColor="textSecondary" numeric>
          {exercises} {exercises === 1 ? 'exercise' : 'exercises'} · {setCount} {setCount === 1 ? 'set' : 'sets'}
        </ThemedText>
      </View>
      <Pressable
        onPress={onMenu}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`${routine.name} options`}
        style={({ pressed }) => [styles.menuButton, pressed && { backgroundColor: theme.fill }]}>
        <Icon name={{ ios: 'ellipsis', md: 'more_horiz' }} size={20} color={theme.text} weight="semibold" />
      </Pressable>
      {canStart && (
        <Pressable
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel={`Start ${routine.name}`}
          style={({ pressed }) => [
            styles.play,
            { backgroundColor: theme.accentFill },
            { transform: [{ scale: pressed ? 0.94 : 1 }] },
          ]}>
          <Icon
            name={{ ios: 'play.fill', md: 'play_arrow' }}
            size={20}
            color={theme.onAccent}
          />
        </Pressable>
      )}
    </View>
  );
}

function LinkRow({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}>
      <Icon name={{ ios: 'plus', md: 'add' }} size={18} color={color} weight="semibold" />
      <ThemedText type="callout" style={{ color, fontWeight: 600 }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Gutter,
    paddingBottom: Spacing.five,
    gap: Spacing.four + 2,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  resume: {
    paddingVertical: Spacing.three - 4,
    gap: Spacing.three - 4,
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
    paddingVertical: Spacing.three - 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
  },
});
