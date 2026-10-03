import { type ReactNode, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Icon } from '@/components/icon';
import { usePageGesture } from '@/components/pager-tabs';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type IconName = Parameters<typeof Icon>[0]['name'];

/**
 * Swipe left to reveal one red action, like iOS Mail. The action only runs on tap, and screen readers
 * get it as an accessibility action. Callers confirm anything that loses work. On a tab's main screen
 * a left swipe on the row is the row's, and a right swipe still moves to the previous tab.
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
  const pageGesture = usePageGesture();
  const [open, setOpen] = useState(false);
  // Swiping between tabs vs this row: a left swipe that starts on the row is the row's (this guard
  // claims it and blocks the tab pager), and a right swipe on a closed row goes to the pager, because
  // the row only starts on a rightward drag once it's open (to close it).
  const guard = useMemo(() => {
    const g = Gesture.Pan()
      .activeOffsetX([-10, 10000])
      .failOffsetX([-10000, 10])
      .enabled(Boolean(pageGesture));
    if (pageGesture) g.blocksExternalGesture(pageGesture);
    return g;
  }, [pageGesture]);
  return (
    <GestureDetector gesture={guard}>
      <View>
        <ReanimatedSwipeable
          simultaneousWithExternalGesture={guard}
          dragOffsetFromLeftEdge={pageGesture && !open ? 10000 : 10}
          onSwipeableWillOpen={() => setOpen(true)}
          onSwipeableWillClose={() => setOpen(false)}
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
      </View>
    </GestureDetector>
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
