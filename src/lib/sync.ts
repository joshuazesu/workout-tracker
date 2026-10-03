/**
 * Account and background sync with Supabase.
 *
 * The local store (workouts.ts) stays the source of truth for the UI, so every screen reads and
 * writes instantly and works offline. This module watches each local change, queues the records
 * it touched (`pending`), and pushes them shortly after. Each sync pushes the queue, then pulls
 * the rows that changed on the server since the last pull (other phones) and merges them in.
 * Conflicts are last write wins per record, and a record with unpushed local edits is never
 * overwritten by a pull.
 *
 * Synced: profile (minus the photo, which is a file on this phone), settings, challenge,
 * trophies, finished workouts, templates and the weight log. The in-progress workout and the
 * template draft stay on the phone.
 */
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';
import { type Routine, type State, storeSync, type WeightEntry, type Workout } from '@/lib/workouts';

const META_KEY = 'sync.v1';
/** Wait for a burst of edits (typing a name) to settle before pushing. */
const PUSH_DELAY = 1500;
const RETRY_DELAY = 30_000;
/** Each pull re-reads the last minute, so a row committed late with an earlier `updated_at` isn't missed. */
const PULL_OVERLAP = 60_000;
const PAGE = 1000;

type Meta = {
  /** Who is signed in on this phone. The app is only unlocked while this is set. */
  userId: string | null;
  email: string | null;
  /**
   * Whose data the local store holds. Kept when a session expires, so the same user signing back
   * in carries on (with any unpushed changes) instead of starting over.
   */
  owner: string | null;
  /** Server time of the newest row pulled. */
  cursor: string | null;
  /** Records changed locally and not yet pushed: key → change number. */
  pending: Record<string, number>;
};

const emptyMeta = (): Meta => ({ userId: null, email: null, owner: null, cursor: null, pending: {} });

function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return { ...emptyMeta(), ...(JSON.parse(raw) as Partial<Meta>) };
  } catch {}
  return emptyMeta();
}

let meta = loadMeta();
let seq = Math.max(0, ...Object.values(meta.pending));
let syncing = false;
let failed = false;

// --- React binding -------------------------------------------------------------------------

export type Account = {
  userId: string | null;
  email: string | null;
  /** Local changes not yet on the server. */
  pending: number;
  syncing: boolean;
  /** The last sync couldn't reach the server (it retries on its own). */
  failed: boolean;
};

const snapshotOf = (): Account => ({
  userId: meta.userId,
  email: meta.email,
  pending: Object.keys(meta.pending).length,
  syncing,
  failed,
});

let snapshot = snapshotOf();
const listeners = new Set<() => void>();

function emit() {
  snapshot = snapshotOf();
  listeners.forEach((l) => l());
}

