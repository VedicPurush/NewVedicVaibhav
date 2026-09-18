import type { Request, Response } from "express";
import axios from "axios";
import { Parser } from "@json2csv/plainjs";

import PoojaBooking, { type IPoojaBooking } from "./poojaBooking.model";
import NewPooja from "./newPooja.model";
import PendingBooking, { type IPendingBooking } from "./pendingPoojaBooking.model";
import { findPitruPujaBookingsByMobile } from "../pitru-puja/pitruPujaBooking.profile";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { razorpayKeyId, verifyPaymentSignature } from "../../lib/razorpay";
import { markUpInr, resolveCurrency } from "../../config/currency";
import {
  createOrderWithFallback,
  internationalFields,
  orderResponseFields,
} from "../../utils/internationalOrder";
import { poojaBookingConfirmation } from "../../utils/mail/smtp";
import { normalPoojaBookingToAdmin, normalPoojaBookingToUser } from "../../utils/mail/smtpUs";
import { sendWhatsappTemplateMessage } from "../../utils/whatsapp";
import { sendMetaPurchaseEvent } from "../../utils/metaCapi";
import {
  tryConsumeAppReferralOrder,
  resolveAppReferralRoute,
  recordAppReferralReward,
  externalApiHeaders,
} from "../../utils/partnerAffiliateReferralCap";

// -------------------
//  Utility Functions
// -------------------

/** Safe email fallback (some flows send emailId instead of email). */
const makeSafeEmail = (mobile: unknown, email?: unknown): string => {
  const trimmed = String(email || "").trim();
  if (trimmed) return trimmed;
  const digits = String(mobile || "")
    .replace(/\D/g, "")
    .slice(-10);
  return digits ? `${digits}@gmail.com` : "user@gmail.com";
};

// --- Partner Affiliate API Helper ---
const sendOrderToPartnerAffiliate = async (booking: IPoojaBooking): Promise<void> => {
  // Only proceed if a referral code exists
  if (!booking.referralCode) {
    return;
  }

  // App orders only earn commission for a referred customer's first N orders (admin-editable
  // via the Vedic Vaibhav Commission Structure page, default 15) — website link referrals have
  // no such cap. Check-and-increment is atomic on our own User record (see
  // utils/partnerAffiliateReferralCap.ts for why it lives here, not on the partner-affiliate side).
  if (booking.orderSource === "APP") {
    const withinCap = await tryConsumeAppReferralOrder(String(booking.mobile ?? ""));
    if (!withinCap) {
      logger.info(
        `[Partner Affiliate] Skipping commission for order ${booking.transactionId}: app referral order cap reached for this customer.`,
      );
      return;
    }
    // Peer (plain-customer) referral -> app store-credit reward ledger; partner/affiliate code ->
    // fall through to the commission push below. Exactly one path per order, never both.
    const route = await resolveAppReferralRoute(booking.referralCode);
    if (route === "PEER") {
      await recordAppReferralReward({
        referrerCode: String(booking.referralCode),
        orderId: booking.transactionId,
        orderAmount: booking.totalPrice,
        department: "BOOK_POOJA",
        referredPhone: String(booking.mobile ?? ""),
      });
      return;
    }
  }

  try {
    const apiUrl = env.partnerAffiliate.orderApi;
    if (!apiUrl) {
      logger.warn("Partner-affiliate order API is not configured. Skipping API call.");
      return;
    }

    // Single-product booking wrapped in an array (partner-affiliate expects products[]).
    const productsArray = [
      {
        productName: booking.poojaname,
        productPrice: booking.totalPrice,
        // No commission data is available in this flow — the VV engine computes the split.
        commissionPercent: [0, 0, 0],
      },
    ];

    const payload = {
      userId: booking.referralCode,
      refferal_user_id: booking.referralCode,
      orderId: booking.transactionId,
      orderPrice: booking.totalPrice,
      time: booking.bookingDate.toISOString(),
      department: "BOOK_POOJA",
      products: productsArray,
      // Audit-only — the partner-affiliate side already enforced the app-order cap decision by
      // virtue of us even reaching this point; it doesn't need this to compute anything.
      orderSource: booking.orderSource || "WEBSITE",
      // Customer identity (phone). The partner-affiliate side uses this to enforce the WEBSITE
      // "first order only" referral cap (one credited order per referred customer). App orders
      // are exempt from that cap (they use the separate App Referral Order Cap upstream).
      customerId: booking.mobile,
    };

    await axios.post(apiUrl, payload, { headers: externalApiHeaders() });
  } catch (error: any) {
    logger.error(
      { err: error.response?.data || error.message },
      `Failed to send order to Partner Affiliate API for transaction ${booking.transactionId}`,
    );
    // Log the error but do not throw — the main booking process is not affected.
  }
};

