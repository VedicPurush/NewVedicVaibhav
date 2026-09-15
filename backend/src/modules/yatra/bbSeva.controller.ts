import type { Request, Response } from "express";
import { Types } from "mongoose";
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
import { BBSevaBooking, PendingBBSevaBooking, type IBBSevaBooking } from "./bbSevaBooking.model";
import BBPackage from "./bbPackage.model";
import { extractClientMeta, sendOrderIdSms } from "./notify";
import { normalizeOrderSource, pushVedicVaibhavOrderCommission } from "../../utils/partnerAffiliateCommission";
import { sendWhatsappTemplateMessage } from "../../utils/whatsapp";
import { bbSevaBookingToAdmin, bbSevaBookingToUser } from "../../utils/mail/smtpUs";
import { sendMetaPurchaseEvent } from "../../utils/metaCapi";

const generateOrderID = (): string => {
  const stamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BB-${stamp}-${random}`;
};

const getBBFamilyPricing = (): { limit: number; rate: number } => ({ limit: 2, rate: 99 });

export const initiateBBSevaPayment = async (req: Request, res: Response): Promise<void> => {
  const {
    packageId,
    name,
    mobile,
    email,
    gotra,
    startDate,
    sankalp,
    familyMembers,
    address,
    city,
    state,
    pincode,
    discountedAmount,
    vv_utm,
    referralCode,
    // the app sends 'APP' so the app referral order cap applies; anything else is WEBSITE
    orderSource,
    // international presentment — a REQUEST, never the amount itself
    currency,
    countryCode,
    country,
    dialCode,
  } = req.body as Record<string, unknown>;

  if (!packageId) throw ApiError.badRequest("packageId is required");
  if (!name || String(name).trim().length < 2) throw ApiError.badRequest("Valid name is required");
  /**
   * Indian numbers keep EXACTLY the old rule. Everyone else gets a length sanity
   * check against their own numbering plan, because /^[6-9]\d{9}$/ rejects every
   * foreign number outright — which would make international checkout impossible
   * however correct the pricing is. No `dialCode` means India, so a client that
   * has not been updated behaves exactly as it did before.
   */
  if (!mobile || !isAcceptablePhone(mobile, dialCode)) {
    throw ApiError.badRequest("Valid mobile number is required");
  }

  const isValidId = Types.ObjectId.isValid(String(packageId));
  const pkg = isValidId
    ? await BBPackage.findById(packageId).lean()
    : await BBPackage.findOne({ packageName: packageId }).lean();
  if (!pkg) throw ApiError.notFound("Package not found");

  const orderID = generateOrderID();
  const baseAmount = pkg.packagePrice;

  // Family member pricing
  const { limit: freeLimit, rate: extraRate } = getBBFamilyPricing();
  const membersList = Array.isArray(familyMembers)
    ? familyMembers.map((item) => String(item || "").trim()).filter((item) => item.length > 0)
    : [];
  const extraMembersCount = Math.max(0, membersList.length - freeLimit);
  const extraCharges = extraMembersCount * extraRate;

  // Final charge (with discount if passed from frontend)
  const parsedDiscount = Number(discountedAmount);
  const chargeAmount =
    parsedDiscount && parsedDiscount >= 1 && parsedDiscount <= baseAmount + extraCharges
      ? parsedDiscount
      : baseAmount + extraCharges;

  /**
   * A SERVER-PRICED flow: the package price comes from the catalog, so the
   * foreign markup is applied here. `chargeAmount` is the India list total
   * (discount already applied) and stays the basis for the markup.
   */
  const orderCurrency = resolveCurrency(currency);
  const amountInr = markUpInr(chargeAmount, orderCurrency);

  const { order: razorpayOrder, pricing: fx } = await createOrderWithFallback(
    amountInr,
    orderCurrency,
    { receipt: orderID, notes: { orderID, packageName: pkg.packageName } },
    "BBSeva",
  );

  await PendingBBSevaBooking.create({
    orderID,
    razorpayOrderId: razorpayOrder.id,
    name: String(name).trim(),
    mobile: normalizePhone(mobile, dialCode),
    email: email ? String(email).trim() : undefined,
    gotra: gotra ? String(gotra).trim() : undefined,
    startDate: startDate ? String(startDate).trim() : undefined,
    sankalp: sankalp ? String(sankalp).trim() : undefined,
    packageName: pkg.packageName,
    packagePrice: pkg.packagePrice,
    numberOfDays: pkg.numberOfDays,
    // The INR value of the sale, already marked up — reporting stays in rupees.
    amount: amountInr,
    listAmount: chargeAmount,
    // Persisted from the pricing the gateway ACCEPTED, never what was requested:
    // an unsupported currency falls back to INR and the webhook's amount check
    // has to compare against the currency the payment really happened in.
    ...internationalFields(fx, { countryCode, country }),
    familyMembers: membersList,
    freeMemberLimit: freeLimit,
    extraMembersCount,
    extraCharges,
    address: address ? String(address).trim() : undefined,
    city: city ? String(city).trim() : undefined,
    state: state ? String(state).trim() : undefined,
    pincode: pincode ? String(pincode).trim() : undefined,
    ...(vv_utm ? { vv_utm } : {}),
    referralCode: referralCode ? String(referralCode).trim() : undefined,
    orderSource: normalizeOrderSource(orderSource),
  });

  res.status(200).json({
    orderID,
    razorpayOrderId: razorpayOrder.id,
    // The checkout must open on the SAME currency + amount the order carries.
    amount: razorpayOrder.amount,
    ...orderResponseFields(fx),
    key: razorpayKeyId,
  });
};

export const finalizeBBSevaBooking = async ({
  orderID,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}: {
  orderID: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) => {
  void razorpay_order_id; // matched upstream; kept for call-shape parity with legacy

  // Idempotency FIRST. Finalising deletes the pending record below, so whichever
  // of {webhook, browser verify} arrives second finds no pending row. Checking
  // for the confirmed booking before requiring a pending one means the loser of
  // that race reports the existing booking instead of throwing "Pending booking
  // not found" — which surfaced to the user as a failed payment.
  const existing = await BBSevaBooking.findOne({ orderID }).lean();
  if (existing) return { booking: existing, alreadyExists: true };

  const pending = await PendingBBSevaBooking.findOne({ orderID }).lean();
  if (!pending) throw new Error("Pending booking not found");

  const { _id: _pendingId, ...pendingData } = pending;
  const booking = await BBSevaBooking.create({
    ...pendingData,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
    paymentStatus: "paid",
  });

  await PendingBBSevaBooking.deleteOne({ orderID });

  // Partner-affiliate commission — Banke Bihari Seva. Best-effort, non-blocking.
  void pushVedicVaibhavOrderCommission({
    referralCode: booking.referralCode,
    orderId: booking.orderID,
    orderPrice: Number(booking.amount) || 0,
    department: "BANKE_BIHARI_SEVA",
    productName: "BANKE_BIHARI_SEVA",
    phone: booking.mobile,
    orderSource: normalizeOrderSource(booking.orderSource),
  });

  // Background notifications
  void (async () => {
    // 0. Admin email
    try {
      await bbSevaBookingToAdmin({
        orderID: pending.orderID,
        name: pending.name,
        mobile: pending.mobile,
        email: pending.email,
        packageName: pending.packageName,
        packagePrice: pending.packagePrice,
        amount: pending.amount,
        startDate: pending.startDate,
        gotra: pending.gotra,
        sankalp: pending.sankalp,
        familyMembers: pending.familyMembers || [],
        address: pending.address,
        city: pending.city,
        state: pending.state,
        pincode: pending.pincode,
        transactionId: booking.razorpayPaymentId || "N/A",
        bookingDate: booking.createdAt || new Date(),
      });
    } catch (e) {
      logger.error({ err: e }, "[BB Seva][BG] Admin email failed");
    }

    // 0b. User confirmation email
    try {
      if (pending.email && pending.email.includes("@")) {
        await bbSevaBookingToUser({
          name: pending.name,
          email: pending.email,
          orderID: pending.orderID,
          packageName: pending.packageName,
          amount: pending.amount,
        // Presentment fields, so the receipt shows what the card was
        // actually billed rather than the internal rupee figure.
          currency: pending.currency,
          chargedAmount: pending.chargedAmount,
          fxRate: pending.fxRate,
          priceMultiplier: pending.priceMultiplier,
          startDate: pending.startDate,
          gotra: pending.gotra,
          familyMembers: pending.familyMembers || [],
        });
      }
    } catch (e) {
      logger.error({ err: e }, "[BB Seva][BG] User email failed");
    }

    // 1. WhatsApp
    try {
      const phone = pending.mobile.startsWith("91") ? pending.mobile : `91${pending.mobile}`;
      const mandirName = "Shri Banke Bihari Ji, Vrindavan";
      const sevaDate = pending.startDate
        ? new Date(pending.startDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "the scheduled date";
      const deityName = "Shri Banke Bihari Ji";

      await sendWhatsappTemplateMessage({
        to: phone,
        templateName: "thankyouchadhava",
        headerImageUrl: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/chadhavathankyou.png",
        templateId: "3679680",
        parameters: [mandirName, sevaDate, pending.orderID, deityName],
      });
    } catch (e) {
      logger.error({ err: e }, "[BB Seva][BG] WhatsApp failed");
    }

    // 2. Fast2SMS (template 194832)
    try {
      await sendOrderIdSms(pending.mobile, pending.orderID);
    } catch (e) {
      logger.error({ err: e }, "[BB Seva][BG] Fast2SMS failed");
    }
  })();

  return { booking, alreadyExists: false };
};

export const verifyBBSevaPayment = async (req: Request, res: Response): Promise<void> => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderID } = req.body as Record<
    string,
    string | undefined
  >;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderID) {
    throw ApiError.badRequest("Missing payment verification fields");
  }

  let signatureValid = false;
  try {
    signatureValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) {
    throw ApiError.badRequest("Payment verification failed: invalid signature");
  }

  const { booking, alreadyExists } = await finalizeBBSevaBooking({
    orderID,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  // Meta CAPI purchase event
  if (!alreadyExists) {
    try {
      const meta = extractClientMeta(req);
      await sendMetaPurchaseEvent({
        orderID: String(orderID),
        value: booking.amount || booking.packagePrice || 0,
        currency: "INR",
        contentId: String(booking.packageName || "BB_SEVA"),
        deliveryCategory: "home_delivery",
        actionSource: "website",
        phone: String(booking.mobile || ""),
        email: booking.email || null,
        externalId: "", // legacy parity: bookings carry no userID
        clientIp: meta.clientIp,
        userAgent: meta.userAgent,
        fbp: meta.fbp,
        fbc: meta.fbc,
        eventSourceUrl: meta.eventSourceUrl,
        eventIdPrefix: "bbseva_purchase_",
      });
    } catch (e) {
      logger.error({ err: e, orderID }, "[MetaCAPI][BBSeva] Purchase failed");
    }
  }

  res.status(200).json({
    message: alreadyExists ? "Booking already confirmed." : "Payment verified successfully",
    orderID: booking.orderID,
  });
};

export const handleBBSevaWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const webhookSecret = env.razorpay.bbWebhookSecret;
    if (!webhookSecret) {
      logger.error("[BB Seva Webhook] secret not set");
      res.status(500).json({ status: "error" });
      return;
    }

    const signature = req.headers["x-razorpay-signature"];
    if (!signature || typeof signature !== "string") {
      res.status(400).json({ status: "error", message: "Missing signature" });
      return;
    }

    const rawBody = Buffer.isBuffer(req.body) ? (req.body as Buffer) : Buffer.from(JSON.stringify(req.body));
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      logger.warn("[BB Seva Webhook] invalid signature");
      res.status(400).json({ status: "error", message: "Invalid signature" });
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
        const pending = await PendingBBSevaBooking.findOne({ razorpayOrderId: orderId }).lean();
        if (pending) {
          await finalizeBBSevaBooking({
            orderID: pending.orderID,
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId || "",
            razorpay_signature: "webhook_verified",
          });
        }
      }
    }

    res.status(200).json({ status: "ok" });
  } catch (err) {
    logger.error({ err }, "[BB Seva Webhook] error");
    res.status(200).json({ status: "error_handled" });
  }
};

export const getBBSevaBookingsByMobile = async (req: Request, res: Response): Promise<void> => {
  const { mobile } = req.params;
  const bookings = await BBSevaBooking.find({ mobile }).sort({ createdAt: -1 }).lean();
  res.status(200).json(bookings);
};

export const getAllBBSevaBookings = async (_req: Request, res: Response): Promise<void> => {
  const bookings = await BBSevaBooking.find().sort({ createdAt: -1 }).lean();
  res.status(200).json(bookings);
};

export const addBBSevaReview = async (req: Request, res: Response): Promise<void> => {
  const { orderID, rating, review } = req.body as { orderID?: string; rating?: number; review?: string };
  if (!orderID) throw ApiError.badRequest("OrderID is required");

  const booking = await BBSevaBooking.findOneAndUpdate({ orderID }, { rating, review }, { new: true });
  if (!booking) throw ApiError.notFound("Booking not found");

  res.status(200).json({ message: "Review submitted successfully", booking });
};

export const getBBSevaReviews = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(String(req.query.page)) || 1;
  const limit = parseInt(String(req.query.limit)) || 10;
  const skip = (page - 1) * limit;

  const query = {
    paymentStatus: "paid",
    review: { $exists: true, $ne: "" },
    rating: { $exists: true, $gte: 1 },
  };

  const bookings = await BBSevaBooking.find(query, {
    name: 1,
    city: 1,
    state: 1,
    rating: 1,
    review: 1,
    packageName: 1,
    createdAt: 1,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await BBSevaBooking.countDocuments(query);

  const reviews = bookings.map((b: Partial<IBBSevaBooking>) => ({
    name: String(b.name || "Devotee").trim(),
    location: [b.city, b.state].filter(Boolean).join(", ") || undefined,
    review: String(b.review || "").trim(),
    rating: Math.max(1, Math.min(5, Number(b.rating) || 5)),
    packageName: String(b.packageName || "").trim(),
  }));

  res.status(200).json({ success: true, data: reviews, total, page, limit });
};
