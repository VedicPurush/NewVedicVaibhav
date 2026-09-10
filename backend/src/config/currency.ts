import { env } from "./env";
import { logger } from "../lib/logger";
import {
  BASE_CURRENCY,
  CURRENCY_MULTIPLIER_OVERRIDES,
  EXCHANGE_RATES,
  FOREIGN_PRICE_TIERS,
  FX_BUFFER as DEFAULT_FX_BUFFER,
} from "./pricing";

/**
 * Resolves config/pricing.ts (applying env overrides) and exposes the FX
 * primitives. Single source of truth for currency on the server — nothing else
 * should read config/pricing.ts directly.
 *
 * ── The rule that governs every function in here ──────────────────────────────
 *
 *   Nothing in this path may ever be the reason someone cannot pay.
 *
 * So: an unknown currency degrades to the base currency, a malformed env value
 * warns and keeps the committed default, and no function here throws. A foreign
 * card can pay an INR order perfectly well — falling back is always better than
 * failing.
 */

export { BASE_CURRENCY };

type CurrencyDef = { exp: 0 | 2; inr: number };

/* -------------------------------------------------------------------------- */
/*  Defensive env parsing                                                      */
/*                                                                             */
/*  The accepted ranges below are TYPO GUARDS, not policy. A bare `3` meaning   */
/*  "3%" would otherwise apply a 300% markup to real customers, and a rate of   */
/*  0 would divide the charge to infinity. Anything outside the range warns     */
/*  and keeps the committed default.                                           */
/* -------------------------------------------------------------------------- */

/** Parses "USD:90,GBP:118" into [["USD", 90], …]. Malformed pairs are skipped. */
const parsePairs = (raw: string, label: string): Array<[string, number]> => {
  const out: Array<[string, number]> = [];
  for (const chunk of raw.split(",")) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const [key, value] = trimmed.split(":");
    const n = Number(value);
    if (!key || !Number.isFinite(n)) {
      logger.warn(`[currency] Ignoring malformed ${label} entry "${trimmed}".`);
      continue;
    }
    out.push([key.trim().toUpperCase(), n]);
  }
  return out;
};

/** FX_BUFFER — margin over the raw rate. */
const resolveBuffer = (): number => {
  const raw = env.fx.buffer.trim();
  if (!raw) return DEFAULT_FX_BUFFER;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 1 && n <= 1.25) return n;
  logger.warn(
    `[currency] FX_BUFFER="${raw}" is outside the accepted range 1.00-1.25 — keeping the default ${DEFAULT_FX_BUFFER}.`,
  );
  return DEFAULT_FX_BUFFER;
};

/** A multiplier is only believable between just-above-0 and 20x. */
const validMultiplier = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0 && n <= 20;

/** FX_RATES — override INR-per-unit for the listed currencies only. */
const resolveRates = (): Record<string, CurrencyDef> => {
  const rates: Record<string, CurrencyDef> = { ...EXCHANGE_RATES };
  for (const [code, inr] of parsePairs(env.fx.rates, "FX_RATES")) {
    const existing = rates[code];
    if (!existing) {
      logger.warn(`[currency] FX_RATES names unknown currency "${code}" — ignored.`);
      continue;
    }
    if (!(inr > 0)) {
      logger.warn(`[currency] FX_RATES ${code}:${inr} is not a positive rate — keeping ${existing.inr}.`);
      continue;
    }
    // `exp` is deliberately NOT overridable from env: it is a property of the
    // currency itself (JPY has no subunit), not a rate that moves. Getting it
    // wrong bills 100x, so it stays in the committed table where it gets reviewed.
    rates[code] = { exp: existing.exp, inr };
  }
  return rates;
};

/** FX_MULTIPLIER — one flat foreign markup for everyone, turns the ladder off. */
const resolveFlatMultiplier = (): number | null => {
  const raw = env.fx.multiplier.trim();
  if (!raw) return null;
  const n = Number(raw);
  if (validMultiplier(n)) return n;
  logger.warn(`[currency] FX_MULTIPLIER="${raw}" is not in the accepted range (0, 20] — ignored.`);
  return null;
};

