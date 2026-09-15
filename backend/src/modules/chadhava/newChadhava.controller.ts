import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Parser } from "@json2csv/plainjs";
import NewChadhavaData from "./newChadhavaData.model";
import NewChadhavaBooking, {
  type IAddress,
  type IChadhavaBooking,
} from "./newChadhavaBooking.model";
import PendingChadhavaBooking from "./pendingChadhavaBooking.model";
import { User } from "../users/user.model";
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
import { sendWhatsappTemplateMessage } from "../../utils/whatsapp";
import { pushVedicVaibhavOrderCommission } from "../../utils/partnerAffiliateCommission";
import {
  generateOrderID,
  getClientIp,
  getUserAgent,
  isValidRazorpaySignature,
} from "./chadhava.helpers";

type AnyRec = Record<string, any>;

/* -------------------------------------------------------------------------- */
/*  Booking -> confirmation-email adapters                                    */
/*                                                                            */
/*  sendChadhavaConfirmationToUser/Admin were written against the LEGACY      */
/*  chadhava schema (`chadhavaDetails`/`offerings`/`paymentDetails`,          */
/*  `puja.title`). This flow's booking (NewChadhavaBooking) shapes the same   */
/*  info differently (`puja.chadhavaName`, `puja.mandir`,                    */
/*  `puja.bookedSections`), so it must be mapped onto that contract rather    */
/*  than handed to the mailer as-is.                                         */
/* -------------------------------------------------------------------------- */
const toChadhavaOfferings = (booking: IChadhavaBooking): { name: string; price: number; quantity: number }[] =>
  (booking.puja.bookedSections || []).flatMap((section) =>
    (section.items || []).map((item) => ({
      name: item.itemName,
      price: item.itemPrice,
      quantity: item.quantity,
    })),
  );

