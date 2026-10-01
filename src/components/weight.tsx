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
import { profileActions, type WeightChange, weightChanges, type WeightEntry } from '@/lib/workouts';

/** How long each weight change stays up before the next one fades in. */
const ROTATE_MS = 5000;

const changeLabel = ({ kg, since }: WeightChange) => {
  const period = since === 'start' ? 'from starting weight' : `over last ${since} days`;
  if (kg === 0) return `No change ${period}`;
  return `${kg > 0 ? 'Up' : 'Down'} ${Math.abs(kg)} kg ${period}`;
};

/**
 * "↓ Down 1.2 kg from starting weight", cycling through the last 7, 12 and 30 days every few
 * seconds. Tapping shows the next one. Losing weight is green and gaining red.
 */
export function WeightDelta({ weights }: { weights: WeightEntry[] }) {
  const theme = useTheme();
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
  const color = change.kg > 0 ? theme.destructive : change.kg < 0 ? theme.positive : theme.textSecondary;

  return (
    <Pressable
      onPress={() => count > 1 && setIndex((i) => (i + 1) % count)}
      accessibilityRole="text"
      accessibilityLabel={changes.map(changeLabel).join('. ')}>
      <Animated.View
        key={`${change.since}-${change.kg}`}
        entering={FadeIn.duration(250).easing(EASE_OUT)}
        style={styles.delta}>
        <Icon
          name={
            change.kg > 0
              ? { ios: 'arrow.up', md: 'arrow_upward' }
              : change.kg < 0
                ? { ios: 'arrow.down', md: 'arrow_downward' }
                : { ios: 'minus', md: 'remove' }
          }
          size={14}
          color={color}
          weight="bold"
        />
        <ThemedText type="subheadline" numeric style={[styles.deltaText, { color }]}>
          {changeLabel(change)}
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
 * Body weight over time: a smooth line with a blue wash under it, three light rules with their kg,
 * and the first and last dates underneath. Logging again on the same day replaces that day's reading.
 */
export function WeightCard({ weights }: { weights: WeightEntry[] }) {
  const theme = useTheme();
  const [logging, setLogging] = useState(false);
  const latest = weights.at(-1);

  const log = (text: string) => {
    const kg = Number(text.replace(',', '.'));
    if (!(kg > 0 && kg < 1000)) return;
    profileActions.logWeight(Math.round(kg * 10) / 10);
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
          <WeightChart weights={weights} />
          {weights.length === 1 && (
            <ThemedText type="subheadline" themeColor="textSecondary">
              Log again on another day to start your line.
            </ThemedText>
          )}
        </>
      )}
      <PromptDialog
        title="Today’s weight (kg)"
        initialValue={latest ? String(latest.kg) : ''}
        placeholder="0"
        keyboardType="decimal-pad"
        visible={logging}
        onSubmit={log}
        onClose={() => setLogging(false)}
      />
    </Section>
  );
}

function WeightChart({ weights }: { weights: WeightEntry[] }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const plotWidth = Math.max(0, width - AXIS_WIDTH);

  const kgs = weights.map((w) => w.kg);
  const lo = Math.min(...kgs);
  const hi = Math.max(...kgs);
  // A little headroom, and at least ±1 kg so a flat week doesn't look like a cliff.
  const pad = Math.max(1, (hi - lo) * 0.15);
  const min = Math.floor(lo - pad);
  const max = Math.ceil(hi + pad);
  const first = weights[0].day;
  const span = weights.at(-1)!.day - first;

  const plotTop = PLOT_PAD;
  const plotBottom = CHART_HEIGHT - PLOT_PAD;
  const toY = (kg: number) => plotBottom - ((kg - min) / (max - min)) * (plotBottom - plotTop);
  // Spaced by date, not by entry, so a gap in logging shows as a gap. Inset so the end dot fits.
  const toX = (day: number) => (span === 0 ? plotWidth / 2 : 6 + ((day - first) / span) * (plotWidth - 12));
  const points = weights.map((w) => ({ x: toX(w.day), y: toY(w.kg) }));
  const line = smoothPath(points);
  const end = points.at(-1)!;
  const area = points.length > 1 ? `${line} L${end.x},${plotBottom} L${points[0].x},${plotBottom} Z` : '';
  const ticks = [max, (max + min) / 2, min];
  const date = (day: number) => new Date(day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  return (
    <View
      accessible
      accessibilityLabel={`Weight chart. ${weights.length} readings from ${date(first)}, ${weights[0].kg} kg, to ${date(weights.at(-1)!.day)}, ${weights.at(-1)!.kg} kg.`}>
      <View style={{ height: CHART_HEIGHT }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {plotWidth > 0 && (
          <Svg width={width} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="weightWash" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={theme.accent} stopOpacity={0.28} />
                <Stop offset="1" stopColor={theme.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {ticks.map((kg) => (
              <Line
                key={kg}
                x1={0}
                x2={plotWidth}
                y1={toY(kg)}
                y2={toY(kg)}
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
        {ticks.map((kg) => (
          <ThemedText
            key={kg}
            type="footnote"
            themeColor="textSecondary"
            numeric
            style={[styles.tick, { top: toY(kg) - 9 }]}>
            {Number.isInteger(kg) ? kg : kg.toFixed(1)}
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
