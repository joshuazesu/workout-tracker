import { type ReactNode, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { EASE_OUT } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { feedback } from '@/lib/feedback';

/** How long a row has to be held before it lifts. Moving earlier scrolls or swipes instead. */
const HOLD_MS = 300;

type Shared = {
  order: SharedValue<string[]>;
  heights: SharedValue<Record<string, number>>;
  active: SharedValue<string | null>;
};

/** Top of `key` when the rows are stacked in `order`. */
function offsetOf(order: string[], heights: Record<string, number>, key: string) {
  'worklet';
  let top = 0;
  for (const k of order) {
    if (k === key) return top;
    top += heights[k] ?? 0;
  }
  return top;
}

/** Past the ends of the list the row follows the finger less and less, instead of stopping dead. */
function rubberband(overshoot: number, dimension: number) {
  'worklet';
  const c = 0.55;
  return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
}

/**
 * A ledger list whose rows can be reordered: hold a row briefly, then drag it. The other rows make
 * room as it passes, and it settles into the gap on release. Screen readers get "Move up" and
 * "Move down" actions instead. Rows are divided by light rules, like `Section` rows.
 */
export function SortableList<T>({
  items,
  keyOf,
  labelOf,
  renderItem,
  onMove,
  onDragChange,
}: {
  items: T[];
  keyOf: (item: T) => string;
  /** Names the row in the screen reader's move actions. */
  labelOf: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  onMove: (from: number, to: number) => void;
  /** So the screen can stop its scroll view from scrolling while a row is held. */
  onDragChange?: (dragging: boolean) => void;
}) {
  const keys = items.map(keyOf);
  const keyList = keys.join('\u0000');
  const order = useSharedValue(keys);
  const heights = useSharedValue<Record<string, number>>({});
  const active = useSharedValue<string | null>(null);
  const shared = { order, heights, active };

  // After a drop the order is already right on the UI thread; this catches adds, removes and
  // changes made elsewhere.
  useEffect(() => {
    if (active.get() === null) order.set(keyList ? keyList.split('\u0000') : []);
  }, [keyList, order, active]);

  const containerStyle = useAnimatedStyle(() => {
    const h = heights.get();
    let total = 0;
    for (const k of order.get()) total += h[k] ?? 0;
    return { height: total };
  });

  const commit = (from: number, to: number) => {
    feedback.drop();
    onMove(from, to);
  };

  return (
    <Animated.View style={containerStyle}>
      {items.map((item, index) => (
        <SortableRow
          key={keys[index]}
          id={keys[index]}
          index={index}
          count={items.length}
          label={labelOf(item)}
          shared={shared}
          onLift={() => {
            feedback.lift();
            onDragChange?.(true);
          }}
          onDrop={(from, to) => {
            onDragChange?.(false);
            if (from !== to) commit(from, to);
          }}
          onMove={onMove}>
          {renderItem(item, index)}
        </SortableRow>
      ))}
    </Animated.View>
  );
}

function SortableRow({
  id,
  index,
  count,
  label,
  shared,
  onLift,
  onDrop,
  onMove,
  children,
}: {
  id: string;
  index: number;
  count: number;
  label: string;
  shared: Shared;
  onLift: () => void;
  onDrop: (from: number, to: number) => void;
  onMove: (from: number, to: number) => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const { order, heights, active } = shared;
  const y = useSharedValue(0);
  const lift = useSharedValue(0);
  const startY = useSharedValue(0);
  const startIndex = useSharedValue(0);
  // Worklets copy what they capture to the UI thread: pass a plain function, not the feedback object.
  const tick = feedback.tap;

  // Follow this row's slot. Rows glide when the order changes, but snap into place while they're
  // still being measured so nothing slides in when the list first appears.
  useAnimatedReaction(
    () => {
      const h = heights.get();
      const o = order.get();
      let ready = true;
      for (const k of o) if (h[k] === undefined) ready = false;
      return { target: offsetOf(o, h, id), ready };
    },
    (next, prev) => {
      if (active.get() === id) return;
      if (prev !== null && next.target === prev.target) return;
      y.set(next.ready && prev?.ready ? withTiming(next.target, { duration: 200, easing: EASE_OUT }) : next.target);
    }
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(HOLD_MS)
    .enabled(count > 1)
    .onStart(() => {
      active.set(id);
      startY.set(y.get());
      startIndex.set(order.get().indexOf(id));
      lift.set(withTiming(1, { duration: 150, easing: EASE_OUT }));
      scheduleOnRN(onLift);
    })
    .onUpdate((e) => {
      const h = heights.get();
      const o = order.get();
      const own = h[id] ?? 0;
      let total = 0;
      for (const k of o) total += h[k] ?? 0;
      const max = total - own;

      // Track the finger 1:1, with resistance past either end.
      const raw = startY.get() + e.translationY;
      y.set(raw < 0 ? rubberband(raw, own) : raw > max ? max + rubberband(raw - max, own) : raw);

      // Find the slot the row's middle is over, among the other rows.
      const center = Math.min(Math.max(raw, 0), max) + own / 2;
      const others = o.filter((k) => k !== id);
      let slot = 0;
      let acc = 0;
      for (const k of others) {
        if (center > acc + (h[k] ?? 0) / 2) slot++;
        acc += h[k] ?? 0;
      }
      if (slot !== o.indexOf(id)) {
        others.splice(slot, 0, id);
        order.set(others);
        scheduleOnRN(tick);
      }
    })
    .onEnd((e) => {
      // Settle into the gap, carrying the finger's speed, with no bounce.
      const target = offsetOf(order.get(), heights.get(), id);
      y.set(
        withSpring(target, { duration: 300, dampingRatio: 1, velocity: e.velocityY }, () => {
          active.set(null);
        })
      );
      lift.set(withTiming(0, { duration: 200, easing: EASE_OUT }));
      scheduleOnRN(onDrop, startIndex.get(), order.get().indexOf(id));
    });

  const rowStyle = useAnimatedStyle(() => {
    const l = lift.get();
    return {
      opacity: heights.get()[id] === undefined ? 0 : 1,
      zIndex: active.get() === id ? 10 : 0,
      transform: [{ translateY: y.get() }, { scale: 1 + 0.03 * l }],
      shadowOpacity: 0.14 * l,
    };
  });
  // The first row in the current order has no rule above it, and neither does the lifted row.
  const ruleStyle = useAnimatedStyle(() => ({
    opacity: order.get()[0] === id || active.get() === id ? 0 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={(e) => {
          const height = e.nativeEvent.layout.height;
          heights.set((h) => (h[id] === height ? h : { ...h, [id]: height }));
        }}
        accessibilityActions={[
          ...(index > 0 ? [{ name: 'moveUp', label: `Move ${label} up` }] : []),
          ...(index < count - 1 ? [{ name: 'moveDown', label: `Move ${label} down` }] : []),
        ]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'moveUp') onMove(index, index - 1);
          if (e.nativeEvent.actionName === 'moveDown') onMove(index, index + 1);
        }}
        style={[styles.row, { backgroundColor: theme.background, shadowColor: '#000' }, rowStyle]}>
        <Animated.View style={[styles.rule, { backgroundColor: theme.separator }, ruleStyle]} />
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
  },
  rule: {
    height: StyleSheet.hairlineWidth * 2,
  },
});