/** FX_MULTIPLIERS — per-currency overrides, merged over the committed ones. */
const resolveMultiplierOverrides = (): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const [code, n] of Object.entries(CURRENCY_MULTIPLIER_OVERRIDES)) {
    if (validMultiplier(n)) out[code.toUpperCase()] = n;
  }
  for (const [code, n] of parsePairs(env.fx.multipliers, "FX_MULTIPLIERS")) {
    if (!validMultiplier(n)) {
      logger.warn(
        `[currency] FX_MULTIPLIERS ${code}:${n} is not in the accepted range (0, 20] — ignored.`,
      );
      continue;
    }
    out[code] = n;
  }
  return out;
};

/** FX_TIERS — "100:4,150:3,*:2" replaces the whole ladder. `*` = Infinity. */
const resolveTiers = (): ReadonlyArray<{ under: number; multiplier: number }> => {
  const raw = env.fx.tiers.trim();
  if (!raw) return FOREIGN_PRICE_TIERS;

  const tiers: Array<{ under: number; multiplier: number }> = [];
  for (const chunk of raw.split(",")) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const [boundRaw, multRaw] = trimmed.split(":");
    const under = boundRaw?.trim() === "*" ? Infinity : Number(boundRaw);
    const multiplier = Number(multRaw);
    if (!(under > 0) || !validMultiplier(multiplier)) {
      logger.warn(`[currency] Ignoring malformed FX_TIERS entry "${trimmed}".`);
      continue;
    }
    tiers.push({ under, multiplier });
  }

  if (!tiers.length) {
    logger.warn(
      `[currency] FX_TIERS="${raw}" produced no usable tiers — keeping the committed ladder.`,
    );
    return FOREIGN_PRICE_TIERS;
  }
  // A ladder is only meaningful read low-bound-first.
  tiers.sort((a, b) => a.under - b.under);
  return tiers;
};

const CURRENCIES: Record<string, CurrencyDef> = resolveRates();
const FX_BUFFER = resolveBuffer();
const FLAT_MULTIPLIER = resolveFlatMultiplier();
const MULTIPLIER_OVERRIDES = resolveMultiplierOverrides();
const TIERS = resolveTiers();

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Unrecognised code -> base currency. NEVER throws.
 *
 * An unknown currency must not be the reason someone cannot pay: a foreign card
 * can pay an INR order.
 */
export function resolveCurrency(code?: unknown): string {
  const c = String(code ?? "").toUpperCase();
  return CURRENCIES[c] ? c : BASE_CURRENCY;
}

/** Is this a currency we can actually present a price in? */
export const isSupportedCurrency = (code?: unknown): boolean =>
  Boolean(CURRENCIES[String(code ?? "").toUpperCase()]);

/** INR per 1 unit of `currency`. 1 for the base currency and for anything unknown. */
export function inrPerUnit(currency: string): number {
  return CURRENCIES[currency]?.inr ?? 1;
}

/** The minor-unit exponent — 2 for cents, 0 for JPY. */
export function minorUnitExponent(currency: string): 0 | 2 {
  return CURRENCIES[currency]?.exp ?? 2;
}

/**
 * The foreign markup for a currency. Resolution order, MOST SPECIFIC WINS:
 *   1. FX_MULTIPLIERS env / CURRENCY_MULTIPLIER_OVERRIDES — this exact currency
 *   2. FX_MULTIPLIER env — one flat number for everyone, turns the ladder off
 *   3. the tier ladder
 *   4. the base currency is NEVER marked up
 */
export function multiplierFor(currency: string): number {
  if (!currency || currency === BASE_CURRENCY) return 1;

  const override = MULTIPLIER_OVERRIDES[currency];
  if (validMultiplier(override)) return override;

  if (FLAT_MULTIPLIER !== null) return FLAT_MULTIPLIER;

  const perUnit = inrPerUnit(currency);
  for (const tier of TIERS) {
    if (perUnit < tier.under) return tier.multiplier;
  }
  return TIERS[TIERS.length - 1]?.multiplier ?? 1;
}