/** Run post-confirm side effects without delaying the HTTP response. All best-effort. */
const runPoojaPostConfirmSideEffects = async (booking: IPoojaBooking | null | undefined): Promise<void> => {
  if (!booking) return;

  // Partner affiliate (best-effort)
  try {
    await sendOrderToPartnerAffiliate(booking);
  } catch (e: any) {
    logger.error({ err: e?.response?.data || e?.message || e }, "[Pooja][BG] Partner affiliate failed");
  }

  // WhatsApp confirmation (best-effort)
  try {
    const rawMobile = String(booking.mobile || "").replace(/\D/g, "");
    const last10 = rawMobile.slice(-10);
    const phone = `91${last10}`;

    await sendWhatsappTemplateMessage({
      to: phone,
      templateName: "pujabooking_with_applink",
      templateId: "2933431",
      headerImageUrl:
        "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/chadhavathankyou.png",
      parameters: [booking.poojaname, booking.mandirname, booking.poojadate, booking.transactionId],
    });
  } catch (e: any) {
    logger.error({ err: e?.response?.data || e?.message || e }, "[Pooja][BG] WhatsApp failed");
  }

  // User confirmation email (best-effort)
  try {
    const toEmail = makeSafeEmail(booking.mobile, booking.email);
    await poojaBookingConfirmation(
      toEmail,
      `${booking.firstname ?? ""} ${booking.lastname ?? ""}`.trim(),
      booking.totalPrice,
      (booking.bookingDate || new Date()).toISOString(),
      booking.package,
      booking.mandirname,
      booking.mandirimage,
      booking.bhaktaNames || [],
      booking.gotra || [],
      booking.mobile,
      booking.address1,
      booking.address2,
      booking.city,
      booking.state,
      booking.country,
      booking.pincode,
      booking.idolDetails,
    );
  } catch (e: any) {
    logger.error({ err: e?.response?.data || e?.message || e }, "[Pooja][BG] User mail failed");
  }

  // Admin email (best-effort)
  try {
    await normalPoojaBookingToAdmin({
      userID: booking.userID,
      firstName: booking.firstname,
      lastName: booking.lastname,
      email: makeSafeEmail(booking.mobile, booking.email),
      mobile: booking.mobile,
      poojaName: booking.poojaname,
      packageName: booking.package,
      mandirName: booking.mandirname,
      totalPrice: booking.totalPrice,
      bhaktaNames: booking.bhaktaNames || [],
      gotraNames: booking.gotra || [],
      address1: booking.address1,
      address2: booking.address2,
      city: booking.city,
      state: booking.state,
      country: booking.country,
      pincode: booking.pincode,
      poojaDate: booking.poojadate,
      poojaTime: booking.poojatime,
      transactionId: booking.transactionId,
      referralCode: booking.referralCode || "N/A",
      idolDetails: booking.idolDetails,
    });
  } catch (e: any) {
    logger.error({ err: e?.response?.data || e?.message || e }, "[Pooja][BG] Admin mail failed");
  }

  // User confirmation email via support@vedicvaibhav.com (best-effort)
  try {
    const toEmail = makeSafeEmail(booking.mobile, booking.email);
    if (toEmail.includes("@") && !toEmail.endsWith("@gmail.com") && !toEmail.match(/^\d+@/)) {
      await normalPoojaBookingToUser({
        name: `${booking.firstname ?? ""} ${booking.lastname ?? ""}`.trim() || "Devotee",
        email: toEmail,
        poojaName: booking.poojaname || "",
        mandirName: booking.mandirname || "",
        packageName: booking.package || "",
        poojaDate: booking.poojadate || "",
        poojaTime: booking.poojatime,
        totalPrice: Number(booking.totalPrice || 0),
        // Presentment fields, so the receipt shows what the card was
        // actually billed rather than the internal rupee figure.
        currency: booking.currency,
        chargedAmount: booking.chargedAmount,
        fxRate: booking.fxRate,
        priceMultiplier: booking.priceMultiplier,
        transactionId: booking.transactionId || "",
        bhaktaNames: booking.bhaktaNames || [],
      });
    }
  } catch (e: any) {
    logger.error({ err: e?.response?.data || e?.message || e }, "[Pooja][BG] Support user mail failed");
  }

  // Meta CAPI purchase (best-effort)
  try {
    const amountVal = Number(booking.totalPrice || 0);
    await sendMetaPurchaseEvent({
      orderID: booking.transactionId || String(booking._id),
      value: amountVal,
      currency: "INR",
      contentId: (booking.poojaname || "POOJA").trim(),
      deliveryCategory: "home_delivery",
      actionSource: "website",
      phone: booking.mobile ? String(booking.mobile) : null,
      email: booking.email,
      userAgent: booking.userAgent,
      clientIp: booking.clientIp,
      fbp: booking.fbp,
      fbc: booking.fbc,
      eventSourceUrl: booking.eventSourceUrl,
      eventIdPrefix: "pooja_purchase_",
    });
  } catch (e: any) {
    logger.error(
      { err: e?.response?.data || e?.message || e },
      `[MetaCAPI][Pooja] Purchase failed for txn=${booking.transactionId}`,
    );
  }
};

// -------------------
//  Fetch endpoints
// -------------------

