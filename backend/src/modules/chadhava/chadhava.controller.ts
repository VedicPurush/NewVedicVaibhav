import type { Request, Response } from "express";
import axios from "axios";
import ChadhavaBooking, { type IChadhavaBooking } from "./chadhava.model";
import PendingChadhavaBooking from "./pendingChadhavaBooking.model";
import { razorpayKeyId } from "../../lib/razorpay";
import { isAcceptablePhone, markUpInr, normalizePhone, resolveCurrency } from "../../config/currency";
import {
  createOrderWithFallback,
  internationalFields,
  orderResponseFields,
} from "../../utils/internationalOrder";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { sendChadhavaConfirmationToUser, type ChadhavaUserEmailBooking } from "../../utils/mail/smtp";
import { sendChadhavaConfirmationToAdmin, type ChadhavaAdminEmailBooking } from "../../utils/mail/smtpUs";
import { sendMetaPurchaseEvent } from "../../utils/metaCapi";
import {
  tryConsumeAppReferralOrder,
  resolveAppReferralRoute,
  recordAppReferralReward,
} from "../../utils/partnerAffiliateReferralCap";
import {
  generateOrderID,
  getClientIp,
  getUserAgent,
  isValidRazorpaySignature,
  runWithConcurrency,
  sanitizeIndianMobile,
} from "./chadhava.helpers";

type AnyRec = Record<string, any>;

/* -------------------------------------------------------------------------- */
/*  Booking -> confirmation-email adapters                                    */
/*                                                                            */
/*  sendChadhavaConfirmationToUser/Admin expect `chadhavaDetails`/`offerings`/*
/*  `paymentDetails`, while this booking stores the same info as              */
/*  `puja.title`/`puja.temple`/`accessories`/`totalPrice` — map one onto the  */
/*  other rather than handing the mailer a shape it doesn't recognize.        */
/* -------------------------------------------------------------------------- */
const toChadhavaUserEmailBooking = (booking: IChadhavaBooking): ChadhavaUserEmailBooking => ({
  name: booking.name,
  currency: booking.currency,
  chargedAmount: booking.chargedAmount,
  fxRate: booking.fxRate,
  priceMultiplier: booking.priceMultiplier,
  paymentDetails: { orderID: booking.orderID, totalPrice: booking.totalPrice },
  chadhavaDetails: {
    title: booking.puja.title,
    temple: booking.puja.temple,
    date: String(booking.puja.date),
  },
  offerings: (booking.accessories || []).map((a) => ({
    name: a.name,
    price: a.price,
    quantity: a.quantity,
  })),
  prasadDetails: booking.prasad
    ? {
        name: booking.prasad.name,
        price: booking.prasad.price,
        whatsapp: booking.whatsapp,
        address: booking.address
          ? {
              street: booking.address.address1,
              city: booking.address.city,
              state: booking.address.state,
              postal: booking.address.pinCode,
              email: booking.address.email,
            }
          : undefined,
      }
    : null,
});

const toChadhavaAdminEmailBooking = (booking: IChadhavaBooking): ChadhavaAdminEmailBooking => ({
  orderID: booking.orderID,
  transactionID: booking.transactionID,
  puja: {
    title: booking.puja.title,
    temple: booking.puja.temple,
    date: booking.puja.date,
  },
  accessories: booking.accessories || [],
  prasad: booking.prasad ? { name: booking.prasad.name, price: booking.prasad.price } : null,
  address: booking.address ?? null,
  totalPrice: booking.totalPrice,
  familyMembers: booking.familyMembers,
  gotra: booking.gotra,
  status: booking.status,
  name: booking.name,
  whatsapp: booking.whatsapp,
});

