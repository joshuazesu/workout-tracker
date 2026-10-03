import { useRef } from 'react';
import type { GestureResponderEvent } from 'react-native';

/** How far the finger can travel and still count as a tap, in points. */
const TAP_SLOP = 10;

/**
 * For rows on the swipeable tab pages: a sideways swipe that doesn't become a page turn would
 * otherwise end as a tap on whatever row it started on. Spread `onPressIn` on the Pressable and
 * check `moved(e)` in `onPress`.
 */
export function useTapGuard() {
  const start = useRef({ x: 0, y: 0 });
  return {
    onPressIn: (e: GestureResponderEvent) => {
      start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    },
    moved: (e: GestureResponderEvent) =>
      Math.hypot(e.nativeEvent.pageX - start.current.x, e.nativeEvent.pageY - start.current.y) > TAP_SLOP,
  };
}
