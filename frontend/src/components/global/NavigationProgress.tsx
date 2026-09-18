"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * A centred spinner over the page for the duration of every client-side
 * navigation.
 *
 * `loading.tsx` already covers routes that have one, but it only appears once
 * Next has begun rendering the new segment, and it cannot cover a navigation
 * that resolves inside the same segment. This is the universal fallback: one
 * piece of feedback for every route change on the site, so a tap is never
 * silent.
 */

/** Set by the spinner; called by the click listener and the patched router. */
const startListeners = new Set<() => void>();

const emitNavStart = () => {
  startListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // Loading feedback must never be able to break a navigation.
    }
  });
};

const PATCHED = "__vvNavigationProgressPatched";

/**
 * Wraps `push`/`replace` on the shared router object.
 *
 * The App Router hands every `useRouter()` caller the same instance out of
 * context, so patching it once here covers all ~130 programmatic navigations in
 * the app without touching a single call site.
 *
 * It is also the only way to observe the START of a `router.push`: the URL — and
 * therefore `usePathname` — does not move until the server has already
 * responded, and that wait is the exact window this spinner exists to fill.
 */
function patchRouter(router: Record<string, unknown>) {
  try {
    if (!router || router[PATCHED]) return;
    const push = router.push;
    const replace = router.replace;
    if (typeof push !== "function") return;

    router.push = function patchedPush(this: unknown, ...args: unknown[]) {
      emitNavStart();
      return (push as (...a: unknown[]) => unknown).apply(this, args);
    };
    if (typeof replace === "function") {
      router.replace = function patchedReplace(this: unknown, ...args: unknown[]) {
        emitNavStart();
        return (replace as (...a: unknown[]) => unknown).apply(this, args);
      };
    }
    router[PATCHED] = true;
  } catch {
    // Frozen or unexpected router shape: anchor clicks still drive the spinner.
  }
}

/** Navigations faster than this never show it, so quick hops don't flash. */
const SHOW_DELAY_MS = 180;
/** Safety net — a navigation that never commits must not spin forever. */
const MAX_DURATION_MS = 20000;

export default function NavigationProgress() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";

  const [visible, setVisible] = useState(false);

  const active = useRef(false);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef<() => void>(() => {});
  // The route currently rendered — compared against `location` on popstate.
  const renderedRoute = useRef({ pathname, search });

  const clearTimers = useCallback(() => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  }, []);

  const done = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    clearTimers();
    setVisible(false);
  }, [clearTimers]);

  useEffect(() => {
    doneRef.current = done;
  }, [done]);

  const start = useCallback(() => {
    if (active.current) return;
    active.current = true;
    clearTimers();

    timeouts.current.push(
      setTimeout(() => {
        if (!active.current) return;
        setVisible(true);
      }, SHOW_DELAY_MS)
    );

    timeouts.current.push(setTimeout(() => doneRef.current(), MAX_DURATION_MS));
  }, [clearTimers]);

  useEffect(() => {
    patchRouter(router as unknown as Record<string, unknown>);
  }, [router]);

  useEffect(() => {
    startListeners.add(start);
    return () => {
      startListeners.delete(start);
    };
  }, [start]);

  // Covers every <Link> and plain <a> on the site.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Bubble phase, so `defaultPrevented` is meaningful here: a link whose own
      // handler cancelled the navigation must not start the spinner.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.hasAttribute("download")) return;

      const target = anchor.getAttribute("target");
      if (target && target !== "_self") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL((anchor as HTMLAnchorElement).href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same page, or a bare hash change — nothing is being fetched.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      emitNavStart();
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  /**
   * Back/forward is usually served from the router cache, but not always.
   *
   * A cached traversal commits before this listener runs (Next's own popstate
   * handler is registered first), so the pathname effect below has already
   * fired by now and would never fire again — the overlay then sat over the
   * restored page until MAX_DURATION_MS. Only start when the rendered route
   * still differs from the URL, i.e. the navigation is genuinely pending.
   */
  useEffect(() => {
    const onPopState = () => {
      const rendered = renderedRoute.current;
      const locationSearch = new URLSearchParams(window.location.search).toString();
      if (rendered.pathname === window.location.pathname && rendered.search === locationSearch) return;
      emitNavStart();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  /**
   * The route committed.
   *
   * These deps are strings, not the `searchParams` object — that object is a new
   * instance on most renders, so an object dep would finish the navigation the
   * moment anything above this component re-rendered.
   */
  useEffect(() => {
    renderedRoute.current = { pathname, search };
    done();
  }, [pathname, search, done]);

  useEffect(() => clearTimers, [clearTimers]);

  if (!visible) return null;

  // aria-hidden because the route skeletons (components/shared/skeletons) already
  // carry role="status" — announcing both would say "loading" twice.
  return (
    <div className="vv-nav-overlay" aria-hidden="true">
      <div className="vv-nav-spinner" />
    </div>
  );
}
