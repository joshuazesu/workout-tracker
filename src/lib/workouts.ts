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
  /** Set count the template asked for, when the workout was started from one. */
  templateSets?: number;
  /** Last time a set was added or removed, so template changes can be listed in order. */
  setsChangedAt?: number;
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
  /** The template this workout was started from. Only set on the active workout. */
  routineId?: string;
};

/** A reusable workout type, e.g. "Push Day": just a named list of exercises. */
export type Routine = {
  id: string;
  name: string;
  exercises: string[];
  /** Sets per exercise, keyed by exercise name. Missing entries fall back to `defaultSetCount`. */
  sets?: Record<string, number>;
};

export type Appearance = 'system' | 'light' | 'dark';

/** How body height and weight are shown and entered. They're always stored in cm and kg. */
export type Units = 'metric' | 'imperial';

/** The colour a body-weight change is shown in, chosen separately for gains and losses. */
export type ChangeColor = 'green' | 'red' | 'neutral';

export const MIN_SETS = 1;
export const MAX_SETS = 10;

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

/** One body-weight reading per local day; `day` is that day's `startOfDay` timestamp. */
export type WeightEntry = { day: number; kg: number };

export type State = {
  onboarded: boolean;
  profile: Profile;
  /** Body-weight log, oldest first. The newest entry is mirrored into `profile.weightKg`. */
  weights: WeightEntry[];
  active: Workout | null;
  history: Workout[];
  routines: Routine[];
  /** Routine being created or edited on the routine screen. */
  draft: Routine | null;
  challenge: Challenge | null;
  trophies: { id: ChallengeId; completedAt: number }[];
  /** Rest timer length; nudging it with -15/+15 updates this so the next rest uses it. */
  restSeconds: number;
  /** Light or dark mode, or follow the phone. */
  appearance: Appearance;
  units: Units;
  weightColors: { gain: ChangeColor; loss: ChangeColor };
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
  weights: [],
  active: null,
  history: [],
  routines: defaultRoutines(),
  draft: null,
  challenge: null,
  trophies: [],
  restSeconds: 90,
  appearance: 'system',
  units: 'metric',
  weightColors: { gain: 'red', loss: 'green' },
});

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>;
      const saved = { ...initialState(), ...parsed };
      // Before the weight log, the profile weight was the only reading; it becomes the first entry.
      // Only once: after a reset the log is empty on purpose.
      const kg = Number(saved.profile.weightKg);
      if (!parsed.weights && kg > 0) saved.weights = [{ day: startOfDay(Date.now()), kg }];
      return saved;
    }
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
/** Told about every local change, so the sync layer can queue it for upload. */
const changeListeners = new Set<(prev: State, next: State) => void>();

function setState(update: (prev: State) => State, fromRemote = false) {
  const prev = state;
  state = update(state);
  if (state === prev) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Non-fatal: state still lives in memory.
  }
  if (!fromRemote) changeListeners.forEach((l) => l(prev, state));
  listeners.forEach((l) => l());
}

/** Hooks for `src/lib/sync.ts`. Screens use `useWorkoutStore` and the actions instead. */
export const storeSync = {
  getState: () => state,
  onChange(listener: (prev: State, next: State) => void) {
    changeListeners.add(listener);
    return () => changeListeners.delete(listener);
  },
  /** Applies data pulled from the server without queueing it to be pushed back. */
  applyRemote(update: (prev: State) => State) {
    setState(update, true);
  },
  /** Back to a fresh install, for signing out. */
  reset() {
    setState(() => initialState(), true);
  },
};

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

/** How many sets a template does for an exercise: its saved count, else last time's, else 3. */
export function defaultSetCount(routine: Routine, name: string, history: Workout[]): number {
  return routine.sets?.[name] ?? lastSets(name, history)?.length ?? 3;
}

/** `count` sets prefilled from last time; extra sets repeat the last one. */
function setsForTemplate(name: string, count: number, history: Workout[]): WorkoutSet[] {
  const last = lastSets(name, history);
  return Array.from({ length: count }, (_, i) => {
    const from = last?.[i] ?? last?.at(-1);
    return { id: uid(), weight: from?.weight ?? '', reps: from?.reps ?? '', done: false };
  });
}

/**
 * Template exercises whose set count was changed during the active workout, in the order they
 * were changed. Used to offer updating the template when the workout is finished.
 */
export function templateSetChanges(workout: Workout, routines: Routine[]) {
  const routine = routines.find((r) => r.id === workout.routineId);
  if (!routine) return null;
  const changes = workout.exercises
    .filter(
      (e) =>
        e.setsChangedAt !== undefined &&
        e.templateSets !== undefined &&
        routine.exercises.includes(e.name) &&
        e.sets.length !== e.templateSets
    )
    .sort((a, b) => a.setsChangedAt! - b.setsChangedAt!)
    .map((e) => ({ name: e.name, from: e.templateSets!, to: e.sets.length }));
  return changes.length > 0 ? { routine, changes } : null;
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
          routineId: routine?.id,
          startedAt: Date.now(),
          exercises: (routine?.exercises ?? []).map((name) => {
            const count = defaultSetCount(routine!, name, s.history);
            return { id: uid(), name, sets: setsForTemplate(name, count, s.history), templateSets: count };
          }),
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
        .map(({ templateSets: _t, setsChangedAt: _c, ...e }) => ({ ...e, sets: e.sets.filter((set) => set.done) }))
        .filter((e) => e.sets.length > 0);
      if (exercises.length === 0) return { ...s, active: null };
      const { restUntil: _rest, routineId: _routine, ...active } = s.active;
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
    updateExercise(exerciseId, (e) => ({
      ...e,
      sets: [...e.sets, emptySet(e.sets.at(-1))],
      setsChangedAt: Date.now(),
    }));
  },
  removeSet(exerciseId: string, setId: string) {
    updateExercise(exerciseId, (e) => ({
      ...e,
      sets: e.sets.filter((s) => s.id !== setId),
      setsChangedAt: Date.now(),
    }));
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
  /**
   * Wipes workouts, the challenge, trophies and the weight log (and so the current weight, which
   * mirrors it). Keeps the rest of the profile and the templates.
   */
  resetHistory() {
    setState((s) => ({
      ...s,
      active: null,
      history: [],
      challenge: null,
      trophies: [],
      weights: [],
      profile: { ...s.profile, weightKg: '' },
    }));
  },
};

