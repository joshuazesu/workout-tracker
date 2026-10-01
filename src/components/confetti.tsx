import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const COLORS = ['#3DD68C', '#FFC53D', '#FF6B6B', '#4CC3FF', '#B18CFF', '#FF9F43'];

type Piece = {
  x: number;
  drift: number;
  rotate: number;
  delay: number;
  duration: number;
  color: string;
  w: number;
  h: number;
};

function makePieces(count: number, width: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.random() * width,
    drift: (Math.random() - 0.5) * 160,
    rotate: (Math.random() - 0.5) * 1080,
    delay: Math.random() * 400,
    duration: 1800 + Math.random() * 1400,
    color: COLORS[i % COLORS.length],
    w: 6 + Math.random() * 6,
    h: 10 + Math.random() * 8,
  }));
}

/** A one-shot confetti fall over the whole screen. Skipped entirely with Reduce Motion on. */
export function Confetti({ count = 60 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  // Random layout is computed once so re-renders don't reshuffle mid-fall.
  const [pieces] = useState(() => makePieces(count, width));

  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} piece={p} fall={height + 40} />
      ))}
    </View>
  );
}

function ConfettiPiece({ piece, fall }: { piece: Piece; fall: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withDelay(piece.delay, withTiming(1, { duration: piece.duration, easing: Easing.in(Easing.quad) })));
  }, [piece, progress]);

  const style = useAnimatedStyle(() => {
    const t = progress.get();
    return {
      opacity: t < 0.85 ? 1 : (1 - t) / 0.15,
      transform: [
        { translateX: piece.drift * Math.sin(t * Math.PI) },
        { translateY: -40 + t * fall },
        { rotate: `${piece.rotate * t}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        { left: piece.x, width: piece.w, height: piece.h, backgroundColor: piece.color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 0,
    borderRadius: 2,
  },
});
