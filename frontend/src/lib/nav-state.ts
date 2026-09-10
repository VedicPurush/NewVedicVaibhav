/**
 * Replacement for react-router's `navigate(path, { state })` / `location.state`.
 * Next.js navigation carries no state object, so pages that used router state
 * persist it in sessionStorage keyed per flow before pushing the route, and
 * read it back on mount (survives refresh, like history state did).
 */
const KEY_PREFIX = "vv-nav-state:";

export const saveNavState = (key: string, state: unknown): void => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${KEY_PREFIX}${key}`, JSON.stringify(state));
  } catch {
    // Storage full/blocked — the target page falls back to its empty-state path.
  }
};

export const readNavState = <T>(key: string): T | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(`${KEY_PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
};
