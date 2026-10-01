import '@/lib/storage';

import { useSyncExternalStore } from 'react';

import { EXERCISE_CATALOG } from '@/constants/exercises';

export type WorkoutSet = {
  id: string;
  weight: string;
  reps: string;
  done: boolean;
};

export type WorkoutExercise = {
  id: string;
  name: string;
  sets: WorkoutSet[];
};

export type Workout = {
  id: string;
  /** Routine name it was started from; absent for empty workouts. */
  name?: string;
  startedAt: number;
  endedAt?: number;
  exercises: WorkoutExercise[];
  /** When the current rest countdown ends. Only set on the active workout. */
  restUntil?: number;
};

/** A reusable workout type, e.g. "Push Day": just a named list of exercises. */
export type Routine = {
  id: string;
  name: string;
  exercises: string[];
};

export type ChallengeId = 'kickstart' | 'builder' | 'habit';

export type Challenge = {
  id: ChallengeId;
  startedAt: number;
  completedAt?: number;
  /** The workout that pushed it over the line, so the summary screen can celebrate it. */
  completedByWorkoutId?: string;
};

/** Strings, like set inputs, so they're friendly to text fields. Height in cm, weight in kg. */
export type Profile = {
  name: string;
  photoUri?: string;
  heightCm: string;
  weightKg: string;
};

type State = {
  onboarded: boolean;
  profile: Profile;
  active: Workout | null;
  history: Workout[];
  routines: Routine[];
  /** Routine being created or edited on the routine screen. */
  draft: Routine | null;
  challenge: Challenge | null;
  trophies: { id: ChallengeId; completedAt: number }[];
  /** Rest timer length; nudging it with -15/+15 updates this so the next rest uses it. */
  restSeconds: number;
};

/** Work out on `days` different days within `windowDays` of starting. */
export const CHALLENGES: Record<
  ChallengeId,
  { title: string; blurb: string; days: number; windowDays: number; next: ChallengeId }
> = {
  kickstart: {
    title: '3-Day Kickstart',
    blurb: 'Work out on 3 different days this week.',
    days: 3,
    windowDays: 7,
    next: 'builder',
  },
  builder: {
    title: '7-Day Builder',
    blurb: 'Work out on 7 different days in the next 2 weeks.',
    days: 7,
    windowDays: 14,
    next: 'habit',
  },
  habit: {
    title: '30-Day Habit',
    blurb: 'Work out on 12 different days in the next 30 days.',
    days: 12,
    windowDays: 30,
    next: 'habit',
  },
};

export const EXERCISES = EXERCISE_CATALOG.map((e) => e.name);

export const MAX_ROUTINES = 5;

const STORAGE_KEY = 'workouts.v2';
const LEGACY_KEY = 'workouts.v1';
const DAY_MS = 24 * 60 * 60 * 1000;

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const defaultRoutines = (): Routine[] => [
  { id: uid(), name: 'Push', exercises: ['Bench Press', 'Overhead Press', 'Lateral Raise', 'Tricep Pushdown'] },
  { id: uid(), name: 'Pull', exercises: ['Pull Up', 'Barbell Row', 'Lat Pulldown', 'Bicep Curl'] },
  { id: uid(), name: 'Legs', exercises: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Calf Raise'] },
];

const initialState = (): State => ({
  onboarded: false,
  profile: { name: '', heightCm: '', weightKg: '' },
  active: null,
  history: [],
  routines: defaultRoutines(),
  draft: null,
  challenge: null,
  trophies: [],
  restSeconds: 90,
});

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...initialState(), ...(JSON.parse(raw) as Partial<State>) };
    // v1 only had { active, history }; keep those and fill in the rest.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return { ...initialState(), ...(JSON.parse(legacy) as Pick<State, 'active' | 'history'>) };
  } catch {
    // Start fresh if storage is unavailable or corrupt.
  }
  return initialState();
}

// A tiny global store so every screen sees the same workout state.
let state: State = load();
const listeners = new Set<() => void>();

