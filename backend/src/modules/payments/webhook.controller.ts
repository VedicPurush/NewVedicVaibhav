import type { Request, Response } from "express";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { verifyWebhookSignature } from "../../lib/razorpay";
import { paymentCoversOrder, type PayableDoc } from "../../utils/internationalOrder";
import PendingBooking from "../pooja/pendingPoojaBooking.model";
import PoojaBooking from "../pooja/poojaBooking.model";
import { finalizePoojaBookingRecord } from "../pooja/poojaBooking.controller";
// Chadhava dependencies (ported in parallel by the chadhava module owner)
import PendingChadhavaBooking from "../chadhava/pendingChadhavaBooking.model";
import { finalizeChadhavaFromPendingRazorpay } from "../chadhava/newChadhava.controller";
import JyotirlingChadhavaBooking from "../chadhava/jyotirlingChadhavaBooking.model";
import { finalizeJyotirlingChadhava } from "../chadhava/jyotirlingChadhava.controller";

/**
 * Was enough money actually received for this order?
 *
 * ⚠️ RAZORPAY REPORTS `amount` IN THE ORDER'S CURRENCY, IN ITS SMALLEST UNIT —
 * cents for a USD order, NOT paise. Comparing it against `totalPrice * 100` is
 * the single most common way to break international payments: every foreign
 * payment looks underpaid and the order is stranded even though the devotee has
 * been charged. paymentCoversOrder() does the comparison in the order's own
 * currency, reading what was actually billed off the pending record.
 *
 * Fail-open by construction: when the payload carries no usable amount this
 * returns true, because "the gateway did not tell us" is not evidence of
 * underpayment and must never block a confirmed payment.
 */
const amountIsSufficient = (paymentEntity: Record<string, any> | undefined, doc: PayableDoc): boolean =>
  paymentCoversOrder(Number(paymentEntity?.amount), doc);

/**
 * Razorpay signs the EXACT raw bytes of the webhook body. Routes mounted under
 * /api/webhook (see app.ts) receive `req.body` as a Buffer via express.raw();
 * the pooja-booking-router copy of the webhook is mounted after express.json()
 * and receives a parsed object, so we re-serialize it there (legacy behaviour).
 */
const rawBodyOf = (req: Request): Buffer =>
  Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}));

const parsePayload = (req: Request, rawBody: Buffer): Record<string, any> =>
  Buffer.isBuffer(req.body) || typeof req.body === "string"
    ? (JSON.parse(rawBody.toString("utf8")) as Record<string, any>)
    : (req.body as Record<string, any>);

/**
 * Pooja Razorpay webhook (legacy path: POST /razorpay/webhook on the booking router).
 * Verifies the signature and finalizes the matching pending booking. Falls back to
 * pending chadhava / jyotirling chadhava bookings that share the same Razorpay account.
 */
export const razorpayWebhookHandler = async (req: Request, res: Response) => {
  try {
    const webhookSecret = env.razorpay.webhookSecret;
    if (!webhookSecret) {
      return res.status(500).json({ ok: false, message: "RAZORPAY_WEBHOOK_SECRET not set" });
    }

    const signature = req.headers["x-razorpay-signature"] as string;
    const rawBody = rawBodyOf(req);
    const payload = parsePayload(req, rawBody);

    if (!signature || !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return res.status(400).json({ ok: false, message: "Invalid webhook signature" });
    }

    const paymentEntity = payload?.payload?.payment?.entity;
    const orderEntity = payload?.payload?.order?.entity;
    const notes = (paymentEntity?.notes || orderEntity?.notes || {}) as Record<string, any>;

    const merchantTransactionId = notes?.merchantTransactionId || orderEntity?.receipt;
    const razorpay_order_id = paymentEntity?.order_id || orderEntity?.id;
    const razorpay_payment_id = paymentEntity?.id;

    if (!merchantTransactionId && !razorpay_order_id) {
      return res.status(200).json({ ok: true, message: "No transaction reference in webhook" });
    }

    const pending =
      (merchantTransactionId ? await PendingBooking.findOne({ merchantTransactionId }) : null) ||
      (razorpay_order_id ? await PendingBooking.findOne({ orderId: razorpay_order_id }) : null);

    if (!pending) {
      // Fallback: check for a PENDING CHADHAVA booking
      const pendingChadhava = razorpay_order_id
        ? await PendingChadhavaBooking.findOne({ orderID: razorpay_order_id })
        : null;

      if (pendingChadhava) {
        const cfResult: Record<string, any> = await finalizeChadhavaFromPendingRazorpay(razorpay_order_id, {
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature: signature,
        });

        return res.status(200).json({
          ok: true,
          type: "chadhava",
          bookingId: cfResult?.booking?._id,
          alreadyExists: cfResult?.alreadyExists,
        });
      }

      // Fallback: check for a PENDING JYOTIRLING CHADHAVA booking
      const pendingJyotirling = razorpay_order_id
        ? await JyotirlingChadhavaBooking.findOne({ orderID: razorpay_order_id })
        : null;

      if (pendingJyotirling) {
        const cfResult: Record<string, any> = await finalizeJyotirlingChadhava(razorpay_order_id, {
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature: "webhook_verified",
        });

        return res.status(200).json({
          ok: true,
          type: "jyotirling_chadhava",
          bookingId: cfResult?.booking?._id,
          alreadyExists: cfResult?.alreadyExists,
        });
      }

      // Fallback: check if it's an already confirmed POOJA booking
      const existingPooja =
        (merchantTransactionId
          ? await PoojaBooking.findOne({ transactionId: merchantTransactionId })
          : null) ||
        (razorpay_order_id ? await PoojaBooking.findOne({ razorpayOrderId: razorpay_order_id }) : null);

      if (existingPooja) {
        return res.status(200).json({
          ok: true,
          type: "pooja",
          message: "Pooja booking already confirmed",
          bookingId: existingPooja._id,
          alreadyExists: true,
        });
      }

      return res
        .status(200)
        .json({ ok: true, message: "No pending booking (Pooja/Chadhava) found for webhook" });
    }

    const result = await finalizePoojaBookingRecord({
      pending,
      transactionId: merchantTransactionId || razorpay_order_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature: signature,
    });

    return res.status(200).json({
      ok: true,
      bookingId: result.booking?._id,
      transactionId: result.booking?.transactionId,
      alreadyExists: result.alreadyExists,
    });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "Razorpay webhook error");
    return res.status(500).json({ ok: false, message: "Webhook processing failed" });
  }
};

