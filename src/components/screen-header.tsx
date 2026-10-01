import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EASE_OUT } from '@/constants/motion';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** On web the native tabs render as a bar across the top; tab screens keep clear of it. */
const WEB_TABS = Platform.OS === 'web' ? 64 : 0;
/** Height of the compact title bar below the status bar, like a native navigation bar. */
const BAR_HEIGHT = 44;

export type CollapsingTitle = {
  scrollY: SharedValue<number>;
  /** Where the big title ends, in scroll content coordinates. */
  titleBottom: SharedValue<number>;
  onScroll: ReturnType<typeof useAnimatedScrollHandler>;
};

/**
 * Tracks a tab screen's scroll on the UI thread, so `CompactTitle` can show the screen's name once
 * the big `ScreenHeader` title has scrolled out of view. Pass `onScroll` to an Animated scroll view.
 */
export function useCollapsingTitle(): CollapsingTitle {
  const scrollY = useSharedValue(0);
  const titleBottom = useSharedValue(Number.POSITIVE_INFINITY);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  return { scrollY, titleBottom, onScroll };
}

/**
 * The ledger header on tab screens: a big condensed title, an optional line of context under it,
 * header buttons on the right, and a heavy ink rule closing it off. It sits at the top of the
 * scroll content; pass `collapse` so the compact title knows when it has scrolled away.
 */
export function ScreenHeader({
  title,
  subtitle,
  right,
  collapse,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  collapse?: CollapsingTitle;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const top = insets.top + Spacing.three + WEB_TABS;
  return (
    <View style={[styles.header, { paddingTop: top, borderBottomColor: theme.text }]}>
      <View style={styles.text}>
        <ThemedText
          type="display"
          accessibilityRole="header"
          numberOfLines={1}
          adjustsFontSizeToFit
          onLayout={(e) => collapse?.titleBottom.set(top + e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText type="subheadline" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
      </View>
      {right}
    </View>
  );
}

/**
 * A slim bar with the screen's name that fades in once the big title has gone under it, and out
 * again when you scroll back up. Render it after the scroll view, as its sibling.
 */
export function CompactTitle({ title, collapse }: { title: string; collapse: CollapsingTitle }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const barBottom = WEB_TABS + insets.top + BAR_HEIGHT;
  // Only the shared values go into the worklet: capturing `collapse` would also try to copy its
  // scroll handler to the UI thread, which can't be copied and crashes on native.
  const { scrollY, titleBottom } = collapse;

  const style = useAnimatedStyle(() => {
    const hidden = scrollY.get() < titleBottom.get() - barBottom;
    return { opacity: withTiming(hidden ? 0 : 1, { duration: 150, easing: EASE_OUT }) };
  });

  return (
    <Animated.View
      pointerEvents="none"
      // The big title is already the screen's heading for screen readers.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.bar,
        {
          top: WEB_TABS,
          paddingTop: insets.top,
          height: insets.top + BAR_HEIGHT,
          backgroundColor: theme.background,
          borderBottomColor: theme.separator,
        },
        style,
      ]}>
      <ThemedText type="headline" numberOfLines={1} style={styles.barTitle}>
        {title}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingBottom: Spacing.three - 4,
    borderBottomWidth: 2,
  },
  text: {
    flex: 1,
    gap: Spacing.one,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  barTitle: {
    fontWeight: 700,
    textAlign: 'center',
  },
});