function setState(update: (prev: State) => State) {
  state = update(state);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Non-fatal: state still lives in memory.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWorkoutStore(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

function updateActive(update: (w: Workout) => Workout) {
  setState((s) => (s.active ? { ...s, active: update(s.active) } : s));
}

function updateExercise(exerciseId: string, update: (e: WorkoutExercise) => WorkoutExercise) {
  updateActive((w) => ({
    ...w,
    exercises: w.exercises.map((e) => (e.id === exerciseId ? update(e) : e)),
  }));
}

function updateDraft(update: (r: Routine) => Routine) {
  setState((s) => (s.draft ? { ...s, draft: update(s.draft) } : s));
}

const emptySet = (prev?: WorkoutSet): WorkoutSet => ({
  id: uid(),
  // Prefill from the previous set so repeat sets are one tap.
  weight: prev?.weight ?? '',
  reps: prev?.reps ?? '',
  done: false,
});

/** The sets logged for an exercise the last time it was done, or null if never. History is newest first. */
export function lastSets(name: string, history: Workout[]): WorkoutSet[] | null {
  for (const w of history) {
    const last = w.exercises.find((e) => e.name === name);
    if (last) return last.sets;
  }
  return null;
}

/** Sets for an exercise, copied from the last time it was done so progress is easy to beat. */
function setsFromLastTime(name: string, history: Workout[]): WorkoutSet[] {
  const last = lastSets(name, history);
  return last ? last.map((s) => ({ ...s, id: uid(), done: false })) : [emptySet()];
}

const MIN_REST = 15;
const MAX_REST = 600;

export const workoutActions = {
  completeOnboarding(acceptChallenge: boolean) {
    setState((s) => ({
      ...s,
      onboarded: true,
      challenge: acceptChallenge ? { id: 'kickstart', startedAt: Date.now() } : s.challenge,
    }));
  },
  startChallenge(id: ChallengeId) {
    setState((s) => ({ ...s, challenge: { id, startedAt: Date.now() } }));
  },
  /** Starts from a routine's exercises, or empty. No-op if a workout is already in progress. */
  start(routineId?: string) {
    setState((s) => {
      if (s.active) return s;
      const routine = s.routines.find((r) => r.id === routineId);
      return {
        ...s,
        active: {
          id: uid(),
          name: routine?.name,
          startedAt: Date.now(),
          exercises: (routine?.exercises ?? []).map((name) => ({
            id: uid(),
            name,
            sets: setsFromLastTime(name, s.history),
          })),
        },
      };
    });
  },
  discard() {
    setState((s) => ({ ...s, active: null }));
  },
  /** Saves the active workout. Returns its id, or null if it had no completed sets and was discarded. */
  finish(): string | null {
    let savedId: string | null = null;
    setState((s) => {
      if (!s.active) return s;
      // Keep only completed sets; drop exercises with none.
      const exercises = s.active.exercises
        .map((e) => ({ ...e, sets: e.sets.filter((set) => set.done) }))
        .filter((e) => e.sets.length > 0);
      if (exercises.length === 0) return { ...s, active: null };
      const { restUntil: _rest, ...active } = s.active;
      const finished = { ...active, name: active.name?.trim() || undefined, exercises, endedAt: Date.now() };
      const history = [finished, ...s.history];
      savedId = finished.id;

      let { challenge, trophies } = s;
      if (challenge && !challenge.completedAt) {
        const progress = challengeProgress(challenge, history);
        if (progress.done >= progress.days && !progress.expired) {
          challenge = { ...challenge, completedAt: Date.now(), completedByWorkoutId: finished.id };
          trophies = [...trophies, { id: challenge.id, completedAt: Date.now() }];
        }
      }
      return { ...s, active: null, history, challenge, trophies };
    });
    return savedId;
  },
  addExercise(name: string) {
    updateActive((w) => ({
      ...w,
      exercises: [...w.exercises, { id: uid(), name, sets: setsFromLastTime(name, state.history) }],
    }));
  },
  removeExercise(exerciseId: string) {
    updateActive((w) => ({ ...w, exercises: w.exercises.filter((e) => e.id !== exerciseId) }));
  },
  addSet(exerciseId: string) {
    updateExercise(exerciseId, (e) => ({ ...e, sets: [...e.sets, emptySet(e.sets.at(-1))] }));
  },
  removeSet(exerciseId: string, setId: string) {
    updateExercise(exerciseId, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) }));
  },
  /**
   * Edits a set. A weight or reps edit also flows down to the later sets that still hold the old
   * value and aren't ticked, so changing set 1 from 70 to 72.5 kg suggests 72.5 for the rest.
   */
  updateSet(exerciseId: string, setId: string, patch: Partial<Omit<WorkoutSet, 'id'>>) {
    updateExercise(exerciseId, (e) => {
      const index = e.sets.findIndex((s) => s.id === setId);
      if (index === -1) return e;
      const old = e.sets[index];
      return {
        ...e,
        sets: e.sets.map((s, i) => {
          if (i === index) return { ...s, ...patch };
          if (i < index || s.done || patch.done !== undefined) return s;
          const next = { ...s };
          // Clearing a field mid-edit shouldn't wipe the sets below it.
          if (patch.weight && s.weight === old.weight) next.weight = patch.weight;
          if (patch.reps && s.reps === old.reps) next.reps = patch.reps;
          return next;
        }),
      };
    });
  },
  rename(name: string) {
    updateActive((w) => ({ ...w, name }));
  },
  /** Starts (or restarts) the rest countdown, called when a set is ticked. */
  startRest() {
    setState((s) => (s.active ? { ...s, active: { ...s.active, restUntil: Date.now() + s.restSeconds * 1000 } } : s));
  },
  /** Adds or removes time from the running rest, and remembers the new length for next time. */
  adjustRest(deltaSeconds: number) {
    setState((s) => {
      if (!s.active?.restUntil) return s;
      const restSeconds = Math.min(MAX_REST, Math.max(MIN_REST, s.restSeconds + deltaSeconds));
      const restUntil = Math.max(Date.now(), s.active.restUntil + deltaSeconds * 1000);
      return { ...s, restSeconds, active: { ...s.active, restUntil } };
    });
  },
  skipRest() {
    updateActive(({ restUntil: _rest, ...w }) => w);
  },
  deleteFromHistory(workoutId: string) {
    setState((s) => ({ ...s, history: s.history.filter((w) => w.id !== workoutId) }));
  },
  /** Wipes workouts, the challenge and trophies. Keeps the profile and templates. */
  resetHistory() {
    setState((s) => ({ ...s, active: null, history: [], challenge: null, trophies: [] }));
  },
};

