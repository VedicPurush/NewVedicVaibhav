import type { Request } from "express";
import { env } from "../config/env";
import { logger } from "../lib/logger";

/**
 * Resolves the caller's country from their IP.
 *
 * ── Why the server does this at all ───────────────────────────────────────────
 *
 * The browser guesses from its timezone — instant and free, but a property of the
 * DEVICE: a phone on a US VPN still reports Asia/Kolkata. The IP is a property of
 * the CONNECTION, and only the server can see it. So the browser paints on its
 * own guess and this corrects it.
 *
 * Resolution order:
 *   1. Edge header (cf-ipcountry, x-vercel-ip-country, …) — free, instant, exact
 *   2. GEOIP_URL, if set — your own provider
 *   3. Keyless fallbacks — ipwho.is, api.country.is
 *
 * Every step may fail. `null` is NOT an error — it means "keep the browser's
 * guess". Nothing in here throws.
 */

/* -------------------------------------------------------------------------- */
/*  Client IP                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The CLIENT's own IP, not your proxy's.
 *
 * nginx APPENDS to X-Forwarded-For, so the chain reads `client, proxy1, proxy2`
 * — the FIRST entry is the browser. Taking the last entry (or req.ip behind
 * several hops) resolves every visitor on earth to your own datacentre, and the
 * bug is invisible in testing because in dev there is only one entry.
 */
export function clientIp(req: Request): string | null {
  const fwd = req.headers["x-forwarded-for"];
  const chain = Array.isArray(fwd) ? fwd[0] : fwd;
  const first = String(chain || req.ip || "")
    .split(",")[0]
    .trim();
  // An IPv4 address wearing an IPv6 costume (::ffff:203.0.113.7).
  return first.replace(/^::ffff:/, "") || null;
}

/** Loopback and RFC1918 space — nothing upstream can geolocate these. */
const isPrivateIp = (ip: string): boolean =>
  !ip ||
  ip === "::1" ||
  ip === "127.0.0.1" ||
  /^10\./.test(ip) ||
  /^192\.168\./.test(ip) ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
  /^169\.254\./.test(ip) ||
  /^f[cd]/i.test(ip);

const isIso2 = (value: unknown): value is string => /^[A-Za-z]{2}$/.test(String(value ?? ""));

/* -------------------------------------------------------------------------- */
/*  Cache + in-flight de-duplication                                           */
/* -------------------------------------------------------------------------- */

type CacheEntry = { country: string | null; expiresAt: number };

/** An IP's country effectively never changes, so a hit is worth caching for long. */
const HIT_TTL_MS = 12 * 60 * 60 * 1000;
/** A failure is cached only briefly, so one upstream blip can't blind us for half a day. */
const MISS_TTL_MS = 5 * 60 * 1000;
/** Bounded so a botnet scan cannot grow this without limit. */
const MAX_ENTRIES = 20_000;
/** This sits in front of a config response the page is waiting on. A provider
 *  slower than this is worse than no provider at all. */
const LOOKUP_TIMEOUT_MS = 1_500;

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<string | null>>();

const readCache = (ip: string): CacheEntry | null => {
  const hit = cache.get(ip);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(ip);
    return null;
  }
  return hit;
};

const writeCache = (ip: string, country: string | null): void => {
  // A Map preserves insertion order, so FIFO eviction needs no extra bookkeeping.
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(ip, { country, expiresAt: Date.now() + (country ? HIT_TTL_MS : MISS_TTL_MS) });
};

/* -------------------------------------------------------------------------- */
/*  Lookup providers                                                           */
/* -------------------------------------------------------------------------- */

/** One JSON GET with a hard timeout. Resolves to null on anything unexpected. */
const fetchJson = async (url: string): Promise<Record<string, unknown> | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** Providers differ on what they call the field; read whichever one is present. */
const countryFromPayload = (payload: Record<string, unknown> | null): string | null => {
  if (!payload) return null;
  for (const key of ["country_code", "countryCode", "country"]) {
    const value = payload[key];
    if (isIso2(value)) return String(value).toUpperCase();
  }
  return null;
};

const lookupUpstream = async (ip: string): Promise<string | null> => {
  const urls: string[] = [];
  if (env.geoip.url) urls.push(env.geoip.url.replace("{ip}", encodeURIComponent(ip)));
  urls.push(`https://ipwho.is/${encodeURIComponent(ip)}`);
  urls.push(`https://api.country.is/${encodeURIComponent(ip)}`);

  for (const url of urls) {
    const country = countryFromPayload(await fetchJson(url));
    if (country) return country;
  }
  return null;
};

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Edge headers, checked first — free, instant and exact when a CDN is in front.
 *
 * Cloudflare sends "XX" for anonymising proxies and "T1" for Tor; both mean
 * "unknown", not a country.
 */
export function countryFromEdgeHeaders(req: Request): string | null {
  const headers = [
    "cf-ipcountry",
    "x-vercel-ip-country",
    "x-appengine-country",
    "fastly-client-country",
    "cloudfront-viewer-country",
  ];
  for (const name of headers) {
    const raw = req.headers[name];
    const value = String((Array.isArray(raw) ? raw[0] : raw) ?? "").toUpperCase();
    if (isIso2(value) && value !== "XX" && value !== "T1") return value;
  }
  return null;
}

/** Cached, de-duplicated IP -> ISO-3166 alpha-2. Never throws. */
export async function countryFromIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;

  const cached = readCache(ip);
  if (cached) return cached.country;

  // A burst from one IP (a page load fires this once, but retries and multiple
  // tabs do not coordinate) makes exactly one upstream call.
  const existing = inFlight.get(ip);
  if (existing) return existing;

  const pending = lookupUpstream(ip)
    .then((country) => {
      writeCache(ip, country);
      return country;
    })
    .catch((err) => {
      logger.warn({ err }, `[geoip] Lookup failed for ${ip}`);
      writeCache(ip, null);
      return null;
    })
    .finally(() => {
      inFlight.delete(ip);
    });

  inFlight.set(ip, pending);
  return pending;
}

/**
 * The country for this request: edge header, then IP lookup.
 *
 * LOCALHOST: ::1 cannot be geolocated, so the whole flow is untestable in dev.
 * GEOIP_DEV_COUNTRY=DE forces a country; GEOIP_DEV_COUNTRY=auto geolocates the
 * SERVER MACHINE's own egress, which on a box behind a system-wide VPN follows
 * the VPN. It is only ever consulted for a PRIVATE client IP, so it cannot
 * affect a real visitor even if left set in production.
 */
export async function countryFromRequest(req: Request): Promise<string | null> {
  const edge = countryFromEdgeHeaders(req);
  if (edge) return edge;

  const ip = clientIp(req);

  if (!ip || isPrivateIp(ip)) {
    const dev = env.geoip.devCountry;
    if (!dev) return null;
    if (dev.toLowerCase() === "auto") {
      // No {ip} — the provider answers for whoever is asking, i.e. this machine.
      return countryFromPayload(await fetchJson("https://ipwho.is/"));
    }
    return isIso2(dev) ? dev.toUpperCase() : null;
  }

  return countryFromIp(ip);
}