export const fetchBookingsByPujaId = async (req: Request, res: Response) => {
  const { poojaID } = req.params;
  if (!poojaID) {
    return res.status(400).json({ message: "poojaID is required" });
  }

  const bookings = await PoojaBooking.find({ poojaID });

  if (!bookings || bookings.length === 0) {
    return res.status(404).json({ message: "No bookings found for this puja." });
  }

  return res.status(200).json({ bookings });
};

export const getPendingBookingsByPoojaId = async (req: Request, res: Response) => {
  const { poojaID } = req.params;
  if (!poojaID) {
    return res.status(400).json({ message: "poojaID is required." });
  }

  const bookings = await PendingBooking.find({ "bookingDetails.poojaID": poojaID });

  if (!bookings || bookings.length === 0) {
    return res.status(404).json({ message: "No pending bookings found for this puja." });
  }

  return res.status(200).json({ bookings });
};

export const fetchPoojaByUserId = async (req: Request, res: Response) => {
  const { id } = req.params;
  const poojaBooked = await PoojaBooking.find({ userID: id });

  if (!poojaBooked || poojaBooked.length === 0) {
    return res.status(404).json({ message: "No pooja bookings found for this user." });
  }

  return res.status(200).json({ poojaBooked });
};

/**
 * Serves the profile's "Pooja Bookings" tab. Identity here is the phone number
 * in the path — not the JWT — which is why pitru puja bookings, stored in their
 * own collection keyed by WhatsApp number, can be folded in on the same key.
 */
export const fetchPoojaByMobile = async (req: Request, res: Response) => {
  const { mobile } = req.params;

  if (!mobile) {
    return res.status(400).json({ success: false, message: "Mobile number is required" });
  }

  // Normalize input
  const digits = String(mobile).replace(/\D/g, "");
  if (digits.length < 10) {
    return res.status(400).json({ success: false, message: "Invalid mobile number" });
  }

  // Always extract LAST 10 digits and build variants
  const last10 = digits.slice(-10);
  const stringVariants = [last10, `91${last10}`];
  const numberVariants = stringVariants.map(Number);

  // Query BOTH string + number representations of the mobile field
  const poojaBooked = await PoojaBooking.find({
    $or: [{ mobile: { $in: stringVariants } }, { mobile: { $in: numberVariants } }],
  });

  const pendingDocs = await PendingBooking.find({
    $or: [
      { "bookingDetails.mobile": { $in: stringVariants } },
      { "bookingDetails.mobile": { $in: numberVariants } },
    ],
  }).lean();

  // Pitru puja has its own collection and field names; the module maps its rows
  // onto this response's shape so the tab renders them with the same card.
  const pitruBookings = await findPitruPujaBookingsByMobile(last10);

  const pendingBookings = pendingDocs.map((doc) => {
    const details = doc.bookingDetails ?? {};
    return {
      ...details,
      _id: doc._id,
      status: "pending",
      completed: false,
      poojaStatus: "pending",
      isPending: true,
      createdAt: doc.createdAt,
    };
  });

  // Merge confirmed and pending
  const combined = [
    ...poojaBooked.map((b) => ({ ...b.toObject(), status: "confirmed" })),
    ...pendingBookings,
    ...pitruBookings,
  ];

  if (!combined.length) {
    return res
      .status(404)
      .json({ success: false, message: "No pooja bookings found for this mobile number" });
  }

  return res.status(200).json({ success: true, poojaBooked: combined });
};

export const fetchPoojaById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const poojaBooked = await PoojaBooking.findById(id);

  if (!poojaBooked) {
    return res.status(404).json({ message: "No pooja bookings found." });
  }

  return res.status(200).json({ poojaBooked });
};

// -------------------
//  Admin text/CSV endpoints
// -------------------

export const getMobileNameList = async (_req: Request, res: Response) => {
  const bookings = await PoojaBooking.find({ mandirname: "Maha Mrityunjay Mahadev Mandir Kashi" });

  const lines = bookings.map((booking) => {
    // Extract and sanitize mobile number
    let mobile = booking.mobile?.toString() || "";
    mobile = mobile.replace(/^(\+91|91)/, "");

    const name = booking.firstname?.trim() ? booking.firstname : booking.bhaktaNames?.[0] || "Unknown";

    return `${mobile},${name}`;
  });

  res.header("Content-Type", "text/plain");
  return res.send(lines.join("\n"));
};

export const getEmailList = async (_req: Request, res: Response) => {
  const bookings = await PoojaBooking.find({ mandirname: "Maha Mrityunjay Mahadev Mandir Kashi" });

  const emails = bookings
    .map((booking) => booking.email?.trim())
    .filter((email): email is string => !!email);

  res.header("Content-Type", "text/plain");
  return res.send(emails.join(" "));
};

export const getBhaktaGotraList = async (_req: Request, res: Response) => {
  const bookings = await PoojaBooking.find({
    mandirname: "Maha Mrityunjay Mahadev Mandir Kashi",
    package: "singlePackage",
  });

  const lines = bookings.map((booking) => {
    const name = booking.bhaktaNames?.[0]?.trim() || "Unknown";
    const gotra = booking.gotra?.[0]?.trim() || "Unknown";
    return `${name}, ${gotra}`;
  });

  res.header("Content-Type", "text/plain");
  return res.send(lines.join("\n"));
};

