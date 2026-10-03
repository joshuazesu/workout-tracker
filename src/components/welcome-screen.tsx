import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { WELCOME_SETTLED_MS, WelcomeMark } from '@/components/welcome-mark';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { feedback } from '@/lib/feedback';

/** How long the final frame holds after a tap cuts the animation short, so the cut reads before moving on. */
const CUT_HOLD_MS = 250;

/**
 * The welcome screen: the LogMyLift lockup and "Tap to continue". A tap before the lockup has
 * settled cuts it to its final frame first, then continues.
 */
export function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [settled, setSettled] = useState(false);
  const startedAt = useRef(0);
  const tapped = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    startedAt.current = Date.now();
    return () => clearTimeout(timer.current);
  }, []);

  const onPress = () => {
    if (tapped.current) return;
    tapped.current = true;
    feedback.tap();
    if (reduceMotion || Date.now() - startedAt.current >= WELCOME_SETTLED_MS) {
      onContinue();
      return;
    }
    setSettled(true);
    timer.current = setTimeout(onContinue, CUT_HOLD_MS);
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="LogMyLift. Tap to continue"
      style={styles.flex}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundPlain }]}>
        <Animated.View exiting={FadeOut.duration(150)} style={styles.body}>
          <WelcomeMark settled={settled} />
        </Animated.View>
        {/* Only once the log has stopped and the name is in. */}
        <Animated.View entering={FadeIn.delay(WELCOME_SETTLED_MS).duration(250)}>
          <ThemedText type="subheadline" themeColor="textSecondary" style={styles.hint}>
            Tap to continue
          </ThemedText>
        </Animated.View>
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: Spacing.four,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  hint: {
    textAlign: 'center',
    paddingBottom: Spacing.three,
  },
});
