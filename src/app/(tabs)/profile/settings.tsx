import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { Row, Section } from '@/components/list';
import { ThemedText } from '@/components/themed-text';
import { Gutter, MaxContentWidth, Spacing, textStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { feedback } from '@/lib/feedback';
import { accountActions, type Account, useAccount } from '@/lib/sync';
import { fromDisplayWeight, fromFeetInches, toDisplayWeight, toFeetInches, weightUnit } from '@/lib/units';
import {
  type Appearance,
  type ChangeColor,
  type Profile,
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

/** Keeps digits and one kind of decimal point, so "80,5" types as "80.5". */
const decimal = (v: string) => v.replace(',', '.').replace(/[^\d.]/g, '');

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
  const { profile, history, appearance, units, weightColors, weights } = useWorkoutStore();
  const account = useAccount();

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
        {/* Remounted when the units change, so the fields start over in the new unit. */}
        <HeightField key={`height-${units}`} profile={profile} units={units} />
        <WeightField key={`weight-${units}-${weights.length === 0}`} profile={profile} units={units} />
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
    </ScrollView>
  );
}

function syncStatus({ pending, syncing, failed }: Account): string {
  if (pending === 0) return syncing ? 'Checking for changes…' : 'Everything is backed up to your account.';
  const changes = `${pending} ${pending === 1 ? 'change' : 'changes'}`;
  return failed ? `${changes} waiting to upload. They’ll go up when you’re back online.` : `Uploading ${changes}…`;
}

/** Centimetres, or feet and inches. Always saved as cm. */
function HeightField({ profile, units }: { profile: Profile; units: Units }) {
  const theme = useTheme();
  const start = Number(profile.heightCm) > 0 ? toFeetInches(Number(profile.heightCm)) : null;
  const [ft, setFt] = useState(start ? String(start.ft) : '');
  const [inches, setInches] = useState(start ? String(start.in) : '');
  const inputStyle = [styles.input, { color: theme.text }];

  if (units === 'metric') {
    return (
      <Field label="Height">
        <TextInput
          value={profile.heightCm}
          onChangeText={(v) => profileActions.update({ heightCm: decimal(v) })}
          placeholder="0"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          accessibilityLabel="Height in centimetres"
          style={inputStyle}
        />
        <ThemedText themeColor="textSecondary">cm</ThemedText>
      </Field>
    );
  }

  const save = (nextFt: string, nextIn: string) => {
    setFt(nextFt);
    setInches(nextIn);
    const cm = fromFeetInches(Number(nextFt) || 0, Number(nextIn) || 0);
    profileActions.update({ heightCm: cm > 0 ? String(cm) : '' });
  };
  return (
    <Field label="Height">
      <TextInput
        value={ft}
        onChangeText={(v) => save(v.replace(/\D/g, ''), inches)}
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
        keyboardType="number-pad"
        accessibilityLabel="Height, feet"
        style={inputStyle}
      />
      <ThemedText themeColor="textSecondary">ft</ThemedText>
      <TextInput
        value={inches}
        onChangeText={(v) => save(ft, v.replace(/\D/g, ''))}
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
        keyboardType="number-pad"
        accessibilityLabel="Height, inches"
        style={inputStyle}
      />
      <ThemedText themeColor="textSecondary">in</ThemedText>
    </Field>
  );
}

/** Body weight in kg or lb. Typing here logs today's reading, like "Log weight" on Profile. */
function WeightField({ profile, units }: { profile: Profile; units: Units }) {
  const theme = useTheme();
  const kg = Number(profile.weightKg);
  // Local text so a half-typed "80." isn't rewritten by the unit conversion.
  const [text, setText] = useState(kg > 0 ? String(toDisplayWeight(kg, units)) : '');
  return (
    <Field label="Weight">
      <TextInput
        value={text}
        onChangeText={(v) => {
          const next = decimal(v);
          setText(next);
          const value = Number(next);
          profileActions.editWeight(value > 0 ? String(fromDisplayWeight(value, units)) : next);
        }}
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
        keyboardType="decimal-pad"
        accessibilityLabel={`Weight in ${units === 'imperial' ? 'pounds' : 'kilograms'}`}
        style={[styles.input, { color: theme.text }]}
      />
      <ThemedText themeColor="textSecondary">{weightUnit(units)}</ThemedText>
    </Field>
  );
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
  input: {
    ...textStyle('body'),
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
  },
});
