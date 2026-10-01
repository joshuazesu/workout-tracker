import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconName = Parameters<typeof Icon>[0]['name'];

/**
 * An inset grouped section, like a block in iOS Settings or Health: an optional bold title, a white
 * rounded surface whose rows get hairline separators, and an optional footnote below.
 */
export function Section({
  title,
  trailing,
  footer,
  children,
  padded = false,
  inset,
  style,
}: {
  title?: string;
  /** Small text or a control on the right of the title, e.g. "3 of 5". */
  trailing?: ReactNode;
  footer?: string;
  children: ReactNode;
  /** Pad the surface for free-form content instead of rows. */
  padded?: boolean;
  /** Separator inset; rows with a leading symbol line up with the text at `RowIconInset`. */
  inset?: number;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={[styles.section, style]}>
      {(title || trailing) && (
        <View style={styles.header}>
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
      <View style={[styles.surface, padded && styles.padded, { backgroundColor: theme.surface }]}>
        {padded
          ? children
          : rows.map((row, i) => (
              <Fragment key={row.key ?? i}>
                {i > 0 && <Separator inset={inset} />}
                {row}
              </Fragment>
            ))}
      </View>
      {footer && (
        <ThemedText type="footnote" themeColor="textSecondary" style={styles.footer}>
          {footer}
        </ThemedText>
      )}
    </View>
  );
}

/** Separator inset that lines up with the label of a `Row` that has an icon. */
export const RowIconInset = Spacing.three + 22 + Spacing.three - 4;

/** Hairline between rows, inset from the leading edge like iOS lists. */
export function Separator({ inset = Spacing.three }: { inset?: number }) {
  const theme = useTheme();
  return <View style={[styles.separator, { marginLeft: inset, backgroundColor: theme.separator }]} />;
}

/** A tappable list row with an optional leading symbol and trailing chevron. */
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
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.fillStrong }]}>
      {icon && <Icon name={icon} size={22} color={iconColor ?? color ?? theme.accent} />}
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
  section: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  title: {
    flex: 1,
    fontWeight: 700,
  },
  surface: {
    borderRadius: Radius,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  padded: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  footer: {
    paddingHorizontal: Spacing.three,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
});
