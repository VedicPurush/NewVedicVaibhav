"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { API_BASE_URL } from "./api";

/**
 * The whole client side of international pricing, in one module.
 *
 * ── The invariant ─────────────────────────────────────────────────────────────
 *
 *   ₹ IS THE SOURCE OF TRUTH. A foreign currency is a PRESENTMENT layer.
 *
 * This module DISPLAYS prices in the devotee's own money. It does NOT change
 * what any checkout SENDS: every create-order call keeps posting the India list
 * total exactly as it always did, and the server applies the foreign markup and
 * the conversion. That split is deliberate — see `convert()` below — and it is
 * what makes the markup impossible to apply twice.
 *
 * Nothing here throws, and nothing here blocks a paint: an unknown currency, a
 * failed config fetch and a corrupt cache all degrade to showing rupees.
 */

/* -------------------------------------------------------------------------- */
/*  1. The two tables                                                          */
/* -------------------------------------------------------------------------- */

export type CurrencyDef = { code: string; symbol: string; exp: 0 | 2; inr: number };

/**
 * A BOOTSTRAP DEFAULT ONLY — so the first paint never waits on a network call.
 * `syncConfig()` replaces `exp`/`inr` from the server on load. Symbols and the
 * country mapping stay a frontend concern.
 *
 * `exp` is the minor-unit exponent and it is load-bearing: 2 for cents, 0 for
 * JPY (no subunit). Three-decimal currencies (KWD/BHD/OMR) are deliberately
 * absent — those countries are priced in USD below.
 */
export const CURRENCIES: Record<string, CurrencyDef> = {
  INR: { code: "INR", symbol: "₹", exp: 2, inr: 1 },

  USD: { code: "USD", symbol: "$", exp: 2, inr: 88 },
  CAD: { code: "CAD", symbol: "CA$", exp: 2, inr: 64 },
  EUR: { code: "EUR", symbol: "€", exp: 2, inr: 96 },
  GBP: { code: "GBP", symbol: "£", exp: 2, inr: 113 },
  CHF: { code: "CHF", symbol: "CHF ", exp: 2, inr: 105 },
  SEK: { code: "SEK", symbol: "kr ", exp: 2, inr: 8.5 },
  NOK: { code: "NOK", symbol: "kr ", exp: 2, inr: 8.2 },
  DKK: { code: "DKK", symbol: "kr ", exp: 2, inr: 12.9 },
  PLN: { code: "PLN", symbol: "zł ", exp: 2, inr: 22.5 },

  AED: { code: "AED", symbol: "AED ", exp: 2, inr: 24 },
  SAR: { code: "SAR", symbol: "SAR ", exp: 2, inr: 23.5 },
  QAR: { code: "QAR", symbol: "QAR ", exp: 2, inr: 24.2 },

  AUD: { code: "AUD", symbol: "A$", exp: 2, inr: 57 },
  NZD: { code: "NZD", symbol: "NZ$", exp: 2, inr: 52 },
  SGD: { code: "SGD", symbol: "S$", exp: 2, inr: 66 },
  HKD: { code: "HKD", symbol: "HK$", exp: 2, inr: 11.3 },
  JPY: { code: "JPY", symbol: "¥", exp: 0, inr: 0.58 }, // no subunit — exp 0
  MYR: { code: "MYR", symbol: "RM ", exp: 2, inr: 20 },
  THB: { code: "THB", symbol: "฿", exp: 2, inr: 2.6 },

  ZAR: { code: "ZAR", symbol: "R ", exp: 2, inr: 5 },
  KES: { code: "KES", symbol: "KSh ", exp: 2, inr: 0.68 },
  MUR: { code: "MUR", symbol: "Rs ", exp: 2, inr: 1.9 },

  NPR: { code: "NPR", symbol: "NPR ", exp: 2, inr: 0.63 },
  LKR: { code: "LKR", symbol: "LKR ", exp: 2, inr: 0.29 },
  BDT: { code: "BDT", symbol: "৳", exp: 2, inr: 0.72 },
  PKR: { code: "PKR", symbol: "PKR ", exp: 2, inr: 0.31 },
  AFN: { code: "AFN", symbol: "AFN ", exp: 2, inr: 1.25 },

  MXN: { code: "MXN", symbol: "MX$", exp: 2, inr: 4.7 },
  BRL: { code: "BRL", symbol: "R$", exp: 2, inr: 16 },
  CZK: { code: "CZK", symbol: "Kč ", exp: 2, inr: 3.9 },
  RUB: { code: "RUB", symbol: "₽", exp: 2, inr: 1.05 },
  TRY: { code: "TRY", symbol: "₺", exp: 2, inr: 2.5 },
  ILS: { code: "ILS", symbol: "₪", exp: 2, inr: 24.5 },
  CNY: { code: "CNY", symbol: "CN¥", exp: 2, inr: 12.2 },
  KRW: { code: "KRW", symbol: "₩", exp: 0, inr: 0.062 }, // no subunit — exp 0
  IDR: { code: "IDR", symbol: "Rp ", exp: 2, inr: 0.0054 },
  PHP: { code: "PHP", symbol: "₱", exp: 2, inr: 1.5 },
  VND: { code: "VND", symbol: "₫", exp: 0, inr: 0.0035 }, // no subunit — exp 0
};

export type Country = {
  iso2: string;
  name: string;
  flag: string;
  /** Calling code, no "+". */
  dial: string;
  currency: string;
  /** National-significant-number length: [min, max]. */
  phone: [number, number];
  /** What the last address line is called locally. */
  postal: string;
};