/* -------------------------------------------------------------------------- */
/*  Partner Affiliate helper (legacy Chadhava flow — includes APP order cap)  */
/* -------------------------------------------------------------------------- */
const sendChadhavaOrderToPartnerAffiliate = async (booking: IChadhavaBooking): Promise<void> => {
  // Only proceed if a referral code exists on the booking object.
  if (!booking.referralCode) return;

  // App orders only earn commission for a referred customer's first N orders (admin-editable,
  // default 15) — website link referrals have no cap. Chadhava is website-only today (see
  // initiateChadhavaPayment), so this is a no-op in practice but keeps behavior consistent if
  // an app entry point is ever added.
  if (booking.orderSource === "APP") {
    const withinCap = await tryConsumeAppReferralOrder(booking.whatsapp);
    if (!withinCap) {
      logger.info(
        `[Partner Affiliate] Skipping commission for chadhava order ${booking.orderID}: app referral order cap reached for this customer.`,
      );
      return;
    }
    // Peer (plain-customer) referral -> app store-credit reward ledger; partner/affiliate code ->
    // fall through to the commission push below. Exactly one path per order, never both.
    const route = await resolveAppReferralRoute(booking.referralCode);
    if (route === "PEER") {
      await recordAppReferralReward({
        referrerCode: String(booking.referralCode),
        orderId: booking.orderID,
        orderAmount: booking.totalPrice,
        department: "CHADHAVA",
        referredPhone: booking.whatsapp,
      });
      return;
    }
  }

  try {
    const apiUrl = env.partnerAffiliate.orderApi;
    if (!apiUrl) {
      logger.warn("PARTNER_AFFILIATE_ORDER_API is not set. Skipping affiliate call.");
      return;
    }

    // A SINGLE consolidated product entry for the affiliate system.
    const productsArray = [
      {
        productName: "CHADHAVA",
        productPrice: booking.totalPrice,
        commissionPercent: [0, 0, 0],
      },
    ];

    const payload = {
      // 'userId' is the referrer (the affiliate).
      userId: booking.referralCode,
      // 'refferal_user_id' is the new customer who made the booking.
      refferal_user_id: booking.userID,
      orderId: booking.orderID,
      orderPrice: booking.totalPrice,
      time: (booking.bookingDate || new Date()).toISOString(),
      department: "CHADHAVA",
      products: productsArray,
      orderSource: booking.orderSource || "WEBSITE", // Audit-only
      // Customer identity (phone) for the WEBSITE "first order only" referral cap on the
      // partner-affiliate side (app orders are exempt — they use the App Referral Order Cap).
      customerId: booking.whatsapp,
    };

    await axios.post(apiUrl, payload, { timeout: 10000 });
  } catch (error: any) {
    // Log but do not throw — non-blocking background task.
    logger.error(
      { err: error.response?.data || error.message },
      `Failed to send Chadhava order to Partner Affiliate API for order ${booking.orderID}`,
    );
  }
};

