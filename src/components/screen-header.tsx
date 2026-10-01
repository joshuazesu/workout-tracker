import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The ledger header on tab screens: a big condensed title, an optional line of context under it,
 * header buttons on the right, and a heavy ink rule closing it off.
 */
export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // On web the native tabs render as a bar across the top; keep the title clear of it.
  const top = insets.top + Spacing.three + (Platform.OS === 'web' ? 64 : 0);
  return (
    <View style={[styles.header, { paddingTop: top, borderBottomColor: theme.text }]}>
      <View style={styles.text}>
        <ThemedText type="display" accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText type="subheadline" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingBottom: Spacing.three - 4,
    borderBottomWidth: 2,
  },
  text: {
    flex: 1,
    gap: Spacing.one,
  },
});