/**
 * The markets served. A country NOT on this list falls back to the home market,
 * which is safe rather than broken — a foreign card can pay an INR order.
 *
 * Kuwait / Oman / Bahrain map to USD on purpose: their currencies are the
 * three-decimal ones, and pricing them in USD dodges that entire class of
 * minor-unit bug rather than handling it in six places.
 */
export const COUNTRIES: Country[] = [
  { iso2: "IN", name: "India", flag: "🇮🇳", dial: "91", currency: "INR", phone: [10, 10], postal: "Pincode" },

  { iso2: "US", name: "United States", flag: "🇺🇸", dial: "1", currency: "USD", phone: [10, 10], postal: "ZIP code" },
  { iso2: "CA", name: "Canada", flag: "🇨🇦", dial: "1", currency: "CAD", phone: [10, 10], postal: "Postal code" },

  { iso2: "GB", name: "United Kingdom", flag: "🇬🇧", dial: "44", currency: "GBP", phone: [10, 10], postal: "Postcode" },
  { iso2: "IE", name: "Ireland", flag: "🇮🇪", dial: "353", currency: "EUR", phone: [9, 9], postal: "Eircode" },
  { iso2: "DE", name: "Germany", flag: "🇩🇪", dial: "49", currency: "EUR", phone: [10, 11], postal: "Postleitzahl" },
  { iso2: "FR", name: "France", flag: "🇫🇷", dial: "33", currency: "EUR", phone: [9, 9], postal: "Code postal" },
  { iso2: "NL", name: "Netherlands", flag: "🇳🇱", dial: "31", currency: "EUR", phone: [9, 9], postal: "Postcode" },
  { iso2: "BE", name: "Belgium", flag: "🇧🇪", dial: "32", currency: "EUR", phone: [8, 9], postal: "Postcode" },
  { iso2: "ES", name: "Spain", flag: "🇪🇸", dial: "34", currency: "EUR", phone: [9, 9], postal: "Código postal" },
  { iso2: "IT", name: "Italy", flag: "🇮🇹", dial: "39", currency: "EUR", phone: [9, 10], postal: "CAP" },
  { iso2: "PT", name: "Portugal", flag: "🇵🇹", dial: "351", currency: "EUR", phone: [9, 9], postal: "Código postal" },
  { iso2: "AT", name: "Austria", flag: "🇦🇹", dial: "43", currency: "EUR", phone: [10, 11], postal: "PLZ" },
  { iso2: "FI", name: "Finland", flag: "🇫🇮", dial: "358", currency: "EUR", phone: [9, 10], postal: "Postinumero" },
  { iso2: "CH", name: "Switzerland", flag: "🇨🇭", dial: "41", currency: "CHF", phone: [9, 9], postal: "PLZ" },
  { iso2: "SE", name: "Sweden", flag: "🇸🇪", dial: "46", currency: "SEK", phone: [9, 9], postal: "Postnummer" },
  { iso2: "NO", name: "Norway", flag: "🇳🇴", dial: "47", currency: "NOK", phone: [8, 8], postal: "Postnummer" },
  { iso2: "DK", name: "Denmark", flag: "🇩🇰", dial: "45", currency: "DKK", phone: [8, 8], postal: "Postnummer" },
  { iso2: "PL", name: "Poland", flag: "🇵🇱", dial: "48", currency: "PLN", phone: [9, 9], postal: "Kod pocztowy" },

  { iso2: "AE", name: "United Arab Emirates", flag: "🇦🇪", dial: "971", currency: "AED", phone: [9, 9], postal: "PO Box" },
  { iso2: "SA", name: "Saudi Arabia", flag: "🇸🇦", dial: "966", currency: "SAR", phone: [9, 9], postal: "PO Box" },
  { iso2: "QA", name: "Qatar", flag: "🇶🇦", dial: "974", currency: "QAR", phone: [8, 8], postal: "PO Box" },
  // Three-decimal currencies — priced in USD, see the note above.
  { iso2: "KW", name: "Kuwait", flag: "🇰🇼", dial: "965", currency: "USD", phone: [8, 8], postal: "PO Box" },
  { iso2: "OM", name: "Oman", flag: "🇴🇲", dial: "968", currency: "USD", phone: [8, 8], postal: "PO Box" },
  { iso2: "BH", name: "Bahrain", flag: "🇧🇭", dial: "973", currency: "USD", phone: [8, 8], postal: "PO Box" },

  { iso2: "AU", name: "Australia", flag: "🇦🇺", dial: "61", currency: "AUD", phone: [9, 9], postal: "Postcode" },
  { iso2: "NZ", name: "New Zealand", flag: "🇳🇿", dial: "64", currency: "NZD", phone: [8, 10], postal: "Postcode" },
  { iso2: "SG", name: "Singapore", flag: "🇸🇬", dial: "65", currency: "SGD", phone: [8, 8], postal: "Postal code" },
  { iso2: "HK", name: "Hong Kong", flag: "🇭🇰", dial: "852", currency: "HKD", phone: [8, 8], postal: "—" },
  { iso2: "JP", name: "Japan", flag: "🇯🇵", dial: "81", currency: "JPY", phone: [10, 10], postal: "Postal code" },
  { iso2: "MY", name: "Malaysia", flag: "🇲🇾", dial: "60", currency: "MYR", phone: [9, 10], postal: "Poskod" },
  { iso2: "TH", name: "Thailand", flag: "🇹🇭", dial: "66", currency: "THB", phone: [9, 9], postal: "Postal code" },

  { iso2: "ZA", name: "South Africa", flag: "🇿🇦", dial: "27", currency: "ZAR", phone: [9, 9], postal: "Postal code" },
  { iso2: "KE", name: "Kenya", flag: "🇰🇪", dial: "254", currency: "KES", phone: [9, 9], postal: "Postal code" },
  { iso2: "MU", name: "Mauritius", flag: "🇲🇺", dial: "230", currency: "MUR", phone: [7, 8], postal: "Postal code" },

  { iso2: "NP", name: "Nepal", flag: "🇳🇵", dial: "977", currency: "NPR", phone: [10, 10], postal: "Postal code" },
  { iso2: "LK", name: "Sri Lanka", flag: "🇱🇰", dial: "94", currency: "LKR", phone: [9, 9], postal: "Postal code" },
  { iso2: "BD", name: "Bangladesh", flag: "🇧🇩", dial: "880", currency: "BDT", phone: [10, 10], postal: "Postal code" },
  { iso2: "PK", name: "Pakistan", flag: "🇵🇰", dial: "92", currency: "PKR", phone: [10, 10], postal: "Postal code" },
  { iso2: "AF", name: "Afghanistan", flag: "🇦🇫", dial: "93", currency: "AFN", phone: [9, 9], postal: "Postal code" },

  { iso2: "MX", name: "Mexico", flag: "🇲🇽", dial: "52", currency: "MXN", phone: [10, 10], postal: "Código postal" },
  { iso2: "BR", name: "Brazil", flag: "🇧🇷", dial: "55", currency: "BRL", phone: [10, 11], postal: "CEP" },
  { iso2: "CZ", name: "Czechia", flag: "🇨🇿", dial: "420", currency: "CZK", phone: [9, 9], postal: "PSČ" },
  { iso2: "RU", name: "Russia", flag: "🇷🇺", dial: "7", currency: "RUB", phone: [10, 10], postal: "Postal code" },
  { iso2: "TR", name: "Türkiye", flag: "🇹🇷", dial: "90", currency: "TRY", phone: [10, 10], postal: "Posta kodu" },
  { iso2: "IL", name: "Israel", flag: "🇮🇱", dial: "972", currency: "ILS", phone: [9, 9], postal: "Postal code" },
  { iso2: "CN", name: "China", flag: "🇨🇳", dial: "86", currency: "CNY", phone: [11, 11], postal: "Postal code" },
  { iso2: "KR", name: "South Korea", flag: "🇰🇷", dial: "82", currency: "KRW", phone: [9, 10], postal: "Postal code" },
  { iso2: "ID", name: "Indonesia", flag: "🇮🇩", dial: "62", currency: "IDR", phone: [9, 12], postal: "Kode pos" },
  { iso2: "PH", name: "Philippines", flag: "🇵🇭", dial: "63", currency: "PHP", phone: [10, 10], postal: "ZIP code" },
  { iso2: "VN", name: "Vietnam", flag: "🇻🇳", dial: "84", currency: "VND", phone: [9, 10], postal: "Postal code" },
];

