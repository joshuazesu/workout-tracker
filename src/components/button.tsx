import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconName = Parameters<typeof Icon>[0]['name'];

type Props = {
  label: string;
  onPress: () => void;
  /**
   * `primary` is a tint-filled pill and should appear once per screen. `tinted` is the quieter
   * ink-outlined pill, `plain` is tint text only, `destructive` is plain red text.
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
    variant === 'primary' ? theme.accentFill : 'transparent';
  const color =
    variant === 'primary'
      ? theme.onAccent
      : variant === 'destructive'
        ? theme.destructive
        : variant === 'tinted'
          ? theme.text
          : theme.accent;

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
          borderWidth: variant === 'tinted' ? 1.5 : 0,
          borderColor: theme.text,
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
    minHeight: 52,
    borderRadius: 999,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    minHeight: 36,
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