function saveMeta() {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {}
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccount(): Account {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

// --- Change tracking -----------------------------------------------------------------------

const PROFILE_FIELDS = ['onboarded', 'appearance', 'units', 'weightColors', 'restSeconds', 'challenge', 'trophies'] as const;

const workoutKey = (id: string) => `workout:${id}`;
const routineKey = (id: string) => `routine:${id}`;
const weightKey = (day: number) => `weight:${day}`;

/** Keys of records added, changed or removed between two lists. Updates are immutable, so a changed record is a new object. */
function diffList<T>(prev: T[], next: T[], keyOf: (item: T) => string, ordered: boolean, out: string[]) {
  if (prev === next) return;
  const before = new Map(prev.map((item, i) => [keyOf(item), { item, i }]));
  next.forEach((item, i) => {
    const key = keyOf(item);
    const old = before.get(key);
    if (!old || old.item !== item || (ordered && old.i !== i)) out.push(key);
    before.delete(key);
  });
  before.forEach((_, key) => out.push(key));
}

function changedKeys(prev: State, next: State): string[] {
  const keys: string[] = [];
  const p = prev.profile;
  const n = next.profile;
  if (
    p.name !== n.name ||
    p.heightCm !== n.heightCm ||
    p.weightKg !== n.weightKg ||
    PROFILE_FIELDS.some((f) => prev[f] !== next[f])
  ) {
    keys.push('profile');
  }
  diffList(prev.history, next.history, (w) => workoutKey(w.id), false, keys);
  // A template's position is stored, so a reorder pushes the templates that moved.
  diffList(prev.routines, next.routines, (r) => routineKey(r.id), true, keys);
  diffList(prev.weights, next.weights, (w) => weightKey(w.day), false, keys);
  return keys;
}

function markPending(keys: string[]) {
  for (const key of keys) meta.pending[key] = ++seq;
}

storeSync.onChange((prev, next) => {
  if (!meta.owner) return;
  const keys = changedKeys(prev, next);
  if (keys.length === 0) return;
  markPending(keys);
  saveMeta();
  if (meta.userId) schedule(PUSH_DELAY);
});

// --- Rows ----------------------------------------------------------------------------------

type WorkoutRow = {
  id: string;
  name: string | null;
  started_at: string;
  ended_at: string | null;
  exercises: Workout['exercises'];
  updated_at: string;
  deleted_at: string | null;
};
type RoutineRow = {
  id: string;
  name: string;
  exercises: string[];
  sets: Routine['sets'] | null;
  position: number;
  updated_at: string;
  deleted_at: string | null;
};
type WeightRow = { day: string; kg: number; updated_at: string; deleted_at: string | null };
type ProfileRow = {
  name: string;
  height_cm: number | null;
  weight_kg: number | null;
  onboarded: boolean;
  appearance: State['appearance'];
  units: State['units'];
  weight_colors: State['weightColors'];
  rest_seconds: number;
  challenge: State['challenge'];
  trophies: State['trophies'];
  updated_at: string;
};

const iso = (ms: number | undefined) => (ms === undefined ? null : new Date(ms).toISOString());
const pad = (n: number) => String(n).padStart(2, '0');
/** A local `startOfDay` timestamp as a calendar date, and back. */
const toDate = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fromDate = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};
/** Profile numbers are text fields locally; blank or half-typed values are stored as null. */
const toNumber = (text: string) => (Number(text) > 0 ? Number(text) : null);

const workoutRow = (w: Workout, user_id: string) => ({
  user_id,
  id: w.id,
  name: w.name ?? null,
  started_at: iso(w.startedAt),
  ended_at: iso(w.endedAt),
  exercises: w.exercises,
  deleted_at: null,
});
const routineRow = (r: Routine, position: number, user_id: string) => ({
  user_id,
  id: r.id,
  name: r.name,
  exercises: r.exercises,
  sets: r.sets ?? null,
  position,
  deleted_at: null,
});
const weightRow = (w: WeightEntry, user_id: string) => ({ user_id, day: toDate(w.day), kg: w.kg, deleted_at: null });
const profileRow = (s: State, user_id: string) => ({
  user_id,
  name: s.profile.name,
  height_cm: toNumber(s.profile.heightCm),
  weight_kg: toNumber(s.profile.weightKg),
  onboarded: s.onboarded,
  appearance: s.appearance,
  units: s.units,
  weight_colors: s.weightColors,
  rest_seconds: s.restSeconds,
  challenge: s.challenge,
  trophies: s.trophies,
});

const fromWorkoutRow = (r: WorkoutRow): Workout => ({
  id: r.id,
  ...(r.name !== null && { name: r.name }),
  startedAt: Date.parse(r.started_at),
  ...(r.ended_at !== null && { endedAt: Date.parse(r.ended_at) }),
  exercises: r.exercises,
});
const fromRoutineRow = (r: RoutineRow): Routine => ({
  id: r.id,
  name: r.name,
  exercises: r.exercises,
  ...(r.sets && { sets: r.sets }),
});
const fromWeightRow = (r: WeightRow): WeightEntry => ({ day: fromDate(r.day), kg: Number(r.kg) });

// --- Push ----------------------------------------------------------------------------------

function chunks<T>(list: T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function push(userId: string) {
  const batch = { ...meta.pending };
  const keys = Object.keys(batch);
  if (keys.length === 0) return;

  const s = storeSync.getState();
  const upserts = { workouts: [] as object[], routines: [] as object[], weights: [] as object[] };
  const deletes = { workouts: [] as string[], routines: [] as string[], weights: [] as string[] };
  let profile = false;

  for (const key of keys) {
    const split = key.indexOf(':');
    const kind = split === -1 ? key : key.slice(0, split);
    const id = key.slice(split + 1);
    if (kind === 'profile') {
      profile = true;
    } else if (kind === 'workout') {
      const w = s.history.find((x) => x.id === id);
      if (w) upserts.workouts.push(workoutRow(w, userId));
      else deletes.workouts.push(id);
    } else if (kind === 'routine') {
      const i = s.routines.findIndex((x) => x.id === id);
      if (i !== -1) upserts.routines.push(routineRow(s.routines[i], i, userId));
      else deletes.routines.push(id);
    } else if (kind === 'weight') {
      const w = s.weights.find((x) => x.day === Number(id));
      if (w) upserts.weights.push(weightRow(w, userId));
      else deletes.weights.push(toDate(Number(id)));
    }
  }

  const now = new Date().toISOString();
  const requests: PromiseLike<{ error: unknown }>[] = [];
  if (profile) requests.push(supabase.from('profiles').upsert(profileRow(s, userId)));
  for (const table of ['workouts', 'routines', 'weights'] as const) {
    const id = table === 'weights' ? 'day' : 'id';
    for (const rows of chunks(upserts[table])) {
      requests.push(supabase.from(table).upsert(rows, { onConflict: `user_id,${id}` }));
    }
    // Tombstones, so other phones drop the record on their next pull.
    for (const ids of chunks(deletes[table])) {
      requests.push(supabase.from(table).update({ deleted_at: now }).eq('user_id', userId).in(id, ids));
    }
  }

  const results = await Promise.all(requests);
  const error = results.find((r) => r.error)?.error;
  if (error) throw error;

  // Anything edited again while the push was in flight stays queued.
  for (const key of keys) if (meta.pending[key] === batch[key]) delete meta.pending[key];
  saveMeta();
}

// --- Pull ----------------------------------------------------------------------------------

type Changes = {
  profile: ProfileRow | null;
  workouts: WorkoutRow[];
  routines: RoutineRow[];
  weights: WeightRow[];
  cursor: string | null;
};

async function fetchAll<T>(table: string, order: string, userId: string, since: string | null): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from(table).select('*').eq('user_id', userId);
    if (since) query = query.gt('updated_at', since);
    const { data, error } = await query
      .order('updated_at')
      .order(order)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data as T[]));
    if (data.length < PAGE) return rows;
  }
}

