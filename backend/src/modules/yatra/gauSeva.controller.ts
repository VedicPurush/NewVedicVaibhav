import type { Request, Response } from "express";
import { razorpayKeyId, verifyPaymentSignature, verifyWebhookSignature } from "../../lib/razorpay";
import { isAcceptablePhone, markUpInr, normalizePhone, resolveCurrency } from "../../config/currency";
import {
  createOrderWithFallback,
  internationalFields,
  orderResponseFields,
} from "../../utils/internationalOrder";
import { ApiError } from "../../lib/apiError";
import { logger } from "../../lib/logger";
import { env } from "../../config/env";
import GauSevaBookingModel from "./gauSevaBooking.model";
import PendingGauSevaBookingModel from "./pendingGauSevaBooking.model";
import { extractClientMeta, sendOrderIdSms, toWhatsappNumber } from "./notify";
import { pushVedicVaibhavOrderCommission } from "../../utils/partnerAffiliateCommission";
import { sendWhatsappTemplateMessage } from "../../utils/whatsapp";
import { sendGauSevaConfirmationEmail } from "../../utils/mail/smtp";
import { sendMetaPurchaseEvent } from "../../utils/metaCapi";

const generateGauSevaBookingId = (): string => {
  const stamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `GAUSEVA-${stamp}-${random}`;
};

const getNextWednesday = (): Date => {
  const now = new Date();
  const day = now.getDay();
  const daysUntilWed = day <= 3 ? 3 - day : 7 - (day - 3);
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilWed);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const createGauSevaRazorpayOrder = async (req: Request, res: Response): Promise<void> => {
  const {
    packageId,
    packageName,
    packagePrice,
    quantity,
    devoteeName,
    whatsapp,
    email,
    gotra,
    occasionType,
    occasionDetails,
    occasionPremium,
    tag,
    specialMessage,
    vv_utm,
    referralCode,
    // international presentment — a REQUEST, never the amount itself
    currency,
    countryCode,
    country,
    dialCode,
  } = req.body as Record<string, unknown>;

  // Validation
  if (!packageId || !String(packageId).trim()) throw ApiError.badRequest("packageId is required.");
  if (!packageName || !String(packageName).trim()) throw ApiError.badRequest("packageName is required.");
  if (!packagePrice || Number(packagePrice) <= 0) throw ApiError.badRequest("Valid packagePrice is required.");
  if (!devoteeName || String(devoteeName).trim().length < 2) throw ApiError.badRequest("Valid devoteeName is required.");
  /**
   * Indian numbers keep EXACTLY the old rule; foreign ones get a length sanity
   * check. See bbSeva.controller.ts for why. No `dialCode` means India, so an
   * un-updated client is unaffected.
   */
  if (!whatsapp || !isAcceptablePhone(whatsapp, dialCode)) {
    throw ApiError.badRequest("Valid WhatsApp number is required.");
  }

  const qty = Math.max(1, Number(quantity) || 1);
  const price = Number(packagePrice);
  const premium = Math.max(0, Number(occasionPremium) || 0);
  const total = Math.round((price + premium) * qty);
  const sevaDate = getNextWednesday();

  const bookingId = generateGauSevaBookingId();

  /**
   * The foreign markup is applied here, to the India list total the arithmetic
   * above produced. `total` stays the India figure and becomes `listAmount`.
   */
  const orderCurrency = resolveCurrency(currency);
  const amountInr = markUpInr(total, orderCurrency);

  const { order: razorpayOrder, pricing: fx } = await createOrderWithFallback(
    amountInr,
    orderCurrency,
    {
      receipt: bookingId,
      notes: {
        bookingId,
        packageId: String(packageId).trim(),
        packageName: String(packageName).trim(),
        whatsapp: normalizePhone(whatsapp, dialCode),
      },
    },
    "GauSeva",
  );

  const occasionFields = {
    occasionType: String(occasionType || "none").trim(),
    occasionDetails: occasionDetails && typeof occasionDetails === "object" ? occasionDetails : null,
    occasionPremium: premium,
    tag: String(tag || "").trim(),
    sevaDate,
  };

  const commonFields = {
    bookingId,
    packageId: String(packageId).trim(),
    packageName: String(packageName).trim(),
    packagePrice: price,
    quantity: qty,
    // The INR value of the sale, already marked up — reporting stays in rupees.
    totalAmount: amountInr,
    listAmount: total,
    // From the pricing the gateway ACCEPTED, never what was requested.
    ...internationalFields(fx, { countryCode, country }),
    devoteeName: String(devoteeName).trim(),
    whatsapp: normalizePhone(whatsapp, dialCode),
    email: String(email || "").trim(),
    gotra: String(gotra || "").trim(),
    specialMessage: String(specialMessage || "").trim(),
    razorpayOrderId: razorpayOrder.id,
    ...occasionFields,
    ...(vv_utm ? { vv_utm } : {}),
  };

  // Save to PendingGauSevaBooking
  await PendingGauSevaBookingModel.create(commonFields);

  // Save initiated record to GauSevaBooking
  await GauSevaBookingModel.create({
    ...commonFields,
    paymentStatus: "created",
    bookingStatus: "initiated",
    deliveryStatus: "pending",
    referralCode: referralCode ? String(referralCode).trim() : undefined,
  });

  res.status(201).json({
    message: "Razorpay order created successfully.",
    bookingId,
    razorpayOrderId: razorpayOrder.id,
    // The checkout must open on the SAME currency + amount the order carries.
    amount: razorpayOrder.amount,
    ...orderResponseFields(fx),
    key: razorpayKeyId,
    packageName: String(packageName).trim(),
    devoteeName: String(devoteeName).trim(),
    whatsapp: normalizePhone(whatsapp, dialCode),
  });
};

