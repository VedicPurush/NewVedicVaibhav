/**
 * One purchase event per booking — no matter how often the success page loads.
 *
 * Success pages fire their analytics from a mount effect that reads the booking
 * out of nav-state/localStorage. That effect knows nothing about history, so it
 * re-fired on every refresh and every back-navigation to the success URL, each
 * time reporting the full order value again. Opening a success URL directly
 * (bookmark, crawler, curiosity) also fired one, with value 0 and an empty
 * transaction id.
 *
 * `shouldTrackPurchase` answers both: it refuses transactions with no real
 * booking data, and refuses any transaction id it has already reported.
 *
 * Deliberately localStorage, not sessionStorage: a refresh is only the common
 * case. Re-opening a success link in a new tab days later is a new session but
 * the same order, and must not be counted twice.
 */

const STORE_KEY = "vv-tracked-purchases";
/** Bounded so this can never grow without limit on a long-lived device. */
const MAX_REMEMBERED = 50;

const readTracked = (): string[] => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
};

/**
 * True only the first time a given transaction is seen, and only when there is
 * a real booking behind it.
 *
 * Calling this MARKS the transaction, so call it exactly once, immediately
 * before sending the events — never as part of a condition you might re-check.
 *
 * @param transactionId order/booking id. Placeholder ids used purely for display
 *   (e.g. "BB-CONFIRMED") carry no booking, so pass the resolved real id or "".
 * @param amount order value. Zero or missing means the page has no booking data.
 */
export const shouldTrackPurchase = (
  transactionId: string | undefined,
  amount: number | undefined,
): boolean => {
  if (typeof window === "undefined") return false;

  const id = String(transactionId ?? "").trim();
  const value = Number(amount) || 0;

  // No booking behind this page view — a direct visit, or state that expired.
  if (!id || value <= 0) return false;

  try {
    const tracked = readTracked();
    if (tracked.includes(id)) return false;

    tracked.push(id);
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify(tracked.slice(-MAX_REMEMBERED)),
    );
    return true;
  } catch {
    // Storage blocked (private mode, quota). Reporting once too often beats
    // losing the conversion entirely, so fall through and let the event fire.
    return true;
  }
};
