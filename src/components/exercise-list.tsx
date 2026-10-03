import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { EXERCISE_CATALOG, type ExerciseInfo } from '@/constants/exercises';
import { Gutter, Spacing, textStyle } from '@/constants/theme';
import { useTapGuard } from '@/hooks/use-tap-guard';
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
  const tap = useTapGuard();
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
        <View style={[styles.search, { backgroundColor: theme.fill }]}>
          <Icon name={{ ios: 'magnifyingglass', md: 'search' }} size={17} color={theme.textSecondary} />
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
            accessibilityLabel="Search exercises"
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>
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
              type="footnote"
              themeColor="textSecondary"
              style={[styles.sectionHeader, { backgroundColor: theme.backgroundPlain }]}>
              {section.title}
            </ThemedText>
          ) : null
        }
        ListEmptyComponent={
          <ThemedText type="subheadline" themeColor="textSecondary" style={styles.empty}>
            No exercises match “{trimmed}”.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <Pressable
            onPressIn={tap.onPressIn}
            onPress={(e) => !tap.moved(e) && onSelect(item.name)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.fillStrong }]}>
            {item.info ? (
              <Image source={item.info.images[0]} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, styles.customThumb, { backgroundColor: theme.accentSoft }]}>
                <Icon name={{ ios: 'plus', md: 'add' }} size={22} color={theme.accent} weight="semibold" />
              </View>
            )}
            <View style={[styles.flex, styles.rowText, { borderBottomColor: theme.separator }]}>
              <ThemedText style={item.custom ? { color: theme.accent } : undefined}>
                {item.custom ? `Add “${item.name}”` : item.name}
              </ThemedText>
              <ThemedText type="subheadline" themeColor="textSecondary" numberOfLines={1}>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: Gutter,
    marginVertical: Spacing.two,
    height: 36,
    borderRadius: 10,
    paddingHorizontal: Spacing.two,
  },
  searchInput: {
    ...textStyle('body'),
    flex: 1,
    minWidth: 0,
    height: 36,
  },
  sectionHeader: {
    fontWeight: 700,
    paddingHorizontal: Gutter,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingLeft: Gutter,
  },
  // The separator runs under the text only, like iOS lists with thumbnails.
  rowText: {
    justifyContent: 'center',
    gap: 1,
    minHeight: 64,
    paddingVertical: Spacing.two,
    paddingRight: Gutter,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  customThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    padding: Spacing.four,
  },
});
