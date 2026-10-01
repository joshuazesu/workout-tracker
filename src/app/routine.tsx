import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Row, RowIconInset, Section } from '@/components/list';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, TextStyles } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { routineActions, useWorkoutStore } from '@/lib/workouts';

/** Create or edit a workout type. Edits a store draft so the add-exercise modal can append to it. */
export default function RoutineScreen() {
  const theme = useTheme();
  const { draft, routines } = useWorkoutStore();
  const isNew = !routines.some((r) => r.id === draft?.id);

  // Saving, cancelling or deleting clears the draft; that's the signal to close.
  useEffect(() => {
    if (!draft && router.canGoBack()) router.back();
  }, [draft]);

  if (!draft) return null;
  const canSave = draft.exercises.length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? 'New Template' : 'Edit Template',
          headerLeft: () => (
            <Pressable onPress={routineActions.cancel} hitSlop={10} accessibilityRole="button" style={styles.headerButton}>
              <ThemedText style={{ color: theme.accent }}>Cancel</ThemedText>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={routineActions.save}
              disabled={!canSave}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              style={styles.headerButton}>
              <ThemedText type="headline" style={{ color: canSave ? theme.accent : theme.textSecondary }}>
                Save
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <TextInput
          value={draft.name}
          onChangeText={routineActions.rename}
          placeholder="Name, e.g. Upper Body"
          placeholderTextColor={theme.textSecondary}
          autoFocus={isNew}
          returnKeyType="done"
          accessibilityLabel="Template name"
          style={[styles.name, { color: theme.text, backgroundColor: theme.surface }]}
        />

        <Section
          title="Exercises"
          footer={
            draft.exercises.length === 0
              ? 'Add the exercises you do in this workout. Sets and weights fill in from your last session.'
              : undefined
          }
          inset={RowIconInset}>
          {draft.exercises.map((name) => (
            <View key={name} style={styles.row}>
              <Pressable
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${name}`}
                onPress={() => routineActions.removeExercise(name)}>
                <Icon name={{ ios: 'minus.circle.fill', md: 'do_not_disturb_on' }} size={22} color={theme.destructive} />
              </Pressable>
              <ThemedText style={styles.flex} numberOfLines={1}>
                {name}
              </ThemedText>
            </View>
          ))}
          <Row
            key="add"
            label="Add Exercise"
            icon={{ ios: 'plus.circle.fill', md: 'add_circle' }}
            color={theme.accent}
            onPress={() => router.push({ pathname: '/add-exercise', params: { target: 'routine' } })}
          />
        </Section>

        {!isNew && (
          <Section>
            <Row
              label="Delete Template"
              color={theme.destructive}
              onPress={() =>
                confirm('Delete template', `Delete “${draft.name}”? Your logged history is kept.`, 'Delete', () =>
                  routineActions.delete(draft.id)
                )
              }
            />
          </Section>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  headerButton: {
    paddingHorizontal: Spacing.two,
    minHeight: 44,
    justifyContent: 'center',
  },
  name: {
    ...TextStyles.headline,
    minHeight: 50,
    borderRadius: Radius,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    minWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: Spacing.three,
  },
});
