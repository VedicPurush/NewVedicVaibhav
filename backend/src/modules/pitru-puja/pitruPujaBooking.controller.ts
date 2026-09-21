import type { Request, Response } from "express";
import PitruPujaBooking, { type IPitruPujaBooking } from "./pitruPujaBooking.model";
import { phoneDigits } from "./pitruPujaBooking.profile";
import PendingPitruPujaBooking from "./pendingPitruPujaBooking.model";
import PitruPuja from "./pitruPuja.model";
import { razorpayKeyId, verifyPaymentSignature, verifyWebhookSignature } from "../../lib/razorpay";
import { markUpInr, resolveCurrency } from "../../config/currency";
import { createOrderWithFallback, internationalFields, orderResponseFields } from "../../utils/internationalOrder";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { ApiError } from "../../lib/apiError";
import { resolvePromo } from "../promo/promo.service";
import { sendMetaPurchaseEvent } from "../../utils/metaCapi";

const istDay = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/**
 * Prefix for the Meta purchase `event_id`.
 *
 * The browser sends the same id with its own `Purchase` pixel event (see
 * `pitruPurchaseEventId` in the frontend's pitru-puja/constants.ts) so Meta
 * deduplicates the pair into a single conversion. Change both together.
 */
const PURCHASE_EVENT_ID_PREFIX = "pitru_purchase_";

/**
 * Meta attribution carried on the devotee's own request.
 *
 * Read inline here, as the other booking modules do, rather than shared: these
 * headers are already on the CORS allow-list in app.ts.
 */
const clientMetaOf = (req: Request) => ({
  clientIp:
    String(req.headers["x-forwarded-for"] || "")
      .split(",")[0]
      ?.trim() ||
    req.socket?.remoteAddress ||
    undefined,
  userAgent: (req.headers["user-agent"] as string) || undefined,
  fbp: (req.headers["x-fbp"] as string) || undefined,
  fbc: (req.headers["x-fbc"] as string) || undefined,
  eventSourceUrl: (req.headers["x-event-source-url"] as string) || undefined,
});

/**
 * Meta CAPI Purchase for a booking that has just been confirmed.
 *
 * Best-effort and self-contained: it swallows its own failures, because a
 * devotee who has paid must never see an error over an analytics call.
 *
 * Attribution comes off the booking, not off the confirming request — the
 * Razorpay webhook can be what confirms a booking, and it carries none of the
 * devotee's headers. Call this exactly once per booking: the callers guard it
 * behind an atomic `paymentStatus` flip so the browser and the webhook racing
 * each other cannot both report the same sale.
 */
const sendPitruPujaPurchase = async (booking: IPitruPujaBooking): Promise<void> => {
  try {
    await sendMetaPurchaseEvent({
      // The booking's own orderId (VVPP…), which is also what the browser puts
      // in its event id — not the Razorpay order id.
      orderID: booking.orderId,
      // `price` is the amount actually charged: markUpInr() has already been
      // applied for international cards, and it is in INR either way.
      value: Number(booking.price || 0),
      currency: "INR",
      contentId: booking.pujaId || "PITRU_PUJA",
      deliveryCategory: "home_delivery",
      actionSource: "website",
      phone: booking.whatsappNumber || null,
      clientIp: booking.clientIp ?? null,
      userAgent: booking.userAgent ?? null,
      fbp: booking.fbp ?? null,
      fbc: booking.fbc ?? null,
      eventSourceUrl: booking.eventSourceUrl ?? null,
      eventIdPrefix: PURCHASE_EVENT_ID_PREFIX,
    });
  } catch (err) {
    logger.error({ err, orderId: booking.orderId }, "[MetaCAPI][PitruPuja] Purchase failed");
  }
};

/**
 * The date being booked: the earliest puja date that is today or later (IST),
 * else the latest one. Mirrors getNextPitruPujaDate on the frontend, which is
 * the date the devotee saw on the page.
 */
function nextPujaDate(dates: Date[] = []): Date | undefined {
  const valid = dates.map((d) => new Date(d)).filter((d) => !isNaN(d.getTime()));
  valid.sort((a, b) => a.getTime() - b.getTime());
  const today = istDay(new Date());
  return valid.find((d) => istDay(d) >= today) ?? valid.at(-1);
}

function generateOrderID(): string {
  const prefix = "VVPP"; // Vedic Vaibhav Pitru Puja
  const suffix = Math.random().toString(36).substring(2, 10).toUpperCase();
  return prefix + suffix;
}