export const INDIA: Country = COUNTRIES[0];

const BY_ISO2: Record<string, Country> = Object.fromEntries(COUNTRIES.map((c) => [c.iso2, c]));

/* -------------------------------------------------------------------------- */
/*  2. Live values (replaced by the server's config on load)                   */
/* -------------------------------------------------------------------------- */

let FX_BUFFER = 1.03;

/**
 * Resolved per currency BY THE SERVER, so the tier rule lives in one place and
 * the browser looks the answer up instead of re-deriving it.
 *
 * Empty until /api/config/currency answers — see BOOTSTRAP_TIERS for what
 * happens in the meantime, and why it must not be 1.
 */
let MULTIPLIERS: Record<string, number> = {};

/**
 * A mirror of the server's committed markup ladder (backend config/pricing.ts).
 *
 * ⚠️ THIS EXISTS TO STOP THE PAGE SHOWING A PRICE IT WILL NOT CHARGE.
 *
 * The server always marks a foreign order up, whether or not the browser ever
 * managed to fetch the config. If an unresolved multiplier fell back to 1, a US
 * devotee would be shown $24.58 for a ₹2,100 seva and then billed $81.12 — for
 * the whole first paint before the config lands, and permanently if that request
 * fails or the backend is down. Silent, and the worst possible failure here.
 *
 * So the browser starts from the same ladder the server ships, and the server's
 * resolved map merely CONFIRMS or overrides it. Keep the two in sync: this is a
 * duplicate of committed data, and a stale copy shows the wrong price rather than
 * charging it, which is why it is a ladder and not a per-currency table.
 */
const BOOTSTRAP_TIERS: ReadonlyArray<{ under: number; multiplier: number }> = [
  { under: 100, multiplier: 3.3 },
  { under: 150, multiplier: 2.2 },
  { under: Infinity, multiplier: 2 },
];

/** The ladder applied to a currency's INR-per-unit value. */
function bootstrapMultiplier(currencyCode: string): number {
  const perUnit = CURRENCIES[currencyCode]?.inr;
  if (!Number.isFinite(perUnit as number)) return 1;
  for (const tier of BOOTSTRAP_TIERS) {
    if ((perUnit as number) < tier.under) return tier.multiplier;
  }
  return BOOTSTRAP_TIERS[BOOTSTRAP_TIERS.length - 1].multiplier;
}

const COUNTRY_KEY = "vv_country";
const RATES_KEY = "vv_fx_rates";
/** The IP-resolved country from a previous visit — cached under its OWN key.
 *  Folding it into the rates blob would mean reading the rates cache could
 *  resurrect a stale country. */
const GEO_KEY = "vv_geo_country";
/** A country the devotee picked BY HAND. Auto-detection never overwrites it. */
const PIN_KEY = "vv_country_pinned";

const isBrowser = typeof window !== "undefined";

const readLocal = (key: string): string | null => {
  if (!isBrowser) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // Private mode / blocked storage must never break pricing.
  }
};