const toChadhavaUserEmailBooking = (booking: IChadhavaBooking): ChadhavaUserEmailBooking => ({
  name: booking.name,
  currency: booking.currency,
  chargedAmount: booking.chargedAmount,
  fxRate: booking.fxRate,
  priceMultiplier: booking.priceMultiplier,
  paymentDetails: { orderID: booking.orderID, totalPrice: booking.totalPrice },
  chadhavaDetails: {
    title: booking.puja.chadhavaName,
    temple: booking.puja.mandir?.nameEnglish,
    date: booking.puja.dateString || String(booking.puja.date),
  },
  offerings: toChadhavaOfferings(booking),
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
    title: booking.puja.chadhavaName,
    temple: booking.puja.mandir?.nameEnglish,
    date: booking.puja.date,
  },
  accessories: toChadhavaOfferings(booking),
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
/*  Canonical booking-details builder                                         */
/* -------------------------------------------------------------------------- */
const buildBookingDetails = async ({
  payload,
  userID,
  req,
}: {
  payload: AnyRec;
  userID: string;
  req: Request;
}): Promise<AnyRec> => {
  /* ---------- helpers ---------- */
  const toBookedItem = (src: AnyRec, type: "item" | "combo") => ({
    itemName: src.name ?? src.comboName ?? src.title ?? src.id,
    itemPrice: src.price,
    itemDesc: src.desc ?? src.comboDescription ?? "",
    itemImage: src.image ? { location: src.image } : null,
    type,
    quantity: src.quantity ?? 1,
  });

  const buildAddress = (addr: AnyRec | undefined): IAddress | undefined => {
    if (!addr) return undefined;

    const street = (addr.address1 || "").trim();
    const pinStr = (addr.postal || "").trim();
    const city = (addr.city || "").trim();
    const state = (addr.state || "").trim();

    // If any essential part is missing, treat it as "no address"
    if (!street || !pinStr || !city || !state) return undefined;

    const pin = Number(pinStr);
    if (Number.isNaN(pin)) return undefined; // invalid pincode

    return {
      name: payload.name, // required
      number: payload.whatsapp, // required
      country: "India", // required (India-only service)
      address1: street,
      city,
      state,
      pinCode: pin,
    };
  };

  const buildPrasad = (p: AnyRec | null | undefined) => {
    if (!p) return null; // none selected

    const { name, desc, price, image } = p;
    if (!name || !desc || !price || !image) return null; // incomplete -> skip

    return { name, desc, price: Number(price), image };
  };

  /* -------- fetch master doc -------- */
  const chadhavaDoc = await NewChadhavaData.findById(payload.chadhavaDetails?.chadhavaId).lean();
  if (!chadhavaDoc) throw new Error("Invalid chadhavaId");

  /* -------- unlocked gift -------- */
  const gifts = (payload.giftSelected || []).map((g: AnyRec) => ({
    offerName: g.title,
    offerStartPrice: g.minAmount,
    offerPrice: 0,
    offerDescription: g.subtitle,
    sendTo: "home",
    images: [{ location: g.image }],
  }));

  /* -------- build -------- */
  return {
    userID,
    name: payload.name,
    // India keeps the bare 10 digits every existing record assumes; everyone
    // else keeps their country code, so the confirmation actually reaches them.
    whatsapp: normalizePhone(payload.whatsapp, payload.dialCode),
    email: payload.email ?? null,
    gotra: payload.gotra,
    // Already the marked-up INR value of the sale (see initiateChadhavaPayment).
    totalPrice: payload.totalPrice,
    listAmount: payload.listAmount ?? payload.totalPrice,
    referralCode: payload.referralCode ?? null,

    puja: {
      chadhavaId: chadhavaDoc._id,
      chadhavaName: chadhavaDoc.chadhavaName,
      mandir: chadhavaDoc.selectedMandirs?.[0] || null,
      date: new Date(payload.chadhavaDetails?.date),
      description: chadhavaDoc.description ?? "",
      rating: chadhavaDoc.rating ?? null,

      bookedSections: [
        {
          sectionName: "Accessories",
          items: (payload.offerings || []).map((o: AnyRec) => toBookedItem(o, "item")),
        },
        {
          sectionName: "Combos",
          items: (payload.comboSelections || []).map((c: AnyRec) => toBookedItem(c, "combo")),
        },
      ].filter((s) => s.items.length),

      bookedExclusiveSections: [],

      offerApplied: gifts,
    },

    address: buildAddress(payload.address),

    prasad: buildPrasad(payload.prasadDetails),

    familyMembers: payload.family || [],

    bookingDate: new Date(),

    // Upsell product(s) selected during payment
    upsellProducts: Array.isArray(payload.upsellProducts) ? payload.upsellProducts : [],
    hasUpsell: Array.isArray(payload.upsellProducts) && payload.upsellProducts.length > 0,

    ...(payload.vv_utm ? { vv_utm: payload.vv_utm } : {}),

    meta: {
      clientIp: getClientIp(req),
      userAgent: getUserAgent(req),
      fbp: payload.fbp ?? null,
      fbc: payload.fbc ?? null,
      actionSource: "website",
      eventSourceUrl: payload.eventSourceUrl || env.metaCapi.defaultEventSourceUrl || "",
    },
  };
};

/* -------------------------------------------------------------------------- */
/*  Razorpay: idempotent & atomic finalize from Pending                       */
/*  (exported — reused by the cleanup cron, webhook handler and scripts)      */
/* -------------------------------------------------------------------------- */
export const finalizeChadhavaFromPendingRazorpay = async (
  orderID: string,
  rzp: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  },
) => {
  // 0) Idempotency: already finalized
  const already = await NewChadhavaBooking.findOne({ orderID });
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
    const existing = await NewChadhavaBooking.findOne({ orderID });
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
  const confirmedBooking = new NewChadhavaBooking({
    ...bookingDetails,
    orderID,
    transactionID: rzp.razorpay_payment_id,
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
    // Partner-affiliate commission. customerId (whatsapp) enables the website first-order cap;
    // APP orders get the app order cap + peer-reward routing. Never throws.
    await pushVedicVaibhavOrderCommission({
      referralCode: confirmedBooking.referralCode,
      refferalUserId: confirmedBooking.userID,
      orderId: confirmedBooking.orderID,
      orderPrice: Number(confirmedBooking.totalPrice) || 0,
      department: "CHADHAVA",
      productName: "CHADHAVA",
      phone: confirmedBooking.whatsapp,
      orderSource: metaCtx.actionSource === "app" ? "APP" : "WEBSITE",
    });

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

    // WhatsApp confirmation (best-effort)
    try {
      /**
       * India stores the BARE 10 DIGITS (normalizePhone's convention), so the
       * WhatsApp Business API needs the "91" prefixed on here. Everyone else's
       * number is already fully dial-code-prefixed by normalizePhone at
       * checkout time — prepending "91" to those would corrupt a foreign
       * number instead of being a harmless no-op, so it is gated on the
       * booking's own countryCode rather than guessed from the string.
       */
      const phone =
        confirmedBooking.countryCode && confirmedBooking.countryCode !== "IN"
          ? confirmedBooking.whatsapp
          : confirmedBooking.whatsapp?.startsWith("91")
            ? confirmedBooking.whatsapp
            : `91${confirmedBooking.whatsapp}`;

      const mandirName = confirmedBooking.puja?.mandir?.nameEnglish || "the temple";
      const chadhavaDate = confirmedBooking.puja?.date
        ? new Date(confirmedBooking.puja.date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "the scheduled date";
      const bookingId = orderID;
      const deityName = confirmedBooking.puja?.mandir?.nameEnglish || "the divine";

      // Template parameters: {{1}} Mandir, {{2}} Date, {{3}} Booking ID, {{4}} Deity
      await sendWhatsappTemplateMessage({
        to: phone,
        templateName: "thankyouchadhava",
        headerImageUrl:
          "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/chadhavathankyou.png",
        templateId: "3679680",
        parameters: [mandirName, chadhavaDate, bookingId, deityName],
      });
    } catch (e: any) {
      logger.error({ err: e?.response?.data || e?.message || e }, "[Chadhava][BG] WhatsApp failed");
    }

    // META CAPI PURCHASE
    try {
      const totalPrice = Number(confirmedBooking.totalPrice || 0);
      const actionSource = "website" as const;

      await sendMetaPurchaseEvent({
        orderID: String(orderID),
        value: totalPrice,
        currency: "INR",
        contentId: String(confirmedBooking.puja?.chadhavaName || "CHADHAVA").trim(),
        deliveryCategory: confirmedBooking.address ? "home_delivery" : "in_store",
        actionSource,
        phone: String(confirmedBooking.whatsapp || ""),
        email: confirmedBooking.email || null,
        externalId: String(confirmedBooking.userID || ""),
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
/*  Controllers                                                               */
/* -------------------------------------------------------------------------- */

export const fetchAllNewChadhavas = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "50",
      search = "",
      isActive,
      isFeatured,
      isExclusive,
      mandirId,
      sort = "-createdAt", // newest first default
    } = req.query as Record<string, string>;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (pageNum - 1) * limitNum;

    const filter: AnyRec = {};

    // optional filters
    if (typeof isActive !== "undefined") filter.isActive = isActive === "true";
    if (typeof isFeatured !== "undefined") filter.isFeatured = isFeatured === "true";
    if (typeof isExclusive !== "undefined") filter.isExclusive = isExclusive === "true";

    // filter by mandirId (selectedMandirs.mandirId)
    if (mandirId && Types.ObjectId.isValid(mandirId)) {
      filter["selectedMandirs.mandirId"] = new Types.ObjectId(mandirId);
    }

    // basic text search on chadhavaName / description
    if (search && String(search).trim()) {
      const q = String(search).trim();
      filter.$or = [
        { chadhavaName: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      NewChadhavaData.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
      NewChadhavaData.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Chadhavas fetched successfully.",
      total,
      page: pageNum,
      limit: limitNum,
      items,
    });
  } catch (error: any) {
    logger.error({ err: error }, "fetchAllNewChadhavas error");
    return res.status(500).json({
      success: false,
      message: "Failed to fetch chadhavas.",
      error: error?.message || String(error),
    });
  }
};

export const getNewChadhavaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id as string)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chadhava id.",
      });
    }

    const doc = await NewChadhavaData.findById(id).lean();

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Chadhava not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Chadhava fetched successfully.",
      data: doc,
    });
  } catch (error: any) {
    logger.error({ err: error }, "getNewChadhavaById error");
    return res.status(500).json({
      success: false,
      message: "Failed to fetch chadhava.",
      error: error?.message || String(error),
    });
  }
};

