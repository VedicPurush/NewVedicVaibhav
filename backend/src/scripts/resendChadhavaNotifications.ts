/**
 * ONE-TIME SCRIPT — Process stale PendingChadhavaBookings from the past 60 days.
 * For each pending booking, checks Razorpay for a captured payment.
 * If found -> finalizes the booking (creates the confirmed ChadhavaBooking and
 * sends WhatsApp + email side effects). Does NOT touch already-confirmed bookings.
 *
 * Run from the backend/ folder:
 *   pnpm tsx src/scripts/resendChadhavaNotifications.ts
 *
 * NOTE: the Razorpay key pair is selected by PAYMENT_MODE (live/test) via
 * lib/razorpay — run with PAYMENT_MODE=live to reconcile production payments.
 */

import { env } from "../config/env";
import { dbMain } from "../config/db";
import { razorpay } from "../lib/razorpay";
import { logger } from "../lib/logger";
import PendingChadhavaBooking from "../modules/chadhava/pendingChadhavaBooking.model";
import { finalizeChadhavaFromPendingRazorpay } from "../modules/chadhava/newChadhava.controller";

async function main(): Promise<void> {
  await dbMain.asPromise();
  logger.info(`DB connected (mode: ${env.razorpay.mode})`);

  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const pendingBookings = await PendingChadhavaBooking.find({
    status: { $in: ["pending", "processing"] },
    createdAt: { $gte: sixtyDaysAgo },
  });

  logger.info(`Found ${pendingBookings.length} pending chadhava bookings from the past 60 days`);

  let confirmed = 0;
  let skipped = 0;
  let failed = 0;

  for (const booking of pendingBookings) {
    const receiptId = booking.orderID;
    logger.info(`Checking: ${receiptId} (status: ${booking.status})`);

    try {
      // Resolve to real Razorpay order ID if stored as our receipt (CHAD...)
      let rzpOrderId = receiptId;

      if (!rzpOrderId.startsWith("order_")) {
        const orders = await razorpay.orders.all({ receipt: rzpOrderId, count: 1 });
        if (!orders.items || orders.items.length === 0) {
          logger.warn(`No Razorpay order found for receipt: ${receiptId} — skipping`);
          skipped++;
          continue;
        }
        rzpOrderId = orders.items[0]!.id;
        logger.info(`Resolved receipt -> Razorpay order: ${rzpOrderId}`);
      }

      // Fetch payments for this Razorpay order
      const orderPayments = await razorpay.orders.fetchPayments(rzpOrderId);
      const capturedPayment = orderPayments.items.find((p) => p.status === "captured");

      if (!capturedPayment) {
        logger.info("No captured payment found — skipping");
        skipped++;
        continue;
      }

      logger.info(`Captured payment found: ${capturedPayment.id}`);

      // Finalize — creates the ChadhavaBooking + sends WhatsApp + email
      const result = await finalizeChadhavaFromPendingRazorpay(receiptId, {
        razorpay_payment_id: capturedPayment.id,
        razorpay_order_id: rzpOrderId,
        razorpay_signature: "manual_script_verified",
      });

      if (result.alreadyExists) {
        logger.info("Booking already confirmed in DB — pending record cleaned up");
        skipped++;
      } else {
        const b = result.booking;
        logger.info(
          {
            paymentId: capturedPayment.id,
            customer: b?.name || "N/A",
            whatsapp: b?.whatsapp || "N/A",
            puja: b?.puja?.chadhavaName || "N/A",
            mandir: b?.puja?.mandir?.nameEnglish || "N/A",
            amount: b?.totalPrice ?? "N/A",
          },
          `CONFIRMED & NOTIFIED: ${receiptId}`,
        );
        confirmed++;
      }
    } catch (e: any) {
      logger.error(`ERROR for ${receiptId}: ${e?.message || e}`);
      failed++;
    }

    // Small delay to avoid Razorpay rate limits
    await new Promise((r) => setTimeout(r, 400));
  }

  logger.info(
    `SCRIPT COMPLETE — confirmed: ${confirmed}, skipped (no payment / already done): ${skipped}, errors: ${failed}`,
  );

  process.exit(0);
}

main().catch((err) => {
  logger.fatal({ err }, "Fatal error");
  process.exit(1);
});
