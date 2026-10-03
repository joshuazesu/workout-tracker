/**
 * The tab navigator: the five tab pages sit side by side and follow the finger, with a bottom bar
 * drawn to look like the native one. Each tab's colour moves with the pages, so a swipe, a tap on the
 * bar and the settle all animate the same way.
 */
import { type NavigatorContentProps, TabRouter, unstable_createStandardRouterNavigator } from 'expo-router';
import { createContext, useContext, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { EASE_OUT } from '@/constants/motion';
import { useTabBadges } from '@/hooks/use-tab-badges';
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
    label: 'Workout',
    icon: { ios: 'play.circle', md: 'play_circle' },
    selectedIcon: { ios: 'play.circle.fill', md: 'play_circle' },
  },
  {
    name: 'exercises',
    label: 'Exercises',
    icon: { ios: 'dumbbell', md: 'fitness_center' },
    selectedIcon: { ios: 'dumbbell.fill', md: 'fitness_center' },
  },
  {
    name: 'challenges',
    label: 'Challenges',
    icon: { ios: 'trophy', md: 'trophy' },
    selectedIcon: { ios: 'trophy.fill', md: 'trophy' },
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
  /** Where the pages are headed, so a swipe's own settle isn't restarted when the tab changes. */
  const goal = useSharedValue(-index * width);
  /** Which page is showing, fractional mid-swipe: 0 is the first tab. Drives the bar. */
  const progress = useDerivedValue(() => -offset.get() / width);

  // A tap on the bar (or a navigate from code) slides to the page.
  useEffect(() => {
    const to = -index * width;
    if (goal.get() === to) return;
    goal.set(to);
    offset.set(reduceMotion ? to : withTiming(to, { duration: SETTLE_MS, easing: EASE_OUT }));
  }, [index, width, reduceMotion, offset, goal]);

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
          // Settle carrying the finger's speed, with no bounce.
          goal.set(-target * width);
          offset.set(withSpring(-target * width, { duration: SETTLE_MS, dampingRatio: 1, velocity: e.velocityX }));
          if (target !== index) scheduleOnRN(actions.navigate, state.routes[target].name);
        }),
    [count, width, index, start, offset, goal, actions.navigate, state.routes]
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
  const badges = useTabBadges();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, borderTopColor: theme.separator, backgroundColor: theme.background }]}>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {names.map((name, i) => (
          <TabButton
            key={name}
            name={name}
            i={i}
            selected={i === index}
            // Only while that tab isn't the one showing.
            badge={Boolean(badges[name]) && i !== index}
            progress={progress}
            onPress={onPress}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * A tab drawn twice, grey and outlined, and blue and filled; they crossfade as its page arrives.
 * `badge` adds an accent dot on the icon's corner when that screen has something waiting.
 */
function TabButton({
  name,
  i,
  selected,
  badge,
  progress,
  onPress,
}: {
  name: string;
  i: number;
  selected: boolean;
  badge: boolean;
  progress: SharedValue<number>;
  onPress: (name: string, selected: boolean) => void;
}) {
  const theme = useTheme();
  const tab = TABS.find((t) => t.name === name);
  const label = tab?.label ?? name;
  const nearness = useDerivedValue(() => 1 - Math.min(1, Math.abs(progress.get() - i)));
  const active = useAnimatedStyle(() => ({ opacity: nearness.get() }));
  const idle = useAnimatedStyle(() => ({ opacity: 1 - nearness.get() }));
  const reduceMotion = useReducedMotion();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={badge ? `${label}, needs attention` : label}
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
      {/* Outside the crossfading layers, so it stays put while they fade. */}
      {badge && (
        <View pointerEvents="none" style={styles.badgeSlot}>
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(150).easing(EASE_OUT)}
            exiting={reduceMotion ? undefined : FadeOut.duration(150).easing(EASE_OUT)}
            style={[styles.badge, { backgroundColor: theme.accentFill, borderColor: theme.background }]}
          />
        </View>
      )}
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
  // A 24pt-wide box centred where the icon sits, so the dot lands on the icon's top-right corner.
  badgeSlot: {
    position: 'absolute',
    top: 6,
    left: '50%',
    width: 24,
    height: 24,
    marginLeft: -12,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -5,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2,
  },
});
