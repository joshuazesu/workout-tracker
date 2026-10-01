import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EXERCISE_CATALOG, type ExerciseInfo } from '@/constants/exercises';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Row = { name: string; info?: ExerciseInfo; custom?: boolean };

/**
 * Searchable A–Z catalogue. With `allowCustom`, typing a name that isn't in the catalogue
 * offers it as a custom exercise (used when adding to a workout).
 * With `headerSearch`, search lives in the native header bar instead (not available on web).
 */
export function ExerciseList({
  onSelect,
  allowCustom = false,
  autoFocus = false,
  headerSearch = false,
}: {
  onSelect: (name: string) => void;
  allowCustom?: boolean;
  autoFocus?: boolean;
  headerSearch?: boolean;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const nativeSearch = headerSearch && Platform.OS !== 'web';

  const trimmed = query.trim();
  const q = trimmed.toLowerCase();
  const matches = EXERCISE_CATALOG.filter(
    (e) => e.name.toLowerCase().includes(q) || e.muscles.some((m) => m.toLowerCase().includes(q)),
  );
  const exactMatch = EXERCISE_CATALOG.some((e) => e.name.toLowerCase() === q);

  const sections: { title: string; data: Row[] }[] = [];
  if (allowCustom && trimmed && !exactMatch) {
    sections.push({ title: '', data: [{ name: trimmed, custom: true }] });
  }
  for (const info of matches) {
    const letter = info.name[0].toUpperCase();
    if (sections.at(-1)?.title !== letter) sections.push({ title: letter, data: [] });
    sections.at(-1)!.data.push({ name: info.name, info });
  }

  return (
    <View style={styles.container}>
      {nativeSearch && (
        <Stack.Screen
          options={{
            headerSearchBarOptions: {
              placeholder: 'Search exercises or muscles',
              hideWhenScrolling: false,
              onChangeText: (e) => setQuery(e.nativeEvent.text),
            },
          }}
        />
      )}
      {!nativeSearch && (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises or muscles"
          placeholderTextColor={theme.textSecondary}
          autoFocus={autoFocus}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType={allowCustom ? 'done' : 'search'}
          onSubmitEditing={() => {
            if (!allowCustom || !trimmed) return;
            // A single match is almost certainly what was meant; otherwise use the typed name.
            onSelect(matches.length === 1 ? matches[0].name : trimmed);
          }}
          style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />
      )}
      <SectionList
        sections={sections}
        contentInsetAdjustmentBehavior="automatic"
        keyExtractor={(row) => (row.custom ? `custom:${row.name}` : row.name)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) =>
          section.title ? (
            <ThemedText
              type="smallBold"
              themeColor="textSecondary"
              style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
              {section.title}
            </ThemedText>
          ) : null
        }
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No exercises match “{trimmed}”.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item.name)}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: theme.backgroundSelected },
              pressed && { backgroundColor: theme.backgroundElement },
            ]}>
            {item.info ? (
              <Image source={item.info.images[0]} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, styles.customThumb, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={{ color: theme.accent, fontWeight: 800 }}>+</ThemedText>
              </View>
            )}
            <View style={styles.flex}>
              <ThemedText style={item.custom ? { color: theme.accent, fontWeight: 700 } : styles.name}>
                {item.custom ? `Add “${item.name}”` : item.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {item.info ? `${item.info.muscles.join(', ')} · ${item.info.equipment}` : 'Custom exercise'}
              </ThemedText>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  search: {
    margin: Spacing.three,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  customThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontWeight: 600,
  },
  empty: {
    textAlign: 'center',
    padding: Spacing.four,
  },
});