export const profileActions = {
  update(patch: Partial<Profile>) {
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  },
};

export const routineActions = {
  /**
   * Opens a draft copy of a routine (or a blank one) for the routine screen to edit.
   * Returns false when creating would exceed MAX_ROUTINES.
   */
  edit(routineId?: string): boolean {
    const existing = state.routines.find((r) => r.id === routineId);
    if (!existing && state.routines.length >= MAX_ROUTINES) return false;
    setState((s) => ({ ...s, draft: existing ? { ...existing } : { id: uid(), name: '', exercises: [] } }));
    return true;
  },
  /** Returns false when at MAX_ROUTINES. */
  duplicate(routineId: string): boolean {
    const original = state.routines.find((r) => r.id === routineId);
    if (!original || state.routines.length >= MAX_ROUTINES) return false;
    const copy = { ...original, id: uid(), name: `${original.name} copy` };
    setState((s) => {
      const routines = [...s.routines];
      routines.splice(routines.indexOf(original) + 1, 0, copy);
      return { ...s, routines };
    });
    return true;
  },
  /** Renames a saved routine directly, without opening the editor. */
  renameSaved(routineId: string, name: string) {
    setState((s) => ({
      ...s,
      routines: s.routines.map((r) => (r.id === routineId ? { ...r, name: name.trim() || r.name } : r)),
    }));
  },
  rename(name: string) {
    updateDraft((r) => ({ ...r, name }));
  },
  addExercise(name: string) {
    updateDraft((r) => (r.exercises.includes(name) ? r : { ...r, exercises: [...r.exercises, name] }));
  },
  removeExercise(name: string) {
    updateDraft((r) => ({ ...r, exercises: r.exercises.filter((e) => e !== name) }));
  },
  save() {
    setState((s) => {
      if (!s.draft) return s;
      const draft = { ...s.draft, name: s.draft.name.trim() || 'Workout' };
      const exists = s.routines.some((r) => r.id === draft.id);
      if (!exists && s.routines.length >= MAX_ROUTINES) return { ...s, draft: null };
      return {
        ...s,
        draft: null,
        routines: exists ? s.routines.map((r) => (r.id === draft.id ? draft : r)) : [...s.routines, draft],
      };
    });
  },
  cancel() {
    setState((s) => ({ ...s, draft: null }));
  },
  delete(routineId: string) {
    setState((s) => ({ ...s, draft: null, routines: s.routines.filter((r) => r.id !== routineId) }));
  },
};

