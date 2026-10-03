/**
 * Settings only for trying things out in development (Settings › Developer, shown when `__DEV__`).
 * Kept on this phone, never synced. Production builds always use the defaults.
 */
import { useSyncExternalStore } from 'react';

import '@/lib/storage';

/** v1: the native tab bar, swipe to switch when the finger lifts. v2: pages that follow the finger. */
export type TabStyle = 'v1' | 'v2';

const KEY = 'dev.tabStyle';

function load(): TabStyle {
  if (!__DEV__) return 'v1';
  try {
    return localStorage.getItem(KEY) === 'v2' ? 'v2' : 'v1';
  } catch {
    return 'v1';
  }
}

let tabStyle = load();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTabStyle(): TabStyle {
  return useSyncExternalStore(subscribe, () => tabStyle, () => tabStyle);
}

export function setTabStyle(next: TabStyle) {
  tabStyle = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {}
  listeners.forEach((l) => l());
}
