import rateLimit from "express-rate-limit";
import type { Request } from "express";

/** Shared limiter factory so every route uses consistent, typed options. */
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) =>
  rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    ...(options.keyGenerator ? { keyGenerator: options.keyGenerator } : {}),
    message: { success: false, message: options.message ?? "Too many requests, please try again later." },
  });

/** Caller IP, with IPv6 collapsed to its /64 so one client cannot rotate addresses. */
const ipKey = (req: Request): string => {
  const ip = req.ip ?? "unknown";
  return ip.includes(":") ? ip.split(":").slice(0, 4).join(":") : ip;
};

/**
 * OTP limits are keyed by the phone/email being targeted, NOT by caller IP.
 *
 * Indian mobile networks put very large numbers of subscribers behind shared
 * CGNAT addresses, so an IP-keyed limit would throttle unrelated customers who
 * happen to share an egress IP. Keying on the target also matches what is
 * actually being abused: SMS-bombing one number, or brute-forcing one account's
 * 6-digit code. Falls back to IP when the request carries no target.
 *
 * Requires express.json() to have run first — these limiters are applied per
 * route (after the body parser in app.ts), never as global middleware.
 */
const otpTargetKey = (req: Request): string => {
  const body = (req.body ?? {}) as { phone?: unknown; email?: unknown; to?: unknown };
  const raw = String(body.phone ?? body.email ?? body.to ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return `ip:${ipKey(req)}`;
  const digits = raw.replace(/\D/g, "");
  // Last 10 digits so +91xxxxxxxxxx and 0xxxxxxxxxx share one bucket.
  return digits.length >= 10 ? `phone:${digits.slice(-10)}` : `id:${raw}`;
};

/** OTP send/verify — strict, per targeted phone or email. */
export const otpRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many OTP requests. Please try again after 15 minutes.",
  keyGenerator: otpTargetKey,
});

/** General write endpoints — per IP. */
export const writeRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: ipKey,
});
