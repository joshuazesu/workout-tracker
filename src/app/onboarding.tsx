import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { DayBoxes } from '@/components/cards';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { feedback } from '@/lib/feedback';
import { enableReminders } from '@/lib/reminders';
import { CHALLENGES, workoutActions } from '@/lib/workouts';

const kickstart = CHALLENGES.kickstart;

export default function OnboardingScreen() {
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const [acceptChallenge, setAcceptChallenge] = useState(false);

  const next = (accept = acceptChallenge) => {
    feedback.tap();
    setAcceptChallenge(accept);
    // Reminders can't be scheduled on web, so skip straight past that step there.
    if (step === 1 && Platform.OS === 'web') workoutActions.completeOnboarding(accept);
    else setStep(step + 1);
  };

  const finish = async (withReminders: boolean) => {
    if (withReminders) await enableReminders();
    // Flipping `onboarded` unlocks the main stack, which routes to home.
    workoutActions.completeOnboarding(acceptChallenge);
  };

  const steps = [
    {
      icon: { ios: 'figure.strengthtraining.traditional', md: 'fitness_center' } as const,
      title: 'Log every set.\nBuild the habit.',
      body: 'Pick a workout, tick off each set as you go, and watch your consistency stack up.',
      actions: <Button label="Get Started" onPress={() => next()} />,
    },
    {
      icon: { ios: 'calendar.badge.checkmark', md: 'event_available' } as const,
      title: `Take the ${kickstart.title}`,
      body: `${kickstart.blurb} Finish it to earn your first trophy.`,
      extra: <DayBoxes done={0} total={kickstart.days} doneToday={false} />,
      actions: (
        <>
          <Button label="I’m In" onPress={() => next(true)} />
          <Button label="Maybe Later" variant="plain" onPress={() => next(false)} />
        </>
      ),
    },
    {
      icon: { ios: 'bell.badge', md: 'notifications_active' } as const,
      title: 'Want a nudge?',
      body: acceptChallenge
        ? 'We’ll check in each evening until your challenge is done, and give you a nudge if a week goes by without a workout.'
        : 'We’ll give you a nudge if you go a few days without a workout. No spam, just a push when you need it.',
      actions: (
        <>
          <Button label="Turn On Reminders" onPress={() => finish(true)} />
          <Button label="Not Now" variant="plain" onPress={() => finish(false)} />
        </>
      ),
    },
  ];
  // Web skips the reminders step, so it shouldn't show a dot for it.
  const stepCount = Platform.OS === 'web' ? 2 : steps.length;
  const current = steps[step];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundPlain }]}>
      <Animated.View key={step} entering={FadeInDown.duration(350)} exiting={FadeOut.duration(150)} style={styles.body}>
        <Icon name={current.icon} size={56} color={theme.accent} />
        <ThemedText type="largeTitle">{current.title}</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          {current.body}
        </ThemedText>
        {current.extra}
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.pager}>
          {steps.slice(0, stepCount).map((_, i) => (
            <View
              key={i}
              style={[
                styles.pagerDot,
                { backgroundColor: i === step ? theme.text : theme.fillStrong, width: i === step ? 20 : 8 },
              ]}
            />
          ))}
        </View>
        {current.actions}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  footer: {
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  pager: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  pagerDot: {
    height: 8,
    borderRadius: 4,
  },
});
