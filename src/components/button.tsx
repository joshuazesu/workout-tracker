import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconName = Parameters<typeof Icon>[0]['name'];

type Props = {
  label: string;
  onPress: () => void;
  /**
   * `primary` is filled with the tint and should appear once per screen. `tinted` is the quieter
   * iOS tinted style, `plain` is text only, `destructive` is plain red text.
   */
  variant?: 'primary' | 'tinted' | 'plain' | 'destructive';
  size?: 'large' | 'small';
  icon?: IconName;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  icon,
  disabled,
  style,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  const background =
    variant === 'primary' ? theme.accent : variant === 'tinted' ? theme.accentSoft : 'transparent';
  const color =
    variant === 'primary' ? theme.onAccent : variant === 'destructive' ? theme.destructive : theme.accent;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        size === 'large' ? styles.large : styles.small,
        {
          backgroundColor: background,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}>
      <View style={styles.content}>
        {icon && <Icon name={icon} size={size === 'large' ? 18 : 14} color={color} weight="semibold" />}
        <ThemedText type={size === 'large' ? 'headline' : 'subheadline'} style={[styles.label, { color }]}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  large: {
    minHeight: 50,
    borderRadius: Radius,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  small: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: Spacing.three - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontWeight: 600,
  },
});
