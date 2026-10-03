import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTapGuard } from '@/hooks/use-tap-guard';
import { useTheme } from '@/hooks/use-theme';

type IconName = Parameters<typeof Icon>[0]['name'];

/**
 * A ledger section: a bold title over an ink rule, then rows divided by light rules. No card behind
 * it; the page is the paper.
 */
export function Section({
  title,
  trailing,
  footer,
  children,
  padded = false,
  style,
}: {
  title?: string;
  /** Small text or a control on the right of the title, e.g. "3 of 5". */
  trailing?: ReactNode;
  footer?: string;
  children: ReactNode;
  /** Free-form content instead of rows. */
  padded?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={style}>
      {(title || trailing) && (
        <View style={[styles.header, { borderBottomColor: theme.text }]}>
          {title && (
            <ThemedText type="title3" style={styles.title} accessibilityRole="header">
              {title}
            </ThemedText>
          )}
          {typeof trailing === 'string' ? (
            <ThemedText type="subheadline" themeColor="textSecondary">
              {trailing}
            </ThemedText>
          ) : (
            trailing
          )}
        </View>
      )}
      {padded ? (
        <View style={styles.padded}>{children}</View>
      ) : (
        rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {i > 0 && <Separator />}
            {row}
          </Fragment>
        ))
      )}
      {footer && (
        <ThemedText type="footnote" themeColor="textSecondary" style={styles.footer}>
          {footer}
        </ThemedText>
      )}
    </View>
  );
}

/** Light rule between ledger rows. */
export function Separator() {
  const theme = useTheme();
  return <View style={[styles.separator, { backgroundColor: theme.separator }]} />;
}

/** A tappable ledger row with an optional leading symbol and trailing chevron. */
export function Row({
  label,
  detail,
  icon,
  iconColor,
  onPress,
  color,
  chevron = false,
  trailing,
  accessibilityLabel,
}: {
  label: string;
  detail?: string;
  icon?: IconName;
  iconColor?: string;
  onPress?: () => void;
  /** Text color, e.g. the tint for an action row or red for a destructive one. */
  color?: string;
  chevron?: boolean;
  trailing?: ReactNode;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const tap = useTapGuard();
  return (
    <Pressable
      onPressIn={tap.onPressIn}
      onPress={(e) => !tap.moved(e) && onPress?.()}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.fill }]}>
      {icon && <Icon name={icon} size={22} color={iconColor ?? color ?? theme.text} />}
      <View style={styles.rowText}>
        <ThemedText style={color ? { color } : undefined}>{label}</ThemedText>
        {detail && (
          <ThemedText type="subheadline" themeColor="textSecondary">
            {detail}
          </ThemedText>
        )}
      </View>
      {trailing}
      {chevron && <Icon name={{ ios: 'chevron.right', md: 'chevron_right' }} size={14} color={theme.textSecondary} weight="semibold" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
  },
  padded: {
    paddingTop: Spacing.three - 4,
    gap: Spacing.three - 4,
  },
  footer: {
    paddingTop: Spacing.two,
  },
  separator: {
    height: StyleSheet.hairlineWidth * 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    minHeight: 48,
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
});
