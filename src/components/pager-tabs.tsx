/**
 * v2 tab style (dev switch, Settings › Developer): the tab pages sit side by side and follow the
 * finger, with a bottom bar drawn to look like the native one. A prototype to compare against the
 * native tab bar (v1); delete whichever loses.
 */
import { type NavigatorContentProps, TabRouter, unstable_createStandardRouterNavigator } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon } from '@/components/icon';
import { PageGestureProvider, TABS } from '@/components/tab-swipe';
import { ThemedText } from '@/components/themed-text';
import { EASE_OUT } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { feedback } from '@/lib/feedback';

/** How far past the first or last page the finger can pull, as a share of the drag. */
const RUBBER = 0.3;
/** How much a fling carries the page, in px per px/s. */
const FLING = 0.2;
const SETTLE_MS = 280;

function PagerContent({ state, descriptors, actions }: NavigatorContentProps<object>) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const count = state.routes.length;
  const index = state.index;

  const offset = useSharedValue(-index * width);
  const start = useSharedValue(0);

  // A tap on the bar (or a navigate from code) slides to the page.
  useEffect(() => {
    offset.set(reduceMotion ? -index * width : withTiming(-index * width, { duration: SETTLE_MS, easing: EASE_OUT }));
  }, [index, width, reduceMotion, offset]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-12, 12])
        .onStart(() => {
          start.set(offset.get());
        })
        .onUpdate((e) => {
          const min = -(count - 1) * width;
          let x = start.get() + e.translationX;
          if (x > 0) x *= RUBBER;
          if (x < min) x = min + (x - min) * RUBBER;
          offset.set(x);
        })
        .onEnd((e) => {
          const projected = offset.get() + e.velocityX * FLING;
          // One page per swipe, like iOS paging.
          const target = Math.max(0, Math.min(count - 1, Math.max(index - 1, Math.min(index + 1, Math.round(-projected / width)))));
          offset.set(withTiming(-target * width, { duration: SETTLE_MS, easing: EASE_OUT }));
          if (target !== index) scheduleOnRN(actions.navigate, state.routes[target].name);
        }),
    [count, width, index, start, offset, actions.navigate, state.routes]
  );

  const pages = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <PageGestureProvider value={pan}>
        <GestureDetector gesture={pan}>
          <View style={styles.viewport}>
            <Animated.View style={[styles.row, { width: width * count }, pages]}>
              {state.routes.map((route) => (
                <View key={route.key} style={{ width }}>
                  {descriptors[route.key].render()}
                </View>
              ))}
            </Animated.View>
          </View>
        </GestureDetector>
      </PageGestureProvider>

      <View
        accessibilityRole="tablist"
        style={[styles.bar, { paddingBottom: insets.bottom, borderTopColor: theme.separator, backgroundColor: theme.background }]}>
        {state.routes.map((route, i) => {
          const tab = TABS.find((t) => t.name === route.name);
          const selected = i === index;
          const color = selected ? theme.accent : theme.textSecondary;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={tab?.label ?? route.name}
              onPress={() => {
                if (!selected) feedback.tap();
                actions.navigate(route.name);
              }}
              style={styles.tab}>
              {tab && <Icon name={selected ? tab.selectedIcon : tab.icon} size={24} color={color} />}
              <ThemedText type="caption" style={{ color }} numberOfLines={1}>
                {tab?.label ?? route.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const PagerTabs = unstable_createStandardRouterNavigator(PagerContent, TabRouter);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingTop: 8,
    paddingBottom: 4,
    minHeight: 49,
  },
});
