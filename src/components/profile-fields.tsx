import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, textStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { feedback } from '@/lib/feedback';
import {
  bmi,
  formatBodyWeight,
  formatHeight,
  fromDisplayWeight,
  fromFeetInches,
  toDisplayWeight,
  toFeetInches,
  weightUnit,
} from '@/lib/units';
import { type Profile, profileActions, type Units } from '@/lib/workouts';

// Profile fields shared by Settings and onboarding. Each one writes to the store as soon as it's entered.

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

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Where the wheels start when nothing has been entered yet. */
const DEFAULT_HEIGHT_CM = 170;
const DEFAULT_WEIGHT_KG = 70;
const HEIGHT_CM = { min: 100, max: 250 };
const HEIGHT_FT = { min: 3, max: 8 };
const WEIGHT = { metric: { min: 30, max: 250 }, imperial: { min: 66, max: 550 } };

/** Height in cm, or feet and inches, picked on wheels. Always saved as cm. */
export function HeightField({ profile, units }: { profile: Profile; units: Units }) {
  const cm = Number(profile.heightCm);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<number[]>([]);

  const start = () => {
    const value = cm > 0 ? cm : DEFAULT_HEIGHT_CM;
    if (units === 'metric') setDraft([clamp(Math.round(value), HEIGHT_CM.min, HEIGHT_CM.max)]);
    else {
      const { ft, in: inches } = toFeetInches(value);
      setDraft([clamp(ft, HEIGHT_FT.min, HEIGHT_FT.max), inches]);
    }
    setOpen(true);
  };
  const save = () => {
    setOpen(false);
    profileActions.update({ heightCm: String(units === 'metric' ? draft[0] : fromFeetInches(draft[0], draft[1])) });
  };

  return (
    <>
      <PickerField label="Height" value={formatHeight(profile.heightCm, units)} onPress={start} />
      <WheelSheet
        open={open}
        title="Height"
        columns={
          units === 'metric'
            ? [{ label: 'Centimetres', items: range(HEIGHT_CM.min, HEIGHT_CM.max).map((n) => ({ value: n, label: String(n) })) }]
            : [
                { label: 'Feet', items: range(HEIGHT_FT.min, HEIGHT_FT.max).map((n) => ({ value: n, label: `${n} ft` })) },
                { label: 'Inches', items: range(0, 11).map((n) => ({ value: n, label: `${n} in` })) },
              ]
        }
        unit={units === 'metric' ? 'cm' : undefined}
        values={draft}
        onChange={setDraft}
        onDone={save}
        onCancel={() => setOpen(false)}
        onRemove={
          cm > 0
            ? () => {
                setOpen(false);
                profileActions.update({ heightCm: '' });
              }
            : undefined
        }
      />
    </>
  );
}

/**
 * Body weight in kg or lb, to one decimal, picked on wheels. Saving logs it as today's reading,
 * like "Log weight" on Profile.
 */
export function WeightField({ profile, units }: { profile: Profile; units: Units }) {
  const kg = Number(profile.weightKg);
  const bounds = WEIGHT[units];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<number[]>([]);

  const start = () => {
    const tenths = Math.round(toDisplayWeight(kg > 0 ? kg : DEFAULT_WEIGHT_KG, units) * 10);
    setDraft([clamp(Math.floor(tenths / 10), bounds.min, bounds.max), tenths % 10]);
    setOpen(true);
  };
  const save = () => {
    setOpen(false);
    profileActions.editWeight(String(fromDisplayWeight(draft[0] + draft[1] / 10, units)));
  };

  return (
    <>
      <PickerField label="Weight" value={formatBodyWeight(profile.weightKg, units)} onPress={start} />
      <WheelSheet
        open={open}
        title="Weight"
        columns={[
          {
            label: units === 'imperial' ? 'Pounds' : 'Kilograms',
            items: range(bounds.min, bounds.max).map((n) => ({ value: n, label: String(n) })),
          },
          { label: 'Tenths', items: range(0, 9).map((n) => ({ value: n, label: `.${n}` })) },
        ]}
        unit={weightUnit(units)}
        values={draft}
        onChange={setDraft}
        onDone={save}
        onCancel={() => setOpen(false)}
        onRemove={
          kg > 0
            ? () => {
                setOpen(false);
                profileActions.editWeight('');
              }
            : undefined
        }
      />
    </>
  );
}

