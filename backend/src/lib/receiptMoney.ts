import { BASE_CURRENCY, convertFromInr, minorUnitExponent } from "../config/currency";

/**
 * Money formatting for RECEIPTS — confirmation emails, and anything else that
 * tells a devotee what they were charged.
 *
 * ── The rule ──────────────────────────────────────────────────────────────────
 *
 *   A receipt is a statement of what ALREADY HAPPENED. It must be built from the
 *   values stored ON THE RECORD, never from today's rate table or today's
 *   country detection.
 *
 * Someone who paid ₹2,100 from Delhi did not pay $24, and a confirmation that
 * says otherwise misrepresents a receipt. Equally, a devotee charged $81.12 must
 * not be emailed "₹6,930" — that is a number they will not find on their card
 * statement, and it is the first thing that turns into a support ticket.
 *
 * So every figure here is derived from `currency`, `chargedAmount`, `fxRate` and
 * `priceMultiplier` as they were written at the time of sale. Rates and
 * multipliers can be revised freely afterwards and old receipts stay correct.
 *
 * The frontend mirrors this in `paidMoney()` (frontend/src/lib/currency.ts).
 */

/** Symbols for the presented currencies. Anything unlisted falls back to its code. */
const SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", CAD: "CA$", EUR: "€", GBP: "£", CHF: "CHF ",
  SEK: "kr ", NOK: "kr ", DKK: "kr ", PLN: "zł ", CZK: "Kč ",
  AED: "AED ", SAR: "SAR ", QAR: "QAR ", ILS: "₪", TRY: "₺", RUB: "₽",
  AUD: "A$", NZD: "NZ$", SGD: "S$", HKD: "HK$", JPY: "¥", CNY: "CN¥",
  KRW: "₩", MYR: "RM ", THB: "฿", IDR: "Rp ", PHP: "₱", VND: "₫",
  ZAR: "R ", KES: "KSh ", MUR: "Rs ", MXN: "MX$", BRL: "R$",
  NPR: "NPR ", LKR: "LKR ", BDT: "৳", PKR: "PKR ", AFN: "AFN ",
};

/** The presentment fields every payable record carries. */
export type PaidRecord = {
  currency?: string | null;
  chargedAmount?: number | null;
  fxRate?: number | null;
  priceMultiplier?: number | null;
};

export type ReceiptMoney = {
  /** ISO-4217 actually charged. */
  code: string;
  /** True for a home-market order — everything below then behaves exactly as before. */
  isBase: boolean;
  /**
   * A CATALOG LINE ITEM, given its India list price.
   *
   * Line items are stored unmarked (an offering's `price` is the India price),
   * while the booking's total is stored already marked up. Applying the record's
   * own `priceMultiplier` here is what makes the itemised rows add up to the
   * total the devotee actually paid, instead of falling short by the markup.
   */
  item: (listInr: number) => string;
  /** An INR figure that is ALREADY marked up (the booking's own totals). */
  marked: (inr: number) => string;
  /**
   * The grand total. Prefers the exact `chargedAmount` that was billed, so the
   * headline figure on the receipt matches the card statement to the cent.
   *
   * NOTE: itemised rows are each rounded to the currency's minor unit, so their
   * sum can differ from this total by up to half a minor unit per row — visible
   * only on zero-decimal currencies (JPY/KRW/VND), where it is a yen or two on a
   * five-figure total. The total is always the authoritative charged figure and
   * is never derived by summing the rows.
   */
  total: (markedInr: number) => string;
};

const formatterFor = (code: string): Intl.NumberFormat => {
  const exp = minorUnitExponent(code);
  return new Intl.NumberFormat(code === BASE_CURRENCY ? "en-IN" : "en-US", {
    minimumFractionDigits: exp === 0 ? 0 : 2,
    maximumFractionDigits: exp === 0 ? 0 : 2,
  });
};

/**
 * Build a formatter bound to one record.
 *
 * `markedTotalInr` is optional but worth passing: with it AND `chargedAmount`,
 * every figure is scaled by the SAME ratio the real charge used, so the rows and
 * the total reconcile exactly — no rounding drift, and no dependence on what the
 * FX buffer happens to be today. Without it, the stored `fxRate` is used.
 */
export function receiptMoney(doc?: PaidRecord | null, markedTotalInr?: number): ReceiptMoney {
  const code = String(doc?.currency ?? BASE_CURRENCY).toUpperCase() || BASE_CURRENCY;
  const isBase = code === BASE_CURRENCY || !SYMBOLS[code];

  const rupees = (n: number): string =>
    `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0))}`;

  // A home-market order, or a currency we cannot present: rupees, exactly as before.
  if (isBase) {
    return {
      code: BASE_CURRENCY,
      isBase: true,
      item: rupees,
      marked: rupees,
      total: rupees,
    };
  }

  const symbol = SYMBOLS[code];
  const fmt = formatterFor(code);
  const multiplier = Number(doc?.priceMultiplier) > 0 ? Number(doc?.priceMultiplier) : 1;
  const charged = Number(doc?.chargedAmount);
  const totalInr = Number(markedTotalInr);
  const rate = Number(doc?.fxRate);

  /**
   * Foreign units per 1 marked-up rupee.
   *
   * Derived from the charge itself when both halves are on the record — that
   * ratio already contains the exact rate AND the FX buffer that were in force
   * when the card was billed, so the receipt reconciles with the statement even
   * after the rate table is revised. Otherwise fall back to the stored rate, and
   * finally to today's conversion.
   */
  const perInr =
    Number.isFinite(charged) && charged > 0 && Number.isFinite(totalInr) && totalInr > 0
      ? charged / totalInr
      : Number.isFinite(rate) && rate > 0
        ? 1 / rate
        : null;

  const show = (amount: number): string => `${symbol}${fmt.format(amount)}`;

  const convert = (inr: number): number => {
    const n = Number(inr) || 0;
    return perInr === null ? convertFromInr(n, code) : n * perInr;
  };

  return {
    code,
    isBase: false,
    item: (listInr) => show(convert((Number(listInr) || 0) * multiplier)),
    marked: (inr) => show(convert(inr)),
    total: (markedInr) =>
      Number.isFinite(charged) && charged > 0 ? show(charged) : show(convert(markedInr)),
  };
}

/**
 * A one-line note for the body of a foreign receipt.
 *
 * The booking is recorded in rupees and every internal reference to it is in
 * rupees, so a devotee querying the order will be quoted a rupee figure by
 * support. Stating both once removes that surprise. Empty for home-market
 * orders, where there is nothing to explain.
 */
export function receiptCurrencyNote(doc?: PaidRecord | null, markedTotalInr?: number): string {
  const m = receiptMoney(doc, markedTotalInr);
  if (m.isBase || !Number.isFinite(Number(markedTotalInr))) return "";
  return `Charged in ${m.code}. Order value ₹${Math.round(Number(markedTotalInr)).toLocaleString("en-IN")}.`;
}
