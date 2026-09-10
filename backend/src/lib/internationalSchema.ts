/**
 * The international presentment fields, added to every payable document.
 *
 * ── What is and isn't changing about your data ────────────────────────────────
 *
 * The document's existing INR amount field (`totalPrice` / `totalAmount` /
 * `amount` / `price`, depending on the model) STAYS EXACTLY WHAT IT ALWAYS WAS:
 * rupees. Everything downstream — reporting, refunds, accounting, Meta CAPI
 * conversion values, WhatsApp templates, admin screens — keeps reading it and
 * needed no change at all.
 *
 * These fields sit BESIDE it and record what the card actually saw:
 *
 *   totalPrice      ₹6,930          INR value of the sale (already marked up)
 *   chargedAmount   $81.11          what the card saw
 *   currency        USD
 *   country         United States  /  countryCode  US
 *   fxRate          88              lets you reconcile the charge months later
 *   priceMultiplier 3.3             the foreign markup that produced totalPrice
 *
 * Storing `fxRate` and `priceMultiplier` is what makes a charge readable a year
 * later, after both the rate table and the markup ladder have been revised.
 *
 * Written for the HOME MARKET TOO (currency defaults to "INR"), so a record
 * always states its own market rather than leaving it to be inferred from a
 * phone number.
 */
export const internationalSchemaFields = {
  /** ISO-4217 the card actually saw. Defaults to INR so historic rows read correctly. */
  currency: { type: String, default: "INR" },
  /** The amount in that currency — undefined on INR orders, where totalPrice says it. */
  chargedAmount: { type: Number },
  /** INR per 1 unit of `currency`, at time of sale. */
  fxRate: { type: Number },
  /** Display name of the buyer's country. */
  country: { type: String },
  /** ISO-3166 alpha-2. Indexed: this is the field every market report groups by. */
  countryCode: { type: String, index: true },
  /** The foreign markup applied to the list price to reach the stored INR amount. */
  priceMultiplier: { type: Number },
  /**
   * The India list price, before any foreign markup — kept so reporting can still
   * answer "how many of this seva did we sell" without dividing every foreign row
   * back through a multiplier that may since have changed.
   * Equal to the stored INR amount for home-market orders.
   */
  listAmount: { type: Number },
} as const;

/** The matching TypeScript shape — extend a booking interface with this. */
export interface IInternationalFields {
  currency?: string;
  chargedAmount?: number;
  fxRate?: number;
  country?: string;
  countryCode?: string;
  priceMultiplier?: number;
  listAmount?: number;
}
