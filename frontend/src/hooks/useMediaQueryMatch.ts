"use client";

import { useSyncExternalStore } from "react";

/**
 * SSR-safe `matchMedia`. Returns false on the server and during hydration, then
 * the real value — so the first client render always agrees with the server HTML.
 *
 * Prefer Tailwind responsive classes over this. Reach for it only when the two
 * branches are structurally different enough that rendering both into the DOM
 * (and hiding one with CSS) would be materially wasteful — CSS `hidden` still
 * mounts everything.
 */
export const useMediaQueryMatch = (query: string): boolean => {
  const subscribe = (notify: () => void) => {
    if (typeof window === "undefined" || !window.matchMedia) return () => {};
    const mql = window.matchMedia(query);
    mql.addEventListener("change", notify);
    return () => mql.removeEventListener("change", notify);
  };

  const getSnapshot = () =>
    typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches;

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
};
