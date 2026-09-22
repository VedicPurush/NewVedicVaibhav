import cron from "node-cron";
import { razorpay } from "../lib/razorpay";
import { logger } from "../lib/logger";
import PendingChadhavaBooking from "../modules/chadhava/pendingChadhavaBooking.model";
import { finalizeChadhavaFromPendingRazorpay } from "../modules/chadhava/newChadhava.controller";
import JyotirlingChadhavaBooking from "../modules/chadhava/jyotirlingChadhavaBooking.model";
import { finalizeJyotirlingChadhava } from "../modules/chadhava/jyotirlingChadhava.controller";
import PendingBooking from "../modules/pooja/pendingPoojaBooking.model";
import { finalizePoojaBookingRecord } from "../modules/pooja/poojaBooking.controller";
import FourDhamYatraBookingModel from "../modules/yatra/fourDhamYatraBooking.model";
import { finalize4DhamBookingRecord } from "../modules/yatra/charDham.controller";
import { PendingBBSevaBooking } from "../modules/yatra/bbSevaBooking.model";
import { finalizeBBSevaBooking } from "../modules/yatra/bbSeva.controller";
import PendingGauSevaBookingModel from "../modules/yatra/pendingGauSevaBooking.model";
import GauSevaBookingModel from "../modules/yatra/gauSevaBooking.model";
import { finalizeGauSevaBooking } from "../modules/yatra/gauSeva.controller";
import { PendingJyotirlingaBooking } from "../modules/jyotirlinga/subscription.model";
import {
  createConfirmedUpfrontBookingFromPending,
  createConfirmedAutopayBookingFromPending,
} from "../modules/jyotirlinga/subscription.controller";
import PendingPersonalizedPoojaBooking from "../modules/personalized-pooja/pendingPersonalizedPooja.model";
import PersonalizedPoojaBooking from "../modules/personalized-pooja/personalizedPooja.model";
import PendingPitruPujaBooking from "../modules/pitru-puja/pendingPitruPujaBooking.model";
import PitruPujaBooking from "../modules/pitru-puja/pitruPujaBooking.model";
import { confirmPitruPujaBooking } from "../modules/pitru-puja/pitruPujaBooking.controller";
import { sendPitruPujaConfirmations } from "../modules/pitru-puja/pitruPujaBooking.notify";

/**
 * Pending-booking reconciliation sweep (legacy "chadhava cleanup" cron):
 * every 10 minutes, find stale pending bookings across ALL verticals whose
 * Razorpay payment was actually captured (missed webhook/redirect) and
 * finalize them idempotently.
 */

const errText = (err: unknown): string => {
  const message = (err as { message?: unknown } | null | undefined)?.message;
  return typeof message === "string" && message ? message : String(err);
};

/** Find a captured payment on an order; null when none (or lookup fails upstream). */
const findCapturedPayment = async (razorpayOrderId: string) => {
  const orderPayments = await razorpay.orders.fetchPayments(razorpayOrderId);
  return orderPayments.items.find((p) => p.status === "captured") ?? null;
};

/** Resolve a receipt-style ID (e.g. "CHAD...") to a real Razorpay order id. */
const resolveRazorpayOrderId = async (storedId: string): Promise<string | null> => {
  if (storedId.startsWith("order_")) return storedId;
  try {
    const orders = await razorpay.orders.all({ receipt: storedId, count: 1 });
    return orders.items && orders.items.length > 0 ? orders.items[0]!.id : null;
  } catch (err) {
    logger.warn(`[Cron] Razorpay order lookup failed for ${storedId}: ${errText(err)}`);
    return null;
  }
};

