import type { Request } from "express";
import { verifyPaymentSignature } from "../../lib/razorpay";

/** Best-effort client IP: x-forwarded-for > x-real-ip > socket. */
export const getClientIp = (req: Request): string => {
  const xf = (req.headers["x-forwarded-for"] || "") as string;
  const ipFromXf = xf ? (xf.split(",")[0] ?? "").trim() : "";
  const ip =
    ipFromXf ||
    (req.headers["x-real-ip"] as string) ||
    req.socket?.remoteAddress ||
    req.ip ||
    "";
  return String(ip || "").trim();
};

export const getUserAgent = (req: Request): string => {
  return String(req.headers["user-agent"] || "").trim();
};

/** Legacy order-id format: <PREFIX><epoch-ms><6 random base36 chars>. */
export const generateOrderID = (prefix = "CHAD"): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

/** Razorpay checkout signature check that never throws (length-mismatched
 *  signatures must yield a 400 "Invalid payment signature", not a 500). */
export const isValidRazorpaySignature = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): boolean => {
  try {
    return verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature,
    });
  } catch {
    return false;
  }
};

/** Sanitize +91 / spaces / punctuation; keep a 10-digit Indian mobile. */
export const sanitizeIndianMobile = (raw: unknown): string | null => {
  if (!raw) return null;
  let s = String(raw).trim().replace(/[^\d]/g, "");
  if (s.startsWith("91") && s.length === 12) s = s.slice(2);
  if (s.length === 10) return s;
  return null;
};

/** Simple promise pool for controlled concurrency. */
export const runWithConcurrency = async <T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency = 6,
): Promise<R[]> => {
  const results: R[] = [];
  let i = 0;

  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await worker(items[idx] as T, idx);
      }
    }),
  );

  return results;
};