export const finalizeGauSevaBooking = async ({
  bookingId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}: {
  bookingId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) => {
  // Atomic lock: skip if already confirmed or being processed
  const booking = await GauSevaBookingModel.findOneAndUpdate(
    {
      bookingId: String(bookingId).trim(),
      razorpayOrderId: String(razorpay_order_id).trim(),
      paymentStatus: { $ne: "paid" },
      bookingStatus: { $nin: ["confirmed", "processing"] },
    },
    { $set: { bookingStatus: "processing" } },
    { new: true },
  );

  if (!booking) {
    // Either not found or already confirmed/processing — check idempotency
    const existing = await GauSevaBookingModel.findOne({
      bookingId: String(bookingId).trim(),
      razorpayOrderId: String(razorpay_order_id).trim(),
    });
    if (existing?.paymentStatus === "paid") return { booking: existing, alreadyExists: true };
    throw new Error("GauSeva booking not found or already being processed.");
  }

  booking.paymentStatus = "paid";
  booking.bookingStatus = "confirmed";
  booking.razorpayPaymentId = String(razorpay_payment_id).trim();
  booking.razorpaySignature = String(razorpay_signature).trim();
  booking.paidAt = new Date();
  await booking.save();

  // Remove from pending
  await PendingGauSevaBookingModel.deleteOne({ bookingId: String(bookingId).trim() }).catch(() => {});

  // Partner-affiliate commission — Gau Seva. Best-effort, non-blocking.
  void pushVedicVaibhavOrderCommission({
    referralCode: booking.referralCode,
    orderId: booking.bookingId,
    orderPrice: Number(booking.totalAmount) || 0,
    department: "GAU_SEVA",
    productName: "GAU_SEVA",
    phone: booking.whatsapp,
  });

  // Fire background notifications
  void (async () => {
    try {
      await sendGauSevaConfirmationEmail({
        devoteeName: booking.devoteeName,
        bookingId: booking.bookingId,
        packageName: booking.packageName,
        packagePrice: booking.packagePrice,
        quantity: booking.quantity,
        totalAmount: booking.totalAmount,
        // Presentment fields, so the receipt shows what the card was
        // actually billed rather than the internal rupee figure.
        currency: booking.currency,
        chargedAmount: booking.chargedAmount,
        fxRate: booking.fxRate,
        priceMultiplier: booking.priceMultiplier,
        whatsapp: booking.whatsapp,
        email: booking.email || undefined,
        gotra: booking.gotra || undefined,
        // Legacy parity: the legacy controller read a nonexistent `occasion`
        // field off the booking, so the mail never received one.
        occasion: undefined,
        specialMessage: booking.specialMessage || undefined,
        paidAt: booking.paidAt || undefined,
      });
    } catch (e) {
      logger.error({ err: e }, "[GauSeva][BG] Email failed");
    }

    try {
      const phone = toWhatsappNumber(booking.whatsapp);
      await sendWhatsappTemplateMessage({
        to: phone,
        templateName: "gauseva_booking",
        headerImageUrl: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/chadhavathankyou.png",
        templateId: "",
        parameters: [booking.devoteeName || "Devotee", booking.bookingId, booking.packageName],
        languageCode: "en",
      });
    } catch (e) {
      logger.error({ err: e }, "[GauSeva][BG] WhatsApp failed");
    }

    try {
      await sendOrderIdSms(booking.whatsapp, booking.bookingId);
    } catch (e) {
      logger.error({ err: e }, "[GauSeva][BG] SMS failed");
    }
  })();

  return { booking, alreadyExists: false };
};

export const verifyGauSevaRazorpayPayment = async (req: Request, res: Response): Promise<void> => {
  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as Record<
    string,
    string | undefined
  >;

  if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw ApiError.badRequest(
      "bookingId, razorpay_order_id, razorpay_payment_id and razorpay_signature are required.",
    );
  }

  let signatureValid = false;
  try {
    signatureValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: String(razorpay_signature).trim(),
    });
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) {
    throw ApiError.badRequest("Payment signature verification failed.");
  }

  const { booking, alreadyExists } = await finalizeGauSevaBooking({
    bookingId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  // Meta CAPI purchase event
  if (!alreadyExists) {
    try {
      const meta = extractClientMeta(req);
      await sendMetaPurchaseEvent({
        orderID: String(bookingId),
        value: booking.totalAmount,
        currency: "INR",
        contentId: String(booking.packageName || "GAUSEVA"),
        deliveryCategory: "home_delivery",
        actionSource: "website",
        phone: String(booking.whatsapp || ""),
        email: booking.email || null,
        externalId: "",
        clientIp: meta.clientIp,
        userAgent: meta.userAgent,
        fbp: meta.fbp,
        fbc: meta.fbc,
        eventSourceUrl: meta.eventSourceUrl,
        eventIdPrefix: "gauseva_purchase_",
      });
    } catch (e) {
      logger.error({ err: e, bookingId }, "[GauSeva] MetaCAPI failed");
    }
  }

  res.status(200).json({
    message: alreadyExists ? "Booking already confirmed." : "Payment verified and booking confirmed.",
    booking: {
      bookingId: booking.bookingId,
      packageName: booking.packageName,
      devoteeName: booking.devoteeName,
      whatsapp: booking.whatsapp,
      paymentStatus: booking.paymentStatus,
      bookingStatus: booking.bookingStatus,
    },
  });
};

export const fetchGauSevaBookingById = async (req: Request, res: Response): Promise<void> => {
  const booking = await GauSevaBookingModel.findOne({ bookingId: req.params.bookingId }).lean();
  if (!booking) throw ApiError.notFound("Booking not found.");
  res.status(200).json({ booking });
};

export const fetchUserGauSevaBookings = async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.params;
  if (!phone) throw ApiError.badRequest("Phone number is required.");

  const bookings = await GauSevaBookingModel.find({ whatsapp: String(phone).trim() })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, bookings });
};

export const handleGauSevaRazorpayWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const webhookSecret = env.razorpay.gauSevaWebhookSecret;
    if (!webhookSecret) {
      res.status(500).json({ status: "error" });
      return;
    }

    const signature = req.headers["x-razorpay-signature"];
    if (!signature || typeof signature !== "string") {
      res.status(400).json({ status: "error" });
      return;
    }

    // This path lives under /api/webhook, where express.raw() is mounted, so the
    // body arrives as the exact signed bytes (the legacy server re-stringified a
    // parsed body, which could never match — see port report).
    const rawBody = Buffer.isBuffer(req.body) ? (req.body as Buffer) : Buffer.from(JSON.stringify(req.body));
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      res.status(400).json({ status: "error" });
      return;
    }

    const body = (Buffer.isBuffer(req.body) ? JSON.parse(rawBody.toString("utf8")) : req.body) as {
      event?: string;
      payload?: { payment?: { entity?: { order_id?: string; id?: string } } };
    };
    const event = body.event;

    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = body.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const booking = await GauSevaBookingModel.findOne({ razorpayOrderId: orderId });
        if (booking) {
          await finalizeGauSevaBooking({
            bookingId: booking.bookingId,
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId || "",
            razorpay_signature: "webhook_verified",
          });
        }
      }
    }

    res.status(200).json({ status: "ok" });
  } catch (err) {
    logger.error({ err }, "[GauSeva Webhook] Error");
    res.status(200).json({ status: "error_handled" });
  }
};
