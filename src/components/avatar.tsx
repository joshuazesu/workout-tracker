import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Profile } from '@/lib/workouts';

/** Profile photo, else the first initial, else a person symbol, on a neutral circle like Contacts. */
export function Avatar({ profile, size }: { profile: Profile; size: number }) {
  const theme = useTheme();
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (profile.photoUri) {
    return <Image source={{ uri: profile.photoUri }} style={round} contentFit="cover" transition={200} />;
  }
  const initial = profile.name.trim().charAt(0).toUpperCase();
  return (
    <View style={[round, styles.fallback, { backgroundColor: theme.avatar }]}>
      {initial ? (
        <ThemedText style={{ color: '#FFFFFF', fontSize: size * 0.42, lineHeight: size * 0.5, fontWeight: 600 }}>
          {initial}
        </ThemedText>
      ) : (
        <Icon name={{ ios: 'person.fill', md: 'person' }} size={size * 0.5} color="#FFFFFF" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
