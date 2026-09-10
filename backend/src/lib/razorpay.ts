import Razorpay from "razorpay";
import crypto from "node:crypto";
import { env } from "../config/env";
import { logger } from "./logger";

if (!env.razorpay.keyId || !env.razorpay.keySecret) {
  logger.warn(
    `[razorpay] No credentials for PAYMENT_MODE=${env.razorpay.mode} — payment APIs will fail until RAZORPAY_KEY_* is configured`,
  );
}

/** Single Razorpay client — key pair selected by PAYMENT_MODE (live/test). */
export const razorpay = new Razorpay({
  key_id: env.razorpay.keyId || "rzp_unconfigured",
  key_secret: env.razorpay.keySecret || "unconfigured",
});

export const razorpayKeyId = env.razorpay.keyId;

/** Verify a checkout signature (order_id|payment_id HMAC-SHA256). */
export const verifyPaymentSignature = (params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean => {
  const expected = crypto
    .createHmac("sha256", env.razorpay.keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signature));
};

/** Verify a webhook signature against the raw request body bytes. */
export const verifyWebhookSignature = (rawBody: Buffer, signature: string, secret: string): boolean => {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
};
