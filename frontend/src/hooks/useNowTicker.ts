"use client";

import { useSyncExternalStore } from "react";

/**
 * useNowTicker
 * ------------
 * One process-wide 1Hz clock that every countdown subscribes to, instead of each
 * card owning its own `setInterval`. A carousel of N chadhava cards used to run N
 * timers forever; this runs exactly one, only while at least one card is mounted,
 * and suspends it entirely while the tab is in the background.
 *
 * Returns 0 on the server and during hydration so the first client render matches
 * the server HTML — callers should treat 0 as "clock not started yet".
 */

let now = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

const emit = () => {
  now = Date.now();
  listeners.forEach((notify) => notify());
};

const start = () => {
  if (timer === null) timer = setInterval(emit, 1000);
};

const stop = () => {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
};

const handleVisibility = () => {
  if (document.hidden) {
    stop();
  } else {
    // Catch up immediately — the displayed value is stale by however long the
    // tab was hidden.
    emit();
    start();
  }
};

const subscribe = (notify: () => void) => {
  listeners.add(notify);

  if (listeners.size === 1) {
    emit();
    start();
    document.addEventListener("visibilitychange", handleVisibility);
  }

  return () => {
    listeners.delete(notify);
    if (listeners.size === 0) {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    }
  };
};

const getSnapshot = () => now;
const getServerSnapshot = () => 0;

export const useNowTicker = (): number =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
