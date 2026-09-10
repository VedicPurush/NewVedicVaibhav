import type { Request, Response } from "express";
import JyotirlingChadhavaData from "./jyotirlingChadhavaData.model";
import JyotirlingChadhavaBooking, {
  type IJyotirlingBookingMeta,
} from "./jyotirlingChadhavaBooking.model";
import { razorpay, razorpayKeyId } from "../../lib/razorpay";
import { isAcceptablePhone, markUpInr, normalizePhone, resolveCurrency } from "../../config/currency";
import {
  createOrderWithFallback,
  internationalFields,
  orderResponseFields,
  paymentCoversOrder,
} from "../../utils/internationalOrder";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { pushVedicVaibhavOrderCommission } from "../../utils/partnerAffiliateCommission";
import { sendWhatsappTemplateMessage } from "../../utils/whatsapp";
import { sendMetaPurchaseEvent } from "../../utils/metaCapi";
import { generateOrderID, getClientIp, getUserAgent, isValidRazorpaySignature } from "./chadhava.helpers";

type AnyRec = Record<string, any>;

/**
 * 1. Fetch data for frontend
 */
export const getJyotirlingChadhavaData = async (_req: Request, res: Response) => {
  try {
    const data = await JyotirlingChadhavaData.findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Active Jyotirling Chadhava configuration not found.",
      });
    }

    if (data.jyotirlingTemples && Array.isArray(data.jyotirlingTemples)) {
      const now = new Date();

      const computedTemples = data.jyotirlingTemples.map((temple) => {
        const year = now.getFullYear();
        const targetDate = new Date(year, temple.defaultMonth, temple.defaultDate, 0, 0, 0, 0);

        // If the date has passed this year, move that puja date 12 months forward
        if (now.getTime() > targetDate.getTime()) {
          targetDate.setFullYear(year + 1);
        }
        return {
          ...temple,
          nextDate: targetDate,
        };
      });

      // Sort by closest upcoming date
      computedTemples.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());

      data.jyotirlingTemples = computedTemples;
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error({ err: error }, "getJyotirlingChadhavaData error");
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Jyotirling Chadhava Data",
      error: error?.message || String(error),
    });
  }
};

const buildAddress = (addr: AnyRec | null | undefined, name: string, whatsapp: string) => {
  if (!addr) return null;

  const street = (addr.address1 || "").trim();
  const pinStr = String(addr.postal || addr.pinCode || "").trim();
  const city = (addr.city || "").trim();
  const state = (addr.state || "").trim();

  // If any essential part is missing, treat it as "no address"
  if (!street || !pinStr || !city || !state) return null;

  const pin = Number(pinStr);
  if (Number.isNaN(pin)) return null;

  return {
    name: name,
    number: whatsapp,
    country: "India",
    address1: street,
    city,
    state,
    pinCode: pin,
  };
};

const buildPrasad = (p: AnyRec | null | undefined) => {
  if (!p) return null;

  const { name, desc, price, image } = p;
  if (!name || !desc || !price || !image) return null;

  return { name, desc, price: Number(price), image };
};

/**
 * 2. Initiate Payment & Create Pending Booking
 */
