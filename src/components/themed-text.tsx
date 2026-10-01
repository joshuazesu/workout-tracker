import { Text, type TextProps } from 'react-native';

import { type TextStyleName, TextStyles, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  /** An iOS text style. Defaults to `body`. */
  type?: TextStyleName;
  themeColor?: ThemeColor;
  /** Tabular figures, for numbers that change in place (timers, weights, counts). */
  numeric?: boolean;
};

export function ThemedText({ style, type = 'body', themeColor, numeric, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        TextStyles[type],
        { color: theme[themeColor ?? 'text'] },
        numeric && { fontVariant: ['tabular-nums'] },
        style,
      ]}
      {...rest}
    />
  );
}