const writeLocal = (key: string, value: string): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

/* -------------------------------------------------------------------------- */
/*  3. Country detection — best signal first                                   */
/* -------------------------------------------------------------------------- */

/**
 * A packed IANA-zone -> ISO2 map. Only the zones that matter for the markets
 * above; anything unlisted falls through to navigator.language and then India.
 */
const TZ_TO_ISO2: Record<string, string> = {
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US",
  "America/Phoenix": "US", "America/Los_Angeles": "US", "America/Anchorage": "US",
  "Pacific/Honolulu": "US", "America/Detroit": "US",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA",
  "America/Winnipeg": "CA", "America/Halifax": "CA",
  "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Berlin": "DE",
  "Europe/Paris": "FR", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE",
  "Europe/Madrid": "ES", "Europe/Rome": "IT", "Europe/Lisbon": "PT",
  "Europe/Vienna": "AT", "Europe/Helsinki": "FI", "Europe/Zurich": "CH",
  "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK",
  "Europe/Warsaw": "PL",
  "Asia/Dubai": "AE", "Asia/Riyadh": "SA", "Asia/Qatar": "QA",
  "Asia/Kuwait": "KW", "Asia/Muscat": "OM", "Asia/Bahrain": "BH",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Brisbane": "AU",
  "Australia/Perth": "AU", "Australia/Adelaide": "AU",
  "Pacific/Auckland": "NZ", "Asia/Singapore": "SG", "Asia/Hong_Kong": "HK",
  "Asia/Tokyo": "JP", "Asia/Kuala_Lumpur": "MY", "Asia/Bangkok": "TH",
  "Africa/Johannesburg": "ZA", "Africa/Nairobi": "KE", "Indian/Mauritius": "MU",
  "Asia/Kathmandu": "NP", "Asia/Colombo": "LK",
  "Asia/Dhaka": "BD", "Asia/Karachi": "PK", "Asia/Kabul": "AF",
  "America/Mexico_City": "MX", "America/Sao_Paulo": "BR", "America/Bahia": "BR",
  "Europe/Prague": "CZ", "Europe/Moscow": "RU", "Europe/Istanbul": "TR",
  "Asia/Jerusalem": "IL", "Asia/Tel_Aviv": "IL",
  "Asia/Shanghai": "CN", "Asia/Seoul": "KR", "Asia/Jakarta": "ID",
  "Asia/Manila": "PH", "Asia/Ho_Chi_Minh": "VN", "Asia/Saigon": "VN",
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN",
};

const known = (iso2: string | null | undefined): string | null =>
  iso2 && BY_ISO2[iso2.toUpperCase()] ? iso2.toUpperCase() : null;

/**
 * The initial country, resolved SYNCHRONOUSLY — every source below is a local
 * read, because the sticky price bar is the first thing read on these pages and
 * must never paint empty.
 *
 * Order, best signal first:
 *   1. ?country=US — an explicit instruction. SESSION ONLY, deliberately not
 *      persisted: a saved test override would silently outrank the IP on every
 *      later visit, which is exactly the confusion you do not want while
 *      checking whether detection works.
 *   2. A saved manual pick — auto-detection never overwrites it.
 *   3. The IP-resolved country from the last visit — the most accurate signal.
 *   4. Timezone, then navigator.language. An NRI in Dubai often still runs
 *      en-IN, which is precisely why language is the weakest fallback.
 */
function detectCountry(): string {
  if (!isBrowser) return "IN";

  try {
    const param = new URLSearchParams(window.location.search).get("country");
    const forced = known(param);
    if (forced) {
      sessionStorage.setItem(COUNTRY_KEY, forced);
      return forced;
    }
    const session = known(sessionStorage.getItem(COUNTRY_KEY));
    if (session) return session;
  } catch {
    /* ignore */
  }

  if (readLocal(PIN_KEY) === "1") {
    const pinned = known(readLocal(COUNTRY_KEY));
    if (pinned) return pinned;
  }

  const geo = known(readLocal(GEO_KEY));
  if (geo) return geo;

  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fromZone = known(TZ_TO_ISO2[zone]);
    if (fromZone) return fromZone;
  } catch {
    /* ignore */
  }

  const lang = known(navigator.language?.split("-")[1]);
  if (lang) return lang;

  return "IN";
}

/* -------------------------------------------------------------------------- */
/*  4. The store — deliberately not React context                              */
/* -------------------------------------------------------------------------- */

/**
 * A module-level store subscribed via useSyncExternalStore.
 *
 * Not context, because ~50 files need to call a plain `money(price)` function
 * rather than thread a hook through every component scope, and because the
 * checkout needs the country before any provider could have been mounted.
 *
 * The snapshot covers the country AND a rate revision, so a fresh rate table
 * repaints every price the same way switching country does. Without the
 * revision, rates landing after paint would leave stale prices on screen until
 * some unrelated re-render happened to fix them.
 */
let country = "IN";
let ratesRevision = 0;
let snapshot = "IN#0";
const listeners = new Set<() => void>();

/**
 * The SSR snapshot is frozen at "IN#0" on purpose.
 *
 * Next.js renders this app on the server, where there is no localStorage, no
 * timezone and no URL param — so the server can only ever produce the home
 * market. Reporting anything else to React during hydration is a mismatch, and
 * React would discard the server HTML for that subtree. Detection therefore runs
 * in an effect (see useCurrencyRoot), one paint after hydration.
 */
const SERVER_SNAPSHOT = "IN#0";

