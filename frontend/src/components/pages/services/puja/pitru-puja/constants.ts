/**
 * Base path of the Pitru Dosh Shanti puja pages.
 *
 * The landing page is one route per puja — `${BASE}/${pujaId}` — because the
 * collection holds several pujas. A bare visit to this path renders the
 * soonest upcoming one, so links published before the split still work.
 */
export const PITRU_PUJA_BASE_PATH = "/services/puja/pitru-dosh-shanti-puja";

/** Landing page for one puja. `pujaId` is the document's own unique id. */
export const pitruPujaHref = (pujaId: string) =>
  `${PITRU_PUJA_BASE_PATH}/${encodeURIComponent(pujaId)}`;

/**
 * Event id shared by the browser's `Purchase` pixel event and the server's
 * Conversions API event for the same booking, so Meta collapses the pair into
 * one conversion instead of counting the money twice.
 *
 * The backend builds the identical string from `eventIdPrefix:
 * "pitru_purchase_"` in modules/pitru-puja/pitruPujaBooking.notify.ts —
 * the two must be changed together, and `orderId` must be the booking's own
 * `orderId` (VVPP…) on both sides, not the Razorpay order id.
 */
export const pitruPurchaseEventId = (orderId: string) => `pitru_purchase_${orderId}`;