export const initiateChadhavaPayment = async (req: Request, res: Response) => {
  try {
    /* ---------------------------------------------------------
       1.  NORMALISE PAYLOAD – works for old & new front-ends
    --------------------------------------------------------- */
    const body = req.body as AnyRec;
    const payload = {
      name: body.name ?? body.fullName,
      whatsapp: body.whatsapp ?? body.phone,
      email: body.email ?? null,
      family: body.family ?? undefined,
      gotra: body.gotra ?? "Kashyap",
      chadhavaDetails: body.chadhavaDetails ?? body.puja,
      offerings: body.offerings ?? body.accessories ?? [],
      comboSelections: body.comboSelections ?? [],
      prasadDetails: body.prasadDetails ?? body.prasad ?? null,
      totalPrice: Number(body.totalPrice ?? body.amount ?? 0),
      address: body.address ?? undefined,
      referralCode: body.referralCode ?? null,
      giftSelected: body.giftSelected ?? null,
      vv_utm: body.vv_utm ?? undefined,
      /* optional marketing/meta */
      fbp: body.fbp,
      fbc: body.fbc,
      eventSourceUrl: body.eventSourceUrl,
      advertiserTrackingEnabled: body.advertiserTrackingEnabled,
      applicationTrackingEnabled: body.applicationTrackingEnabled,
      // Upsell
      upsellProducts: body.upsellProducts ?? [],
      hasUpsell: body.hasUpsell ?? false,
      /* international presentment — a REQUEST, never the amount itself */
      currency: body.currency,
      countryCode: body.countryCode,
      country: body.country,
      dialCode: body.dialCode,
    } as const;

    const { name, whatsapp, chadhavaDetails, totalPrice } = payload;
    if (!name || !whatsapp || !chadhavaDetails || !totalPrice) {
      return res.status(400).json({ message: "Missing required booking details." });
    }

    /**
     * Indian numbers keep EXACTLY the old rule; everyone else gets a length
     * sanity check against their own numbering plan. See bbSeva.controller.ts
     * for why /^[6-9]\d{9}$/ rejecting every foreign number is the actual bug.
     * No `dialCode` means India, so a client that has not been updated
     * behaves exactly as it did before.
     */
    if (!isAcceptablePhone(whatsapp, payload.dialCode)) {
      return res.status(400).json({ message: "Valid mobile number is required." });
    }

    /* ---------------------------------------------------------
       1.5. UPDATE USER ADDRESS (Best Effort)
    --------------------------------------------------------- */
    if (payload.address && whatsapp) {
      try {
        const digits = String(whatsapp).replace(/\D/g, "");
        if (digits.length >= 10) {
          const normalized = `+91 ${digits.slice(-10)}`;
          await User.updateOne(
            { phone: normalized },
            {
              $set: {
                address1: payload.address.address1,
                address2: payload.address.address2,
                city: payload.address.city,
                state: payload.address.state,
                country: payload.address.country,
                pincode: payload.address.postal || payload.address.pincode,
              },
            },
          );
        }
      } catch (uErr) {
        logger.error({ err: uErr }, "Error updating user address");
      }
    }

    /* ---------------------------------------------------------
       2.  GENERATE IDS & BUILD BOOKING OBJECT
    --------------------------------------------------------- */
    const orderID = generateOrderID();
    const userID = `USER_${Date.now()}`;

    /**
     * The browser sends the INDIA LIST TOTAL, unchanged from before. The foreign
     * markup is applied here and only here — see chadhava.controller.ts for why
     * the server owns the multiplier in every flow in this codebase.
     */
    const orderCurrency = resolveCurrency(payload.currency);
    const listInr = Number(payload.totalPrice);
    const amountInr = markUpInr(listInr, orderCurrency);

    /* ----------- validate master doc exists ----------- */
    const chadhavaDoc = await NewChadhavaData.findById(payload.chadhavaDetails?.chadhavaId).lean();
    if (!chadhavaDoc) {
      return res.status(400).json({ message: "Invalid chadhavaId" });
    }

    const bookingDetails = await buildBookingDetails({
      // totalPrice becomes the INR VALUE OF THE SALE so every downstream reader
      // (reporting, Meta CAPI, emails, admin CSVs) keeps working in rupees.
      payload: { ...payload, totalPrice: amountInr, listAmount: listInr },
      userID,
      req,
    });

    /* ---------------------------------------------------------
       3.  CREATE RAZORPAY ORDER
    --------------------------------------------------------- */
    if (!env.razorpay.keyId || !env.razorpay.keySecret) {
      return res.status(500).json({
        success: false,
        message: "Server misconfig: Razorpay keys missing",
      });
    }

    const { order: razorpayOrder, pricing: fx } = await createOrderWithFallback(
      amountInr,
      orderCurrency,
      {
        receipt: orderID,
        notes: {
          userID,
          name,
          whatsapp,
          temple: payload.chadhavaDetails?.temple ?? "",
        },
      },
      "NewChadhava",
    );

    // Persisted only AFTER the order exists, and from the pricing the gateway
    // actually accepted — never from what was requested. A currency the account
    // is not enabled for falls back to INR, and the verification path has to
    // compare against the currency the payment really happened in.
    await PendingChadhavaBooking.create({
      orderID,
      bookingDetails: {
        ...bookingDetails,
        ...internationalFields(fx, payload),
      },
      status: "pending",
      statusDate: new Date(),
    });

    return res.status(200).json({
      success: true,
      orderID,
      razorpayOrderId: razorpayOrder.id,
      // The checkout must open on the SAME currency + amount the order carries.
      amount: razorpayOrder.amount,
      ...orderResponseFields(fx),
      key: razorpayKeyId,
    });
  } catch (err: any) {
    logger.error({ err }, "initiateChadhavaPayment error");
    return res.status(500).json({
      success: false,
      message: "Payment initiation failed",
      error: err.message || String(err),
    });
  }
};