/**
 * POST /create-pitru-puja-booking
 *
 * Creates the booking row BEFORE payment, `paymentStatus: false` — matching the
 * pattern already used by the personalized-pooja module. Price and person count
 * are never taken from the client: both are resolved here from the puja's own
 * `packages[]`, keyed by the package `label` (a real catalog field), so a
 * tampered request can change which package it claims, never what it costs.
 *
 * An optional `promoCode` is validated here against that catalog price — the
 * browser only names the code, it never sends the discounted amount.
 */
export const createPitruPujaBooking = async (req: Request, res: Response): Promise<void> => {
  const { pujaId, packageLabel, whatsappNumber, callingNumber, kartaName, kartaGotra, ancestorNames, promoCode } =
    req.body as Record<string, unknown>;

  if (!pujaId || typeof pujaId !== "string") throw ApiError.badRequest("Missing pujaId.");
  if (!packageLabel || typeof packageLabel !== "string") throw ApiError.badRequest("Missing packageLabel.");
  // Stored as digits only. The profile's puja tab finds a devotee's bookings by
  // matching their phone number, and "98765 43210" never matches "9876543210".
  const whatsappDigits = phoneDigits(whatsappNumber);
  if (whatsappDigits.length < 10) {
    throw ApiError.badRequest("A valid WhatsApp number is required.");
  }
  if (!kartaName || !String(kartaName).trim()) throw ApiError.badRequest("Karta's name is required.");
  if (!kartaGotra || !String(kartaGotra).trim()) throw ApiError.badRequest("Karta's Gotra is required.");
  if (
    !Array.isArray(ancestorNames) ||
    ancestorNames.length === 0 ||
    ancestorNames.some((n) => !String(n || "").trim())
  ) {
    throw ApiError.badRequest("Ancestor name(s) are required.");
  }

  const puja = await PitruPuja.findOne({ pujaId, isActive: true }).lean();
  if (!puja) throw ApiError.notFound("Puja not found.");

  const pkg = puja.packages.find((p) => p.label === packageLabel);
  if (!pkg) throw ApiError.badRequest("Selected package no longer exists for this puja.");

  if (ancestorNames.length !== pkg.personCount) {
    throw ApiError.badRequest(`This package is for ${pkg.personCount} ancestor(s).`);
  }

  const promo = promoCode ? await resolvePromo(promoCode, pkg.price) : null;
  const payableInr = promo ? promo.finalAmount : pkg.price;

  const orderId = generateOrderID();
  const pujaDate = nextPujaDate(puja.mandirDate);
  const mandirDateIso = pujaDate ? pujaDate.toISOString() : undefined;

  const booking = new PitruPujaBooking({
    pujaId,
    poojaName: puja.pujaName,
    packageLabel: pkg.label,
    personCount: pkg.personCount,
    price: payableInr,
    listAmount: payableInr,
    originalAmount: pkg.price,
    promoCode: promo?.promoName,
    discountAmount: promo?.discountAmount ?? 0,
    whatsappNumber: whatsappDigits,
    callingNumber: callingNumber ? phoneDigits(callingNumber) || undefined : undefined,
    kartaName: String(kartaName).trim(),
    kartaGotra: String(kartaGotra).trim(),
    ancestorNames: (ancestorNames as unknown[]).map((n) => String(n).trim()),
    mandirName: puja.mandirName,
    mandirPlace: puja.mandirPlace,
    poojaDate: mandirDateIso,
    orderId,
    paymentStatus: false,
    // Captured here, at the one point in the flow that is guaranteed to be the
    // devotee's own browser, and replayed on the purchase event at confirmation.
    ...clientMetaOf(req),
  });

  await booking.save();

  res.status(201).json({ success: true, booking });
};

/**
 * POST /pitru-puja-payment
 *
 * Server-priced: the browser only names the booking's `orderId`. The India list
 * price is read back from the booking (`listAmount`, set once at creation) and
 * marked up fresh on every call — reading from `price` instead would compound
 * the markup on a retried payment attempt.
 */