export const startPendingBookingSweeps = (): void => {
  cron.schedule("*/10 * * * *", async () => {
    try {
      // Older than 5 minutes (give checkout/webhook time to finish), newer
      // than 7 days (efficiency; still catches stragglers).
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const staleWindow = { $lt: fiveMinutesAgo, $gt: sevenDaysAgo };

      // 1. Chadhava
      const pendingChadhava = await PendingChadhavaBooking.find({
        status: { $in: ["pending", "processing"] },
        createdAt: staleWindow,
      });
      for (const booking of pendingChadhava) {
        try {
          const rzpOrderId = await resolveRazorpayOrderId(booking.orderID);
          if (!rzpOrderId) continue;
          const payment = await findCapturedPayment(rzpOrderId);
          if (payment) {
            await finalizeChadhavaFromPendingRazorpay(booking.orderID, {
              razorpay_payment_id: payment.id,
              razorpay_order_id: rzpOrderId,
              razorpay_signature: "cron_auto_verified",
            });
          }
        } catch (err) {
          logger.error(`[Cron][Chadhava] Error checking order ${booking.orderID}: ${errText(err)}`);
        }
      }

      // 2. Pooja
      const pendingPooja = await PendingBooking.find({ createdAt: staleWindow });
      for (const booking of pendingPooja) {
        try {
          const orderId = booking.orderId;
          if (!orderId) continue;
          const payment = await findCapturedPayment(orderId);
          if (payment) {
            await finalizePoojaBookingRecord({
              pending: booking,
              transactionId: booking.merchantTransactionId || orderId,
              razorpay_order_id: orderId,
              razorpay_payment_id: payment.id,
              razorpay_signature: "cron_auto_verified",
            });
          }
        } catch (err) {
          logger.error(`[Cron][Pooja] Failed to finalize pending ${booking._id}: ${errText(err)}`);
        }
      }

      // 3. 4-Dham Yatra
      const pending4Dham = await FourDhamYatraBookingModel.find({
        paymentStatus: { $ne: "paid" },
        createdAt: staleWindow,
      });
      for (const booking of pending4Dham) {
        try {
          const orderId = booking.razorpayOrderId;
          if (!orderId) continue;
          const payment = await findCapturedPayment(orderId);
          if (payment) {
            await finalize4DhamBookingRecord({
              bookingId: booking.bookingId,
              razorpay_order_id: orderId,
              razorpay_payment_id: payment.id,
              razorpay_signature: "cron_auto_verified",
            });
          }
        } catch (err) {
          logger.error(`[Cron][4Dham] Failed to finalize pending ${booking._id}: ${errText(err)}`);
        }
      }

      // 4. BB Seva
      const pendingBBSeva = await PendingBBSevaBooking.find({ createdAt: staleWindow });
      for (const booking of pendingBBSeva) {
        try {
          const orderId = booking.razorpayOrderId;
          if (!orderId) continue;
          const payment = await findCapturedPayment(orderId);
          if (payment) {
            await finalizeBBSevaBooking({
              orderID: booking.orderID,
              razorpay_order_id: orderId,
              razorpay_payment_id: payment.id,
              razorpay_signature: "cron_auto_verified",
            });
          }
        } catch (err) {
          logger.error(`[Cron][BBSeva] Failed to finalize pending ${booking._id}: ${errText(err)}`);
        }
      }

      // 5. Gau Seva
      const pendingGauSeva = await PendingGauSevaBookingModel.find({ createdAt: staleWindow });
      for (const pending of pendingGauSeva) {
        try {
          const orderId = pending.razorpayOrderId;
          if (!orderId) continue;

          // Already confirmed in the main collection — just clear the stale pending doc.
          const existing = await GauSevaBookingModel.findOne({
            bookingId: pending.bookingId,
            paymentStatus: "paid",
          });
          if (existing) {
            await PendingGauSevaBookingModel.deleteOne({ _id: pending._id }).catch(() => {});
            continue;
          }

          const payment = await findCapturedPayment(orderId);
          if (payment) {
            await finalizeGauSevaBooking({
              bookingId: pending.bookingId,
              razorpay_order_id: orderId,
              razorpay_payment_id: payment.id,
              razorpay_signature: "cron_auto_verified",
            });
          }
        } catch (err) {
          logger.error(`[Cron][GauSeva] Failed to finalize pending ${pending._id}: ${errText(err)}`);
        }
      }

      // 6. 12 Jyotirlinga subscriptions
      const pendingJyotirlinga = await PendingJyotirlingaBooking.find({
        status: "pending",
        createdAt: staleWindow,
      });
      for (const pending of pendingJyotirlinga) {
        try {
          const orderId = pending.gatewayRefs?.authOrderId;
          if (!orderId) continue;
          const payment = await findCapturedPayment(orderId);
          if (payment) {
            if (pending.gatewayRefs?.paymentMode === "autopay") {
              await createConfirmedAutopayBookingFromPending({
                pending,
                razorpayPaymentId: payment.id,
                razorpayOrderId: orderId,
                razorpaySignature: "cron_auto_verified",
                customerId: pending.gatewayRefs?.authCustomerId || "",
                tokenId: "",
                paymentStatus: "captured",
                source: "cron",
              });
            } else {
              await createConfirmedUpfrontBookingFromPending({
                pending,
                razorpayPaymentId: payment.id,
                razorpayOrderId: orderId,
                razorpaySignature: "cron_auto_verified",
                paymentStatus: "captured",
                source: "cron",
              });
            }
          }
        } catch (err) {
          logger.error(`[Cron][Jyotirlinga] Failed to finalize pending ${pending._id}: ${errText(err)}`);
        }
      }

      // 7. Personalized puja
      const pendingPersonalized = await PendingPersonalizedPoojaBooking.find({ createdAt: staleWindow });
      for (const pending of pendingPersonalized) {
        try {
          const orderId = pending.orderId;
          if (!orderId) continue;
          const payment = await findCapturedPayment(orderId);
          if (payment) {
            const booking = await PersonalizedPoojaBooking.findOne({ orderId });
            if (booking && !booking.paymentStatus) {
              booking.paymentStatus = true;
              booking.transactionID = payment.id;
              booking.paymentDate = new Date();
              booking.showPaymentToUser = true;
              await booking.save();
              await PendingPersonalizedPoojaBooking.deleteOne({ orderId });
            } else if (booking?.paymentStatus) {
              await PendingPersonalizedPoojaBooking.deleteOne({ orderId });
            }
          }
        } catch (err) {
          logger.error(`[Cron][PersonalizedPuja] Failed to finalize pending ${pending._id}: ${errText(err)}`);
        }
      }

      // 8. Jyotirling Chadhava
      const pendingJyotirlingChadhava = await JyotirlingChadhavaBooking.find({
        status: "pending",
        createdAt: staleWindow,
      });
      for (const booking of pendingJyotirlingChadhava) {
        try {
          const rzpOrderId = await resolveRazorpayOrderId(booking.orderID);
          if (!rzpOrderId) continue;
          const payment = await findCapturedPayment(rzpOrderId);
          if (payment) {
            await finalizeJyotirlingChadhava(booking.orderID, {
              razorpay_payment_id: payment.id,
              razorpay_order_id: rzpOrderId,
              razorpay_signature: "cron_auto_verified",
            });
          }
        } catch (err) {
          logger.error(`[Cron][JyotirlingChadhava] Error checking order ${booking.orderID}: ${errText(err)}`);
        }
      }

      // 9. Pitru Puja
      const pendingPitru = await PendingPitruPujaBooking.find({ createdAt: staleWindow });
      for (const pending of pendingPitru) {
        try {
          const booking = await PitruPujaBooking.findOne({ orderId: pending.orderId }).select(
            "razorpayOrderId paymentStatus",
          );
          if (!booking) continue;

          // Already confirmed by the browser or the webhook — the pending row
          // is just litter at this point.
          if (booking.paymentStatus) {
            await PendingPitruPujaBooking.deleteOne({ orderId: pending.orderId });
            continue;
          }

          // Written when the Razorpay order was created, so it is a real
          // order_… id and needs no receipt lookup.
          const rzpOrderId = booking.razorpayOrderId;
          if (!rzpOrderId) continue;

          const payment = await findCapturedPayment(rzpOrderId);
          if (!payment) continue;

          const confirmed = await confirmPitruPujaBooking({ razorpayOrderId: rzpOrderId }, payment.id);
          if (confirmed) await sendPitruPujaConfirmations(confirmed);
        } catch (err) {
          logger.error(`[Cron][PitruPuja] Failed to finalize pending ${pending.orderId}: ${errText(err)}`);
        }
      }
    } catch (err) {
      logger.error({ err }, "[Cron] Fatal sweep error");
    }
  });
};