export const verifyChadhavaPaymentRazorpay = async (req: Request, res: Response) => {
  try {
    const {
      orderID,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      bookingDetails, // optional (new flow)
    } = req.body as AnyRec;

    /* ---------------------------------------------------------
       1.  Basic validations
    --------------------------------------------------------- */
    if (!orderID) {
      return res.status(400).json({ success: false, message: "Missing orderID" });
    }

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }

    if (!env.razorpay.keySecret) {
      return res
        .status(500)
        .json({ success: false, message: "Server misconfig: RAZORPAY_KEY_SECRET missing" });
    }

    /* ---------------------------------------------------------
       2.  Verify Razorpay signature
    --------------------------------------------------------- */
    if (!isValidRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    /* ---------------------------------------------------------
       3.  If the front-end sent bookingDetails again, normalise
           before merging so we don't clobber the canonical object
           created during /initiate-payment.
    --------------------------------------------------------- */
    if (bookingDetails) {
      const canonical = await buildBookingDetails({
        payload: bookingDetails, // may already contain offerings, etc.
        userID: bookingDetails.userID ?? `USER_${Date.now()}`,
        req,
      });

      await PendingChadhavaBooking.updateOne(
        { orderID },
        { $set: { bookingDetails: canonical } },
        { upsert: false },
      );
    }

    /* ---------------------------------------------------------
       4.  Finalise booking (idempotent)
    --------------------------------------------------------- */
    const result = await finalizeChadhavaFromPendingRazorpay(orderID, {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    });

    if (result.inProgress) {
      // Another request / worker is finalising right now — tell client to retry shortly
      return res.status(202).json({
        success: false,
        message: "Finalisation in progress. Please retry in 1-2 seconds.",
        orderID,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.alreadyExists
        ? "Booking already confirmed"
        : "Payment verified & booking confirmed",
      bookingId: result.booking?._id,
      transactionID: result.booking?.transactionID,
      alreadyExists: result.alreadyExists,
      orderID,
    });
  } catch (err: any) {
    logger.error({ err }, "verifyChadhavaPaymentRazorpay error");
    return res.status(500).json({
      success: false,
      message: "Payment verified but booking finalisation failed (server error).",
      error: err?.message || String(err),
    });
  }
};

export const getUserBookings = async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    const bookings = await NewChadhavaBooking.find({ whatsapp: phone }).sort({ bookingDate: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (err: any) {
    logger.error({ err }, "getUserBookings error");
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user bookings",
      error: err.message || String(err),
    });
  }
};

