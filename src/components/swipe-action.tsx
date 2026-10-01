import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type IconName = Parameters<typeof Icon>[0]['name'];

/**
 * Swipe left to reveal one red action, like iOS Mail. The action only runs on tap, and screen readers
 * get it as an accessibility action. Callers confirm anything that loses work.
 */
export function SwipeAction({
  label,
  icon = { ios: 'trash', md: 'delete' },
  onAction,
  background,
  radius = 0,
  style,
  children,
}: {
  label: string;
  icon?: IconName;
  onAction: () => void;
  /** Opaque color under the content, so the action never shows through a translucent row. */
  background?: string;
  radius?: number;
  style?: ViewStyle;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      containerStyle={[{ borderRadius: radius }, style]}
      childrenContainerStyle={{ backgroundColor: background ?? theme.surface, borderRadius: radius }}
      renderRightActions={(_progress, _translation, swipeable) => (
        <Pressable
          onPress={() => {
            swipeable.close();
            onAction();
          }}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={[styles.action, { backgroundColor: theme.destructive, borderRadius: radius }]}>
          <Icon name={icon} size={20} color="#FFFFFF" />
          <ThemedText type="caption" style={styles.label}>
            {label}
          </ThemedText>
        </Pressable>
      )}>
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: 600,
  },
});