function publish(): void {
  snapshot = `${country}#${ratesRevision}`;
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = (): string => snapshot;
const getServerSnapshot = (): string => SERVER_SNAPSHOT;

/** The active country. Always a real entry — never undefined. */
export const currentCountry = (): Country => BY_ISO2[country] ?? INDIA;

/** The active currency code. */
export const currentCurrency = (): string => currentCountry().currency;

/** True while the home market is active. */
export const isIndia = (): boolean => currentCountry().iso2 === "IN";

/**
 * Switch country by hand. PINS the choice, so auto-detection stops overriding it
 * on later visits — otherwise the IP would silently undo the devotee's pick.
 */
export function setCountry(iso2: string): void {
  const next = known(iso2);
  if (!next || next === country) return;
  country = next;
  writeLocal(COUNTRY_KEY, next);
  writeLocal(PIN_KEY, "1");
  try {
    sessionStorage.setItem(COUNTRY_KEY, next);
  } catch {
    /* ignore */
  }
  publish();
}

/**
 * Drop a manual pick and go back to auto-detection.
 *
 * Surfaced as "📍 Detect automatically" in the picker. Without an escape hatch,
 * one mis-tap locks a country in for good.
 */
export function clearCountryPin(): void {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(PIN_KEY);
    window.localStorage.removeItem(COUNTRY_KEY);
    sessionStorage.removeItem(COUNTRY_KEY);
  } catch {
    /* ignore */
  }
  const detected = known(readLocal(GEO_KEY)) ?? "IN";
  if (detected !== country) {
    country = detected;
    publish();
  }
}

/* -------------------------------------------------------------------------- */
/*  5. Rates: cached read, then live sync                                      */
/* -------------------------------------------------------------------------- */

type ConfigPayload = {
  buffer?: number;
  rates?: Record<string, { exp?: number; inr?: number }>;
  multipliers?: Record<string, number>;
  country?: string | null;
};

/**
 * Apply a rates payload over the bootstrap table.
 *
 * DEGRADES SAFELY BY DESIGN:
 *   - only `exp` and `inr` are taken; symbols stay a frontend concern;
 *   - a currency the server dropped keeps its bootstrap values rather than
 *     vanishing mid-checkout;
 *   - malformed values are skipped individually.
 *
 * A bad payload means "prices unchanged", never "prices wrong". The bounds
 * mirror the server's, so a value the server would have rejected cannot slip in
 * through a stale cached payload either.
 */
function applyRates(payload: ConfigPayload): boolean {
  let changed = false;

  const buffer = Number(payload?.buffer);
  if (Number.isFinite(buffer) && buffer >= 1 && buffer <= 1.25 && buffer !== FX_BUFFER) {
    FX_BUFFER = buffer;
    changed = true;
  }

  const rates = payload?.rates;
  if (rates && typeof rates === "object") {
    for (const [code, def] of Object.entries(rates)) {
      const existing = CURRENCIES[code];
      if (!existing) continue; // A currency with no symbol here is not presentable.
      const inr = Number(def?.inr);
      const exp = Number(def?.exp);
      if (!Number.isFinite(inr) || inr <= 0) continue;
      const nextExp: 0 | 2 = exp === 0 ? 0 : 2;
      if (existing.inr !== inr || existing.exp !== nextExp) {
        CURRENCIES[code] = { ...existing, inr, exp: nextExp };
        formatters.delete(code); // Cached Intl formatter now has the wrong exponent.
        changed = true;
      }
    }
  }

  const multipliers = payload?.multipliers;
  if (multipliers && typeof multipliers === "object") {
    const next: Record<string, number> = {};
    for (const [code, value] of Object.entries(multipliers)) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0 && n <= 20) next[code] = n;
    }
    if (Object.keys(next).length) {
      MULTIPLIERS = next;
      changed = true;
    }
  }

  return changed;
}

/** Read cached rates synchronously, so a repeat visitor is priced with zero latency. */
function applyCachedRates(): void {
  const raw = readLocal(RATES_KEY);
  if (!raw) return;
  try {
    applyRates(JSON.parse(raw) as ConfigPayload);
  } catch {
    /* A corrupt cache means bootstrap rates, not broken prices. */
  }
}

/**
 * Compile-time constant in Next.js, so every `IS_DEV` branch below — and the
 * third-party providers it names — is eliminated from the production bundle.
 * A real visitor's browser never runs any of it.
 */
const IS_DEV = process.env.NODE_ENV !== "production";

/** Why a geo signal did or did not change the active country. */
type GeoOutcome = "applied" | "same" | "pinned" | "url-override" | "unserved" | "none";

/**
 * Apply an IP-resolved country. Never overrides a manual pick.
 *
 * Returns WHY, because every one of these paths used to be a silent `return` —
 * which is exactly why "prices don't change on a VPN" was impossible to diagnose
 * from the outside. All of these look identical on screen (prices stay in the
 * home currency) and every one has a different fix.
 */
function applyGeoCountry(iso2: string | null | undefined): GeoOutcome {
  const raw = String(iso2 ?? "").toUpperCase();
  if (!raw) return "none";

  const geo = known(raw);
  if (!geo) {
    // A real country, just not one of the markets in COUNTRIES. Falling back to
    // the home market is deliberate and safe (a foreign card can pay an INR
    // order) — but it is indistinguishable from broken detection unless we say so.
    console.warn(
      `[currency] Detected country ${raw}, which is not in the served markets list — ` +
        `prices stay in the home currency. Add a row to COUNTRIES in lib/currency.ts to price this market.`,
    );
    return "unserved";
  }

  writeLocal(GEO_KEY, geo);

  if (readLocal(PIN_KEY) === "1") {
    console.info(
      `[currency] Detected ${geo}, but a manual country pick is pinned (${country}) and wins. ` +
        `Choose "Detect automatically" in the country picker to follow your IP again.`,
    );
    return "pinned";
  }

  try {
    if (known(new URLSearchParams(window.location.search).get("country"))) {
      console.info(`[currency] Detected ${geo}, but ?country= in the URL wins for this session.`);
      return "url-override";
    }
  } catch {
    /* ignore */
  }

  if (geo === country) return "same";

  country = geo;
  publish();
  if (IS_DEV) console.info(`[currency] Country -> ${geo} (${currentCurrency()}) from IP.`);
  return "applied";
}

