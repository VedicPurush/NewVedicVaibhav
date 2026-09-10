import type { Orders } from "razorpay/dist/types/orders";
import { razorpay } from "../lib/razorpay";
import { logger } from "../lib/logger";
import {
  BASE_CURRENCY,
  convertFromInr,
  inrPerUnit,
  multiplierFor,
  resolveCurrency,
  toMinorUnits,
} from "../config/currency";

/**
 * The shared order-creation contract.
 *
 * Ten flows take payments in this codebase (chadhava, new chadhava, jyotirling
 * chadhava, pooja, prasad, personalized pooja, char dham, banke-bihari seva, gau
 * seva, jyotirlinga subscription). International support written ten times would
 * drift ten ways — and the two things that must not drift are THE AMOUNT BILLED
 * and THE AMOUNT VERIFIED LATER against the webhook.
 *
 * Hence one narrow contract, used by all of them.
 */

export type OrderPricing = {
  /** ISO-4217 actually used. The base currency whenever the request was unusable. */
  currency: string;
  /** `amountInr` expressed in `currency` — what the card sees. */
  chargedAmount: number;
  /** What the gateway's `amount` field wants: the smallest unit of `currency`. */
  amountMinor: number;
  /** INR per 1 unit at time of sale, so a charge still reconciles months later. */
  fxRate: number;
  /** The foreign markup that produced `amountInr`. */
  priceMultiplier: number;
};

/**
 * Resolve what to actually bill.
 *
 * The contract's two rules:
 *
 *  - `amountInr` is the INR the sale is worth, ALREADY MARKED UP. It becomes the
 *    booking's stored amount, so every downstream consumer (reporting, refunds,
 *    accounting, Meta CAPI conversion values, WhatsApp templates) keeps seeing
 *    rupees and never needed to change.
 *
 *  - `currency` is only ever a REQUEST. The charge is re-derived from the INR, so
 *    a tampered client can change WHICH CURRENCY it is billed in but never HOW
 *    MUCH.
 */
export function resolveOrderPricing(amountInr: number, requested?: unknown): OrderPricing {
  const currency = resolveCurrency(requested);
  const inr = Number(amountInr) || 0;
  const chargedAmount = currency === BASE_CURRENCY ? inr : convertFromInr(inr, currency);

  return {
    currency,
    chargedAmount,
    amountMinor: toMinorUnits(chargedAmount, currency),
    fxRate: inrPerUnit(currency),
    priceMultiplier: multiplierFor(currency),
  };
}

/** `razorpay.orders.create` is overloaded (promise + callback form), and the
 *  callback overload is the one ReturnType<> resolves to — so the SDK's own
 *  interfaces are named directly rather than derived from the function. */
type OrderOptions = Orders.RazorpayOrderCreateRequestBody;
type RazorpayOrder = Orders.RazorpayOrder;

/**
 * Create the Razorpay order, falling back to the base currency if the gateway
 * rejects the presentment currency.
 *
 * A currency the Razorpay account is not enabled for is the ONE FAILURE WITH A
 * GOOD ANSWER: international cards can pay an INR order perfectly well, so bill
 * in rupees rather than showing "could not start payment" and losing the sale.
 *
 * ⚠️ CALLERS MUST PERSIST THE RETURNED `pricing`, NOT WHAT THEY ASKED FOR —
 * otherwise the webhook's amount check compares a rupee payment against a dollar
 * expectation and strands an order the customer has already paid for.
 */
