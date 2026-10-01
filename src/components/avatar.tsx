import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Profile } from '@/lib/workouts';

/** Profile photo, or the first initial on an accent circle when there isn't one. */
export function Avatar({ profile, size }: { profile: Profile; size: number }) {
  const theme = useTheme();
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (profile.photoUri) {
    return <Image source={{ uri: profile.photoUri }} style={round} contentFit="cover" transition={200} />;
  }
  return (
    <View style={[round, styles.fallback, { backgroundColor: theme.accent }]}>
      <ThemedText style={{ color: theme.onAccent, fontSize: size * 0.42, lineHeight: size * 0.5, fontWeight: 800 }}>
        {profile.name.trim().charAt(0).toUpperCase() || '🙂'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