/** Total kg lifted across completed sets. */
export function workoutVolume(workout: Workout): number {
  return workout.exercises.reduce(
    (sum, e) =>
      sum +
      e.sets
        .filter((s) => s.done)
        .reduce((setSum, s) => setSum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0),
    0
  );
}

export const completedSetCount = (workout: Workout) =>
  workout.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Local calendar day, so a 11pm and a 1am workout land on different days. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Monday 00:00 of the week containing `ts`. */
export function startOfWeek(ts: number): number {
  const d = new Date(startOfDay(ts));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export function challengeProgress(challenge: Challenge, history: Workout[], now = Date.now()) {
  const def = CHALLENGES[challenge.id];
  const endsAt = startOfDay(challenge.startedAt) + def.windowDays * DAY_MS;
  const days = new Set(
    history
      .filter((w) => w.startedAt >= startOfDay(challenge.startedAt) && w.startedAt < endsAt)
      .map((w) => dayKey(w.startedAt))
  );
  const done = Math.min(days.size, def.days);
  return {
    ...def,
    done,
    // Only finish() awards a challenge, so the card and the trophy count can't disagree.
    complete: Boolean(challenge.completedAt),
    expired: !challenge.completedAt && now >= endsAt,
    endsAt,
    daysLeft: Math.max(0, Math.ceil((endsAt - now) / DAY_MS)),
    doneToday: days.has(dayKey(now)),
  };
}

/** Consecutive weeks with at least one workout, counting this week only once it has one. */
export function weekStreak(history: Workout[], now = Date.now()): number {
  const weeks = new Set(history.map((w) => startOfWeek(w.startedAt)));
  let week = startOfWeek(now);
  if (!weeks.has(week)) week = startOfWeek(week - DAY_MS);
  let streak = 0;
  while (weeks.has(week)) {
    streak++;
    week = startOfWeek(week - DAY_MS);
  }
  return streak;
}

/** Exercises in this workout whose top weight beats every earlier workout. */
export function personalRecords(workout: Workout, history: Workout[]) {
  const earlier = history.filter((w) => w.startedAt < workout.startedAt);
  return workout.exercises.flatMap((e) => {
    const top = Math.max(...e.sets.map((s) => Number(s.weight) || 0));
    if (top <= 0) return [];
    const previous = earlier.flatMap((w) =>
      w.exercises.filter((x) => x.name === e.name).flatMap((x) => x.sets.map((s) => Number(s.weight) || 0))
    );
    // A first-ever attempt isn't a record, there's nothing to beat.
    const previousBest = Math.max(...previous);
    if (previous.length === 0 || top <= previousBest) return [];
    return [{ name: e.name, weight: top, previous: previousBest }];
  });
}
