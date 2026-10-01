import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Section } from '@/components/list';
import { PromptDialog } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { EASE_OUT } from '@/constants/motion';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { feedback } from '@/lib/feedback';
import { fromDisplayWeight, toDisplayWeight, weightUnit } from '@/lib/units';
import {
  type ChangeColor,
  profileActions,
  type Units,
  useWorkoutStore,
  type WeightChange,
  weightChanges,
  type WeightEntry,
} from '@/lib/workouts';

/** How long each weight change stays up before the next one fades in. */
const ROTATE_MS = 5000;

/** The change in the user's unit, rounded the way it's shown, so "0.0" counts as no change. */
const shown = (change: WeightChange, units: Units) =>
  Math.sign(change.kg) * toDisplayWeight(Math.abs(change.kg), units);

const changeLabel = (change: WeightChange, units: Units) => {
  const period = change.since === 'start' ? 'from starting weight' : `over last ${change.since} days`;
  const value = shown(change, units);
  if (value === 0) return `No change ${period}`;
  return `${value > 0 ? 'Up' : 'Down'} ${Math.abs(value)} ${weightUnit(units)} ${period}`;
};

/**
 * "↓ Down 1.2 kg from starting weight", cycling through the last 7, 12 and 30 days every few
 * seconds. Tapping shows the next one. Gains and losses take the colours picked in Settings.
 */
