import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { CHALLENGES, type Challenge, challengeProgress, dayKey, type Workout } from '@/lib/workouts';

/**
 * Retention nudges, scheduled on-device so they work offline and in Expo Go (remote push needs a
 * server and a development build). The whole schedule is rebuilt from scratch each time workout
 * history or the challenge changes, so logging a workout pushes every "come back" nudge forward.
 */

const supported = Platform.OS !== 'web';
const REMIND_HOUR = 18;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Days after the last workout to knock: gently at first, then every few days once it's been a week. */
const INACTIVITY_DAYS = [2, 4, 7, 10, 13, 16, 19, 22, 25, 28, 35, 42, 49, 56];

const INACTIVITY_COPY: Record<number, { title: string; body: string }> = {
  2: { title: 'Ready for round two?', body: 'Your next session is one tap away.' },
  4: { title: 'Don’t lose the momentum', body: 'A quick workout today keeps the streak alive.' },
  7: { title: 'It’s been a week 👀', body: 'No workouts logged in 7 days. Ready to get back at it?' },
};

const LATER_COPY = [
  { title: 'Hey, don’t forget to work out', body: 'Even 20 minutes counts. Start a session now.' },
  { title: 'Your future self says hi', body: 'Pick a workout and log one set. That’s all it takes.' },
  { title: 'Still there?', body: 'Your routines are waiting. Jump back in today.' },
];

if (supported) {
  // Reminders are about coming back, so don't show them while the app is already open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: false,
    }),
  });
}

async function granted() {
  if (!supported) return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/** Asks for permission. Returns whether reminders can be sent. */
export async function enableReminders(): Promise<boolean> {
  if (!supported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Workout reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!current.canAskAgain) {
    // iOS only asks once; after that the switch lives in Settings.
    Linking.openSettings();
    return false;
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Whether reminders are on, rechecked when the app returns from Settings. */
export function useRemindersEnabled(): [boolean | null, () => void] {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    const check = () => granted().then(setEnabled);
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);
  const turnOn = () => {
    enableReminders().then(setEnabled);
  };
  return [enabled, turnOn];
}

function atReminderHour(ts: number) {
  const d = new Date(ts);
  d.setHours(REMIND_HOUR, 0, 0, 0);
  return d.getTime();
}

type Reminder = { at: number; title: string; body: string };

export function planReminders(history: Workout[], challenge: Challenge | null, now = Date.now()): Reminder[] {
  const reminders: Reminder[] = [];
  const takenDays = new Set<string>();

  // Challenge check-ins: every remaining evening until it's won, skipping days already trained.
  if (challenge && !challenge.completedAt) {
    const p = challengeProgress(challenge, history, now);
    if (!p.expired) {
      for (let at = atReminderHour(now); at < p.endsAt; at += DAY_MS) {
        if (at <= now || (p.doneToday && dayKey(at) === dayKey(now))) continue;
        const left = p.days - p.done;
        reminders.push({
          at,
          title: `${CHALLENGES[challenge.id].title}: ${left} to go`,
          body:
            at + DAY_MS >= p.endsAt
              ? 'Last day to finish your challenge. Log a workout tonight!'
              : `${p.done} of ${p.days} workout days done. Keep it going today.`,
        });
        takenDays.add(dayKey(at));
      }
    }
  }

  // Inactivity nudges, counted from the last workout (or from now if there isn't one yet).
  const last = history[0]?.startedAt ?? now;
  INACTIVITY_DAYS.forEach((days, i) => {
    const at = atReminderHour(last + days * DAY_MS);
    if (at <= now || takenDays.has(dayKey(at))) return;
    const copy = INACTIVITY_COPY[days] ?? LATER_COPY[i % LATER_COPY.length];
    reminders.push({ at, ...copy });
  });

  return reminders.sort((a, b) => a.at - b.at);
}

export async function syncReminders(history: Workout[], challenge: Challenge | null) {
  if (!(await granted())) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  // iOS keeps at most 64 pending notifications.
  for (const r of planReminders(history, challenge).slice(0, 60)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(r.at),
        channelId: 'reminders',
      },
    });
  }
}