/**
 * DEV ONLY: ask a third party for the country FROM THE BROWSER.
 *
 * THIS IS WHY A VPN APPEARS NOT TO WORK ON LOCALHOST.
 *
 * In dev the browser talks to an API on localhost, so the request never leaves
 * the machine and the server sees `::1` — there is no client IP to geolocate, and
 * /api/config/currency correctly answers `country: null`. Nothing else picks up
 * the slack either: a VPN changes neither the browser's timezone nor its
 * navigator.language, so the synchronous detection in detectCountry() still says
 * India.
 *
 * GEOIP_DEV_COUNTRY=auto on the server is only a partial answer — it geolocates
 * the SERVER's own egress, which follows a system-wide VPN but NOT a browser
 * extension or a split tunnel: those move the browser and leave Node connecting
 * from your real location.
 *
 * So in dev the browser asks directly, which is the only vantage point that sees
 * what the browser's VPN is actually doing.
 */
async function syncDevGeo(): Promise<void> {
  if (!IS_DEV || !isBrowser) return;

  // Both answer for whoever is calling when given no IP, and both send CORS headers.
  for (const url of ["https://ipwho.is/", "https://api.country.is/"]) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const payload = (await res.json()) as Record<string, unknown>;
      const iso = payload.country_code ?? payload.countryCode ?? payload.country;
      if (!/^[A-Za-z]{2}$/.test(String(iso ?? ""))) continue;

      console.info(
        `[currency] dev geo: ${new URL(url).host} says this browser is in ${String(iso).toUpperCase()}.`,
      );
      applyGeoCountry(String(iso));
      return;
    } catch {
      /* try the next provider */
    }
  }
  console.warn(
    "[currency] dev geo: no provider answered (offline, or blocked by an ad blocker). " +
      "Prices stay on the detected country. Use ?country=US to force one.",
  );
}

/**
 * Print everything that decides the price currently on screen.
 *
 * Exposed as `window.vvCurrency` in dev — the first thing to run when prices
 * "look wrong", because it separates causes that are indistinguishable on screen.
 */
export function currencyDebug(): void {
  const c = currentCountry();
  console.log("%c[currency] state", "font-weight:bold", {
    country: `${c.flag} ${c.name} (${c.iso2})`,
    currency: c.currency,
    multiplier: multiplierFor(c.currency),
    example: `1100 shows as ${formatMoney(1100, c.currency)}`,
    ratesLoadedFromServer: ratesRevision > 0,
    fxBuffer: FX_BUFFER,
    manualPinActive: readLocal(PIN_KEY) === "1",
    pinnedCountry: readLocal(COUNTRY_KEY),
    lastIpCountry: readLocal(GEO_KEY),
    apiBase: API_BASE_URL,
    servedMarkets: COUNTRIES.length,
  });
  if (readLocal(PIN_KEY) === "1") {
    console.warn(
      "[currency] A manual pick is pinned, so auto/IP detection is disabled. Run vvCurrency.clearPin().",
    );
  }
  if (ratesRevision === 0) {
    console.warn(
      `[currency] Server rates never arrived. Is the backend up at ${API_BASE_URL}/api/config/currency ?`,
    );
  }
}

let syncStarted = false;

/**
 * FIRE-AND-FORGET. The page is already painted and priced from cached or
 * bootstrap values — a checkout that BLOCKS on a config call is a lost sale.
 *
 * Failures are logged, never silent: a 404 here looks exactly like broken geo
 * detection from the outside, with no way to tell the two apart.
 */
function syncConfig(): void {
  if (!isBrowser || syncStarted) return;
  syncStarted = true;

  fetch(`${API_BASE_URL}/api/config/currency`, { credentials: "omit" })
    .then((r) => {
      if (!r.ok) {
        console.warn(
          `[currency] /api/config/currency -> HTTP ${r.status}. Keeping bootstrap rates. ` +
            `A 404 here means the backend does not have the route yet - redeploy it.`,
        );
        if (IS_DEV) void syncDevGeo();
        return null;
      }
      return r.json() as Promise<ConfigPayload>;
    })
    .then((payload) => {
      if (!payload) return;
      writeLocal(
        RATES_KEY,
        JSON.stringify({
          buffer: payload.buffer,
          rates: payload.rates,
          multipliers: payload.multipliers,
        }),
      );
      if (applyRates(payload)) {
        ratesRevision += 1;
        publish();
      }

      // On localhost the server sees a loopback address and correctly answers
      // null, so in dev the browser asks a third party itself. See syncDevGeo().
      // IS_DEV is checked at the CALL SITE, not just inside, so the whole
      // function and its provider URLs are dropped from the production bundle.
      if (applyGeoCountry(payload.country) === "none" && IS_DEV) void syncDevGeo();
    })
    .catch((err: unknown) => {
      console.warn(
        `[currency] config fetch failed against ${API_BASE_URL}/api/config/currency:`,
        (err as Error)?.message ?? err,
      );
      // The backend being unreachable must not also cost us country detection.
      if (IS_DEV) void syncDevGeo();
    });
}

/* -------------------------------------------------------------------------- */
/*  6. Conversion and formatting                                              */
/* -------------------------------------------------------------------------- */

