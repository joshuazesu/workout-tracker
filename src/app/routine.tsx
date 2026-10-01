import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
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

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? 'New Template' : 'Edit Template',
          headerLeft: () => (
            <Pressable onPress={routineActions.cancel} hitSlop={10} style={styles.headerButton}>
              <ThemedText themeColor="textSecondary">Cancel</ThemedText>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={routineActions.save}
              disabled={draft.exercises.length === 0}
              hitSlop={10}
              style={styles.headerButton}>
              <ThemedText
                style={{
                  color: draft.exercises.length ? theme.accent : theme.textSecondary,
                  fontWeight: 700,
                }}>
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
          style={[styles.name, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        <ThemedText type="smallBold" themeColor="textSecondary">
          EXERCISES
        </ThemedText>
        {draft.exercises.length === 0 && (
          <ThemedText themeColor="textSecondary">Add the exercises you do in this workout. Sets and weights fill in from your last session.</ThemedText>
        )}
        {draft.exercises.map((name, i) => (
          <View key={name} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText themeColor="textSecondary" style={styles.index}>
              {i + 1}
            </ThemedText>
            <ThemedText style={styles.flex} numberOfLines={1}>
              {name}
            </ThemedText>
            <Pressable
              hitSlop={10}
              accessibilityLabel={`Remove ${name}`}
              onPress={() => routineActions.removeExercise(name)}>
              <ThemedText themeColor="textSecondary">✕</ThemedText>
            </Pressable>
          </View>
        ))}

        <Button
          label="+ Add exercise"
          variant="secondary"
          onPress={() => router.push({ pathname: '/add-exercise', params: { target: 'routine' } })}
        />

        {!isNew && (
          <Pressable
            onPress={() =>
              confirm('Delete template', `Delete “${draft.name}”? Your logged history is kept.`, 'Delete', () =>
                routineActions.delete(draft.id)
              )
            }
            style={({ pressed }) => [styles.delete, { opacity: pressed ? 0.6 : 1 }]}>
            <ThemedText style={styles.deleteText}>Delete template</ThemedText>
          </Pressable>
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
    gap: Spacing.two,
  },
  headerButton: {
    paddingHorizontal: Spacing.two,
  },
  name: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    fontSize: 20,
    fontWeight: 700,
    marginBottom: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  index: {
    width: 18,
    fontVariant: ['tabular-nums'],
  },
  delete: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  deleteText: {
    color: '#E5484D',
    fontWeight: 600,
  },
});
