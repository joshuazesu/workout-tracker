/**
 * The tab navigator: the four tab pages sit side by side and follow the finger, with a bottom bar
 * drawn to look like the native one. Each tab's colour moves with the pages, so a swipe, a tap on the
 * bar and the settle all animate the same way.
 */
import { type NavigatorContentProps, TabRouter, unstable_createStandardRouterNavigator } from 'expo-router';
import { createContext, useContext, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { EASE_OUT } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { feedback } from '@/lib/feedback';

type IconName = Parameters<typeof Icon>[0]['name'];

/** The tabs, left to right. */
export const TABS: { name: string; label: string; icon: IconName; selectedIcon: IconName }[] = [
  {
    name: 'profile',
    label: 'Profile',
    icon: { ios: 'person.crop.circle', md: 'person' },
    selectedIcon: { ios: 'person.crop.circle.fill', md: 'person' },
  },
  {
    name: 'history',
    label: 'History',
    icon: { ios: 'clock.arrow.circlepath', md: 'history' },
    selectedIcon: { ios: 'clock.arrow.circlepath', md: 'history' },
  },
  {
    name: '(start)',
    label: 'Start Workout',
    icon: { ios: 'play.circle', md: 'play_circle' },
    selectedIcon: { ios: 'play.circle.fill', md: 'play_circle' },
  },
  {
    name: 'exercises',
    label: 'Exercises',
    icon: { ios: 'dumbbell', md: 'fitness_center' },
    selectedIcon: { ios: 'dumbbell.fill', md: 'fitness_center' },
  },
];

/**
 * The gesture that swipes between tabs. Rows with their own swipe (`SwipeAction`) block it, so a
 * swipe that starts on a template or the in-progress workout opens Delete/Discard instead.
 */
const PageGesture = createContext<GestureType | undefined>(undefined);
export const usePageGesture = () => useContext(PageGesture);

/** How far past the first or last page the finger can pull, as a share of the drag. */
const RUBBER = 0.3;
/** How much a fling carries the page, in px per px/s. */
const FLING = 0.2;
const SETTLE_MS = 280;

function PagerContent({ state, descriptors, actions }: NavigatorContentProps<object>) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const count = state.routes.length;
  const index = state.index;

  const offset = useSharedValue(-index * width);
  const start = useSharedValue(0);
  /** Which page is showing, fractional mid-swipe: 0 is the first tab. Drives the bar. */
  const progress = useDerivedValue(() => -offset.get() / width);

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
      <PageGesture.Provider value={pan}>
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
      </PageGesture.Provider>
      <TabBar
        names={state.routes.map((r) => r.name)}
        index={index}
        progress={progress}
        onPress={(name, selected) => {
          if (!selected) feedback.tap();
          actions.navigate(name);
        }}
      />
    </View>
  );
}

function TabBar({
  names,
  index,
  progress,
  onPress,
}: {
  names: string[];
  index: number;
  progress: SharedValue<number>;
  onPress: (name: string, selected: boolean) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, borderTopColor: theme.separator, backgroundColor: theme.background }]}>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {names.map((name, i) => (
          <TabButton key={name} name={name} i={i} selected={i === index} progress={progress} onPress={onPress} />
        ))}
      </View>
    </View>
  );
}

/** A tab drawn twice, grey and outlined, and blue and filled; they crossfade as its page arrives. */
function TabButton({
  name,
  i,
  selected,
  progress,
  onPress,
}: {
  name: string;
  i: number;
  selected: boolean;
  progress: SharedValue<number>;
  onPress: (name: string, selected: boolean) => void;
}) {
  const theme = useTheme();
  const tab = TABS.find((t) => t.name === name);
  const label = tab?.label ?? name;
  const nearness = useDerivedValue(() => 1 - Math.min(1, Math.abs(progress.get() - i)));
  const active = useAnimatedStyle(() => ({ opacity: nearness.get() }));
  const idle = useAnimatedStyle(() => ({ opacity: 1 - nearness.get() }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => onPress(name, selected)}
      style={styles.tab}>
      <Animated.View style={[styles.tabContent, idle]}>
        {tab && <Icon name={tab.icon} size={24} color={theme.textSecondary} />}
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {label}
        </ThemedText>
      </Animated.View>
      <Animated.View style={[styles.tabContent, styles.overlay, active]}>
        {tab && <Icon name={tab.selectedIcon} size={24} color={theme.accent} />}
        <ThemedText type="caption" themeColor="accent" numberOfLines={1}>
          {label}
        </ThemedText>
      </Animated.View>
    </Pressable>
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
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    minHeight: 52,
  },
  tabContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
});
