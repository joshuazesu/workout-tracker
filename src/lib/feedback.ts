import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const SOURCES = {
  set: require('@/assets/sounds/set.wav'),
  finish: require('@/assets/sounds/finish.wav'),
  challenge: require('@/assets/sounds/challenge.wav'),
};

type Sound = keyof typeof SOURCES;

// Players live for the app's lifetime so chimes start instantly instead of loading on tap.
const players: Partial<Record<Sound, AudioPlayer>> = {};
let audioModeSet = false;

function play(sound: Sound) {
  try {
    if (!audioModeSet) {
      audioModeSet = true;
      // Respect the silent switch, and never pause the music people lift to.
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    }
    const player = (players[sound] ??= createAudioPlayer(SOURCES[sound]));
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Sound is a bonus; never let it break logging.
  }
}

/** Warm up the players so the first chime isn't delayed. */
export function preloadSounds() {
  for (const sound of Object.keys(SOURCES) as Sound[]) {
    try {
      players[sound] ??= createAudioPlayer(SOURCES[sound]);
    } catch {}
  }
}

const native = Platform.OS !== 'web';

function after(ms: number, fn: () => void) {
  setTimeout(fn, ms);
}

export const feedback = {
  tap() {
    if (native) Haptics.selectionAsync();
  },
  error() {
    if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
  /** A set ticked off: the core-loop micro reward. */
  setDone() {
    play('set');
    if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  /** Rest is over: a chime and a double buzz you can feel with the phone in a pocket. */
  restDone() {
    play('set');
    if (!native) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    after(250, () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  /** Workout saved: haptic taps timed to the rising arpeggio. */
  workoutDone() {
    play('finish');
    if (!native) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    after(110, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    after(220, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    after(330, () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  /** Challenge finished: the biggest reward in the app. */
  challengeDone() {
    play('challenge');
    if (!native) return;
    [0, 100, 200, 300].forEach((ms) => after(ms, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)));
    after(500, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    after(650, () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
};
