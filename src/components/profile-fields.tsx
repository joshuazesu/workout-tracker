import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, textStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { feedback } from '@/lib/feedback';
import { fromDisplayWeight, fromFeetInches, toDisplayWeight, toFeetInches, weightUnit } from '@/lib/units';
import { type Profile, profileActions, type Units } from '@/lib/workouts';

// Profile fields shared by Settings and onboarding. Each one writes to the store as you type.

/** Keeps digits and one kind of decimal point, so "80,5" types as "80.5". */
const decimal = (v: string) => v.replace(',', '.').replace(/[^\d.]/g, '');

export function NameField({ profile }: { profile: Profile }) {
  const theme = useTheme();
  return (
    <Field label="Name">
      <TextInput
        value={profile.name}
        onChangeText={(name) => profileActions.update({ name })}
        placeholder="Your name"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="done"
        style={[styles.input, { color: theme.text }]}
      />
    </Field>
  );
}

/** Centimetres, or feet and inches. Always saved as cm. Remount it (`key`) when the units change. */
export function HeightField({ profile, units }: { profile: Profile; units: Units }) {
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

/**
 * Body weight in kg or lb. Typing here logs today's reading, like "Log weight" on Profile.
 * Remount it (`key`) when the units change.
 */
export function WeightField({ profile, units }: { profile: Profile; units: Units }) {
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

/** Two pills, Metric (cm, kg) and Imperial (ft, lb), for a compact units choice. */
export function UnitsChoice({ units }: { units: Units }) {
  const theme = useTheme();
  const options: { value: Units; label: string }[] = [
    { value: 'metric', label: 'cm, kg' },
    { value: 'imperial', label: 'ft, lb' },
  ];
  return (
    <Field label="Units">
      <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="Units">
        {options.map((o) => {
          const selected = units === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => {
                feedback.tap();
                profileActions.setUnits(o.value);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={o.value === 'metric' ? 'Metric, centimetres and kilograms' : 'Imperial, feet and pounds'}
              style={[
                styles.choice,
                { borderColor: selected ? theme.text : theme.separator, borderWidth: selected ? 2 : 1 },
              ]}>
              <ThemedText type="subheadline" style={selected ? styles.choiceSelected : undefined}>
                {o.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
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
  choices: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
  },
  choice: {
    justifyContent: 'center',
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
  },
  choiceSelected: {
    fontWeight: 600,
  },
});