export const initiateJyotirlingPayment = async (req: Request, res: Response) => {
  try {
    const {
      name,
      whatsapp,
      gotra,
      familyMembers,
      selectedTemples,
      selectedOfferings,
      totalPrice,
      familyMemberExtraCharge,
      devicePlatform,
      bookingSource,
      fbp,
      fbc,
      eventSourceUrl,
      address,
      prasadDetails,
      bookingSessionId,
      vv_utm,
      pageStep,
      referralCode,
      // international presentment — a REQUEST, never the amount itself
      currency,
      countryCode,
      country,
      dialCode,
    } = req.body as AnyRec;

    if (!name || !whatsapp || !selectedTemples?.length || !selectedOfferings?.length || !totalPrice) {
      return res.status(400).json({ message: "Missing required booking details." });
    }

    /**
     * Indian numbers keep EXACTLY the old rule; everyone else gets a length
     * sanity check against their own numbering plan. See bbSeva.controller.ts
     * for why /^[6-9]\d{9}$/ rejecting every foreign number is the actual bug.
     * No `dialCode` means India, so a client that has not been updated
     * behaves exactly as it did before.
     */
    if (!isAcceptablePhone(whatsapp, dialCode)) {
      return res.status(400).json({ message: "Valid mobile number is required." });
    }

    // India keeps the bare 10 digits every existing record assumes; everyone
    // else keeps their country code, so the confirmation actually reaches them.
    const cleanedWhatsapp = normalizePhone(whatsapp, dialCode);
    const orderID = generateOrderID("JYOTIR");
    const userID = `USER_${Date.now()}`;
    /**
     * The browser sends the INDIA LIST TOTAL. The foreign markup is applied here
     * and only here — see chadhava.controller.ts for why the server owns it.
     */
    const orderCurrency = resolveCurrency(currency);
    const listInr = Number(totalPrice);
    const amountInr = markUpInr(listInr, orderCurrency);

    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);

    // Try to find an existing booking for this session or phone number (with incomplete status)
    let booking = null;
    let sessionBooking = null;
    if (bookingSessionId) {
      sessionBooking = await JyotirlingChadhavaBooking.findOne({
        $or: [{ orderID: bookingSessionId }, { "meta.bookingSessionId": bookingSessionId }],
      });
    }

    if (sessionBooking) {
      if (sessionBooking.whatsapp !== cleanedWhatsapp) {
        // User changed phone number in this session!
        // Check if there is an existing incomplete booking for the new phone number
        const existingForNewPhone = await JyotirlingChadhavaBooking.findOne({
          whatsapp: cleanedWhatsapp,
          status: { $in: ["abandoned_cart", "pending", "payment_pending", "failed"] },
        }).sort({ updatedAt: -1 });

        if (existingForNewPhone) {
          booking = existingForNewPhone;
          // Delete the old session booking to prevent duplicate entries
          await JyotirlingChadhavaBooking.deleteOne({ _id: sessionBooking._id });
        } else {
          booking = sessionBooking;
        }
      } else {
        booking = sessionBooking;
      }
    } else {
      booking = await JyotirlingChadhavaBooking.findOne({
        whatsapp: cleanedWhatsapp,
        status: { $in: ["abandoned_cart", "pending", "payment_pending", "failed"] },
      }).sort({ updatedAt: -1 });
    }

    if (booking) {
      // Update the existing booking to payment_pending
      booking.userID = booking.userID || userID;
      booking.orderID = orderID; // official order ID for Razorpay receipt
      // Capture the referrer once (first-referral-wins) so it survives to payment confirmation.
      if (referralCode && !booking.referralCode) booking.referralCode = String(referralCode).trim();
      booking.name = name;
      booking.whatsapp = cleanedWhatsapp;
      booking.gotra = gotra;
      booking.familyMembers = familyMembers || [];
      booking.selectedTemples = selectedTemples;
      booking.selectedOfferings = selectedOfferings;
      booking.totalPrice = amountInr;
      booking.listAmount = listInr;
      booking.familyMemberExtraCharge = Number(familyMemberExtraCharge) || 0;
      booking.bookingDate = new Date();
      booking.status = "payment_pending";
      booking.statusDate = new Date();
      if (devicePlatform) booking.devicePlatform = devicePlatform;
      if (bookingSource) booking.bookingSource = bookingSource;
      booking.address = buildAddress(address, name, cleanedWhatsapp);
      booking.prasad = buildPrasad(prasadDetails) as typeof booking.prasad;
      booking.paymentAttemptCount = (booking.paymentAttemptCount || 0) + 1;
      if (!booking.meta) booking.meta = {};
      const meta = booking.meta as IJyotirlingBookingMeta;
      meta.bookingSessionId = bookingSessionId || meta.bookingSessionId;
      meta.clientIp = clientIp;
      meta.userAgent = userAgent;
      meta.fbp = fbp || meta.fbp || null;
      meta.fbc = fbc || meta.fbc || null;
      meta.actionSource = "website";
      meta.eventSourceUrl = eventSourceUrl || meta.eventSourceUrl || "";
      if (vv_utm) meta.utm = vv_utm;
      if (pageStep) meta.pageStep = pageStep;

      await booking.save();
    } else {
      // Create new booking with payment_pending status
      await JyotirlingChadhavaBooking.create({
        userID,
        orderID,
        referralCode: referralCode ? String(referralCode).trim() : undefined,
        name,
        whatsapp: cleanedWhatsapp,
        gotra,
        familyMembers: familyMembers || [],
        selectedTemples,
        selectedOfferings,
        totalPrice: amountInr,
        listAmount: listInr,
        familyMemberExtraCharge: Number(familyMemberExtraCharge) || 0,
        bookingDate: new Date(),
        status: "payment_pending",
        statusDate: new Date(),
        devicePlatform,
        bookingSource,
        paymentAttemptCount: 1,
        address: buildAddress(address, name, cleanedWhatsapp),
        prasad: buildPrasad(prasadDetails),
        meta: {
          bookingSessionId,
          clientIp,
          userAgent,
          fbp: fbp || null,
          fbc: fbc || null,
          actionSource: "website",
          eventSourceUrl: eventSourceUrl || env.metaCapi.defaultEventSourceUrl || "",
          utm: vv_utm || null,
          pageStep: pageStep || null,
        },
      });
    }

    // 2. Create Razorpay Order
    if (!env.razorpay.keyId || !env.razorpay.keySecret) {
      return res.status(500).json({ success: false, message: "Razorpay keys missing" });
    }

    const { order: razorpayOrder, pricing: fx } = await createOrderWithFallback(
      amountInr,
      orderCurrency,
      {
        receipt: orderID,
        notes: {
          name,
          whatsapp: cleanedWhatsapp,
          service: "JyotirlingChadhava",
        },
      },
      "JyotirlingChadhava",
    );

    // This flow writes its booking row BEFORE the order exists (it doubles as
    // abandoned-cart tracking), so the pricing the gateway actually ACCEPTED is
    // patched back on here — never the currency that was merely requested.
    await JyotirlingChadhavaBooking.updateOne(
      { orderID },
      { $set: internationalFields(fx, { countryCode, country }) },
    );

    return res.status(200).json({
      success: true,
      orderID,
      razorpayOrderId: razorpayOrder.id,
      // The checkout must open on the SAME currency + amount the order carries.
      amount: razorpayOrder.amount,
      ...orderResponseFields(fx),
      key: razorpayKeyId,
    });
  } catch (error: any) {
    logger.error({ err: error }, "initiateJyotirlingPayment error");
    return res.status(500).json({
      success: false,
      message: "Payment initiation failed",
      error: error.message || String(error),
    });
  }
};

