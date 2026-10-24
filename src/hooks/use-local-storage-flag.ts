"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener); // other tabs
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false; // storage blocked (private mode, policy): behave as "off"
  }
}

/**
 * A boolean remembered in localStorage — e.g. "sidebar collapsed". Server render
 * and first client render both use `false`, so there is no hydration mismatch;
 * the stored value applies right after.
 */
export function useLocalStorageFlag(key: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => false,
  );

  const setValue = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        /* ignore: the preference just will not persist */
      }
      notify();
    },
    [key],
  );

  return [value, setValue] as const;
}
