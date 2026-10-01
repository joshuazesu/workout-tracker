import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/** A ring that fills clockwise from 12 o'clock, with a count in the middle (e.g. "2 of 13" sets). */
export function ProgressRing({
  value,
  total,
  size = 68,
  stroke = 8,
}: {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
}) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityLabel={`${value} of ${total} sets done`}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.fill} strokeWidth={stroke} fill="none" />
        {progress > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={theme.accent}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - progress)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <ThemedText type="title3" numeric style={styles.value}>
          {value}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numeric>
          of {total}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    lineHeight: 22,
  },
});
