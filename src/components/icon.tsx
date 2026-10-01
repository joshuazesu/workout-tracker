import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type SymbolName = Extract<SymbolViewProps['name'], object>;

/**
 * An SF Symbol on iOS, the matching Material Symbol on Android and web.
 * Pass both names, e.g. `{ ios: 'calendar', md: 'calendar_month' }`.
 */
export function Icon({
  name,
  size = 22,
  color,
  weight,
}: {
  name: { ios: SymbolName['ios']; md: NonNullable<SymbolName['android']> };
  size?: number;
  color?: ColorValue;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}) {
  const theme = useTheme();
  return (
    <SymbolView
      name={{ ios: name.ios, android: name.md, web: name.md }}
      size={size}
      tintColor={color ?? theme.text}
      weight={weight}
      style={{ width: size, height: size }}
    />
  );
}
