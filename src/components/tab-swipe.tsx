import { router, useFocusEffect, type Href } from 'expo-router';
import { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Icon } from '@/components/icon';
import { EASE_OUT } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { useTabStyle } from '@/lib/dev-settings';

type IconName = Parameters<typeof Icon>[0]['name'];

/** The tabs, left to right. Shared by the native tab bar's swipe (v1) and the pager (v2). */
export const TABS: { name: string; href: Href; label: string; icon: IconName; selectedIcon: IconName }[] = [
  {
    name: 'profile',
    href: '/profile',
    label: 'Profile',
    icon: { ios: 'person.crop.circle', md: 'person' },
    selectedIcon: { ios: 'person.crop.circle.fill', md: 'person' },
  },
  {
    name: 'history',
    href: '/history',
    label: 'History',
    icon: { ios: 'clock.arrow.circlepath', md: 'history' },
    selectedIcon: { ios: 'clock.arrow.circlepath', md: 'history' },
  },
  {
    name: '(start)',
    href: '/',
    label: 'Start Workout',
    icon: { ios: 'play.circle', md: 'play_circle' },
    selectedIcon: { ios: 'play.circle.fill', md: 'play_circle' },
  },
  {
    name: 'exercises',
    href: '/exercises',
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
export const PageGestureProvider = PageGesture.Provider;
export const usePageGesture = () => useContext(PageGesture);

/** A swipe this far, or this fast, changes tab. */
const DISTANCE = 60;
const VELOCITY = 500;
/** How far the screen follows the finger before it commits. */
const FOLLOW = 32;
/** How far the next screen slides in from. */
const ENTER = 24;

/** Set by a swipe, read by the tab it lands on, so only a swipe (not a tap on the bar) slides in. */
let arriving: 1 | -1 | 0 = 0;

/**
 * Swipe left or right on a tab's main screen to move to the next tab (v1, with the native tab bar).
 * The tab changes when the finger lifts; the screen follows the finger a little until then, and the
 * next one slides in from that side. In v2 the pager does all this, so this only passes through.
 */
export function TabSwipe({ tab, children }: { tab: string; children: ReactNode }) {
  const style = useTabStyle();
  if (style === 'v2') return children;
  return <NativeTabSwipe tab={tab}>{children}</NativeTabSwipe>;
}

function NativeTabSwipe({ tab, children }: { tab: string; children: ReactNode }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const index = TABS.findIndex((t) => t.name === tab);
  const hasPrev = index > 0;
  const hasNext = index < TABS.length - 1;

  const drag = useSharedValue(0);
  const enter = useSharedValue(0);
  const fade = useSharedValue(1);

  const go = useCallback(
    (dir: 1 | -1) => {
      arriving = dir;
      router.navigate(TABS[index + dir].href);
    },
    [index]
  );

  // Arriving by swipe: slide in from the side the finger came from.
  useFocusEffect(
    useCallback(() => {
      const dir = arriving;
      arriving = 0;
      if (!dir || reduceMotion || Platform.OS === 'web') return;
      enter.set(dir * ENTER);
      fade.set(0);
      enter.set(withTiming(0, { duration: 220, easing: EASE_OUT }));
      fade.set(withTiming(1, { duration: 220, easing: EASE_OUT }));
    }, [reduceMotion, enter, fade])
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-12, 12])
        .onUpdate((e) => {
          if (reduceMotion) return;
          // Swiping left moves to the next tab, so the screen leans left; it barely moves at an end.
          const allowed = e.translationX < 0 ? hasNext : hasPrev;
          const reach = allowed ? FOLLOW : FOLLOW / 4;
          drag.set(reach * Math.tanh(e.translationX / 120));
        })
        .onEnd((e) => {
          drag.set(withTiming(0, { duration: 200, easing: EASE_OUT }));
          const dir = e.translationX < 0 ? 1 : -1;
          const far = Math.abs(e.translationX) > DISTANCE || Math.abs(e.velocityX) > VELOCITY;
          // A fling back the other way cancels.
          const sameWay = Math.sign(e.velocityX) !== Math.sign(e.translationX) ? Math.abs(e.velocityX) < 200 : true;
          if (far && sameWay && (dir === 1 ? hasNext : hasPrev)) scheduleOnRN(go, dir);
        }),
    [reduceMotion, hasNext, hasPrev, drag, go]
  );

  const animated = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateX: drag.get() + enter.get() }],
  }));

  return (
    <PageGestureProvider value={pan}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.flex, { backgroundColor: theme.background }, animated]}>{children}</Animated.View>
      </GestureDetector>
    </PageGestureProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