export async function createOrderWithFallback(
  amountInr: number,
  requestedCurrency: unknown,
  baseOptions: Omit<OrderOptions, "amount" | "currency">,
  label = "Order",
): Promise<{ order: RazorpayOrder; pricing: OrderPricing }> {
  let pricing = resolveOrderPricing(amountInr, requestedCurrency);

  const build = (p: OrderPricing): OrderOptions =>
    ({
      ...baseOptions,
      amount: p.amountMinor,
      currency: p.currency,
      notes: {
        ...((baseOptions as { notes?: Record<string, string> }).notes || {}),
        // Only tagged for foreign orders, so an INR order's notes look exactly
        // as they always did and nothing downstream reading them changes.
        ...(p.currency !== BASE_CURRENCY && {
          currency: p.currency,
          chargedAmount: String(p.chargedAmount),
          amountInr: String(amountInr),
        }),
      },
    }) as OrderOptions;

  try {
    return { order: await razorpay.orders.create(build(pricing)), pricing };
  } catch (err) {
    if (pricing.currency === BASE_CURRENCY) throw err;
    logger.error(
      { err },
      `[${label}] Razorpay rejected a ${pricing.currency} order — retrying in ${BASE_CURRENCY}. ` +
        `Enable ${pricing.currency} on the Razorpay account to present prices in it.`,
    );
    pricing = resolveOrderPricing(amountInr, BASE_CURRENCY);
    return { order: await razorpay.orders.create(build(pricing)), pricing };
  }
}

/** What the browser sent alongside the order, when it sent anything. */
export type GeoInput = {
  countryCode?: unknown;
  country?: unknown;
};

/**
 * The fields to store on every payable record.
 *
 * Stored EVEN FOR THE HOME MARKET, so a record always states its own market
 * rather than leaving it to be inferred from a phone number later. Country is
 * optional because some flows (admin-created records, app clients on old builds)
 * have no browser to ask.
 */
export function internationalFields(
  pricing: OrderPricing,
  geo?: GeoInput,
): {
  currency: string;
  chargedAmount: number;
  fxRate: number;
  priceMultiplier: number;
  countryCode?: string;
  country?: string;
} {
  return {
    currency: pricing.currency,
    chargedAmount: pricing.chargedAmount,
    fxRate: pricing.fxRate,
    priceMultiplier: pricing.priceMultiplier,
    ...(geo?.countryCode
      ? { countryCode: String(geo.countryCode).toUpperCase().slice(0, 2) }
      : {}),
    ...(geo?.country ? { country: String(geo.country).slice(0, 64) } : {}),
  };
}

/** A record that carries enough to know what it should have been paid. */
export type PayableDoc = {
  amount?: number | null;
  currency?: string | null;
  chargedAmount?: number | null;
};

/**
 * Did this payment cover the order? — THE BUG THIS FILE EXISTS TO PREVENT.
 *
 * THE GATEWAY REPORTS THE AMOUNT IN THE ORDER'S CURRENCY, IN ITS SMALLEST UNIT —
 * cents for a USD order, not paise. Comparing that against `amountInr * 100`
 * makes every single foreign payment look underpaid, and strands an order the
 * customer has already paid for.
 *
 * A non-numeric `paidMinor` returns true: the gateway did not tell us the amount,
 * which is not evidence of underpayment and must not block a confirmed payment.
 */
export function paymentCoversOrder(paidMinor: unknown, doc: PayableDoc): boolean {
  if (typeof paidMinor !== "number" || !Number.isFinite(paidMinor)) return true;

  const currency = doc.currency || BASE_CURRENCY;
  const expectedMajor =
    currency === BASE_CURRENCY
      ? Number(doc.amount ?? 0)
      : Number(doc.chargedAmount ?? convertFromInr(Number(doc.amount ?? 0), currency));

  return paidMinor >= toMinorUnits(expectedMajor, currency);
}

/**
 * The block every create-order response must return.
 *
 * The checkout MUST open on the SAME currency and amount the order carries — the
 * server may have fallen back to the base currency, and if the two disagree the
 * payment either fails outright or verifies against the wrong expectation.
 */
export function orderResponseFields(pricing: OrderPricing): {
  currency: string;
  chargedAmount: number;
  amountMinor: number;
} {
  return {
    currency: pricing.currency,
    chargedAmount: pricing.chargedAmount,
    amountMinor: pricing.amountMinor,
  };
}
