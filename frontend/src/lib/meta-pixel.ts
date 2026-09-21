/**
 * Meta Pixel helpers.
 *
 * The pixel is loaded lazily — components/global/DeferredTags holds it back
 * until the visitor's first interaction — so `window.fbq` is routinely still
 * absent when a page fires its first event. A plain `if (window.fbq)` guard
 * drops those calls on the floor, which is how a `ViewContent` on a landing
 * page gets lost almost every time. `fbqTrack` queues instead, and flushes once
 * the library lands.
 *
 * `metaHeaders` carries the same visitor's `_fbp`/`_fbc` cookies to the backend,
 * so the server-side Conversions API event can be matched to this browser.
 */

/** Poll interval while waiting for the deferred pixel to arrive. */
const FLUSH_INTERVAL_MS = 400;

type FbqOptions = { eventID?: string };

type QueuedEvent = {
  event: string;
  params?: Record<string, unknown>;
  options?: FbqOptions;
};

const isFbq = (fn: unknown): fn is (...args: unknown[]) => void => typeof fn === "function";

const getCookie = (name: string): string => {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(?:^|;\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : "";
};

/**
 * Fires a standard pixel event, queueing it when the pixel has not loaded yet.
 *
 * @param options pass `eventID` whenever the backend sends the same conversion
 *   through the Conversions API, so Meta counts the pair once.
 */
export const fbqTrack = (
  event: string,
  params?: Record<string, unknown>,
  options?: FbqOptions,
): void => {
  if (typeof window === "undefined") return;

  const win = window as unknown as {
    fbq?: unknown;
    _fbqQueue?: QueuedEvent[];
    _fbqInterval?: number;
  };

  if (isFbq(win.fbq)) {
    try {
      win.fbq("track", event, params || {}, options);
    } catch (err) {
      console.warn("fbq track failed", err);
    }
    return;
  }

  win._fbqQueue = win._fbqQueue || [];
  win._fbqQueue.push({ event, params, options });

  if (win._fbqInterval) return;
  win._fbqInterval = window.setInterval(() => {
    const fbq = win.fbq;
    if (!isFbq(fbq)) return;

    const queued = win._fbqQueue || [];
    win._fbqQueue = [];
    queued.forEach((e) => {
      try {
        fbq("track", e.event, e.params || {}, e.options);
      } catch (err) {
        console.warn("fbq queued track failed", err);
      }
    });

    window.clearInterval(win._fbqInterval);
    win._fbqInterval = 0;
  }, FLUSH_INTERVAL_MS);
};

/**
 * Attribution headers for a booking call, read on the server by the Meta
 * purchase event (see the backend's `x-fbp` / `x-fbc` / `x-event-source-url`
 * handling — these three are already on the CORS allow-list).
 *
 * `_fbc` only exists once the pixel has written it, which the deferred load can
 * miss entirely on a quick bounce. The `fbclid` query parameter carries the same
 * click id, so it is rebuilt in Meta's documented format when the cookie is
 * absent — otherwise every click-through would lose its click attribution.
 */
export const metaHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};

  const fbp = getCookie("_fbp");
  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  const fbc = getCookie("_fbc") || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : "");

  const headers: Record<string, string> = { "x-event-source-url": window.location.href };
  if (fbp) headers["x-fbp"] = fbp;
  if (fbc) headers["x-fbc"] = fbc;
  return headers;
};