/* -------------------------------------------------------------------------- */
/*  Razorpay: idempotent & atomic finalize from Pending (legacy model)        */
/* -------------------------------------------------------------------------- */
const finalizeChadhavaFromPendingRazorpay = async (
  orderID: string,
  rzp: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  },
) => {
  // 0) Idempotency: already finalized
  const already = await ChadhavaBooking.findOne({ orderID });
  if (already) {
    await PendingChadhavaBooking.deleteOne({ orderID });
    return { booking: already, alreadyExists: true };
  }

  // 1) Atomic lock pending — allow taking over "processing" stuck for > 5 minutes.
  const stagnantTime = new Date(Date.now() - 5 * 60 * 1000);
  const pending = await PendingChadhavaBooking.findOneAndUpdate(
    {
      orderID,
      $or: [
        { status: { $in: ["pending", "paid"] } },
        { status: "processing", statusDate: { $lt: stagnantTime } },
      ],
    },
    { $set: { status: "processing", statusDate: new Date() } },
    { new: true },
  );

  if (!pending || !pending.bookingDetails) {
    const existing = await ChadhavaBooking.findOne({ orderID });
    if (existing) {
      await PendingChadhavaBooking.deleteOne({ orderID });
      return { booking: existing, alreadyExists: true };
    }

    const processing = await PendingChadhavaBooking.findOne({ orderID, status: "processing" });
    if (processing) {
      return { booking: null, alreadyExists: false, inProgress: true };
    }

    throw new Error("Pending booking not found or invalid");
  }

  const bookingDetails = pending.bookingDetails;

  // Meta context saved at initiate-time
  const metaCtx = (bookingDetails?.meta || {}) as {
    clientIp?: string;
    userAgent?: string;
    fbp?: string;
    fbc?: string;
    actionSource?: "website" | "app" | string;
    eventSourceUrl?: string;
    advertiserTrackingEnabled?: 0 | 1 | boolean | string | number;
    applicationTrackingEnabled?: 0 | 1 | boolean | string | number;
  };

  // 2) Create confirmed booking
  const confirmedBooking = new ChadhavaBooking({
    ...bookingDetails,
    orderID,
    transactionID: rzp.razorpay_payment_id,
    // Only preserve comboSelections if it exists and has items
    ...(bookingDetails.comboSelections && bookingDetails.comboSelections.length > 0
      ? { comboSelections: bookingDetails.comboSelections }
      : {}),
    payment: {
      provider: "razorpay",
      razorpay_payment_id: rzp.razorpay_payment_id,
      razorpay_order_id: rzp.razorpay_order_id,
      razorpay_signature: rzp.razorpay_signature,
      status: "success",
      verifiedAt: new Date(),
    },
    status: "confirmed",
    statusDate: new Date(),
    referralCode: bookingDetails.referralCode || null,
  });

  await confirmedBooking.save();

  // 3) Cleanup pending
  await PendingChadhavaBooking.deleteOne({ orderID });

  // 4) Side effects (NON-BLOCKING)
  void (async () => {
    try {
      await sendChadhavaOrderToPartnerAffiliate(confirmedBooking);
    } catch (e: any) {
      logger.error({ err: e?.message || e }, "Affiliate call failed");
    }

    try {
      await sendChadhavaConfirmationToUser({
        toObject: () => toChadhavaUserEmailBooking(confirmedBooking),
      });
    } catch (e: any) {
      logger.error({ err: e?.message || e }, "User email failed");
    }

    try {
      await sendChadhavaConfirmationToAdmin({
        toObject: () => toChadhavaAdminEmailBooking(confirmedBooking),
      });
    } catch (e: any) {
      logger.error({ err: e?.message || e }, "Admin email failed");
    }

    // META CAPI PURCHASE (forced website action source)
    try {
      const totalPrice = Number(confirmedBooking.totalPrice || 0);
      const actionSource = "website" as const;

      await sendMetaPurchaseEvent({
        orderID: String(orderID),
        value: totalPrice,
        currency: "INR",
        contentId: String(confirmedBooking.puja?.title || "CHADHAVA").trim(),
        deliveryCategory: confirmedBooking.address ? "home_delivery" : "in_store",
        actionSource,
        phone: String(confirmedBooking.whatsapp || ""),
        email: (confirmedBooking as AnyRec).email || null,
        externalId: String(confirmedBooking.userID || ""),
        // for website events these are important
        clientIp: metaCtx.clientIp || null,
        userAgent: metaCtx.userAgent || null,
        fbp: metaCtx.fbp || null,
        fbc: metaCtx.fbc || null,
        eventSourceUrl: metaCtx.eventSourceUrl || env.metaCapi.defaultEventSourceUrl || null,
        eventIdPrefix: "chadhava_purchase_",
      });
    } catch (e: any) {
      logger.error(
        { err: e?.response?.data || e?.message || e },
        `[MetaCAPI][Chadhava] Purchase failed for orderID=${orderID}`,
      );
    }
  })();

  return { booking: confirmedBooking, alreadyExists: false };
};

/* -------------------------------------------------------------------------- */
/*  Controller functions                                                      */
/* -------------------------------------------------------------------------- */