export const finalizeJyotirlingChadhava = async (
  orderID: string,
  paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  },
) => {
  const booking = await JyotirlingChadhavaBooking.findOne({ orderID });
  if (!booking) {
    throw new Error("Jyotirling Chadhava Booking not found");
  }

  if (booking.status === "confirmed") {
    return { booking, alreadyExists: true };
  }

  // Double verification check with Razorpay API (for browser client-submitted verification)
  if (
    paymentData.razorpay_signature !== "webhook_verified" &&
    paymentData.razorpay_signature !== "cron_auto_verified"
  ) {
    try {
      const paymentDetails = await razorpay.payments.fetch(paymentData.razorpay_payment_id);
      if (paymentDetails.status !== "captured" && paymentDetails.status !== "authorized") {
        throw new Error(`Razorpay payment status is: ${paymentDetails.status}`);
      }

      /**
       * Razorpay reports the amount in THE ORDER'S CURRENCY, in its smallest
       * unit — cents for a USD order, NOT paise. Comparing it against
       * totalPrice*100 would make every foreign payment look underpaid and
       * strand an order the devotee has already paid for.
       */
      if (
        !paymentCoversOrder(Number(paymentDetails.amount), {
          amount: booking.totalPrice,
          currency: booking.currency,
          chargedAmount: booking.chargedAmount,
        })
      ) {
        throw new Error(
          `Amount mismatch for order ${booking.orderID}: paid ${paymentDetails.amount} ` +
            `${paymentDetails.currency}, expected the equivalent of ₹${booking.totalPrice}.`,
        );
      }
    } catch (payErr: any) {
      logger.error({ err: payErr?.message || payErr }, "Razorpay double verification failed");
      throw new Error("Razorpay double verification check failed.");
    }
  }

  // Update the booking to Confirmed
  const confirmedBooking = await JyotirlingChadhavaBooking.findOneAndUpdate(
    { orderID, status: { $in: ["pending", "payment_pending", "abandoned_cart", "failed"] } },
    {
      $set: {
        transactionID: paymentData.razorpay_payment_id,
        status: "confirmed",
        statusDate: new Date(),
        backendVerificationStatus: true,
      },
    },
    { new: true },
  );

  if (!confirmedBooking) {
    const exists = await JyotirlingChadhavaBooking.findOne({ orderID, status: "confirmed" });
    if (exists) {
      return { booking: exists, alreadyExists: true };
    }
    throw new Error("Failed to finalize booking record.");
  }

  // Partner-affiliate commission — 12 Jyotirlinga Chadhava. Best-effort, non-blocking.
  void pushVedicVaibhavOrderCommission({
    referralCode: confirmedBooking.referralCode,
    orderId: confirmedBooking.orderID,
    orderPrice: Number(confirmedBooking.totalPrice) || 0,
    department: "JYOTIRLINGA_CHADHAVA",
    productName: "JYOTIRLINGA_CHADHAVA",
    phone: confirmedBooking.whatsapp,
    orderSource: confirmedBooking.bookingSource === "app" ? "APP" : "WEBSITE",
  });

  // Send WhatsApp Nudge/Confirmation & Meta CAPI
  void (async () => {
    try {
      /**
       * India stores the BARE 10 DIGITS (normalizePhone's convention), so the
       * WhatsApp Business API needs "91" prefixed here. Everyone else's number
       * is already fully dial-code-prefixed by normalizePhone at checkout
       * time — prepending "91" to those would corrupt a foreign number, so
       * it's gated on the booking's own countryCode rather than guessed from
       * the string.
       */
      const phone =
        confirmedBooking.countryCode && confirmedBooking.countryCode !== "IN"
          ? confirmedBooking.whatsapp
          : confirmedBooking.whatsapp.startsWith("91")
            ? confirmedBooking.whatsapp
            : `91${confirmedBooking.whatsapp}`;

      const mandirName = confirmedBooking.selectedTemples.map((t) => t.nameEnglish).join(", ");
      const bookingId = orderID;
      const chadhavaDate = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      // Re-using the standard chadhava template
      await sendWhatsappTemplateMessage({
        to: phone,
        templateName: "thankyouchadhava",
        headerImageUrl:
          "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/chadhavathankyou.png",
        templateId: "3679680",
        parameters: [mandirName, chadhavaDate, bookingId, "Lord Shiva"],
      });

      await JyotirlingChadhavaBooking.updateOne(
        { _id: confirmedBooking._id },
        { $set: { whatsappNotificationSent: true, notificationSentTime: new Date() } },
      );
    } catch (e) {
      logger.error({ err: e }, "WhatsApp sending failed for Jyotirling booking");
    }

    // META CAPI PURCHASE
    try {
      const metaCtx = (confirmedBooking.meta || {}) as IJyotirlingBookingMeta;
      const totalPrice = Number(confirmedBooking.totalPrice || 0);

      await sendMetaPurchaseEvent({
        orderID: String(orderID),
        value: totalPrice,
        currency: "INR",
        contentId: "JYOTIRLING_CHADHAVA",
        deliveryCategory: "in_store",
        actionSource: "website",
        phone: String(confirmedBooking.whatsapp || ""),
        externalId: String(confirmedBooking.userID || ""),
        clientIp: metaCtx.clientIp || null,
        userAgent: metaCtx.userAgent || null,
        fbp: metaCtx.fbp || null,
        fbc: metaCtx.fbc || null,
        eventSourceUrl: metaCtx.eventSourceUrl || env.metaCapi.defaultEventSourceUrl || null,
        eventIdPrefix: "jyotirling_chadhava_purchase_",
      });
      logger.info(`[MetaCAPI][Jyotirling] Purchase sent for orderID=${orderID}`);
    } catch (e: any) {
      logger.error(
        { err: e?.response?.data || e?.message || e },
        `[MetaCAPI][Jyotirling] Purchase failed for orderID=${orderID}`,
      );
    }
  })();

  return { booking: confirmedBooking, alreadyExists: false };
};

