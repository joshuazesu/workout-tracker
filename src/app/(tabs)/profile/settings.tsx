import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { Row, Section } from '@/components/list';
import { HeightField, NameField, WeightField } from '@/components/profile-fields';
import { ThemedText } from '@/components/themed-text';
import { Gutter, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { feedback } from '@/lib/feedback';
import { accountActions, type Account, useAccount } from '@/lib/sync';
import {
  type Appearance,
  type ChangeColor,
  profileActions,
  type Units,
  useWorkoutStore,
  workoutActions,
} from '@/lib/workouts';

const APPEARANCES: { value: Appearance; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const UNITS: { value: Units; label: string; detail: string }[] = [
  { value: 'metric', label: 'Metric', detail: 'cm and kg' },
  { value: 'imperial', label: 'Imperial', detail: 'ft, in and lb' },
];

const CHANGE_COLORS: { value: ChangeColor; label: string }[] = [
  { value: 'green', label: 'Green' },
  { value: 'red', label: 'Red' },
  { value: 'neutral', label: 'Neutral' },
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
  const { profile, history, appearance, units, weightColors, weights, showBmi } = useWorkoutStore();
  const account = useAccount();
  const [deleting, setDeleting] = useState(false);

  // On success the app locks and routes to sign-in by itself, so only failure needs handling here.
  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await accountActions.deleteAccount();
    } catch {
      setDeleting(false);
      Alert.alert('Couldn’t delete account', 'Check your internet connection and try again.');
    }
  };

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

      <Section title="Details" footer="BMI is worked out from your height and weight and shown on Profile.">
        <NameField profile={profile} />
        {/* Remounted when the units change, so the fields start over in the new unit. */}
        <HeightField key={`height-${units}`} profile={profile} units={units} />
        <WeightField key={`weight-${units}-${weights.length === 0}`} profile={profile} units={units} />
        <Row
          label="Show BMI"
          onPress={() => profileActions.setShowBmi(!showBmi)}
          accessibilityLabel={`Show BMI, ${showBmi ? 'on' : 'off'}`}
          trailing={
            <Switch
              value={showBmi}
              onValueChange={profileActions.setShowBmi}
              trackColor={{ true: theme.accentFill }}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          }
        />
      </Section>

      <Section title="Units" footer="For your height and body weight. Lifting weights stay in kg.">
        {UNITS.map((u) => (
          <Row
            key={u.value}
            label={u.label}
            detail={u.detail}
            onPress={() => {
              feedback.tap();
              profileActions.setUnits(u.value);
            }}
            accessibilityLabel={`${u.label}, ${u.detail}${units === u.value ? ', selected' : ''}`}
            trailing={
              units === u.value ? (
                <Icon name={{ ios: 'checkmark', md: 'check' }} size={18} color={theme.accent} weight="semibold" />
              ) : undefined
            }
          />
        ))}
      </Section>

      <Section title="Weight change" footer="The colour of the change under your name on Profile.">
        <ColorChoice label="Gain" value={weightColors.gain} onChange={(c) => profileActions.setWeightColor('gain', c)} />
        <ColorChoice label="Loss" value={weightColors.loss} onChange={(c) => profileActions.setWeightColor('loss', c)} />
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

      <Section title="Account" footer={syncStatus(account)}>
        <Row label={account.email ?? 'Signed in'} detail="Signed in with email" />
        <Row
          label="Sign out"
          color={theme.accent}
          onPress={() =>
            confirm(
              'Sign out?',
              account.pending > 0
                ? `${account.pending} ${account.pending === 1 ? 'change hasn’t' : 'changes haven’t'} reached your account yet and will be lost. Connect to the internet first to keep ${account.pending === 1 ? 'it' : 'them'}.`
                : 'Your workouts stay in your account. This phone is cleared until you sign in again.',
              'Sign Out',
              () => void accountActions.signOut()
            )
          }
        />
      </Section>

      <Section
        title="Data"
        footer="Start fresh. Deletes every workout, challenge, trophy and weight reading from this phone and your account. This can’t be undone.">
        <Row
          label="Reset tracking history"
          color={theme.destructive}
          onPress={() =>
            confirm(
              'Reset all tracking?',
              `This permanently deletes ${history.length} logged ${history.length === 1 ? 'workout' : 'workouts'}, ${weights.length} weight ${weights.length === 1 ? 'reading' : 'readings'}, your challenge progress and trophies. Your name, photo, height and templates are kept.`,
              'Reset',
              () => {
                workoutActions.resetHistory();
                feedback.tap();
              }
            )
          }
        />
      </Section>

      <Section footer="Permanently deletes your account and everything in it, on every device. This can’t be undone.">
        <Row
          label={deleting ? 'Deleting account…' : 'Delete account'}
          color={theme.destructive}
          onPress={
            deleting
              ? undefined
              : () =>
                  confirm(
                    'Delete your account?',
                    `This permanently deletes ${account.email ?? 'your account'} with all your workouts, templates, weight readings, challenge progress and trophies, and clears this phone.`,
                    'Delete Account',
                    () => void deleteAccount()
                  )
          }
        />
      </Section>
    </ScrollView>
  );
}

function syncStatus({ pending, syncing, failed }: Account): string {
  if (pending === 0) return syncing ? 'Checking for changes…' : 'Everything is backed up to your account.';
  const changes = `${pending} ${pending === 1 ? 'change' : 'changes'}`;
  return failed ? `${changes} waiting to upload. They’ll go up when you’re back online.` : `Uploading ${changes}…`;
}

/** A row of three pills (Green, Red, Neutral), each with a dot of its colour. */
function ColorChoice({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ChangeColor;
  onChange: (color: ChangeColor) => void;
}) {
  const theme = useTheme();
  const swatch: Record<ChangeColor, string> = { green: theme.positive, red: theme.destructive, neutral: theme.text };
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel={`Weight ${label.toLowerCase()} colour`}>
        {CHANGE_COLORS.map((c) => {
          const selected = value === c.value;
          return (
            <Pressable
              key={c.value}
              onPress={() => {
                feedback.tap();
                onChange(c.value);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={c.label}
              style={[
                styles.choice,
                { borderColor: selected ? theme.text : theme.separator, borderWidth: selected ? 2 : 1 },
              ]}>
              <View style={[styles.dot, { backgroundColor: swatch[c.value] }]} />
              <ThemedText type="subheadline" style={selected ? styles.choiceSelected : undefined}>
                {c.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
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
  choices: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
  },
  choiceSelected: {
    fontWeight: 600,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