export const initiateChadhavaPayment = async (req: Request, res: Response) => {
  const {
    name,
    whatsapp,
    family,
    gotra,
    chadhavaDetails,
    comboSelections,
    offerings,
    prasadDetails,
    totalPrice,
    address,
    referralCode,

    // international presentment — a REQUEST, never the amount itself
    currency,
    countryCode,
    country,
    dialCode,

    // tracking (optional)
    fbp,
    fbc,

    // website source URL (frontend value or env fallback)
    eventSourceUrl,

    // kept but irrelevant for website
    advertiserTrackingEnabled,
    applicationTrackingEnabled,
  } = req.body as AnyRec;

  if (!name || !whatsapp || !chadhavaDetails || !totalPrice) {
    return res.status(400).json({ message: "Missing required booking details." });
  }

  /**
   * Indian numbers keep EXACTLY the old rule; everyone else gets a length
   * sanity check against their own numbering plan. See bbSeva.controller.ts
   * for why /^[6-9]\d{9}$/ rejecting every foreign number is the actual bug.
   * No `dialCode` means India, so a client that has not been updated behaves
   * exactly as it did before.
   */
  if (!isAcceptablePhone(whatsapp, dialCode)) {
    return res.status(400).json({ message: "Valid mobile number is required." });
  }

  const orderID = generateOrderID();
  const userID = `USER_${Date.now()}`;

  /**
   * The browser sends the INDIA LIST TOTAL, exactly as it always has — coupons,
   * combos and add-ons already applied. The foreign markup is applied HERE and
   * only here.
   *
   * That is a deliberate choice for this codebase: every checkout sends a
   * client-computed total, so if the browser also applied the multiplier then
   * this server's own price checks (and the coupon minimums they are compared
   * against) would be reading marked-up rupees against an India catalog and
   * rejecting valid orders. One owner for the multiplier, and it is the server.
   */
  const orderCurrency = resolveCurrency(currency);
  const listInr = Number(totalPrice);
  const amountInr = markUpInr(listInr, orderCurrency);

  const clientIp = getClientIp(req);
  const userAgent = getUserAgent(req);

  // force website
  const normalizedActionSource = "website" as const;

  // Normalize flags (unused for website)
  const advTrack =
    advertiserTrackingEnabled === 0 ||
    advertiserTrackingEnabled === "0" ||
    advertiserTrackingEnabled === false ||
    advertiserTrackingEnabled === "false"
      ? 0
      : advertiserTrackingEnabled === 1 ||
          advertiserTrackingEnabled === "1" ||
          advertiserTrackingEnabled === true ||
          advertiserTrackingEnabled === "true"
        ? 1
        : 0;

  const appTrack =
    applicationTrackingEnabled === 0 ||
    applicationTrackingEnabled === "0" ||
    applicationTrackingEnabled === false ||
    applicationTrackingEnabled === "false"
      ? 0
      : applicationTrackingEnabled === 1 ||
          applicationTrackingEnabled === "1" ||
          applicationTrackingEnabled === true ||
          applicationTrackingEnabled === "true"
        ? 1
        : advTrack;

  const bookingDetails: AnyRec = {
    userID,
    name,
    // India keeps the bare 10 digits every existing record assumes; everyone
    // else keeps their country code, so the confirmation actually reaches them.
    whatsapp: normalizePhone(whatsapp, dialCode),
    puja: {
      chadhavaId: chadhavaDetails.chadhavaId,
      title: chadhavaDetails.title,
      temple: chadhavaDetails.temple,
      date: new Date(chadhavaDetails.date),
    },
    accessories: offerings,
    prasad: prasadDetails,
    // The INR value of the sale — already marked up, so every downstream reader
    // (reporting, Meta CAPI, emails, admin) keeps seeing rupees and is unchanged.
    totalPrice: amountInr,
    listAmount: listInr,
    familyMembers: family,
    comboSelections: Array.isArray(comboSelections) ? comboSelections : [],
    gotra,
    bookingDate: new Date(),
    address:
      prasadDetails && address
        ? {
            name: name,
            number: whatsapp,
            address1: address.address1,
            city: address.city,
            state: address.state,
            pinCode: Number(address.postal),
            country: "India",
          }
        : undefined,
    referralCode: referralCode || null,
    // This entry point is website-only today (see the forced "website" actionSource just
    // below) — no separate app initiation flow for Chadhava currently exists in this backend.
    orderSource: "WEBSITE",

    meta: {
      clientIp,
      userAgent,
      fbp: fbp || null,
      fbc: fbc || null,
      actionSource: normalizedActionSource,
      eventSourceUrl:
        String(eventSourceUrl || "").trim() ||
        String(env.metaCapi.defaultEventSourceUrl || "").trim() ||
        null,
      advertiserTrackingEnabled: advTrack,
      applicationTrackingEnabled: appTrack,
    },
  };

  const pendingBooking = new PendingChadhavaBooking({
    orderID,
    bookingDetails,
    status: "pending",
    statusDate: new Date(),
  });
  await pendingBooking.save();

  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    return res.status(500).json({
      success: false,
      message: "Server misconfig: Razorpay keys missing",
    });
  }

  try {
    const { order: razorpayOrder, pricing: fx } = await createOrderWithFallback(
      amountInr,
      orderCurrency,
      {
        receipt: orderID,
        notes: {
          userID,
          name,
          whatsapp,
          temple: chadhavaDetails.temple,
        },
      },
      "Chadhava",
    );

    // Persist what was ACTUALLY billed, not what was requested: the gateway may
    // have refused the currency and fallen back to INR, and the verification path
    // must compare against the same currency the payment happened in.
    await PendingChadhavaBooking.updateOne(
      { orderID },
      {
        $set: Object.fromEntries(
          Object.entries(internationalFields(fx, { countryCode, country })).map(([k, v]) => [
            `bookingDetails.${k}`,
            v,
          ]),
        ),
      },
    );

    return res.status(200).json({
      success: true,
      orderID,
      razorpayOrderId: razorpayOrder.id,
      // The checkout must open on the SAME currency + amount the order carries.
      // `amount` stays the gateway's own minor-unit figure for backwards
      // compatibility; orderResponseFields supplies currency/chargedAmount/
      // amountMinor, and is authoritative after a base-currency fallback.
      amount: razorpayOrder.amount,
      ...orderResponseFields(fx),
      key: razorpayKeyId,
    });
  } catch (err: any) {
    logger.error({ err }, "Razorpay order creation failed");
    return res.status(500).json({
      message: "Payment initiation failed",
      error: err.message,
    });
  }
};