export const profileActions = {
  update(patch: Partial<Profile>) {
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  },
  setAppearance(appearance: Appearance) {
    setState((s) => ({ ...s, appearance }));
  },
  setUnits(units: Units) {
    setState((s) => ({ ...s, units }));
  },
  setWeightColor(direction: 'gain' | 'loss', color: ChangeColor) {
    setState((s) => ({ ...s, weightColors: { ...s.weightColors, [direction]: color } }));
  },
  /** Records today's body weight, replacing an earlier reading from today. Ignores non-positive values. */
  logWeight(kg: number) {
    if (!(kg > 0)) return;
    setState((s) => ({ ...s, weights: withToday(s.weights, kg), profile: { ...s.profile, weightKg: String(kg) } }));
  },
  /**
   * The Settings weight field: keeps the text as typed, and logs it as today's reading once it's a
   * number. The text is in kg; the field converts pounds before calling this.
   */
  editWeight(text: string) {
    const kg = Number(text);
    setState((s) => ({
      ...s,
      weights: kg > 0 ? withToday(s.weights, kg) : s.weights,
      profile: { ...s.profile, weightKg: text },
    }));
  },
};

/** Today is always the newest day, so its reading goes last. */
function withToday(weights: WeightEntry[], kg: number): WeightEntry[] {
  const day = startOfDay(Date.now());
  return [...weights.filter((w) => w.day !== day), { day, kg }];
}

/** The newest reading minus an older one, in kg (unrounded): from the first ever, or from `days` ago. */
export type WeightChange = { kg: number; since: 'start' | number };

/**
 * Weight changes to show under the profile name: since the first reading, then over the last 7, 12
 * and 30 days. A window only appears when there's a reading from before it began and one inside it,
 * so "over last 30 days" never quietly means "over the last 5".
 */
export function weightChanges(weights: WeightEntry[], now = Date.now()): WeightChange[] {
  const latest = weights.at(-1);
  if (!latest || weights.length < 2) return [];
  const changes: WeightChange[] = [{ kg: latest.kg - weights[0].kg, since: 'start' }];
  for (const days of [7, 12, 30]) {
    const cutoff = new Date(startOfDay(now));
    cutoff.setDate(cutoff.getDate() - days);
    const before = weights.findLast((w) => w.day <= cutoff.getTime());
    if (before && before !== latest) changes.push({ kg: latest.kg - before.kg, since: days });
  }
  return changes;
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
}

export const routineActions = {
  /**
   * Opens a draft copy of a routine (or a blank one) for the routine screen to edit.
   * Returns false when creating would exceed MAX_ROUTINES.
   */
  edit(routineId?: string): boolean {
    const existing = state.routines.find((r) => r.id === routineId);
    if (!existing && state.routines.length >= MAX_ROUTINES) return false;
    // Spell out every exercise's set count so the editor shows exactly what a workout will use.
    const draft = existing
      ? {
          ...existing,
          sets: Object.fromEntries(existing.exercises.map((n) => [n, defaultSetCount(existing, n, state.history)])),
        }
      : { id: uid(), name: '', exercises: [], sets: {} };
    setState((s) => ({ ...s, draft }));
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
  /** Moves a saved template to a new place in the list (drag to reorder on Start). */
  move(from: number, to: number) {
    setState((s) => ({ ...s, routines: moveItem(s.routines, from, to) }));
  },
  /** Moves an exercise within the draft; a workout started from the template follows this order. */
  moveExercise(from: number, to: number) {
    updateDraft((r) => ({ ...r, exercises: moveItem(r.exercises, from, to) }));
  },
  rename(name: string) {
    updateDraft((r) => ({ ...r, name }));
  },
  addExercise(name: string) {
    updateDraft((r) =>
      r.exercises.includes(name)
        ? r
        : {
            ...r,
            exercises: [...r.exercises, name],
            sets: { ...r.sets, [name]: lastSets(name, state.history)?.length ?? 3 },
          }
    );
  },
  removeExercise(name: string) {
    updateDraft((r) => {
      const { [name]: _removed, ...sets } = r.sets ?? {};
      return { ...r, exercises: r.exercises.filter((e) => e !== name), sets };
    });
  },
  /** Sets the draft's set count for one exercise, clamped to MIN_SETS–MAX_SETS. */
  setSetCount(name: string, count: number) {
    updateDraft((r) => ({ ...r, sets: { ...r.sets, [name]: Math.min(MAX_SETS, Math.max(MIN_SETS, count)) } }));
  },
  /** Saves set counts changed during a workout back to its template. */
  updateSetCounts(routineId: string, counts: Record<string, number>) {
    setState((s) => ({
      ...s,
      routines: s.routines.map((r) => (r.id === routineId ? { ...r, sets: { ...r.sets, ...counts } } : r)),
    }));
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