export const getFamilyBhaktaGotraList = async (_req: Request, res: Response) => {
  const bookings = await PoojaBooking.find({
    mandirname: "Maha Mrityunjay Mahadev Mandir Kashi",
    package: "familyBhogPackage",
  });

  const lines = bookings.map((booking) => {
    const names = booking.bhaktaNames?.length
      ? booking.bhaktaNames.map((name) => name.trim()).join(" , ")
      : "Unknown";
    const gotra = booking.gotra?.[0]?.trim() || "Unknown";
    return `[${names}] : [${gotra}]`;
  });

  res.header("Content-Type", "text/plain");
  return res.send(lines.join("\n"));
};

export const getDynamicBhaktaGotraList = async (req: Request, res: Response) => {
  const packageType = req.query.package as string;

  if (!packageType) {
    return res.status(400).send("Package type is required as a query parameter.");
  }

  const bookings = await PoojaBooking.find({
    mandirname: "Maha Mrityunjay Mahadev Mandir Kashi",
    package: packageType,
  });

  const lines = bookings.map((booking) => {
    const bhaktaNames = booking.bhaktaNames?.map((name) => name.trim()) || [];
    const gotra = booking.gotra?.[0]?.trim() || "Unknown";

    const namesFormatted = bhaktaNames.length ? `[${bhaktaNames.join(" , ")}]` : "[Unknown]";
    return `${namesFormatted} : [${gotra}]`;
  });

  res.header("Content-Type", "text/plain");
  return res.send(lines.join("\n"));
};

export const getPoojaDashboardStats = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const matchStage: Record<string, any> = {};
  if (startDate || endDate) {
    matchStage.bookingDate = {};
    if (startDate) matchStage.bookingDate.$gte = new Date(startDate as string);
    if (endDate) matchStage.bookingDate.$lte = new Date(endDate as string);
  }

  const stats = await PoojaBooking.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $toLower: "$package" }, // e.g., "singlepackage"
        count: { $sum: 1 },
        totalPrice: { $sum: "$totalPrice" },
      },
    },
  ]);

  const defaultStats = {
    single: { count: 0, totalPrice: 0 },
    partner: { count: 0, totalPrice: 0 },
    family: { count: 0, totalPrice: 0 },
    jointfamily: { count: 0, totalPrice: 0 },
  };

  // Map DB package names to our categories.
  // NOTE (preserved from legacy): the aggregation lower-cases `_id`, so these
  // mixed-case keys never match — every booking falls through and the defaults
  // are returned. Kept identical to avoid changing the dashboard's numbers.
  const packageMap: Record<string, keyof typeof defaultStats> = {
    singlePackage: "single",
    partnerPackage: "partner",
    familyBhogPackage: "family",
    jointfamilyPackage: "jointfamily",
  };

  stats.forEach((p: { _id: string; count: number; totalPrice: number }) => {
    const mappedKey = packageMap[p._id];
    if (mappedKey) {
      defaultStats[mappedKey] = { count: p.count, totalPrice: p.totalPrice };
    }
  });

  const totalCount = Object.values(defaultStats).reduce((acc, v) => acc + v.count, 0);
  const totalRevenue = Object.values(defaultStats).reduce((acc, v) => acc + v.totalPrice, 0);

  return res.json({ packages: defaultStats, totalCount, totalRevenue });
};

// -------------------
//  Razorpay flow
// -------------------

/**
 * Recomputes what a booking should cost from the database and compares it to
 * the amount the client asked us to charge.
 *
 * Only bookings tagged `poojaSource: "new"` are verified, because their total
 * is a closed formula: base price + one per-member charge per extra bhakta.
 * Legacy bookings mix coupons, promo codes, idols, prasad and ad-hoc add-on
 * rows, so recomputing them here would reject valid orders. Those are logged
 * and left alone.
 *
 * @returns null when acceptable, or a message describing the mismatch.
 */
const verifyOrderAmount = async (
  amountInPaise: number,
  bookingDetails: Record<string, any> | undefined,
): Promise<string | null> => {
  if (bookingDetails?.poojaSource !== "new") return null;

  const pooja = await NewPooja.findById(bookingDetails?.poojaID).lean();
  if (!pooja) return "Unknown pooja for this order.";

  const base = pooja.discountPrice ?? pooja.originalPrice ?? 0;
  // bhaktaNames[0] is the yajmaan, covered by the base price
  const extraMembers = Math.max(0, (bookingDetails?.bhaktaNames?.length || 1) - 1);
  const expectedRupees = base + extraMembers * (pooja.familyMemberPrice ?? 101);

  // compare in paise; prices may carry decimals, so never trust float equality
  const expectedPaise = Math.round(expectedRupees * 100);
  const claimedPaise = Math.round(Number(amountInPaise) || 0);

  if (claimedPaise !== expectedPaise) {
    return `Amount mismatch: expected ${expectedPaise} paise, got ${claimedPaise}.`;
  }
  return null;
};

