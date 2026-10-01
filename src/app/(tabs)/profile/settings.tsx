import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing, TextStyles } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { feedback } from '@/lib/feedback';
import { profileActions, useWorkoutStore, workoutActions } from '@/lib/workouts';

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
  const { profile, history } = useWorkoutStore();

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
          {profile.photoUri ? 'Change Photo' : 'Add Photo'}
        </ThemedText>
      </Pressable>

      <View style={[styles.group, { backgroundColor: theme.surface }]}>
        <Field label="Name">
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
        <Divider />
        <Field label="Height">
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
        <Divider />
        <Field label="Weight">
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
      </View>

      <ThemedText type="title3" style={styles.groupTitle} accessibilityRole="header">
        Data
      </ThemedText>
      <Pressable
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
        accessibilityRole="button"
        style={({ pressed }) => [styles.group, styles.danger, { backgroundColor: pressed ? theme.fillStrong : theme.surface }]}>
        <ThemedText style={{ color: theme.destructive }}>Reset Tracking History</ThemedText>
      </Pressable>
      <ThemedText type="footnote" themeColor="textSecondary" style={styles.groupLabel}>
        Start fresh. Deletes every workout, challenge and trophy. This can’t be undone.
      </ThemedText>
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

function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.separator }]} />;
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  photo: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  group: {
    borderRadius: Radius,
    paddingHorizontal: Spacing.three,
    borderCurve: 'continuous',
  },
  groupLabel: {
    paddingHorizontal: Spacing.three,
  },
  groupTitle: {
    fontWeight: 700,
    paddingHorizontal: Spacing.one,
    marginTop: Spacing.three,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
  },
  fieldLabel: {
    width: 72,
  },
  input: {
    ...TextStyles.body,
    flex: 1,
    minWidth: 0,
    paddingVertical: 11,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  danger: {
    paddingVertical: 11,
    minHeight: 44,
    justifyContent: 'center',
  },
});
