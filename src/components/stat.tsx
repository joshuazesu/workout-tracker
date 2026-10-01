import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}