/** The multiplier the SERVER resolved for this currency. 1 for the home market. */
export function multiplierFor(currencyCode: string): number {
  if (!currencyCode || currencyCode === "INR") return 1;
  const m = MULTIPLIERS[currencyCode];
  if (Number.isFinite(m) && m > 0) return m;
  // The server's map has not arrived (first paint, failed fetch, backend down).
  // Fall back to the committed ladder, NEVER to 1 — see BOOTSTRAP_TIERS.
  return bootstrapMultiplier(currencyCode);
}

/**
 * ₹ -> the amount to DISPLAY in `currencyCode`.
 *
 * Rounded UP to the minor unit, matching the server exactly: it costs the buyer
 * at most one cent and guarantees the settled INR never lands under the list
 * price after the gateway's cross-currency cut.
 *
 * ⚠️ THIS IS FOR DISPLAY ONLY. Checkouts keep POSTING the India list total —
 * the server re-derives the charge from it. If the browser sent a converted or
 * marked-up figure too, the markup would be applied twice and every stored
 * amount would disagree with the card statement.
 */
export function convert(inr: number, currencyCode: string): number {
  const c = CURRENCIES[currencyCode];
  const amount = Number(inr);
  if (!Number.isFinite(amount)) return 0;
  if (!c || c.code === "INR") return amount;
  const f = 10 ** c.exp;
  return Math.ceil(((amount * multiplierFor(currencyCode)) / c.inr) * FX_BUFFER * f) / f;
}

/** Intl instances are built once per currency and cached — this runs on EVERY
 *  price on the page, and constructing one per render is measurably slow. */
const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currencyCode: string): Intl.NumberFormat {
  const cached = formatters.get(currencyCode);
  if (cached) return cached;

  const c = CURRENCIES[currencyCode] ?? CURRENCIES.INR;
  const fmt = new Intl.NumberFormat(currencyCode === "INR" ? "en-IN" : "en-US", {
    minimumFractionDigits: c.exp === 0 ? 0 : 2,
    maximumFractionDigits: c.exp === 0 ? 0 : 2,
  });
  formatters.set(currencyCode, fmt);
  return fmt;
}

/**
 * ₹ -> a display string in `currencyCode`.
 *
 * The home market keeps its EXACT original formatting (₹1,100 — Indian
 * grouping, no decimals), so nothing about the India-facing site changes
 * visually.
 */
export function formatMoney(inr: number, currencyCode: string): string {
  if (!currencyCode || currencyCode === "INR" || !CURRENCIES[currencyCode]) {
    return `₹${Math.round(Number(inr) || 0).toLocaleString("en-IN")}`;
  }
  const c = CURRENCIES[currencyCode];
  return `${c.symbol}${formatterFor(currencyCode).format(convert(inr, currencyCode))}`;
}

/** The one call almost every price on the site needs. */
export const money = (inr: number): string => formatMoney(inr, currentCurrency());

/**
 * Re-render a hand-authored marketing string's ₹ amounts in the active market.
 *
 *   localizeCopy("Special ₹50 Off")  ->  "Special $1.17 Off"   (US)
 *   localizeCopy("Special ₹50 Off")  ->  "Special ₹50 Off"     (India, unchanged)
 *
 * Coupon labels, app-download banners and similar copy are authored once, as
 * plain rupee text, baked into a module-level array or a literal string — the
 * amount can't be pulled out into its own money() call without restructuring
 * where the string lives. This is the one place that copy is allowed to stay a
 * single hardcoded string: every ₹<number> token in it is replaced, and
 * everything else — the marketing language around it — passes through
 * untouched. Numbers with thousands separators ("₹1,100") are handled too.
 *
 * A caller must itself be subscribed via useMoney() (even if it discards the
 * returned value) so its component re-renders when the country changes —
 * this function reads the live country but triggers no re-render on its own.
 */
export function localizeCopy(text: string): string {
  return String(text ?? "").replace(/₹\s*([\d,]+(?:\.\d+)?)/g, (_match, num: string) =>
    money(Number(num.replace(/,/g, ""))),
  );
}

/**
 * India list price -> the INR this sale is actually WORTH in the active market.
 *
 * ⚠️ FOR ANALYTICS AND CONVERSION VALUES ONLY — never for an amount posted to a
 * create-order endpoint. The server applies the same multiplier when it prices
 * the order, so sending this as `amount` would apply it twice.
 *
 * This exists because the browser and the server report the SAME Meta event_id
 * for a purchase, and Meta keeps only one of the pair. The server reports the
 * marked-up rupee value it stored on the booking; if the browser reported the
 * bare list price, a foreign conversion would be recorded as whichever of the
 * two happened to arrive first — usually the smaller one, under-reporting
 * foreign revenue by the whole multiplier. Both sides must agree, and the value
 * they must agree on is what the sale actually earned.
 */
export function inrEquivalent(listInr: number, currencyCode: string): number {
  return Math.round(Number(listInr || 0) * multiplierFor(currencyCode));
}

/** inrEquivalent() against the active market. See the warning above. */
export const toInr = (listInr: number): number => inrEquivalent(listInr, currentCurrency());

/**
 * Show an amount that was ALREADY PAID.
 *
 * ⚠️ PAST ORDERS MUST NOT BE RE-PRICED BY TODAY'S PICKER. Someone who paid
 * ₹2,100 from Delhi did not pay $24, and showing them $24 because they happen to
 * be travelling misrepresents a receipt. Read the currency stored ON THE RECORD,
 * and fall back to rupees for historic rows that predate this feature.
 */
