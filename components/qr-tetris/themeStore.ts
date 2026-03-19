import { useSyncExternalStore } from 'react';

import { DEFAULT_THEME, THEME_KEY } from './constants';
import type { Theme } from './types';

const listeners = new Set<() => void>();
let currentTheme: Theme = DEFAULT_THEME;

function themesEqual(left: Theme, right: Theme) {
  return left.mode === right.mode && left.accent === right.accent;
}

function emitChange() {
  listeners.forEach(listener => listener());
}

function readStoredTheme() {
  try {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return { ...DEFAULT_THEME, ...JSON.parse(saved) };
  } catch {
    // ignore malformed local storage
  }
  return DEFAULT_THEME;
}

function getSnapshot() {
  return currentTheme;
}

function getServerSnapshot() {
  return DEFAULT_THEME;
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (typeof window !== 'undefined') {
    const syncFromStorage = () => {
      const storedTheme = readStoredTheme();
      if (!themesEqual(currentTheme, storedTheme)) {
        currentTheme = storedTheme;
        emitChange();
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY) syncFromStorage();
    };

    syncFromStorage();
    window.addEventListener('storage', onStorage);

    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }

  return () => listeners.delete(listener);
}

export function useThemeStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function persistTheme(nextTheme: Theme) {
  currentTheme = nextTheme;
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(nextTheme));
  } catch {
    // ignore write failures
  }
  emitChange();
}
