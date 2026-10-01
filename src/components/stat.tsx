import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

/** A labelled number, Fitness-style: small grey label over a bold tabular value. */
export function Stat({ label, value, align = 'left' }: { label: string; value: string; align?: 'left' | 'center' }) {
  return (
    <View style={[styles.stat, align === 'center' && styles.center]}>
      <ThemedText type="footnote" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="title3" numeric style={styles.value}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    gap: 2,
  },
  center: {
    alignItems: 'center',
  },
  value: {
    fontWeight: 700,
  },
});
