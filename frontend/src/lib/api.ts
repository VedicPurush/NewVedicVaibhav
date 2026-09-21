import axios from "axios";

/**
 * Single source of truth for the backend origin. The legacy app hardcoded
 * `http://localhost:5009` across ~370 call sites and patched it at build time;
 * here every request goes through this module instead.
 */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5009").replace(
  /\/+$/,
  "",
);

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
