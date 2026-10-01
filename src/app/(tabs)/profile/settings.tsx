import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { Row, Section } from '@/components/list';
import { ThemedText } from '@/components/themed-text';
import { Gutter, MaxContentWidth, Spacing, textStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { feedback } from '@/lib/feedback';
import { type Appearance, profileActions, useWorkoutStore, workoutActions } from '@/lib/workouts';

const APPEARANCES: { value: Appearance; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Picker results live in a cache the OS can purge, so keep a copy in the documents folder. */
async function persistPhoto(uri: string, previous?: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  const destination = new File(Paths.document, `avatar-${Date.now()}.jpg`);
  await new File(uri).copy(destination);
  if (previous?.startsWith(Paths.document.uri)) {
    try {
      new File(previous).delete();
    } catch {}
  }
  return destination.uri;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { profile, history, appearance } = useWorkoutStore();

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    try {
      profileActions.update({ photoUri: await persistPhoto(result.assets[0].uri, profile.photoUri) });
    } catch {
      Alert.alert('Couldn’t save photo', 'Please try another image.');
    }
  };

  const inputStyle = [styles.input, { color: theme.text }];

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Pressable onPress={pickPhoto} style={styles.photo} accessibilityLabel="Change profile photo">
        <Avatar profile={profile} size={96} />
        <ThemedText type="subheadline" style={{ color: theme.accent, fontWeight: 600 }}>
          {profile.photoUri ? 'Change photo' : 'Add photo'}
        </ThemedText>
      </Pressable>

      <Section title="Details">
        <Field key="name" label="Name">
          <TextInput
            value={profile.name}
            onChangeText={(name) => profileActions.update({ name })}
            placeholder="Your name"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="words"
            returnKeyType="done"
            style={inputStyle}
          />
        </Field>
        <Field key="height" label="Height">
          <TextInput
            value={profile.heightCm}
            onChangeText={(v) => profileActions.update({ heightCm: v.replace(/[^\d.]/g, '') })}
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            style={inputStyle}
          />
          <ThemedText themeColor="textSecondary">cm</ThemedText>
        </Field>
        <Field key="weight" label="Weight">
          <TextInput
            value={profile.weightKg}
            onChangeText={(v) => profileActions.update({ weightKg: v.replace(',', '.').replace(/[^\d.]/g, '') })}
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            style={inputStyle}
          />
          <ThemedText themeColor="textSecondary">kg</ThemedText>
        </Field>
      </Section>

      <Section
        title="Appearance"
        footer="System follows your phone’s Light or Dark setting.">
        {APPEARANCES.map((a) => (
          <Row
            key={a.value}
            label={a.label}
            onPress={() => {
              feedback.tap();
              profileActions.setAppearance(a.value);
            }}
            accessibilityLabel={`${a.label}${appearance === a.value ? ', selected' : ''}`}
            trailing={
              appearance === a.value ? (
                <Icon name={{ ios: 'checkmark', md: 'check' }} size={18} color={theme.accent} weight="semibold" />
              ) : undefined
            }
          />
        ))}
      </Section>

      <Section title="Data" footer="Start fresh. Deletes every workout, challenge and trophy. This can’t be undone.">
        <Row
          label="Reset tracking history"
          color={theme.destructive}
          onPress={() =>
            confirm(
              'Reset all tracking?',
              `This permanently deletes ${history.length} logged ${history.length === 1 ? 'workout' : 'workouts'}, your challenge progress and trophies. Your profile and templates are kept.`,
              'Reset',
              () => {
                workoutActions.resetHistory();
                feedback.tap();
              }
            )
          }
        />
      </Section>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Gutter,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    gap: Spacing.four + 2,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  photo: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
  },
  fieldLabel: {
    width: 72,
  },
  input: {
    ...textStyle('body'),
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
  },
});