export function paidMoney(record: {
  amount?: number | null;
  totalPrice?: number | null;
  totalAmount?: number | null;
  price?: number | null;
  currency?: string | null;
  chargedAmount?: number | null;
}): string {
  const inr = Number(record?.totalPrice ?? record?.totalAmount ?? record?.amount ?? record?.price ?? 0);
  const code = record?.currency;
  const charged = Number(record?.chargedAmount ?? NaN);

  if (!code || code === "INR" || !CURRENCIES[code] || !Number.isFinite(charged)) {
    return `₹${Math.round(inr).toLocaleString("en-IN")}`;
  }
  return `${CURRENCIES[code].symbol}${formatterFor(code).format(charged)}`;
}

/* -------------------------------------------------------------------------- */
/*  7. Phone and shipping helpers                                              */
/* -------------------------------------------------------------------------- */

/**
 * Physical goods, home market only.
 *
 * ⚠️ ANY PHYSICAL-GOODS ADD-ON MUST BE GATED ON THIS. Perishable prasad either
 * gets refused at customs or costs more to courier than the order itself — so
 * don't offer the box abroad rather than selling it and apologising afterwards.
 */
export const shipsPrasad = (c: Country = currentCountry()): boolean => c.iso2 === "IN";

/** Digits only, capped at the country's maximum national number length. */
export function sanitizePhone(value: string, c: Country = currentCountry()): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, c.phone[1]);
}

/** Within the country's national-significant-number range. */
export function isValidPhone(value: string, c: Country = currentCountry()): boolean {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < c.phone[0] || digits.length > c.phone[1]) return false;
  // India additionally keeps its long-standing "must start 6-9" rule.
  return c.iso2 === "IN" ? /^[6-9]/.test(digits) : true;
}

/**
 * The value to SEND to the server.
 *
 * The asymmetry is deliberate: India keeps the BARE 10 DIGITS that every
 * existing booking record, WhatsApp template and push-notification alias already
 * assumes. Everyone else keeps their country code, so the confirmation actually
 * reaches them. The server mirrors this in config/currency.ts#normalizePhone.
 */
export function toStoredPhone(value: string, c: Country = currentCountry()): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (c.iso2 === "IN") return digits.slice(-10);
  return digits.startsWith(c.dial) ? digits : `${c.dial}${digits}`;
}

/**
 * The presentment block every create-order call must POST.
 *
 * All four are REQUESTS, not amounts. The server re-derives the charge from the
 * rupee total the same call sends, so a tampered client can change which
 * currency it is billed in but never how much.
 */
export function orderRequestFields(c: Country = currentCountry()): {
  currency: string;
  countryCode: string;
  country: string;
  dialCode: string;
} {
  return { currency: c.currency, countryCode: c.iso2, country: c.name, dialCode: c.dial };
}

/* -------------------------------------------------------------------------- */
/*  8. React bindings                                                          */
/* -------------------------------------------------------------------------- */

export type Money = {
  country: Country;
  currency: string;
  isIndia: boolean;
  money: (inr: number) => string;
  convert: (inr: number) => number;
  /** List price -> marked-up INR. Analytics values only — never a posted amount. */
  inr: (listInr: number) => number;
  multiplier: number;
  shipsPrasad: boolean;
  setCountry: (iso2: string) => void;
};

/** Subscribe a component to country + rate changes. */
export function useMoney(): Money {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const c = BY_ISO2[snap.split("#")[0]] ?? INDIA;

  return {
    country: c,
    currency: c.currency,
    isIndia: c.iso2 === "IN",
    money: useCallback((inr: number) => formatMoney(inr, c.currency), [c.currency]),
    convert: useCallback((inr: number) => convert(inr, c.currency), [c.currency]),
    inr: useCallback((listInr: number) => inrEquivalent(listInr, c.currency), [c.currency]),
    multiplier: multiplierFor(c.currency),
    shipsPrasad: shipsPrasad(c),
    setCountry,
  };
}

/**
 * Everything useCurrencyRoot does, as a plain function.
 *
 * Extracted from the effect so the detection sequence can be exercised without a
 * React renderer — the ordering here (cached rates, then the synchronous guess,
 * then the network confirmation) is the part that actually decides which
 * currency a devotee sees, and it should be testable on its own.
 *
 * Safe to call more than once: syncConfig() is guarded, and re-running detection
 * with an unchanged country publishes nothing new.
 */
export function startCurrencyDetection(): void {
  applyCachedRates();

  const detected = detectCountry();
  if (detected !== country || ratesRevision === 0) {
    country = detected;
    ratesRevision += 1; // Forces a repaint even when the country is unchanged.
    publish();
  }

  syncConfig();

  if (IS_DEV && isBrowser) {
    // "Prices look wrong" has several causes that are indistinguishable on
    // screen — a pinned manual pick, an unserved market, the backend being
    // down, or loopback in dev. These make each one answerable in one call.
    (window as unknown as Record<string, unknown>).vvCurrency = {
      debug: currencyDebug,
      setCountry,
      clearPin: clearCountryPin,
      detectNow: syncDevGeo,
    };
    console.info(
      '[currency] dev helpers ready: vvCurrency.debug() / .setCountry("US") / .clearPin() / .detectNow()',
    );
  }
}

/**
 * Mount ONCE at the app root.
 *
 * It holds the only subscription that matters: the root re-render cascades to
 * everything below it (nothing in this tree is React.memo'd), which is what
 * lets ~50 files call a plain `money(price)` function instead of threading a
 * hook through every component scope.
 *
 * Detection and the config fetch both run in an effect rather than at module
 * load, because this app is server-rendered: on the server there is no
 * localStorage, no timezone and no URL to read, so the first client render must
 * match the server's "IN" HTML exactly or React discards it as a hydration
 * mismatch. One extra paint is the price of correct hydration.
 */
export function useCurrencyRoot(): void {
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    startCurrencyDetection();
  }, []);
}