export const initiatePitruPujaPayment = async (req: Request, res: Response): Promise<void> => {
  const { orderId, currency, countryCode, country } = req.body as Record<string, unknown>;
  if (!orderId || typeof orderId !== "string") throw ApiError.badRequest("Missing orderId.");

  const booking = await PitruPujaBooking.findOne({ orderId });
  if (!booking) throw ApiError.notFound("Booking not found.");
  if (booking.paymentStatus) throw ApiError.badRequest("Payment already completed for this booking.");

  const orderCurrency = resolveCurrency(currency);
  const listInr = Number(booking.listAmount ?? booking.price);
  const amountInr = markUpInr(listInr, orderCurrency);

  const { order, pricing: fx } = await createOrderWithFallback(
    amountInr,
    orderCurrency,
    { receipt: booking.orderId },
    "PitruPuja",
  );

  booking.listAmount = listInr;
  booking.price = amountInr;
  booking.razorpayOrderId = order.id;
  Object.assign(
    booking,
    internationalFields(fx, { countryCode: countryCode as string, country: country as string }),
  );
  await booking.save();

  await PendingPitruPujaBooking.deleteOne({ orderId });
  await new PendingPitruPujaBooking({
    orderId: booking.orderId,
    bookingDetails: booking._id,
    status: "pending",
  }).save();

  // The checkout must open on the SAME currency + amount the order carries.
  res.status(200).json({ order, key: razorpayKeyId, ...orderResponseFields(fx) });
};

/** POST /verify-pitru-puja-payment */
export const verifyPitruPujaPayment = async (req: Request, res: Response): Promise<void> => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body as Record<
    string,
    unknown
  >;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
    throw ApiError.badRequest("Missing payment details.");
  }

  let signatureValid = false;
  try {
    signatureValid = verifyPaymentSignature({
      orderId: String(razorpay_order_id),
      paymentId: String(razorpay_payment_id),
      signature: String(razorpay_signature),
    });
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) throw ApiError.badRequest("Invalid payment signature.");

  const booking = await PitruPujaBooking.findOne({ orderId: String(orderId) });
  if (!booking) throw ApiError.notFound("Booking not found.");

  // One atomic flip instead of read-then-save: the Razorpay webhook races this
  // handler whenever the browser is slow to call back, and both could otherwise
  // read `paymentStatus: false` and each report the sale to Meta. Only the
  // caller whose update matched gets a document back.
  const confirmed = await PitruPujaBooking.findOneAndUpdate(
    { _id: booking._id, paymentStatus: false },
    {
      paymentStatus: true,
      transactionID: String(razorpay_payment_id),
      paymentDate: new Date(),
    },
    { new: true },
  );

  if (confirmed) {
    await PendingPitruPujaBooking.deleteOne({ orderId: confirmed.orderId });
  }

  res.status(200).json({
    success: true,
    message: "Payment verified.",
    bookingId: booking._id,
    orderId: booking.orderId,
  });

  // Deliberately after the response and deliberately not awaited: metaCapi
  // allows itself 12s, and this endpoint runs inside the checkout's 20s budget,
  // so awaiting a slow Meta call here could time out a payment the devotee has
  // already made and show them a failure.
  if (confirmed) void sendPitruPujaPurchase(confirmed);
};

/**
 * POST /api/webhook/pitru-puja-razorpay — safety net for a browser that never
 * calls back (closed tab, crash) after Razorpay has already captured payment.
 * Mounted with express.raw() by the shared /api/webhook router (see app.ts).
 */
export const handlePitruPujaWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const webhookSecret = env.razorpay.webhookSecret;
    if (!webhookSecret) {
      res.status(500).json({ status: "error" });
      return;
    }

    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    if (!signature) {
      res.status(400).json({ status: "error", message: "Missing signature" });
      return;
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      logger.warn("[PitruPuja Webhook] Invalid signature");
      res.status(400).json({ status: "error", message: "Invalid signature" });
      return;
    }

    const body = (Buffer.isBuffer(req.body) ? JSON.parse(rawBody.toString("utf8")) : req.body) as {
      event?: string;
      payload?: { payment?: { entity?: { order_id?: string; id?: string } } };
    };

    if (body.event === "payment.captured" || body.event === "order.paid") {
      const paymentEntity = body.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        // Same atomic flip as the browser verify path — whichever of the two
        // gets here first is the one that reports the purchase to Meta.
        const confirmed = await PitruPujaBooking.findOneAndUpdate(
          { razorpayOrderId, paymentStatus: false },
          {
            paymentStatus: true,
            transactionID: paymentId || "",
            paymentDate: new Date(),
          },
          { new: true },
        );

        if (confirmed) {
          await PendingPitruPujaBooking.deleteOne({ orderId: confirmed.orderId });
          // Awaited here, unlike the verify path: nothing is waiting on this
          // response but Razorpay, and the handler must not finish before the
          // event is sent.
          await sendPitruPujaPurchase(confirmed);
        } else if (!(await PitruPujaBooking.exists({ razorpayOrderId }))) {
          logger.warn(`[PitruPuja Webhook] Booking not found for razorpayOrderId: ${razorpayOrderId}`);
        }
      }
    }

    res.status(200).json({ status: "ok" });
  } catch (err) {
    logger.error(`[PitruPuja Webhook] Error: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ status: "error" });
  }
};