async function fetchChanges(userId: string, cursor: string | null): Promise<Changes> {
  const since = cursor ? new Date(Date.parse(cursor) - PULL_OVERLAP).toISOString() : null;
  const [profiles, workouts, routines, weights] = await Promise.all([
    fetchAll<ProfileRow>('profiles', 'user_id', userId, since),
    fetchAll<WorkoutRow>('workouts', 'id', userId, since),
    fetchAll<RoutineRow>('routines', 'id', userId, since),
    fetchAll<WeightRow>('weights', 'day', userId, since),
  ]);
  let newest = cursor;
  for (const row of [...profiles, ...workouts, ...routines, ...weights]) {
    if (!newest || Date.parse(row.updated_at) > Date.parse(newest)) newest = row.updated_at;
  }
  return { profile: profiles[0] ?? null, workouts, routines, weights, cursor: newest };
}

/** Applies server rows over local records, except ones with unpushed local edits. */
function merge<T, R extends { deleted_at: string | null }>(
  local: T[],
  rows: R[],
  keyOf: (item: T) => string,
  rowKey: (row: R) => string,
  fromRow: (row: R) => T
): T[] {
  if (rows.length === 0) return local;
  const byKey = new Map(local.map((item) => [keyOf(item), item]));
  for (const row of rows) {
    const key = rowKey(row);
    if (key in meta.pending) continue;
    if (row.deleted_at) byKey.delete(key);
    else byKey.set(key, fromRow(row));
  }
  return [...byKey.values()];
}

/** `replaceRoutines` takes the account's templates instead of merging with the ones on this phone. */
function applyChanges(changes: Changes, replaceRoutines = false) {
  const { profile: p, workouts, routines, weights } = changes;
  if (!p && !workouts.length && !routines.length && !weights.length && !replaceRoutines) return;

  storeSync.applyRemote((s) => {
    const history = merge(s.history, workouts, (w) => workoutKey(w.id), (r) => workoutKey(r.id), fromWorkoutRow);
    if (history !== s.history) history.sort((a, b) => b.startedAt - a.startedAt);

    const localRoutines = replaceRoutines ? [] : s.routines;
    const merged = merge(localRoutines, routines, (r) => routineKey(r.id), (r) => routineKey(r.id), fromRoutineRow);
    // Pulled templates take their stored position; the rest keep their place.
    const position = new Map(routines.map((r) => [r.id, r.position]));
    const localIndex = new Map(localRoutines.map((r, i) => [r.id, i]));
    const ordered = merged === localRoutines
      ? localRoutines
      : merged
          .map((r) => ({ r, at: position.get(r.id) ?? localIndex.get(r.id) ?? Infinity }))
          .sort((a, b) => a.at - b.at)
          .map(({ r }) => r);

    const weightLog = merge(s.weights, weights, (w) => weightKey(w.day), (r) => weightKey(fromDate(r.day)), fromWeightRow);
    if (weightLog !== s.weights) weightLog.sort((a, b) => a.day - b.day);

    const next: State = {
      ...s,
      history,
      routines: ordered,
      draft: replaceRoutines ? null : s.draft,
      weights: weightLog,
    };
    if (p && !('profile' in meta.pending)) {
      Object.assign(next, {
        profile: {
          ...s.profile,
          name: p.name,
          heightCm: p.height_cm === null ? '' : String(p.height_cm),
          weightKg: p.weight_kg === null ? '' : String(p.weight_kg),
        },
        onboarded: p.onboarded,
        appearance: p.appearance,
        units: p.units,
        weightColors: p.weight_colors,
        restSeconds: p.rest_seconds,
        challenge: p.challenge,
        trophies: p.trophies,
      });
    }
    return next;
  });
}