export const verifyJyotirlingPayment = async (req: Request, res: Response) => {
  try {
    const { orderID, razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body as AnyRec;

    if (!orderID || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }

    if (!isValidRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      await JyotirlingChadhavaBooking.updateOne(
        { orderID },
        {
          $set: {
            status: "abandoned_cart",
            statusDate: new Date(),
            paymentFailureReason: "Invalid Signature",
          },
        },
      );
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    const result = await finalizeJyotirlingChadhava(orderID, {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    });

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
  } catch (error: any) {
    logger.error({ err: error }, "verifyJyotirlingPayment error");
    return res.status(500).json({
      success: false,
      message: "Verification failed",
      error: error.message || String(error),
    });
  }
};

/**
 * 4. Fetch User Bookings
 */
export const getUserJyotirlingBookings = async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    const bookings = await JyotirlingChadhavaBooking.find({
      whatsapp: { $regex: new RegExp(phone.slice(-10) + "$", "i") },
    })
      .sort({ bookingDate: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error: any) {
    logger.error({ err: error }, "getUserJyotirlingBookings error");
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message || String(error),
    });
  }
};

export const handleAbandonedCart = async (req: Request, res: Response) => {
  try {
    const {
      whatsapp,
      bookingSessionId,
      name,
      gotra,
      familyMembers,
      selectedTemples,
      selectedOfferings,
      totalPrice,
      familyMemberExtraCharge,
      devicePlatform,
      bookingSource,
      address,
      prasadDetails,
      status,
      vv_utm,
      pageStep,
      referralCode,
      dialCode,
    } = req.body as AnyRec;

    if (!whatsapp) {
      return res.status(400).json({ success: false, message: "WhatsApp number is required." });
    }

    if (!isAcceptablePhone(whatsapp, dialCode)) {
      return res.status(400).json({ success: false, message: "Invalid WhatsApp number." });
    }

    // India keeps the bare 10 digits every existing record assumes; everyone
    // else keeps their country code, so session-continuity matching (below)
    // and any later confirmation reach the same, correctly formatted number.
    const cleanedWhatsapp = normalizePhone(whatsapp, dialCode);

    let booking = null;
    let sessionBooking = null;
    if (bookingSessionId) {
      sessionBooking = await JyotirlingChadhavaBooking.findOne({
        $or: [{ orderID: bookingSessionId }, { "meta.bookingSessionId": bookingSessionId }],
      });
    }

    if (sessionBooking) {
      if (sessionBooking.whatsapp !== cleanedWhatsapp) {
        // User changed phone number in this session!
        // Check if there is an existing incomplete booking for the new phone number
        const existingForNewPhone = await JyotirlingChadhavaBooking.findOne({
          whatsapp: cleanedWhatsapp,
          status: { $in: ["abandoned_cart", "pending", "payment_pending", "failed"] },
        }).sort({ updatedAt: -1 });

        if (existingForNewPhone) {
          booking = existingForNewPhone;
          // Delete the old session booking to prevent duplicate entries
          await JyotirlingChadhavaBooking.deleteOne({ _id: sessionBooking._id });
        } else {
          booking = sessionBooking;
        }
      } else {
        booking = sessionBooking;
      }
    } else {
      booking = await JyotirlingChadhavaBooking.findOne({
        whatsapp: cleanedWhatsapp,
        status: { $in: ["abandoned_cart", "pending", "payment_pending", "failed"] },
      }).sort({ updatedAt: -1 });
    }

    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);

    if (booking) {
      if ((booking.status as string) === "confirmed") {
        return res.status(200).json({
          success: true,
          message: "Booking already confirmed. Overwrite prevented.",
          booking,
        });
      }

      // Update existing incomplete booking
      booking.whatsapp = cleanedWhatsapp;
      if (name) booking.name = name;
      if (gotra !== undefined) booking.gotra = gotra;
      if (familyMembers) booking.familyMembers = familyMembers;
      if (selectedTemples) booking.selectedTemples = selectedTemples;
      if (selectedOfferings) booking.selectedOfferings = selectedOfferings;
      if (totalPrice !== undefined) booking.totalPrice = Number(totalPrice);
      if (familyMemberExtraCharge !== undefined) {
        booking.familyMemberExtraCharge = Number(familyMemberExtraCharge);
      }
      booking.status = status || "abandoned_cart";
      booking.statusDate = new Date();
      if (devicePlatform) booking.devicePlatform = devicePlatform;
      if (bookingSource) booking.bookingSource = bookingSource;
      if (address) {
        booking.address = buildAddress(address, name || booking.name, cleanedWhatsapp);
      }
      if (prasadDetails) {
        booking.prasad = buildPrasad(prasadDetails) as typeof booking.prasad;
      }
      if (!booking.meta) booking.meta = {};
      const meta = booking.meta as IJyotirlingBookingMeta;
      meta.bookingSessionId = bookingSessionId || meta.bookingSessionId;
      meta.clientIp = clientIp;
      meta.userAgent = userAgent;
      if (vv_utm) meta.utm = vv_utm;
      if (pageStep) meta.pageStep = pageStep;

      await booking.save();

      return res.status(200).json({
        success: true,
        message: "Abandoned cart updated successfully.",
        booking,
      });
    } else {
      // Create a new abandoned_cart entry
      const orderID = bookingSessionId || generateOrderID("JYOTIR");
      const newBooking = await JyotirlingChadhavaBooking.create({
        userID: `USER_${Date.now()}`,
        orderID,
        referralCode: referralCode ? String(referralCode).trim() : undefined,
        name: name || "Guest Devotee",
        whatsapp: cleanedWhatsapp,
        gotra: gotra || "",
        familyMembers: familyMembers || [],
        selectedTemples: selectedTemples || [],
        selectedOfferings: selectedOfferings || [],
        totalPrice: Number(totalPrice || 0),
        familyMemberExtraCharge: Number(familyMemberExtraCharge || 0),
        bookingDate: new Date(),
        status: status || "abandoned_cart",
        statusDate: new Date(),
        devicePlatform,
        bookingSource,
        address: address ? buildAddress(address, name || "Guest Devotee", cleanedWhatsapp) : null,
        prasad: prasadDetails ? buildPrasad(prasadDetails) : null,
        meta: {
          bookingSessionId,
          clientIp,
          userAgent,
          utm: vv_utm || null,
          pageStep: pageStep || null,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Abandoned cart created successfully.",
        booking: newBooking,
      });
    }
  } catch (error: any) {
    logger.error({ err: error }, "handleAbandonedCart error");
    return res.status(500).json({
      success: false,
      message: "Failed to handle abandoned cart",
      error: error.message || String(error),
    });
  }
};