export const verifyChadhavaPaymentRazorpay = async (req: Request, res: Response) => {
  const { orderID, razorpay_payment_id, razorpay_order_id, razorpay_signature } =
    req.body as AnyRec;

  if (!orderID) {
    return res.status(400).json({ success: false, message: "Missing orderID" });
  }

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: "Missing payment details" });
  }

  // Env check before signature verification
  if (!env.razorpay.keySecret) {
    return res
      .status(500)
      .json({ success: false, message: "Server misconfig: RAZORPAY_KEY_SECRET missing" });
  }

  // 1) Verify Razorpay signature
  if (!isValidRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return res.status(400).json({ success: false, message: "Invalid payment signature" });
  }

  // 2) Finalize idempotently + atomically
  try {
    const result = await finalizeChadhavaFromPendingRazorpay(orderID, {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    });
    if (result.inProgress) {
      return res.status(202).json({
        success: false,
        message: "Finalization in progress. Please retry in 1-2 seconds.",
        orderID,
      });
    }
    return res.status(200).json({
      success: true,
      message: result.alreadyExists
        ? "Booking already confirmed"
        : "Payment verified & booking confirmed",
      bookingId: result.booking?._id,
      orderID,
      transactionID: result.booking?.transactionID,
      alreadyExists: result.alreadyExists,
    });
  } catch (e: any) {
    logger.error({ err: e?.message || e }, `Razorpay finalize failed for order ${orderID}`);

    // If booking exists despite error, return success (idempotent)
    const existing = await ChadhavaBooking.findOne({ orderID });
    if (existing) {
      await PendingChadhavaBooking.deleteOne({ orderID });
      return res.status(200).json({
        success: true,
        message: "Booking already confirmed",
        bookingId: existing._id,
        orderID,
        transactionID: existing.transactionID,
        alreadyExists: true,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Payment verified but booking finalization failed (server error).",
    });
  }
};

