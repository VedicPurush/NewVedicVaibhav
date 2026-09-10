import axios from "axios";

/**
 * Shared post-payment verification for every checkout on the site.
 *
 * ## Why this exists
 *
 * Razorpay's `handler` callback only fires once the payment is *captured* — by
 * the time we get here the money has already left the user's account. Anything
 * that goes wrong from this point on is a confirmation problem on our side, not
 * a payment failure, and must never be reported to the user as "payment failed".
 *
 * Every checkout used to `await` the verify endpoint exactly once and treat any
 * non-success as a failure. That loses a race the backend cannot avoid:
 *
 *   1. Razorpay captures the payment.
 *   2. Razorpay's webhook reaches our server (often first — it is server-to-server,
 *      while the browser call competes with the user's own network).
 *   3. The webhook finalises the booking and deletes the pending record.
 *   4. The browser's verify call arrives, finds no pending record, and errors.
 *
 * The user is then shown "payment failed" for a booking that is, in fact,
 * already confirmed — which is exactly the bug this module fixes. The webhook is
 * meant to be the safety net for delayed confirmations, not the primary path.
 *
 * Retrying closes the race: the losing call simply asks again a moment later and
 * gets back the booking the webhook (or a concurrent finaliser) just created.
 *
 * ## Outcomes
 *
 * - `confirmed`   — booking exists. Show success.
 * - `declined`    — the gateway signature did not validate (HTTP 400). This is the
 *                   only case that may legitimately be shown as a failure.
 * - `unconfirmed` — retries exhausted without a definitive answer. The payment is
 *                   still captured, so the caller should show success-with-pending
 *                   copy and let the webhook finish the job. Never show a failure.
 */

export type VerifyOutcome<T> =
  | { status: "confirmed"; data: T }
  | { status: "declined"; message: string }
  | { status: "unconfirmed"; message: string };

export interface VerifyPaymentOptions<T> {
  /** One verification attempt. Should reject on HTTP error (axios default). */
  attempt: () => Promise<T>;
  /**
   * Decides whether a *resolved* response actually means "booking confirmed".
   * Needed because several endpoints answer `202 { success: false }` to mean
   * "another worker is finalising, retry shortly" — a 2xx that is not a success.
   * Defaults to `data?.success !== false`.
   */
  isConfirmed?: (data: T) => boolean;
  /** Attempts including the first. Default 6 (~13s worst case). */
  maxAttempts?: number;
  /** Base backoff in ms; grows linearly per attempt. Default 800. */
  baseDelayMs?: number;
  /** Called before each retry — useful for progress copy. */
  onRetry?: (attempt: number, maxAttempts: number) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A 400 means the request itself was rejected — bad/absent signature or missing
 * fields. Retrying cannot change that, and it is the one genuine "do not honour
 * this payment" signal. Every other status (404 pending-not-found, 409, 5xx) and
 * every network/timeout error is transient here and worth another attempt.
 */
const isHardDecline = (err: unknown): boolean =>
  axios.isAxiosError(err) && err.response?.status === 400;

const messageFrom = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message || err.message;
  }
  return err instanceof Error ? err.message : String(err);
};

export async function verifyPaymentWithRetry<T>({
  attempt,
  isConfirmed = (data: T) => (data as { success?: boolean })?.success !== false,
  maxAttempts = 6,
  baseDelayMs = 800,
  onRetry,
}: VerifyPaymentOptions<T>): Promise<VerifyOutcome<T>> {
  let lastMessage = "Could not confirm the booking.";

  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const data = await attempt();
      if (isConfirmed(data)) return { status: "confirmed", data };
      // 2xx that explicitly is not a confirmation (e.g. 202 "finalisation in
      // progress"). Fall through to the retry below.
      lastMessage =
        (data as { message?: string })?.message || "Booking is still being confirmed.";
    } catch (err) {
      if (isHardDecline(err)) {
        return { status: "declined", message: messageFrom(err) };
      }
      lastMessage = messageFrom(err);
    }

    if (i < maxAttempts) {
      onRetry?.(i, maxAttempts);
      await sleep(baseDelayMs * i);
    }
  }

  return { status: "unconfirmed", message: lastMessage };
}