export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const { amount, currency, receipt, bookingDetails, merchantTransactionId, countryCode, country } =
      req.body;

    if (!amount || !merchantTransactionId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    /**
     * `amount` is the INDIA LIST TOTAL IN PAISE — exactly what this endpoint has
     * always received, and what verifyOrderAmount below recomputes against the
     * India catalog. It stays that way: the foreign markup is applied AFTER the
     * check, so a foreign buyer's order is still validated against the same
     * catalog price an Indian buyer's is.
     *
     * `currency` is only ever a REQUEST for which currency to present in. The
     * charge is re-derived from the rupee figure, so a tampered client can change
     * WHICH currency it is billed in but never HOW MUCH.
     */
    // Never let the browser dictate the price it pays.
    const amountError = await verifyOrderAmount(amount, bookingDetails);
    if (amountError) {
      logger.error(
        `[Pricing] Rejected order ${merchantTransactionId} for pooja ${bookingDetails?.poojaID}: ${amountError}`,
      );
      return res
        .status(400)
        .json({ error: "Order total could not be verified. Please refresh and try again." });
    }

    // Persist pending booking against merchantTransactionId so webhook/verify can find it
    await PendingBooking.findOneAndUpdate(
      { merchantTransactionId },
      { merchantTransactionId, bookingDetails, status: "pending" },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const orderCurrency = resolveCurrency(currency);
    const listInr = Math.round(Number(amount)) / 100;
    const amountInr = markUpInr(listInr, orderCurrency);

    const { order, pricing: fx } = await createOrderWithFallback(
      amountInr,
      orderCurrency,
      {
        receipt: merchantTransactionId || receipt,
        notes: {
          merchantTransactionId,
          poojaId: bookingDetails?.poojaID,
          userId: bookingDetails?.userID,
        },
      },
      "Pooja",
    );

    // Store orderId on pending to allow webhook lookup fallback, along with the
    // pricing the gateway ACTUALLY ACCEPTED (never what was requested — the
    // account may not be enabled for the currency and have fallen back to INR).
    // bookingDetails is a Mixed sub-document, and finalizePoojaBookingRecord
    // spreads it onto the booking, so these land on the confirmed record too.
    await PendingBooking.findOneAndUpdate(
      { merchantTransactionId },
      {
        orderId: order.id,
        "bookingDetails.totalPrice": amountInr,
        "bookingDetails.listAmount": listInr,
        ...Object.fromEntries(
          Object.entries(internationalFields(fx, { countryCode, country })).map(([k, v]) => [
            `bookingDetails.${k}`,
            v,
          ]),
        ),
      },
      { new: true },
    );

    return res.json({
      orderId: order.id,
      key: razorpayKeyId,
      merchantTransactionId,
      // The checkout must open on the SAME currency + amount the order carries.
      amount: order.amount,
      ...orderResponseFields(fx),
    });
  } catch (error) {
    logger.error({ err: error }, "Error creating Razorpay order");
    return res.status(500).json({ error: "Error creating Razorpay order" });
  }
};

