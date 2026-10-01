import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { feedback } from '@/lib/feedback';

/** The iOS stepper: a − | + capsule. The value is shown by the caller. */
export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** What is being counted, for screen readers, e.g. "Bench Press sets". */
  label: string;
}) {
  const theme = useTheme();
  const step = (delta: number) => {
    feedback.tap();
    onChange(value + delta);
  };
  return (
    <View
      style={[styles.capsule, { backgroundColor: theme.fill }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && value < max) step(1);
        if (e.nativeEvent.actionName === 'decrement' && value > min) step(-1);
      }}>
      <Segment icon={{ ios: 'minus', md: 'remove' }} disabled={value <= min} onPress={() => step(-1)} />
      <View style={[styles.divider, { backgroundColor: theme.separator }]} />
      <Segment icon={{ ios: 'plus', md: 'add' }} disabled={value >= max} onPress={() => step(1)} />
    </View>
  );
}

function Segment({
  icon,
  disabled,
  onPress,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      importantForAccessibility="no"
      style={({ pressed }) => [styles.segment, pressed && { backgroundColor: theme.fillStrong }]}>
      <Icon name={icon} size={16} color={disabled ? theme.outline : theme.text} weight="semibold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9,
    overflow: 'hidden',
    height: 32,
  },
  segment: {
    width: 46,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
  },
});
