import { Platform } from 'react-native';

import { useNow } from '@/hooks/use-now';
import { useRemindersEnabled } from '@/lib/reminders';
import { challengeProgress, useWorkoutStore } from '@/lib/workouts';

/**
 * Which tabs have something waiting, keyed by tab name. Derived from state, never stored, so a dot
 * clears as soon as the thing is dealt with.
 */
export function useTabBadges(): Record<string, boolean> {
  const { challenge, history, profile } = useWorkoutStore();
  const now = useNow();
  // null while checking. Web has no reminders, so it never counts as off there (as in RemindersPrompt).
  const [remindersOn] = useRemindersEnabled();
  const remindersOff = Platform.OS !== 'web' && remindersOn === false;

  return {
    // No challenge running, one to follow up, or one that ran out.
    challenges:
      !challenge || Boolean(challenge.completedAt) || challengeProgress(challenge, history, now).expired,
    profile: !profile.name.trim() || remindersOff,
  };
}