/** Shared helper: finalize a booking from a pending record (idempotent). */
export const finalizePoojaBookingRecord = async ({
  pending,
  transactionId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  skipEmails = false,
}: {
  pending: IPendingBooking | null | undefined;
  transactionId: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  skipEmails?: boolean;
}): Promise<{ booking: IPoojaBooking; alreadyExists: boolean }> => {
  // Idempotent check FIRST: has this already been confirmed?
  // Match the Razorpay order id as well as our transactionId. The webhook and the
  // browser can derive *different* transactionIds for the same payment (the
  // webhook falls back to the order receipt when the payment notes are absent),
  // so a transactionId-only check let the second finaliser miss the first one's
  // booking and insert a duplicate for a single payment. One Razorpay order is
  // always exactly one booking, so razorpayOrderId is the stable key here.
  const existing = await PoojaBooking.findOne(
    razorpay_order_id
      ? { $or: [{ transactionId }, { razorpayOrderId: razorpay_order_id }] }
      : { transactionId },
  );
  if (existing) {
    // Already confirmed, clean up pending robustly
    if (pending && pending._id) {
      await PendingBooking.deleteOne({ _id: pending._id });
    } else {
      await PendingBooking.deleteOne({ merchantTransactionId: transactionId });
    }
    return { booking: existing, alreadyExists: true };
  }

  // If not confirmed yet, we MUST have pending details
  if (!pending || !pending.bookingDetails) {
    throw new Error("Pending booking not found or missing bookingDetails");
  }

  const details = pending.bookingDetails || {};

  const normalizedEmail = details.email ?? details.emailId ?? details.emailID ?? details.email_id;
  const normalizedFirstName = details.firstname ?? details.firstName ?? details.first_name;
  const normalizedLastName = details.lastname ?? details.lastName ?? details.last_name;
  const safeEmail = makeSafeEmail(details.mobile, normalizedEmail);

  // Bulletproof userID: try every possible source (legacy pending records vary)
  const resolvedUserID =
    details.userID ||
    details.userId ||
    details.userid ||
    (details.mobile ? String(details.mobile) : null) ||
    (pending.merchantTransactionId ? `cron_${pending.merchantTransactionId}` : `cron_${transactionId}`);

  const newBooking = new PoojaBooking({
    // Razorpay payment fields
    transactionId,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,

    // core (bulletproof fallback for legacy records)
    userID: resolvedUserID,
    mandirID: details.mandirID,
    poojaID: details.poojaID,
    totalPrice: details.totalPrice,
    package: details.package,

    /**
     * International presentment, carried through the pending record's Mixed
     * bookingDetails. `totalPrice` above is the INR value of the sale (already
     * marked up), so every existing reader of this document is unaffected.
     *
     * NOTE: the display `country` field on this model is the SHIPPING address's
     * country and is written further down — so only `countryCode` is taken from
     * the international block here, and the two never fight over one field.
     */
    currency: details.currency || "INR",
    chargedAmount: details.chargedAmount,
    fxRate: details.fxRate,
    priceMultiplier: details.priceMultiplier,
    listAmount: details.listAmount ?? details.totalPrice,
    countryCode: details.countryCode,

    isAddressSelected: details.isAddressSelected || false,

    // statuses (confirmed)
    bookingDate: details.bookingDate ? new Date(details.bookingDate) : new Date(),
    poojaStatus: "confirmed",
    prasadStatus: details.prasadStatus || "pending",

    // contact
    email: safeEmail,
    firstname: normalizedFirstName,
    lastname: normalizedLastName,
    mobile: details.mobile,

    // address
    address1: details.address1 ?? "",
    address2: details.address2 ?? "",
    city: details.city ?? "",
    state: details.state ?? "",
    country: details.country ?? "",
    pincode: details.pincode ?? 0,

    // gotra/bhakta (fallbacks for old legacy db rows)
    gotra: details.gotra && details.gotra.length > 0 ? details.gotra : ["N/A"],
    bhaktaNames:
      details.bhaktaNames && details.bhaktaNames.length > 0
        ? details.bhaktaNames
        : [normalizedFirstName || "N/A"],

    // add-ons
    dakshinaToPandit: details.dakshinaToPandit ?? null,
    donateToMandir: details.donateToMandir ?? null,
    brahmanBhoj: details.brahmanBhoj ?? null,

    // mandir/pooja info
    mandirimage: details.mandirimage,
    mandirname: details.mandirname,
    poojaname: details.poojaname,
    poojadate: details.poojadate,
    poojatime: details.poojatime,

    idolDetails: details.idolDetails,
    referralCode: details.referralCode ?? null,
    orderSource: details.orderSource ?? "WEBSITE",
    vv_utm: details.vv_utm,
  });

  try {
    await newBooking.save();
  } catch (err: any) {
    // `transactionId` is a unique index. The idempotency read above is a
    // check-then-act with no lock, and Razorpay drives the browser callback and
    // the payment.captured webhook at the same instant — so both can pass that
    // read and race to insert. The loser used to surface an E11000 as a 500,
    // which the checkout reported as "payment verification failed" for a booking
    // the winner had just confirmed. A duplicate key here therefore means
    // "someone else already finalised this", which is a success, not an error.
    if (err?.code !== 11000) throw err;

    const winner = await PoojaBooking.findOne(
      razorpay_order_id
        ? { $or: [{ transactionId }, { razorpayOrderId: razorpay_order_id }] }
        : { transactionId },
    );
    if (!winner) throw err; // duplicate on some other field — genuinely unexpected

    if (pending?._id) await PendingBooking.deleteOne({ _id: pending._id });
    return { booking: winner, alreadyExists: true };
  }

  // optional side effects (emails + partner api). Keep booking confirmation resilient.
  if (!skipEmails) {
    try {
      await sendOrderToPartnerAffiliate(newBooking);
    } catch (e: any) {
      logger.error({ err: e?.response?.data || e?.message || e }, "Partner affiliate failed");
    }

    // User confirmation email
    try {
      await poojaBookingConfirmation(
        newBooking.email,
        `${newBooking.firstname ?? ""} ${newBooking.lastname ?? ""}`.trim(),
        newBooking.totalPrice,
        (newBooking.bookingDate || new Date()).toISOString(),
        newBooking.package,
        newBooking.mandirname,
        newBooking.mandirimage,
        newBooking.bhaktaNames || [],
        newBooking.gotra || [],
        newBooking.mobile,
        newBooking.address1,
        newBooking.address2,
        newBooking.city,
        newBooking.state,
        newBooking.country,
        newBooking.pincode,
        newBooking.idolDetails,
      );
    } catch (e: any) {
      logger.error({ err: e?.response?.data || e?.message || e }, "[Razorpay] User mail failed");
    }

    // Admin email
    try {
      await normalPoojaBookingToAdmin({
        userID: newBooking.userID,
        firstName: newBooking.firstname,
        lastName: newBooking.lastname,
        email: newBooking.email,
        mobile: newBooking.mobile,
        poojaName: newBooking.poojaname,
        packageName: newBooking.package,
        mandirName: newBooking.mandirname,
        totalPrice: newBooking.totalPrice,
        bhaktaNames: newBooking.bhaktaNames || [],
        gotraNames: newBooking.gotra || [],
        address1: newBooking.address1,
        address2: newBooking.address2,
        city: newBooking.city,
        state: newBooking.state,
        country: newBooking.country,
        pincode: newBooking.pincode,
        poojaDate: newBooking.poojadate,
        poojaTime: newBooking.poojatime,
        transactionId: newBooking.transactionId,
        referralCode: newBooking.referralCode || "N/A",
        idolDetails: newBooking.idolDetails,
      });
    } catch (e: any) {
      logger.error({ err: e?.response?.data || e?.message || e }, "[Razorpay] Admin mail failed");
    }

    // WhatsApp confirmation (best-effort)
    try {
      const rawMobile = String(newBooking.mobile || "").replace(/\D/g, "");
      const last10 = rawMobile.slice(-10);
      if (last10.length === 10) {
        await sendWhatsappTemplateMessage({
          to: `91${last10}`,
          templateName: "pujabooking_with_applink",
          templateId: "2933431",
          headerImageUrl:
            "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/chadhavathankyou.png",
          parameters: [
            newBooking.poojaname || "Puja",
            newBooking.mandirname || "Mandir",
            newBooking.poojadate || new Date().toISOString(),
            newBooking.transactionId || "",
          ],
        });
      }
    } catch (e: any) {
      logger.error({ err: e?.response?.data || e?.message || e }, "[Pooja][Finalize] WhatsApp failed");
    }

    // Fast2SMS confirmation (best-effort)
    try {
      const rawMobile = String(newBooking.mobile || "").replace(/\D/g, "");
      const last10 = rawMobile.slice(-10);
      if (last10.length === 10) {
        const devoteeName = newBooking.bhaktaNames?.[0] || newBooking.firstname || "Devotee";
        const poojaName = newBooking.poojaname || "Puja";
        const poojaDate = newBooking.poojadate || new Date().toISOString();

        const smsUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${env.fast2sms.apiKey}&route=dlt&sender_id=VVORDR&message=195395&variables_values=${encodeURIComponent(devoteeName)}|${encodeURIComponent(poojaName)}|${encodeURIComponent(poojaDate)}&flash=0&numbers=${last10}&schedule_time=`;

        await axios.get(smsUrl);
      }
    } catch (e: any) {
      logger.error({ err: e?.response?.data || e?.message || e }, "[Pooja][Finalize] Fast2SMS failed");
    }
  }

  // Meta CAPI purchase (cron/webhook finalization — best-effort).
  // Guarded by !skipEmails: the browser verify path passes skipEmails and already
  // sends this from runPoojaPostConfirmSideEffects *after* responding. Awaiting it
  // here too both double-counted the purchase and spent up to 12s (metaCapi's own
  // timeout) inside the checkout's 20s request budget — a slow Meta call alone
  // could time the verify call out and show the user a failed payment.
  if (!skipEmails) {
    try {
      await sendMetaPurchaseEvent({
        orderID: newBooking.transactionId || String(newBooking._id),
        value: Number(newBooking.totalPrice || 0),
        currency: "INR",
        contentId: (newBooking.poojaname || "POOJA").trim(),
        deliveryCategory: "home_delivery",
        actionSource: "website",
        phone: newBooking.mobile ? String(newBooking.mobile) : null,
        email: newBooking.email,
        userAgent: newBooking.userAgent,
        clientIp: newBooking.clientIp,
        fbp: newBooking.fbp,
        fbc: newBooking.fbc,
        eventSourceUrl: newBooking.eventSourceUrl,
        eventIdPrefix: "pooja_purchase_",
      });
    } catch (e: any) {
      logger.error(
        { err: e?.response?.data || e?.message || e },
        `[MetaCAPI][Pooja-Finalize] Purchase failed for txn=${transactionId}`,
      );
    }
  }

  // cleanup pending robustly
  if (pending && pending._id) {
    await PendingBooking.deleteOne({ _id: pending._id });
  } else {
    await PendingBooking.deleteOne({ merchantTransactionId: transactionId });
  }

  return { booking: newBooking, alreadyExists: false };
};

export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, merchantTransactionId } =
      req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing Razorpay fields" });
    }

    if (!env.razorpay.keySecret) {
      return res
        .status(500)
        .json({ success: false, message: "Server misconfig: RAZORPAY_KEY_SECRET missing" });
    }

    // Verify signature (HMAC-SHA256 over "orderId|paymentId")
    let signatureValid = false;
    try {
      signatureValid = verifyPaymentSignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });
    } catch {
      signatureValid = false; // malformed signature (length mismatch etc.)
    }
    if (!signatureValid) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // Use merchantTransactionId as primary transactionId
    const txnId = merchantTransactionId;
    if (!txnId) {
      return res.status(400).json({ success: false, message: "Missing merchantTransactionId" });
    }

    const pending =
      (await PendingBooking.findOne({ merchantTransactionId: txnId })) ||
      (await PendingBooking.findOne({ orderId: razorpay_order_id }));

    if (!pending) {
      // No pending row means the webhook almost certainly finalised this booking
      // first and deleted it. Match on the Razorpay ids too, not just our own
      // transactionId: the webhook derives its transactionId from the payment
      // notes (falling back to the order receipt), so a booking it created can
      // be stored under a different id than the one the browser is asking about.
      // Looking only at transactionId made those 404 — reported to the user as a
      // failed payment for a booking that was already confirmed.
      const existing = await PoojaBooking.findOne({
        $or: [
          { transactionId: txnId },
          { razorpayOrderId: razorpay_order_id },
          { razorpayPaymentId: razorpay_payment_id },
        ],
      });
      if (existing) {
        return res.status(200).json({
          success: true,
          message: "Booking already exists",
          bookingId: existing._id,
          transactionId: existing.transactionId,
          alreadyExists: true,
        });
      }

      // 409, not 404: the payment is captured and a finaliser may still be
      // in-flight, so this is a "not yet" that the client should retry — not a
      // permanent "no such thing".
      return res.status(409).json({
        success: false,
        message: "Booking not confirmed yet. Please retry shortly.",
      });
    }

    const result = await finalizePoojaBookingRecord({
      pending,
      transactionId: txnId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      // keep functionality, but do it async after the response
      skipEmails: true,
    });

    if (!result.alreadyExists) {
      void (async () => {
        try {
          await runPoojaPostConfirmSideEffects(result.booking);
        } catch (e: any) {
          logger.error(`[Pooja][BG] Side effects crashed: ${e?.message || e}`);
        }
      })();
    }

    return res.status(200).json({
      success: true,
      message: result.alreadyExists ? "Booking already exists" : "Payment verified & booking confirmed",
      bookingId: result.booking?._id,
      transactionId: result.booking?.transactionId,
      alreadyExists: result.alreadyExists,
    });
  } catch (err: any) {
    if (err?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: "Validation failed", errors: err.errors });
    }
    logger.error({ err }, "verify-razorpay-payment error");
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// -------------------
//  CSV export
// -------------------

export const exportPoojaBookings = async (req: Request, res: Response) => {
  try {
    const { poojaId, type } = req.query; // type: 'pending' | 'confirmed'
    const isPending = type === "pending";
    let bookings: Array<Record<string, any>> = [];

    if (!poojaId) {
      return res.status(400).send("Pooja ID is required");
    }

    if (isPending) {
      // Pending structure varies, usually inside bookingDetails
      bookings = await PendingBooking.find({
        $or: [
          { "bookingDetails.poojaID": poojaId },
          { "bookingDetails.poojaId": poojaId },
          { poojaID: poojaId }, // rare direct field
        ],
      })
        .sort({ createdAt: -1 })
        .lean<Array<Record<string, any>>>();
    } else {
      bookings = await PoojaBooking.find({ poojaID: poojaId })
        .sort({ bookingDate: -1 })
        .lean<Array<Record<string, any>>>();
    }

    if (bookings.length === 0) {
      return res.status(404).send("No bookings found to export");
    }

    // Flatten logic for CSV
    const flattened = bookings.map((b) => {
      const uId = b.userID || b.bookingDetails?.userID || "-";
      const core = isPending ? b.bookingDetails : b;

      const poojaName = core?.poojaname || core?.poojaName || core?.poojaID || "-";
      const dateVal = isPending ? core?.poojadate : b.poojadate;
      const price = core?.totalPrice || b.totalPrice;
      const status = isPending ? b.status : b.poojaStatus;
      const prasad = core?.prasadStatus || b.prasadStatus || (core?.needPrasad ? "Yes" : "No");
      const mobile = core?.mobile || core?.whatsapp || b.mobile || "-";
      const name = core?.name || core?.userName || b.bhaktaNames?.[0] || "-";

      const addrObj = core?.address || b.address;
      let addrStr = "-";
      if (addrObj && typeof addrObj === "object") {
        addrStr = [addrObj.address1, addrObj.city, addrObj.state, addrObj.pinCode, addrObj.country]
          .filter(Boolean)
          .join(", ");
      } else if (typeof addrObj === "string") {
        addrStr = addrObj;
      }

      const gotra = Array.isArray(core?.gotra) ? core.gotra.join(",") : core?.gotra || "-";
      const family = Array.isArray(core?.bhaktaNames) ? core.bhaktaNames.join(",") : core?.bhaktaNames || "-";

      return {
        "Booking ID": b._id,
        "User ID": uId,
        Name: name,
        Mobile: mobile,
        "Pooja Name": poojaName,
        "Pooja Date": dateVal || "-",
        Time: !isPending ? b.poojatime || "-" : "-",
        "Total Price": price,
        Status: status,
        Prasad: prasad,
        Address: addrStr,
        Gotra: gotra,
        "Family Names": family,
        "Transaction ID": b.transactionId || "-",
      };
    });

    const parser = new Parser();
    const csv = parser.parse(flattened);

    res.header("Content-Type", "text/csv");
    res.attachment(`pooja_bookings_${type}_${poojaId}_${new Date().toISOString().slice(0, 10)}.csv`);
    return res.send(csv);
  } catch (err) {
    logger.error({ err }, "Export error");
    return res.status(500).send("Export failed");
  }
};