/**
 * Main Razorpay webhook (POST /api/webhook/razorpay and /api/v1/webhook/razorpay).
 * Mounted with express.raw() — `req.body` is a Buffer and the HMAC is verified
 * over the exact raw bytes. Tries chadhava first, then pooja (legacy order).
 */
export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const webhookSecret = env.razorpay.webhookSecret;
    if (!webhookSecret) {
      logger.error("RAZORPAY_WEBHOOK_SECRET is not set");
      return res.status(500).json({ status: "error", message: "Server misconfig" });
    }

    const signature = req.headers["x-razorpay-signature"] as string;
    if (!signature) {
      return res.status(400).json({ status: "error", message: "Missing signature" });
    }

    const rawBody = rawBodyOf(req);
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      logger.warn("Invalid webhook signature attempt");
      return res.status(400).json({ status: "error", message: "Invalid signature" });
    }

    const payload = parsePayload(req, rawBody);
    const event = payload?.event;

    // 'payment.captured' is safest for confirming money is received
    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload?.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        // 1. Try Chadhava first
        const pendingChadhava = await PendingChadhavaBooking.findOne({ orderID: orderId });

        if (pendingChadhava) {
          const details = (pendingChadhava.bookingDetails || {}) as Record<string, any>;
          if (
            !amountIsSufficient(paymentEntity, {
              amount: details.totalPrice,
              currency: details.currency,
              chargedAmount: details.chargedAmount,
            })
          ) {
            // Acknowledge so Razorpay stops retrying, but do NOT confirm — an
            // underpaid order is a support case, not a booking.
            logger.error(
              `[Webhook] Amount mismatch for chadhava order=${orderId}: paid ` +
                `${paymentEntity?.amount} ${paymentEntity?.currency}, expected the ` +
                `equivalent of ₹${details.totalPrice}. Not confirming.`,
            );
            return res.status(200).json({ status: "amount_mismatch" });
          }

          await finalizeChadhavaFromPendingRazorpay(orderId, {
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            razorpay_signature: "webhook_verified",
          });
        } else {
          // 2. Try Pooja — the Razorpay order_id is stored in PendingBooking.orderId
          const pendingPooja = await PendingBooking.findOne({
            $or: [{ orderId }, { merchantTransactionId: orderId }],
          });

          if (pendingPooja) {
            const details = (pendingPooja.bookingDetails || {}) as Record<string, any>;
            if (
              !amountIsSufficient(paymentEntity, {
                amount: details.totalPrice,
                currency: details.currency,
                chargedAmount: details.chargedAmount,
              })
            ) {
              logger.error(
                `[Webhook] Amount mismatch for pooja order=${orderId}: paid ` +
                  `${paymentEntity?.amount} ${paymentEntity?.currency}, expected the ` +
                  `equivalent of ₹${details.totalPrice}. Not confirming.`,
              );
              return res.status(200).json({ status: "amount_mismatch" });
            }

            await finalizePoojaBookingRecord({
              pending: pendingPooja,
              transactionId: pendingPooja.merchantTransactionId || orderId,
              razorpay_order_id: orderId,
              razorpay_payment_id: paymentId,
              razorpay_signature: "webhook_verified",
            });
          } else {
            logger.warn(`[Webhook] Order ID ${orderId} not found in PendingChadhava or PendingPooja.`);
          }
        }
      }
    }

    // Always return 200 OK to Razorpay to acknowledge receipt
    return res.status(200).json({ status: "ok" });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "Webhook processing error");
    // Return 200 even on error to prevent Razorpay retrying indefinitely on a code bug
    return res.status(200).json({ status: "error_handled" });
  }
};