export function WeightDelta() {
  const theme = useTheme();
  const { weights, units, weightColors } = useWorkoutStore();
  const now = useNow();
  const changes = weightChanges(weights, now);
  const [index, setIndex] = useState(0);
  const count = changes.length;

  // Restarts on every change, so a tap gets its full turn before the next one.
  useEffect(() => {
    if (count < 2) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearTimeout(id);
  }, [index, count]);

  if (count === 0) return null;
  const change = changes[index % count];
  const value = shown(change, units);
  const tone: Record<ChangeColor, string> = { green: theme.positive, red: theme.destructive, neutral: theme.text };
  const color = value > 0 ? tone[weightColors.gain] : value < 0 ? tone[weightColors.loss] : theme.textSecondary;

  return (
    <Pressable
      onPress={() => count > 1 && setIndex((i) => (i + 1) % count)}
      accessibilityRole="text"
      accessibilityLabel={changes.map((c) => changeLabel(c, units)).join('. ')}>
      <Animated.View
        key={`${change.since}-${value}`}
        entering={FadeIn.duration(250).easing(EASE_OUT)}
        style={styles.delta}>
        <Icon
          name={
            value > 0
              ? { ios: 'arrow.up', md: 'arrow_upward' }
              : value < 0
                ? { ios: 'arrow.down', md: 'arrow_downward' }
                : { ios: 'minus', md: 'remove' }
          }
          size={14}
          color={color}
          weight="bold"
        />
        <ThemedText type="subheadline" numeric style={[styles.deltaText, { color }]}>
          {changeLabel(change, units)}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

const CHART_HEIGHT = 168;
/** Room above and below the line so the end dot and the axis labels aren't clipped. */
const PLOT_PAD = 10;
const AXIS_WIDTH = 40;

/**
 * Body weight over time: a smooth line with a blue wash under it, three light rules with their values,
 * and the first and last dates underneath. Logging again on the same day replaces that day's reading.
 */
export function WeightCard() {
  const theme = useTheme();
  const { weights, units } = useWorkoutStore();
  const [logging, setLogging] = useState(false);
  const latest = weights.at(-1);

  const log = (text: string) => {
    const value = Number(text.replace(',', '.'));
    if (!(value > 0 && value < 2000)) return;
    profileActions.logWeight(fromDisplayWeight(value, units));
    feedback.tap();
  };

  return (
    <Section
      title="Weight"
      trailing={
        weights.length > 0 ? (
          <Button label="Log weight" variant="tinted" size="small" onPress={() => setLogging(true)} />
        ) : undefined
      }
      padded>
      {weights.length === 0 ? (
        <View style={styles.empty}>
          <Icon name={{ ios: 'scalemass', md: 'monitor_weight' }} size={28} color={theme.textSecondary} />
          <ThemedText type="title3">Track your weight</ThemedText>
          <ThemedText type="subheadline" themeColor="textSecondary" style={styles.emptyText}>
            Log it each morning and watch the line move.
          </ThemedText>
          <Button label="Log weight" variant="tinted" size="small" onPress={() => setLogging(true)} />
        </View>
      ) : (
        <>
          <WeightChart weights={weights} units={units} />
          {weights.length === 1 && (
            <ThemedText type="subheadline" themeColor="textSecondary">
              Log again on another day to start your line.
            </ThemedText>
          )}
        </>
      )}
      <PromptDialog
        title={`Today’s weight (${weightUnit(units)})`}
        initialValue={latest ? String(toDisplayWeight(latest.kg, units)) : ''}
        placeholder="0"
        keyboardType="decimal-pad"
        visible={logging}
        onSubmit={log}
        onClose={() => setLogging(false)}
      />
    </Section>
  );
}

function WeightChart({ weights, units }: { weights: WeightEntry[]; units: Units }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const plotWidth = Math.max(0, width - AXIS_WIDTH);
  const unit = weightUnit(units);

  // Everything below is in the user's unit, so the axis reads in round kg or lb.
  const values = weights.map((w) => toDisplayWeight(w.kg, units));
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // A little headroom, and at least ±1 so a flat week doesn't look like a cliff.
  const pad = Math.max(1, (hi - lo) * 0.15);
  const min = Math.floor(lo - pad);
  const max = Math.ceil(hi + pad);
  const first = weights[0].day;
  const span = weights.at(-1)!.day - first;

  const plotTop = PLOT_PAD;
  const plotBottom = CHART_HEIGHT - PLOT_PAD;
  const toY = (value: number) => plotBottom - ((value - min) / (max - min)) * (plotBottom - plotTop);
  // Spaced by date, not by entry, so a gap in logging shows as a gap. Inset so the end dot fits.
  const toX = (day: number) => (span === 0 ? plotWidth / 2 : 6 + ((day - first) / span) * (plotWidth - 12));
  const points = weights.map((w, i) => ({ x: toX(w.day), y: toY(values[i]) }));
  const line = smoothPath(points);
  const end = points.at(-1)!;
  const area = points.length > 1 ? `${line} L${end.x},${plotBottom} L${points[0].x},${plotBottom} Z` : '';
  const ticks = [max, (max + min) / 2, min];
  const date = (day: number) => new Date(day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  return (
    <View
      accessible
      accessibilityLabel={`Weight chart. ${weights.length} readings from ${date(first)}, ${values[0]} ${unit}, to ${date(weights.at(-1)!.day)}, ${values.at(-1)} ${unit}.`}>
      <View style={{ height: CHART_HEIGHT }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {plotWidth > 0 && (
          <Svg width={width} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="weightWash" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={theme.accent} stopOpacity={0.28} />
                <Stop offset="1" stopColor={theme.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {ticks.map((value) => (
              <Line
                key={value}
                x1={0}
                x2={plotWidth}
                y1={toY(value)}
                y2={toY(value)}
                stroke={theme.separator}
                strokeWidth={1}
              />
            ))}
            {area !== '' && <Path d={area} fill="url(#weightWash)" />}
            {line !== '' && (
              <Path d={line} fill="none" stroke={theme.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            )}
            <Circle cx={end.x} cy={end.y} r={5} fill={theme.accent} stroke={theme.background} strokeWidth={2} />
          </Svg>
        )}
        {ticks.map((value) => (
          <ThemedText
            key={value}
            type="footnote"
            themeColor="textSecondary"
            numeric
            style={[styles.tick, { top: toY(value) - 9 }]}>
            {Number.isInteger(value) ? value : value.toFixed(1)}
          </ThemedText>
        ))}
      </View>
      <View style={[styles.dates, { marginRight: AXIS_WIDTH }]}>
        <ThemedText type="footnote" themeColor="textSecondary">
          {date(first)}
        </ThemedText>
        {span > 0 && (
          <ThemedText type="footnote" themeColor="textSecondary">
            {date(weights.at(-1)!.day)}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

/**
 * A smooth curve through the points that never overshoots them (monotone cubic, Fritsch–Carlson),
 * so the line doesn't invent a dip below the lowest reading.
 */
function smoothPath(points: { x: number; y: number }[]): string {
  const n = points.length;
  if (n < 2) return '';
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1].x - points[i].x;
    slope[i] = dx[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / dx[i];
  }
  const tangent = points.map((_, i) =>
    i === 0 ? slope[0] : i === n - 1 ? slope[n - 2] : slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
  );
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      tangent[i] = k * a * slope[i];
      tangent[i + 1] = k * b * slope[i];
    }
  }
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const third = dx[i] / 3;
    d += ` C${points[i].x + third},${points[i].y + tangent[i] * third} ${points[i + 1].x - third},${points[i + 1].y - tangent[i + 1] * third} ${points[i + 1].x},${points[i + 1].y}`;
  }
  return d;
}

const styles = StyleSheet.create({
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  deltaText: {
    fontWeight: 600,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  emptyText: {
    textAlign: 'center',
  },
  tick: {
    position: 'absolute',
    right: 0,
    width: AXIS_WIDTH - 6,
    textAlign: 'right',
  },
  dates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
});
