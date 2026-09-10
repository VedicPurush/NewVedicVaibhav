/**
 * International pricing — THE ONE FILE YOU EDIT TO CHANGE WHAT FOREIGN BUYERS PAY.
 *
 * Pure data. No logic, no imports. `config/currency.ts` resolves everything here
 * (applying any env overrides) and is the only module the rest of the app talks to.
 *
 * ── The invariant everything else follows ──────────────────────────────────────
 *
 *   INR is the only source of truth. A foreign currency is a PRESENTMENT layer.
 *
 * Every catalog price, every booking's stored `amount`, every analytics event,
 * every confirmation email and every admin screen stays in INR — forever. The
 * devotee READS the price in their own money and their card is CHARGED in their
 * own money, but the record is still an INR record with the foreign figures
 * stored beside it (`currency`, `chargedAmount`, `fxRate`, `priceMultiplier`).
 *
 * Conversion is a pure function INR -> foreign, NEVER the reverse. Nothing in the
 * pricing maths ever reads the converted value back.
 *
 * ── How a foreign price is built ──────────────────────────────────────────────
 *
 *   India list price       ₹2,100
 *     x tier multiplier    x 3.3        <- FOREIGN_PRICE_TIERS  (pricing decision)
 *     = INR value of sale  ₹6,930       <- what the booking stores as `amount`
 *     / exchange rate      / 88  (USD)  <- EXCHANGE_RATES
 *     x safety buffer      x 1.03       <- FX_BUFFER            (FX-drift safety)
 *     = charged            $81.11       <- what the card sees
 *     x 100                = 8111       <- what Razorpay's `amount` field wants
 */

/**
 * The base currency. Everything the business actually runs on.
 * Never marked up, never converted.
 */
export const BASE_CURRENCY = "INR";

/**
 * FX safety margin, applied on top of the raw rate.
 *
 * Deliberately NOT merged with the multipliers below: this is an FX-drift
 * mechanic, not a pricing one. It exists so the settled INR can never land under
 * the list price after Razorpay's cross-currency cut, even if the real rate has
 * moved since EXCHANGE_RATES was last reviewed.
 *
 * Conflating the two would mean you cannot change what you charge abroad without
 * also changing your tolerance for rate drift.
 */
export const FX_BUFFER = 1.03;

/**
 * The foreign markup ladder — a PRICING decision, not an FX one.
 *
 * Selling abroad costs more: cross-border gateway fees, higher refund rates,
 * timezone-spanning support, international courier where it applies.
 *
 * Banded by how much ONE UNIT of the buyer's currency is worth in rupees.
 *
 * KNOWN WEAKNESS, handled deliberately: this ladder keys on how a currency is
 * DENOMINATED, not on what it can BUY. NPR is ₹0.63/unit, so Nepal would land in
 * the top band by accident. That is exactly what CURRENCY_MULTIPLIER_OVERRIDES
 * below is for.
 */
export const FOREIGN_PRICE_TIERS: ReadonlyArray<{ under: number; multiplier: number }> = [
  { under: 100, multiplier: 3.3 }, // USD ₹88, EUR ₹96, AED ₹24, JPY ₹0.58
  { under: 150, multiplier: 2.2 }, // GBP ₹113, CHF ₹105
  { under: Infinity, multiplier: 2 }, // anything worth ₹150+ per unit
];

/**
 * Per-currency escape hatch from the ladder. Most specific rule in the system —
 * beats the flat FX_MULTIPLIER env var and beats the tier ladder.
 *
 * Use it for lower-income markets whose currency happens to be denominated in
 * small units, and for neighbouring markets you want to sell at the India price.
 */
export const CURRENCY_MULTIPLIER_OVERRIDES: Record<string, number> = {
  // NPR: 1,   // neighbouring market — sell at the India price
  // LKR: 1,
  // ZAR: 2,
};

/**
 * Fixed exchange rates — INR per 1 unit of the currency.
 *
 * FIXED, NOT LIVE. This is a choice, not laziness:
 *   - a rate that moves between the price someone READ and the price their card
 *     is CHARGED is a support ticket;
 *   - a rate API is one more thing that can be down between a customer and their
 *     payment.
 *
 * Review a few times a year. FX_BUFFER absorbs drift in between, and the
 * FX_RATES env var is the no-deploy hotfix path.
 *
 * `exp` is the MINOR-UNIT EXPONENT and it is LOAD-BEARING — Razorpay bills in the
 * smallest unit. 2 for almost everything (cents), 0 for the zero-decimal
 * currencies. Get it wrong and you bill 100x too much or too little.
 *
 * The zero-decimal ones here are JPY, KRW and VND. If you add a currency, CHECK
 * ISO 4217 rather than assuming 2 — the other common exp-0 codes are CLP, ISK,
 * XAF, XOF, XPF, UGX, PYG, RWF, VUV, BIF, DJF, GNF and KMF.
 *
 * Three-decimal currencies (KWD/BHD/OMR) are deliberately ABSENT: those countries
 * are priced in USD instead (see the frontend COUNTRIES table), so this code only
 * ever handles the two well-trodden cases.
 */
export const EXCHANGE_RATES: Record<string, { exp: 0 | 2; inr: number }> = {
  INR: { exp: 2, inr: 1 },

  // Americas
  USD: { exp: 2, inr: 88 },
  CAD: { exp: 2, inr: 64 },
  MXN: { exp: 2, inr: 4.7 },
  BRL: { exp: 2, inr: 16 },

  // Europe
  EUR: { exp: 2, inr: 96 },
  GBP: { exp: 2, inr: 113 },
  CHF: { exp: 2, inr: 105 },
  SEK: { exp: 2, inr: 8.5 },
  NOK: { exp: 2, inr: 8.2 },
  DKK: { exp: 2, inr: 12.9 },
  PLN: { exp: 2, inr: 22.5 },
  CZK: { exp: 2, inr: 3.9 },
  RUB: { exp: 2, inr: 1.05 },
  TRY: { exp: 2, inr: 2.5 },

  // Middle East
  AED: { exp: 2, inr: 24 },
  SAR: { exp: 2, inr: 23.5 },
  QAR: { exp: 2, inr: 24.2 },
  ILS: { exp: 2, inr: 24.5 },

  // Asia-Pacific
  AUD: { exp: 2, inr: 57 },
  NZD: { exp: 2, inr: 52 },
  SGD: { exp: 2, inr: 66 },
  HKD: { exp: 2, inr: 11.3 },
  JPY: { exp: 0, inr: 0.58 }, // no subunit — exp 0
  CNY: { exp: 2, inr: 12.2 },
  KRW: { exp: 0, inr: 0.062 }, // no subunit — exp 0
  MYR: { exp: 2, inr: 20 },
  THB: { exp: 2, inr: 2.6 },
  IDR: { exp: 2, inr: 0.0054 },
  PHP: { exp: 2, inr: 1.5 },
  VND: { exp: 0, inr: 0.0035 }, // no subunit — exp 0

  // Africa
  ZAR: { exp: 2, inr: 5 },
  KES: { exp: 2, inr: 0.68 },
  MUR: { exp: 2, inr: 1.9 },

  // South Asia
  NPR: { exp: 2, inr: 0.63 },
  LKR: { exp: 2, inr: 0.29 },
  BDT: { exp: 2, inr: 0.72 },
  PKR: { exp: 2, inr: 0.31 },
  AFN: { exp: 2, inr: 1.25 },
};