// --- Sync loop -----------------------------------------------------------------------------

let timer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<void> | null = null;
let again = false;

function schedule(delay: number) {
  clearTimeout(timer);
  timer = setTimeout(() => void sync(), delay);
}

async function syncOnce() {
  const userId = meta.userId;
  if (!userId || meta.owner !== userId) return;
  syncing = true;
  emit();
  try {
    await push(userId);
    const changes = await fetchChanges(userId, meta.cursor);
    // Signed out (or switched user) while the request was in flight.
    if (meta.owner !== userId) return;
    applyChanges(changes);
    meta.cursor = changes.cursor;
    failed = false;
    saveMeta();
  } catch {
    failed = true;
    schedule(RETRY_DELAY);
  } finally {
    syncing = false;
    emit();
  }
}

/** Pushes local changes, then pulls the server's. Never throws; failures retry on their own. */
export function sync(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await syncOnce();
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

// Catch up whenever the app comes to the front, and once on launch.
AppState.addEventListener('change', (status) => {
  if (status === 'active') void sync();
});
void sync();

// The server ended the session (signed out elsewhere, or it expired). Lock the app but keep this
// phone's data and queue, so signing back in as the same user carries on.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' && meta.userId) {
    meta.userId = null;
    saveMeta();
  }
});

// --- Sign in and out -----------------------------------------------------------------------

/**
 * Connects the local store to the signed-in account, then unlocks the app.
 * - Same user as before: carry on.
 * - A new account: everything on this phone is uploaded.
 * - An existing account: its templates, settings and profile replace this phone's, and workouts
 *   and weight readings that are only on this phone are added to it.
 */
async function attach(userId: string, email: string | null) {
  if (meta.owner && meta.owner !== userId) {
    // Someone else's data is on this phone; start clean.
    storeSync.reset();
    meta = emptyMeta();
  }
  if (meta.owner !== userId) {
    const changes = await fetchChanges(userId, null);
    const s = storeSync.getState();
    if (changes.profile) {
      const remoteWorkouts = new Set(changes.workouts.map((r) => r.id));
      const remoteDays = new Set(changes.weights.map((r) => fromDate(r.day)));
      markPending([
        ...s.history.filter((w) => !remoteWorkouts.has(w.id)).map((w) => workoutKey(w.id)),
        ...s.weights.filter((w) => !remoteDays.has(w.day)).map((w) => weightKey(w.day)),
      ]);
      applyChanges(changes, true);
    } else {
      markPending([
        'profile',
        ...s.history.map((w) => workoutKey(w.id)),
        ...s.routines.map((r) => routineKey(r.id)),
        ...s.weights.map((w) => weightKey(w.day)),
      ]);
    }
    meta.cursor = changes.cursor;
  }
  meta.owner = userId;
  meta.userId = userId;
  meta.email = email;
  saveMeta();
  void sync();
}

export const accountActions = {
  /** Emails a sign-in code. The same code creates the account if it's new. */
  async sendCode(email: string) {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  },
  /** Checks the code, then loads the account's data. The app unlocks once this resolves. */
  async verifyCode(email: string, code: string) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) throw error;
    if (!data.user) throw new Error('Sign-in failed. Please try again.');
    await attach(data.user.id, data.user.email ?? email);
  },
  /** Retries loading the account after a verified code, when the first attempt couldn't. */
  async finishSignIn() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw error ?? new Error('Please sign in again.');
    await attach(data.user.id, data.user.email ?? null);
  },
  /** Pushes what it can, signs out and clears this phone. Workouts stay in the account. */
  async signOut() {
    clearTimeout(timer);
    await sync();
    try {
      await supabase.auth.signOut();
    } catch {
      // Offline: the local session is still removed.
    }
    clearPhone();
  },
  /**
   * Deletes the account and everything in it from the server, then clears this phone. Needs a
   * connection; throws (leaving everything as it was) if the server couldn't do it.
   */
  async deleteAccount() {
    clearTimeout(timer);
    const { error } = await supabase.rpc('delete_account');
    if (error) throw error;
    // The user no longer exists, so only the local session can be removed.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    clearPhone();
  },
};

function clearPhone() {
  clearTimeout(timer);
  storeSync.reset();
  meta = emptyMeta();
  seq = 0;
  failed = false;
  saveMeta();
}