// Fetch Chadhava booking details based on the phone number
export const getChadhavaByPhoneNumber = async (req: Request, res: Response) => {
  const { phoneNumber } = req.params;

  if (!phoneNumber) {
    return res.status(400).json({ message: "Phone number is required." });
  }

  // Fetch both in parallel
  const [confirmedBookings, pendingDocs] = await Promise.all([
    ChadhavaBooking.find({ whatsapp: phoneNumber }).lean(),
    PendingChadhavaBooking.find({ "bookingDetails.whatsapp": phoneNumber }).lean(),
  ]);

  // Normalize pending to return the actual bookingDetails merged with parent fields
  const pendingBookings = pendingDocs.map((doc) => {
    const details = (doc.bookingDetails ?? doc) as AnyRec;
    return {
      ...details,
      orderID: doc.orderID,
      _id: doc._id,
      status: doc.status,
      // ensure we don't lose created timestamp if needed
      createdAt: doc.createdAt ?? details.createdAt,
    };
  });

  if (!confirmedBookings.length && !pendingBookings.length) {
    return res.status(404).json({
      success: false,
      message: "No bookings found for this phone number.",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Bookings found.",
    counts: {
      confirmed: confirmedBookings.length,
      pending: pendingBookings.length,
      total: confirmedBookings.length + pendingBookings.length,
    },
    confirmedBookings,
    pendingBookings,
  });
};

export const getAllChadhavaBookingss = async (_req: Request, res: Response) => {
  const bookings = await ChadhavaBooking.find();
  if (!bookings || bookings.length === 0) {
    return res.status(404).send("No bookings found.");
  }
  res.setHeader("Content-Type", "text/plain");
  return res.status(200).send(bookings);
};

export const getChadhavaBookingsByPujaTitle = async (req: Request, res: Response) => {
  const { pujaTitle } = req.params;

  if (!pujaTitle) {
    return res.status(400).json({ message: "Puja title is required." });
  }

  const bookings = await ChadhavaBooking.find({ "puja.title": pujaTitle });

  if (!bookings || bookings.length === 0) {
    return res.status(404).json({ message: "No bookings found for this Puja." });
  }

  return res.status(200).json({ bookings });
};

export const getPendingChadhavaByPujaTitle = async (req: Request, res: Response) => {
  const { title } = req.params;
  if (!title) {
    return res.status(400).json({ message: "Puja title is required." });
  }

  // Case-insensitive search for pending bookings with the exact puja title
  const bookings = await PendingChadhavaBooking.find({
    "bookingDetails.puja.title": { $regex: new RegExp(`^${title}$`, "i") },
  });

  if (!bookings || bookings.length === 0) {
    return res
      .status(404)
      .json({ message: "No pending chadhava bookings found for this title." });
  }

  return res.status(200).json({ bookings });
};

export const getAllChadhavaBookings = async (_req: Request, res: Response) => {
  const bookings = await ChadhavaBooking.find({}, { name: 1, totalPrice: 1, _id: 0 });
  if (!bookings || bookings.length === 0) {
    return res.status(404).send("No bookings found.");
  }
  const formatted = bookings.map((booking) => `${booking.name}, ${booking.totalPrice}`).join("\n");

  res.setHeader("Content-Type", "text/plain");
  return res.status(200).send(formatted);
};

export const getChadhavaBookingsByDate = async (req: Request, res: Response) => {
  const { date } = req.query;
  let filter: AnyRec = {};

  if (date) {
    const start = new Date(date as string);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    filter = {
      bookingDate: {
        $gte: start,
        $lte: end,
      },
    };
  }

  const bookings = await ChadhavaBooking.find(filter, {
    name: 1,
    totalPrice: 1,
    bookingDate: 1,
    accessories: 1,
    _id: 0,
  }).sort({ bookingDate: -1 });

  res.json(bookings);
};

/* -------------------------------------------------------------------------- */
/*  Fast2SMS                                                                  */
/* -------------------------------------------------------------------------- */

const FAST2SMS_DEFAULTS = {
  route: "dlt",
  sender_id: "VVORDR",
  message: "194832",
};

/** Sends Fast2SMS messages ONLY for bookings whose createdAt falls on 16 Aug 2025 (UTC). */
export const blastSmsToBookingsBeforeDate = async (
  req: Request<unknown, unknown, { concurrency?: number }>,
  res: Response,
) => {
  try {
    // 1) Exact UTC window: 16 Aug 2025 inclusive -> 17 Aug 2025 exclusive
    const windowStart = new Date("2025-08-16T00:00:00.000Z");
    const windowEnd = new Date("2025-08-17T00:00:00.000Z");

    // 2) Fetch whatsapp + orderID for bookings inside the window
    const rows = await ChadhavaBooking.find(
      {
        createdAt: { $gte: windowStart, $lt: windowEnd },
        whatsapp: { $exists: true, $ne: "" },
      },
      { whatsapp: 1, orderID: 1, _id: 0 },
    )
      .lean()
      .exec();

    // 3) Build per-booking send list (no de-dupe by number; one SMS per booking)
    type SendRow = { number: string; orderID: string };
    const sendRowsRaw: SendRow[] = rows
      .map((r) => {
        const num = sanitizeIndianMobile(r.whatsapp);
        const id = typeof r.orderID === "string" ? r.orderID.trim() : "";
        return num && id ? { number: num, orderID: id } : null;
      })
      .filter((x): x is SendRow => !!x);

    // Remove exact duplicates (same number + same orderID) just in case
    const dedupSet = new Set<string>();
    const sendRows: SendRow[] = [];
    for (const r of sendRowsRaw) {
      const key = `${r.number}|${r.orderID}`;
      if (!dedupSet.has(key)) {
        dedupSet.add(key);
        sendRows.push(r);
      }
    }

    if (sendRows.length === 0) {
      return res.json({
        ok: true,
        summary: {
          windowStartISO: windowStart.toISOString(),
          windowEndISO: windowEnd.toISOString(),
          totalFetched: rows.length,
          totalPreparedToSend: 0,
          totalSent: 0,
          totalFailed: 0,
          sentOrderIDs: [] as string[],
        },
        details: { sent: [], failed: [] },
      });
    }

    // 4) Send via Fast2SMS per (number, orderID)
    const { route, sender_id, message } = FAST2SMS_DEFAULTS;

    const concurrency = Math.min(Math.max(1, req.body?.concurrency ?? 6), 12);

    type SendResult =
      | { ok: true; number: string; orderID: string; response: unknown }
      | { ok: false; number: string; orderID: string; error: string; status?: number };

    const results = await runWithConcurrency<SendRow, SendResult>(
      sendRows,
      async ({ number, orderID }) => {
        try {
          const resp = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
            params: {
              authorization: env.fast2sms.apiKey,
              route,
              sender_id,
              message,
              variables_values: orderID, // dynamic per booking
              flash: 0,
              numbers: number,
              schedule_time: "",
            },
            timeout: 10000,
            headers: { Accept: "application/json" },
          });
          return { ok: true as const, number, orderID, response: resp.data };
        } catch (e: any) {
          return {
            ok: false as const,
            number,
            orderID,
            error: e?.response?.data?.message || e?.message || "Request failed",
            status: e?.response?.status,
          };
        }
      },
      concurrency,
    );

    // 5) Summarize and include which orderIDs were sent
    const sent = results.filter((r) => r.ok) as Extract<SendResult, { ok: true }>[];
    const failed = results.filter((r) => !r.ok) as Extract<SendResult, { ok: false }>[];
    const sentOrderIDs = sent.map((r) => r.orderID);

    return res.json({
      ok: true,
      summary: {
        windowStartISO: windowStart.toISOString(),
        windowEndISO: windowEnd.toISOString(),
        totalFetched: rows.length,
        totalPreparedToSend: sendRows.length,
        totalSent: sent.length,
        totalFailed: failed.length,
        sentOrderIDs,
      },
      details: {
        sent: sent.map((r) => ({ number: r.number, orderID: r.orderID })),
        failed: failed.map((r) => ({
          number: r.number,
          orderID: r.orderID,
          error: r.error,
          status: r.status,
        })),
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      message: "Failed to blast SMS via Fast2SMS",
      error: err?.message ?? String(err),
    });
  }
};

export const sendChadhavaSMS = async (req: Request, res: Response) => {
  try {
    const { id, name, phone, title, temple, date } = req.body as AnyRec;
    // Basic input checks
    if (!name || !phone || !title || !temple || !date) {
      return res.status(400).json({ success: false, message: "Missing parameters" });
    }
    const number = sanitizeIndianMobile(phone);
    if (!number) {
      return res.status(400).json({ success: false, message: "Invalid Indian mobile number" });
    }

    const resp = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
      params: {
        authorization: env.fast2sms.apiKey,
        route: FAST2SMS_DEFAULTS.route,
        sender_id: FAST2SMS_DEFAULTS.sender_id,
        message: FAST2SMS_DEFAULTS.message,
        variables_values: id,
        flash: 0,
        numbers: number,
        schedule_time: "",
      },
      timeout: 10000,
      headers: { Accept: "application/json" },
    });

    if (resp.data?.return) {
      return res.json({ success: true, response: resp.data });
    }
    return res.status(500).json({ success: false, response: resp.data });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.response?.data?.message || err.message || "Unknown error",
    });
  }
};