/** BMI worked out from the profile's height and weight. Renders nothing until both are set. */
export function BmiField({ profile }: { profile: Profile }) {
  const value = bmi(profile.heightCm, profile.weightKg);
  if (value === null) return null;
  return (
    <Field label="BMI">
      <ThemedText numeric style={styles.value}>
        {value}
      </ThemedText>
    </Field>
  );
}

/** A field that shows its value and opens a picker when tapped. */
function PickerField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value || 'not set'}`}
      accessibilityHint="Opens a picker">
      <Field label={label}>
        <ThemedText themeColor={value ? 'text' : 'textSecondary'} style={styles.value}>
          {value || 'Not set'}
        </ThemedText>
      </Field>
    </Pressable>
  );
}

type WheelColumn = { label: string; items: { value: number; label: string }[] };

/** A bottom sheet of picker wheels (one per column) with Cancel, Done and an optional Remove. */
function WheelSheet({
  open,
  title,
  columns,
  unit,
  values,
  onChange,
  onDone,
  onCancel,
  onRemove,
}: {
  open: boolean;
  title: string;
  columns: WheelColumn[];
  /** Shown after the wheels, e.g. "kg". */
  unit?: string;
  values: number[];
  onChange: (values: number[]) => void;
  onDone: () => void;
  onCancel: () => void;
  onRemove?: () => void;
}) {
  const theme = useTheme();
  return (
    <BottomSheet open={open} onClose={onCancel} closeLabel="Cancel">
      <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
        <View style={styles.sheetHeader}>
          <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button">
            <ThemedText style={{ color: theme.accent }}>Cancel</ThemedText>
          </Pressable>
          <ThemedText type="headline">{title}</ThemedText>
          <Pressable onPress={onDone} hitSlop={8} accessibilityRole="button">
            <ThemedText type="headline" style={{ color: theme.accent }}>
              Done
            </ThemedText>
          </Pressable>
        </View>
        <View style={styles.wheels}>
          {columns.map((column, i) => (
            <Picker
              key={column.label}
              selectedValue={values[i]}
              onValueChange={(v) => onChange(values.map((old, j) => (j === i ? Number(v) : old)))}
              accessibilityLabel={column.label}
              itemStyle={[textStyle('title3'), { color: theme.text }]}
              dropdownIconColor={theme.text}
              style={[styles.wheel, { color: theme.text, backgroundColor: theme.surface }]}>
              {column.items.map((item) => (
                <Picker.Item key={item.value} value={item.value} label={item.label} color={theme.text} />
              ))}
            </Picker>
          ))}
          {unit && (
            <ThemedText type="title3" themeColor="textSecondary" style={styles.unit}>
              {unit}
            </ThemedText>
          )}
        </View>
        {onRemove && (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            style={[styles.remove, { borderTopColor: theme.separator }]}>
            <ThemedText style={{ color: theme.destructive }}>Remove {title.toLowerCase()}</ThemedText>
          </Pressable>
        )}
      </View>
    </BottomSheet>
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
  value: {
    flex: 1,
    paddingVertical: 12,
  },
  sheet: {
    borderRadius: Radius,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  wheels: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingBottom: Platform.OS === 'ios' ? 0 : Spacing.three,
    gap: Platform.OS === 'ios' ? 0 : Spacing.two,
  },
  wheel: {
    flex: 1,
  },
  unit: {
    paddingHorizontal: Spacing.two,
  },
  remove: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
