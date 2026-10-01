import { startOfDay, type WorkoutSet } from '@/lib/workouts';

/**
 * Runs of identical sets collapse into one entry: three sets of 8 at 70 kg read "3 × 8 · 70 kg",
 * and a pyramid reads "70 kg × 8, 75 kg × 6".
 */
export function summarizeSets(sets: WorkoutSet[]): string {
  const runs: { weight: number; reps: string; count: number }[] = [];
  for (const s of sets) {
    const weight = Number(s.weight) || 0;
    const last = runs.at(-1);
    if (last && last.weight === weight && last.reps === s.reps) last.count++;
    else runs.push({ weight, reps: s.reps, count: 1 });
  }
  return runs
    .map(({ weight, reps, count }) => {
      if (count > 1) return weight > 0 ? `${count} × ${reps} · ${weight} kg` : `${count} × ${reps}`;
      return weight > 0 ? `${weight} kg × ${reps}` : `${reps} reps`;
    })
    .join(', ');
}

/** "Today", "Yesterday", a weekday within the last week, else "Mon 14 Sept". */
export function relativeDay(ts: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(ts)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const date = new Date(ts);
  if (days > 1 && days < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** Whole minutes for summaries, e.g. "52 min" or "1 h 05 min". */
export function formatMinutes(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}