export const getAllConfirmedBookings = async (req: Request, res: Response) => {
  try {
    const { pujaTitle } = req.params as { pujaTitle?: string };
    const query: AnyRec = { status: "confirmed" };

    if (pujaTitle && pujaTitle !== "undefined") {
      // 'chadhavaName' is the title in the new model
      query["puja.chadhavaName"] = { $regex: decodeURIComponent(pujaTitle), $options: "i" };
    }

    const bookings = await NewChadhavaBooking.find(query).sort({ bookingDate: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (err: any) {
    logger.error({ err }, "getAllConfirmedBookings error");
    return res.status(500).json({
      success: false,
      message: "Failed to fetch confirmed bookings",
      error: err.message || String(err),
    });
  }
};

export const getAllPendingBookings = async (req: Request, res: Response) => {
  try {
    const { pujaTitle } = req.params as { pujaTitle?: string };
    const query: AnyRec = {};

    if (pujaTitle && pujaTitle !== "undefined") {
      const regex = { $regex: decodeURIComponent(pujaTitle), $options: "i" };
      query.$or = [
        { "bookingDetails.chadhavaDetails.title": regex },
        { "bookingDetails.puja.title": regex },
        { "bookingDetails.puja.chadhavaName": regex },
      ];
    }

    const bookings = await PendingChadhavaBooking.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (err: any) {
    logger.error({ err }, "getAllPendingBookings error");
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending bookings",
      error: err.message || String(err),
    });
  }
};

export const exportChadhavaBookings = async (req: Request, res: Response) => {
  try {
    const { type, pujaTitle } = req.query; // type: 'pending' | 'confirmed'
    const isPending = type === "pending";
    let bookings: AnyRec[] = [];

    if (isPending) {
      const query: AnyRec = {};
      if (pujaTitle && pujaTitle !== "undefined") {
        const regex = { $regex: decodeURIComponent(pujaTitle as string), $options: "i" };
        query.$or = [
          { "bookingDetails.chadhavaDetails.title": regex },
          { "bookingDetails.puja.title": regex },
          { "bookingDetails.puja.chadhavaName": regex },
        ];
      }
      bookings = await PendingChadhavaBooking.find(query).sort({ createdAt: -1 });
    } else {
      const query: AnyRec = { status: "confirmed" };
      if (pujaTitle && pujaTitle !== "undefined") {
        query["puja.chadhavaName"] = {
          $regex: decodeURIComponent(pujaTitle as string),
          $options: "i",
        };
      }
      bookings = await NewChadhavaBooking.find(query).sort({ bookingDate: -1 });
    }

    if (bookings.length === 0) {
      return res.status(404).send("No bookings found to export");
    }

    // Flatten logic for CSV
    const flattened = bookings.map((b) => {
      const data = isPending ? b.bookingDetails : b;
      const temple = isPending
        ? data?.chadhavaDetails?.temple || data?.puja?.mandir?.nameEnglish || "-"
        : data?.puja?.mandir?.nameEnglish || "-";

      const dateStr = isPending
        ? data?.chadhavaDetails?.date || data?.puja?.date || "-"
        : data?.puja?.date || "-";

      let accStr = "-";
      if (Array.isArray(data?.accessories) && data.accessories.length > 0) {
        accStr = data.accessories
          .map((a: AnyRec) => `${a.name || a.itemName} (x${a.quantity || 1})`)
          .join(", ");
      }

      let giftStr = "-";
      if (Array.isArray(data?.gifts) && data.gifts.length > 0) {
        giftStr = data.gifts.map((g: AnyRec) => g.title || g.name).join(", ");
      }

      const addr = data?.address || {};
      const addressFull = [addr?.address1, addr?.city, addr?.state, addr?.pinCode, addr?.country]
        .filter(Boolean)
        .join(", ");

      return {
        "Booking ID": b._id,
        "Booking Date": new Date(isPending ? b.createdAt : b.bookingDate).toLocaleString(),
        "Order ID": b.orderID,
        Name: data?.name || "-",
        Mobile: data?.whatsapp || data?.mobile || "-",
        Temple: temple,
        "Puja Date": dateStr,
        "Total Price": data?.totalPrice,
        Status: b.status || (isPending ? "Pending" : "Confirmed"),
        Gotra: data?.gotra || "-",
        "Family Members": data?.familyMembers?.join(", ") || "-",
        Address: addressFull,
        Prasad: !!data?.prasad || !!data?.needPrasad ? "Yes" : "No",
        Accessories: accStr,
        Gifts: giftStr,
      };
    });

    const parser = new Parser();
    const csv = parser.parse(flattened);

    res.header("Content-Type", "text/csv");
    res.attachment(`chadhava_bookings_${type}_${new Date().toISOString().slice(0, 10)}.csv`);
    return res.send(csv);
  } catch (err: any) {
    logger.error({ err }, "Export error");
    return res.status(500).send("Export failed");
  }
};
