import { StyleSheet, Text, type TextProps } from 'react-native';

import { font, type TextStyleName, TextStyles, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  /** A text style from the type scale. Defaults to `body`. */
  type?: TextStyleName;
  themeColor?: ThemeColor;
  /** Tabular figures, for numbers that change in place (timers, weights, counts). */
  numeric?: boolean;
};

export function ThemedText({ style, type = 'body', themeColor, numeric, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const { narrow, ...base } = TextStyles[type] as (typeof TextStyles)[TextStyleName] & { narrow?: boolean };
  // Archivo ships one family per weight, so turn the final weight (a style override wins) into a family.
  const flat = StyleSheet.flatten(style) ?? {};
  const family = font(flat.fontWeight ?? base.fontWeight, narrow);

  return (
    <Text
      style={[
        base,
        { color: theme[themeColor ?? 'text'] },
        numeric && { fontVariant: ['tabular-nums'] },
        style,
        family,
        { fontWeight: undefined },
      ]}
      {...rest}
    />
  );
}
