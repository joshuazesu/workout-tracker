import { useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { DayBoxes } from '@/components/cards';
import { Icon } from '@/components/icon';
import { Section } from '@/components/list';
import { BmiField, HeightField, NameField, UnitsChoice, WeightField } from '@/components/profile-fields';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { feedback } from '@/lib/feedback';
import { enableReminders } from '@/lib/reminders';
import { CHALLENGES, useWorkoutStore, workoutActions } from '@/lib/workouts';

const kickstart = CHALLENGES.kickstart;
/** Reminders can't be scheduled on web, so the challenge page is the last one there. */
const hasReminders = Platform.OS !== 'web';

/**
 * Intro pages side by side in a horizontal pager, so they can be swiped back and forth. The
 * challenge buttons scroll to the next page; only the last page's buttons finish onboarding.
 */
export default function OnboardingScreen() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const pager = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [acceptChallenge, setAcceptChallenge] = useState(false);
  const { profile, units, showBmi } = useWorkoutStore();

  const goTo = (i: number) => pager.current?.scrollTo({ x: i * width, animated: !reduceMotion });

  const next = (accept = acceptChallenge) => {
    feedback.tap();
    setAcceptChallenge(accept);
    goTo(page + 1);
  };

  const finish = async (withReminders: boolean, accept = acceptChallenge) => {
    if (withReminders) await enableReminders();
    // Flipping `onboarded` unlocks the main stack, which routes to home.
    workoutActions.completeOnboarding(accept);
  };

  const pages = [
    {
      icon: { ios: 'figure.strengthtraining.traditional', md: 'fitness_center' } as const,
      title: 'Log your lifts.\nBuild the habit.',
      body: 'Pick a workout, tick off each set as you go, and watch your consistency stack up.',
    },
    {
      icon: { ios: 'gift', md: 'redeem' } as const,
      title: 'Every lift earns\nyou Logs',
      body: 'Spend Logs on items in the app.',
    },
    {
      icon: { ios: 'person.crop.circle', md: 'account_circle' } as const,
      title: 'About you',
      body: 'Fills in your profile and starts your weight log. All optional, and you can change them any time in Settings.',
      // The fields save as they're entered, so there's nothing to confirm; swipe on.
      extra: (
        <Section>
          <NameField profile={profile} />
          <UnitsChoice units={units} />
          <HeightField key={`height-${units}`} profile={profile} units={units} />
          <WeightField key={`weight-${units}`} profile={profile} units={units} />
          {showBmi && <BmiField profile={profile} />}
        </Section>
      ),
    },
    {
      icon: { ios: 'calendar.badge.checkmark', md: 'event_available' } as const,
      title: `Take the ${kickstart.title}`,
      body: `${kickstart.blurb} Finish it to earn your first trophy.`,
      extra: <DayBoxes done={0} total={kickstart.days} doneToday={false} />,
      actions: (
        <>
          <Button label="I’m In" onPress={() => (hasReminders ? next(true) : finish(false, true))} />
          <Button
            label="Maybe Later"
            variant="plain"
            onPress={() => (hasReminders ? next(false) : finish(false, false))}
          />
        </>
      ),
    },
    ...(!hasReminders
      ? []
      : [
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
        ]),
  ];

  // Follows the finger, so the dots and buttons switch as soon as a page is mostly in view.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const current = Math.min(pages.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / width)));
    if (current !== page) {
      setPage(current);
      Keyboard.dismiss();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundPlain }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={16}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w === width) return;
            setWidth(w);
            // Keep the same page in view after a resize.
            pager.current?.scrollTo({ x: page * w, animated: false });
          }}
          style={styles.flex}>
          {width > 0 &&
            pages.map((p, i) => (
              <ScrollView
                key={i}
                style={{ width }}
                contentContainerStyle={styles.page}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <View style={styles.body}>
                  <Icon name={p.icon} size={56} color={theme.accent} />
                  <ThemedText type="largeTitle">{p.title}</ThemedText>
                  <ThemedText type="body" themeColor="textSecondary">
                    {p.body}
                  </ThemedText>
                  {p.extra}
                </View>
              </ScrollView>
            ))}
        </ScrollView>

        <View style={styles.footer}>
          {/* Same height on every page, so the dots below don't move as buttons come and go. */}
          <View style={styles.actions}>
            {pages[page].actions ?? (
              <ThemedText type="footnote" themeColor="textSecondary" style={styles.hint}>
                Swipe to continue
              </ThemedText>
            )}
          </View>
          {/* Tappable too, since a mouse on web can't swipe. */}
          <View style={styles.pager}>
            {pages.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => goTo(i)}
                accessibilityRole="button"
                accessibilityLabel={`Page ${i + 1} of ${pages.length}`}
                accessibilityState={{ selected: i === page }}
                style={styles.pagerHit}>
                <View
                  style={[
                    styles.pagerDot,
                    { backgroundColor: i === page ? theme.text : theme.fillStrong, width: i === page ? 20 : 8 },
                  ]}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: Spacing.four,
  },
  flex: {
    flex: 1,
  },
  page: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  body: {
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
    paddingHorizontal: Spacing.four,
  },
  actions: {
    minHeight: 52 * 2 + Spacing.two,
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  hint: {
    textAlign: 'center',
    paddingBottom: Spacing.three,
  },
  pager: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  pagerHit: {
    height: 28,
    paddingHorizontal: Spacing.half,
    justifyContent: 'center',
  },
  pagerDot: {
    height: 8,
    borderRadius: 4,
  },
});
