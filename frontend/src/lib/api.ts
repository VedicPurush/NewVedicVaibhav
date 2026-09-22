import axios from "axios";

/**
 * Single source of truth for the backend origin. The legacy app hardcoded
 * `http://localhost:5009` across ~370 call sites and patched it at build time;
 * here every request goes through this module instead.
 */
const CONFIGURED_API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5009"
).replace(/\/+$/, "");

/** Hosts meaning "the machine this browser is on" — the whole problem below. */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Resolve the backend origin for the device the browser is actually running on.
 *
 * NEXT_PUBLIC_* values are inlined into the bundle at build time, so the dev
 * bundle carries a literal `http://localhost:5009`. That is correct on the dev
 * machine and wrong on every other device: a phone opening the dev server at
 * http://192.168.0.150:3000 resolves `localhost` to ITSELF, so every API call
 * fails with a connection error that reads like the backend being down.
 *
 * So when the configured host is loopback but the page was served from some
 * other host, keep the configured port and path and swap in the host the page
 * came from. Nothing hardcodes today's DHCP address, so it survives a
 * new lease.
 *
 * Deliberately inert everywhere else:
 *   - SSR has no `window`, and the server really does want localhost.
 *   - Production configures https://vedicvaibhav.com/api, whose host is not
 *     loopback, so the configured value is returned untouched.
 */
const resolveApiBaseUrl = (): string => {
  if (typeof window === "undefined") return CONFIGURED_API_BASE_URL;
  try {
    const configured = new URL(CONFIGURED_API_BASE_URL);
    if (!LOOPBACK_HOSTS.has(configured.hostname)) return CONFIGURED_API_BASE_URL;
    const pageHost = window.location.hostname;
    if (LOOPBACK_HOSTS.has(pageHost)) return CONFIGURED_API_BASE_URL;
    configured.hostname = pageHost;
    return configured.toString().replace(/\/+$/, "");
  } catch {
    // A malformed base URL must not take the whole app down.
    return CONFIGURED_API_BASE_URL;
  }
};

export const API_BASE_URL = resolveApiBaseUrl();

/** Build an absolute API URL from a path (`apiUrl("/getallpoojas")`). */
export const apiUrl = (path: string): string => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Shared axios instance — attaches the user's JWT when one is stored.
 *  No request previously had a timeout, so a stalled backend/network call hung
 *  forever with no error and no retry — the request-level cause of "responds
 *  slow". 20s is generous for normal API calls but still fails predictably. */
export const api = axios.create({ baseURL: API_BASE_URL, timeout: 20_000 });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem("userDetails");
      const token: unknown = stored ? JSON.parse(stored)?.token : undefined;
      if (typeof token === "string" && token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Corrupt localStorage must never break requests.
    }
  }
  return config;
});

/**
 * True only when a failed request was the backend answering "no such record"
 * (404) — not a timeout, a network error or a 5xx.
 *
 * Pages that turn a missing record into a real 404 must make this distinction.
 * During an outage every lookup fails, and treating that as "missing" would
 * serve 404s for pages that exist, which is how a brief outage turns into
 * search engines dropping real URLs.
 */
export const isNotFoundResponse = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 404;