/**
 * INR -> charge amount, rounded UP to the minor unit so the settled INR can never
 * come in under the list price.
 *
 * Does NOT apply the multiplier — `inr` is expected to be the already-marked-up
 * INR value of the sale. See markUpInr() for who applies that, and when.
 */
export function convertFromInr(inr: number, currency: string): number {
  const c = CURRENCIES[currency];
  const amount = Number(inr);
  if (!Number.isFinite(amount)) return 0;
  if (!c || currency === BASE_CURRENCY) return amount;
  const f = 10 ** c.exp;
  return Math.ceil((amount / c.inr) * FX_BUFFER * f) / f;
}

/** The smallest unit — what the gateway bills. Cents for USD, paise for INR. */
export function toMinorUnits(amount: number, currency: string): number {
  const c = CURRENCIES[currency] ?? CURRENCIES[BASE_CURRENCY];
  return Math.round(Number(amount || 0) * 10 ** (c?.exp ?? 2));
}

/**
 * List price -> the INR a sale in this market is actually worth.
 *
 * WHERE THE MARKUP IS APPLIED DEPENDS ON WHO OWNS THE PRICE — and getting this
 * wrong double-charges:
 *
 *   - CLIENT-priced flows (the browser computes the total and sends it): the
 *     browser has already applied the multiplier via inrEquivalent(). The server
 *     must NOT apply it again.
 *   - SERVER-priced flows (the catalog is authoritative and the client only names
 *     items): the server applies it here.
 *
 * Both read the same resolved multiplier, so there is still one number to change.
 */
export function markUpInr(listInr: number, currency: string): number {
  return Math.round(Number(listInr || 0) * multiplierFor(currency));
}

/**
 * The payload behind GET /api/config/currency.
 *
 * `multipliers` is sent ALREADY RESOLVED PER CURRENCY, so the tier rule exists in
 * exactly one place and the browser looks the answer up instead of re-deriving it.
 */
export function currencyConfig(): {
  base: string;
  buffer: number;
  rates: Record<string, CurrencyDef>;
  multipliers: Record<string, number>;
} {
  const multipliers: Record<string, number> = {};
  for (const code of Object.keys(CURRENCIES)) multipliers[code] = multiplierFor(code);
  return { base: BASE_CURRENCY, buffer: FX_BUFFER, rates: CURRENCIES, multipliers };
}

/**
 * Phone storage, mirroring the frontend's toStoredPhone().
 *
 * The asymmetry is deliberate: India keeps the BARE 10 DIGITS that every existing
 * record, WhatsApp template and push-notification alias in this system already
 * assumes. Everyone else keeps their country code, so the confirmation actually
 * reaches them.
 */
export function normalizePhone(raw: unknown, dialCode?: unknown): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";

  const dial = String(dialCode ?? "").replace(/\D/g, "");
  // No dial code, or an Indian one: strip any 0/91 prefix down to the bare number.
  if (!dial || dial === "91") return digits.replace(/^(?:0+|91)/, "").slice(-10);

  return digits.startsWith(dial) ? digits : `${dial}${digits}`;
}

/**
 * Is this a phone number we can accept for this market?
 *
 * Every checkout controller in this codebase validated with /^[6-9]\d{9}$/ — an
 * India-only rule that rejects every foreign number outright, which would make
 * international checkout impossible however correct the pricing is. Indian
 * numbers keep exactly the old rule; everyone else gets a length sanity check,
 * because there is no single format to validate a world of numbering plans
 * against and a false rejection here loses the sale.
 */
export function isAcceptablePhone(raw: unknown, dialCode?: unknown): boolean {
  const dial = String(dialCode ?? "").replace(/\D/g, "");
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!dial || dial === "91") {
    return /^[6-9]\d{9}$/.test(normalizePhone(digits, dial));
  }
  const national = digits.startsWith(dial) ? digits.slice(dial.length) : digits;
  return national.length >= 5 && national.length <= 15;
}
