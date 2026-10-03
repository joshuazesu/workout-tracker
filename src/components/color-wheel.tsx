import { useId, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { BottomSheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, textStyle } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { accentTokens, hexToHsv, hsvToHex, normalizeHex } from '@/lib/accent';

const SIZE = 248;
const R = SIZE / 2;
const THUMB = 28;
const BAR = 28;
/** Hue wedges around the wheel. SVG has no conic gradient, so the wheel is drawn as slices. */
const WEDGES = 180;

type Hsv = { h: number; s: number; v: number };

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

/**
 * The custom accent picker: a colour wheel (hue around, saturation out from the white centre), a
 * brightness bar, and a hex field. Done hands back `#RRGGBB`.
 */
export function ColorWheelSheet({
  open,
  initial,
  onClose,
  onDone,
}: {
  open: boolean;
  /** Where the wheel starts each time it opens. */
  initial: string;
  onClose: () => void;
  onDone: (hex: string) => void;
}) {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(initial));
  const [text, setText] = useState(initial);
  const [barWidth, setBarWidth] = useState(0);

  // Starts over from `initial` on every open.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setHsv(hexToHsv(initial));
      setText(initial);
    }
  }

  const hex = hsvToHex(hsv.h, hsv.s, hsv.v);
  const tokens = accentTokens(hex, scheme);

  const pick = (next: Hsv) => {
    setHsv(next);
    setText(hsvToHex(next.h, next.s, next.v));
  };

  const pickOnWheel = (x: number, y: number) => {
    const dx = x - R;
    const dy = y - R;
    const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    pick({ ...hsv, h, s: clamp(Math.hypot(dx, dy) / R) });
  };
  const wheelPan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => pickOnWheel(e.x, e.y))
    .onUpdate((e) => pickOnWheel(e.x, e.y));

  const pickOnBar = (x: number) => barWidth > 0 && pick({ ...hsv, v: clamp(x / barWidth) });
  const barPan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => pickOnBar(e.x))
    .onUpdate((e) => pickOnBar(e.x));

  const angle = (hsv.h * Math.PI) / 180;
  const thumbX = R + Math.cos(angle) * hsv.s * R;
  const thumbY = R + Math.sin(angle) * hsv.s * R;

  return (
    <BottomSheet open={open} onClose={onClose} closeLabel="Cancel">
      <GestureHandlerRootView style={[styles.sheet, { backgroundColor: theme.surface }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
            <ThemedText style={{ color: theme.accent }}>Cancel</ThemedText>
          </Pressable>
          <ThemedText type="headline">Custom colour</ThemedText>
          <Pressable onPress={() => onDone(hex)} hitSlop={8} accessibilityRole="button">
            <ThemedText type="headline" style={{ color: theme.accent }}>
              Done
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.preview}>
          <View style={[styles.sample, { backgroundColor: tokens.accentFill }]}>
            <ThemedText type="subheadline" style={[styles.sampleText, { color: theme.onAccent }]}>
              Start workout
            </ThemedText>
          </View>
          <View style={[styles.hexField, { backgroundColor: theme.fill }]}>
            <View style={[styles.hexDot, { backgroundColor: hex }]} />
            <TextInput
              value={text}
              onChangeText={(t) => {
                setText(t);
                const valid = normalizeHex(t);
                if (valid) setHsv(hexToHsv(valid));
              }}
              onEndEditing={() => setText(hex)}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={7}
              accessibilityLabel="Hex colour"
              style={[styles.hexInput, { color: theme.text }]}
            />
          </View>
        </View>

        <GestureDetector gesture={wheelPan}>
          <View
            style={styles.wheel}
            accessibilityLabel="Colour wheel"
            accessibilityHint="Drag to choose a hue and how strong it is">
            <HueWheel />
            {/* The brightness bar darkens the whole wheel, so it previews what you'll get. */}
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, styles.round, { backgroundColor: '#000000', opacity: 1 - hsv.v }]}
            />
            <View
              pointerEvents="none"
              style={[styles.thumb, { left: thumbX - THUMB / 2, top: thumbY - THUMB / 2, backgroundColor: hex }]}
            />
          </View>
        </GestureDetector>

        <GestureDetector gesture={barPan}>
          <View
            style={styles.bar}
            onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
            accessibilityRole="adjustable"
            accessibilityLabel="Brightness"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(hsv.v * 100) }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) =>
              pick({ ...hsv, v: clamp(hsv.v + (e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1)) })
            }>
            <Svg width="100%" height={BAR} style={styles.barTrack}>
              <Defs>
                <LinearGradient id="brightness" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#000000" />
                  <Stop offset="1" stopColor={hsvToHex(hsv.h, hsv.s, 1)} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height={BAR} rx={BAR / 2} fill="url(#brightness)" />
            </Svg>
            <View
              pointerEvents="none"
              style={[
                styles.thumb,
                { left: hsv.v * barWidth - THUMB / 2, top: (BAR - THUMB) / 2, backgroundColor: hex },
              ]}
            />
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    </BottomSheet>
  );
}

/** Full-brightness hues around the edge, fading to white at the centre. Drawn once per size. */
export function HueWheel({ size = SIZE, slices = WEDGES }: { size?: number; slices?: number }) {
  const r = size / 2;
  // On web, gradient ids are document-wide, so each wheel needs its own.
  const id = `saturation-${useId().replace(/:/g, '')}`;
  const wedges = useMemo(() => {
    const step = 360 / slices;
    return Array.from({ length: slices }, (_, i) => {
      // A little overlap so the slices don't leave hairline seams.
      const a0 = ((i * step - 0.5) * Math.PI) / 180;
      const a1 = (((i + 1) * step + 0.5) * Math.PI) / 180;
      const d = `M${r},${r} L${r + r * Math.cos(a0)},${r + r * Math.sin(a0)} A${r},${r} 0 0 1 ${r + r * Math.cos(a1)},${r + r * Math.sin(a1)} Z`;
      return <Path key={i} d={d} fill={hsvToHex(i * step + step / 2, 1, 1)} />;
    });
  }, [r, slices]);

  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx={r} cy={r} r={r} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {wedges}
      <Circle cx={r} cy={r} r={r} fill={`url(#${id})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  sheet: {
    // GestureHandlerRootView defaults to flex: 1; the sheet sizes to its content instead.
    flexGrow: 0,
    flexBasis: 'auto',
    borderRadius: Radius,
    borderCurve: 'continuous',
    overflow: 'hidden',
    paddingBottom: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
  sample: {
    height: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sampleText: {
    fontWeight: 600,
  },
  hexField: {
    flex: 1,
    minWidth: 0,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  hexDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  hexInput: {
    ...textStyle('body'),
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
  },
  wheel: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
  },
  round: {
    borderRadius: R,
  },
  bar: {
    height: BAR,
    marginTop: Spacing.four,
    marginHorizontal: Spacing.four,
  },
  barTrack: {
    borderRadius: BAR / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.35)',
  },
});
