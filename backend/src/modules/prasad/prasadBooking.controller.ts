import type { Request, Response } from "express";
import axios from "axios";
import { Types } from "mongoose";
import PrasadBooking from "./prasadBooking.model";
import type { IPrasadBooking, IPrasadDelivery, ISangamPrasadDelivery } from "./prasadBooking.model";
import PendingPrasadBooking from "./pendingPrasadBooking.model";
import Pandit from "../mandir/pandit.model";
import {
  checkServiceability,
  createShiprocketOrder,
  type ServiceabilityParams,
} from "../delivery/serviceability.controller";
import { razorpay, razorpayKeyId, verifyPaymentSignature } from "../../lib/razorpay";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { ApiError } from "../../lib/apiError";
import { prasadBookingConfirmation } from "../../utils/mail/smtp";
import { prasadBookingConfirmationToAdmin } from "../../utils/mail/smtpUs";
import { sendMetaPurchaseEvent } from "../../utils/metaCapi";
import {
  tryConsumeAppReferralOrder,
  resolveAppReferralRoute,
  recordAppReferralReward,
  externalApiHeaders,
} from "../../utils/partnerAffiliateReferralCap";

/**
 * Partner-affiliate push for a confirmed prasad booking. Best-effort — never throws
 * past its own boundary for the commission API call.
 */
const sendPrasadOrderToPartnerAffiliate = async (booking: IPrasadBooking): Promise<void> => {
  // Only proceed if a referral code exists and is not empty.
  if (!booking.referralCode) {
    return;
  }

  // App orders only earn commission for a referred customer's first N orders (admin-editable,
  // default 15) — website link referrals have no cap. See utils/partnerAffiliateReferralCap.ts.
  if (booking.orderSource === "APP") {
    const withinCap = await tryConsumeAppReferralOrder(booking.address?.number);
    if (!withinCap) {
      logger.info(
        `[Partner Affiliate] Skipping commission for prasad order ${booking.orderID}: app referral order cap reached for this customer.`,
      );
      return;
    }
    // Peer (plain-customer) referral -> app store-credit reward ledger; partner/affiliate code
    // -> fall through to the commission push below. Exactly one path per order, never both.
    const route = await resolveAppReferralRoute(booking.referralCode);
    if (route === "PEER") {
      await recordAppReferralReward({
        referrerCode: String(booking.referralCode),
        orderId: booking.orderID,
        orderAmount: booking.totalPrice,
        department: "ONLINE_PRASAD",
        referredPhone: booking.address?.number,
      });
      return;
    }
  }

  try {
    const apiUrl = env.partnerAffiliate.orderApi;
    if (!apiUrl) {
      logger.warn("PARTNER_AFFILIATE_ORDER_API environment variable is not set. Skipping API call.");
      return;
    }

    const productsArray = [
      ...booking.prasadDeliveries.map((p) => ({
        productName: p.packageName,
        productPrice: p.prasadPrice,
        quantity: p.prasadCount,
        commissionPercent: [0, 0, 0],
      })),
      ...booking.sangamPrasadDelivery.map((s) => ({
        productName: s.description || "Sangam Prasad",
        productPrice: s.discountedPrice || s.originalPrice,
        quantity: s.quantity,
        commissionPercent: [0, 0, 0],
      })),
    ];

    const payload = {
      userId: booking.referralCode,
      refferal_user_id: booking.userID,
      orderId: booking.orderID,
      orderPrice: booking.totalPrice,
      time: booking.bookingDate.toISOString(),
      department: "ONLINE_PRASAD",
      products: productsArray,
      orderSource: booking.orderSource || "WEBSITE", // audit-only
      // Customer identity (phone) for the WEBSITE "first order only" referral cap on the
      // partner-affiliate side (app orders are exempt — they use the App Referral Order Cap).
      customerId: booking.address?.number,
    };

    await axios.post(apiUrl, payload, { headers: externalApiHeaders() });
  } catch (error) {
    logger.error(
      {
        err: axios.isAxiosError(error) ? error.response?.data || error.message : error,
      },
      `Failed to send Prasad order to Partner Affiliate API for order ${booking.orderID}`,
    );
    // Log the error but do not throw, so the main booking process is not affected.
  }
};

/**
 * Creates Shiprocket orders for a confirmed booking's prasad items, grouped by
 * pandit pickup pincode. Mutates the booking's delivery subdocuments in place and
 * returns the flattened courier list (identical logic in both verify flows).
 */
const createPrasadShiprocketOrders = async (
  newBooking: InstanceType<typeof PrasadBooking>,
): Promise<unknown[]> => {
  const prasadByPin: { [pin: number]: IPrasadDelivery[] } = {};
  for (const d of newBooking.prasadDeliveries) {
    const panditDoc = await Pandit.findOne({ mandirId: d.mandirID });
    if (!panditDoc) {
      logger.warn(`No pandit found for mandirID ${d.mandirID}`);
      continue;
    }
    const pickupPin = Number(panditDoc.pincode || 0);
    if (!prasadByPin[pickupPin]) prasadByPin[pickupPin] = [];
    prasadByPin[pickupPin].push(d);
  }

  const allCouriersArray: unknown[] = [];
  for (const pickupPin of Object.keys(prasadByPin).map(Number)) {
    const groupPrasad = prasadByPin[pickupPin];
    if (!groupPrasad || groupPrasad.length === 0) continue;

    try {
      const serviceabilityParams: ServiceabilityParams = {
        pickup_postcode: pickupPin,
        delivery_postcode: newBooking.address.pinCode,
        cod: false,
        weight: 1,
        declared_value: 100,
        is_return: false,
        only_local: false,
        qc_check: false,
      };
      const serviceResp = await checkServiceability(serviceabilityParams);
      if (!serviceResp.serviceAvailable) {
        logger.warn(`No service available for pincode ${pickupPin}. Skipping creation.`);
        continue;
      }

      const pseudoBooking = {
        ...newBooking.toObject(),
        prasadDeliveries: groupPrasad,
        sangamPrasadDelivery: [],
        panditPincode: pickupPin,
      };

      const srResp = await createShiprocketOrder(pseudoBooking, {
        serviceAvailable: true,
        cheapestCourier: serviceResp.cheapestCourier,
        allCouriers: serviceResp.allCouriers,
      });

      for (const d of groupPrasad) {
        d.shiprocketOrderId = srResp.order_id;
        d.shiprocketShipmentId = srResp.shipment_id;
        d.pickupPincode = pickupPin;
        d.allCouriers = serviceResp.allCouriers || [];
      }
      allCouriersArray.push(...(serviceResp.allCouriers || []));
    } catch (err) {
      logger.error(
        `Error creating SR order for prasadPin ${pickupPin}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return allCouriersArray;
};

/** Confirmation emails to user + admin, with the exact legacy payloads. */
const sendPrasadConfirmationEmails = async (
  newBooking: InstanceType<typeof PrasadBooking>,
  referralCode: string | null | undefined,
): Promise<void> => {
  await prasadBookingConfirmation(
    newBooking.address.email || "",
    newBooking.userID,
    newBooking.totalPrice,
    newBooking.statusDate.toISOString(),
    newBooking.prasadDeliveries,
    newBooking.sangamPrasadDelivery,
    newBooking.address.number,
    newBooking.address.address,
    newBooking.address.landmark || "",
    newBooking.address.city,
    newBooking.address.state,
    newBooking.address.country,
    newBooking.address.pinCode,
    newBooking.deliveryCharge,
  );
  await prasadBookingConfirmationToAdmin({
    userID: newBooking.userID,
    email: newBooking.address.email || "",
    mobile: newBooking.address.number,
    prasadDeliveries: newBooking.prasadDeliveries,
    sangamPrasadDelivery: newBooking.sangamPrasadDelivery,
    totalPrice: newBooking.totalPrice,
    statusDate: newBooking.statusDate.toISOString(),
    address: {
      email: newBooking.address.email || "",
      number: newBooking.address.number,
      address1: newBooking.address.address,
      address2: newBooking.address.landmark || "",
      city: newBooking.address.city,
      state: newBooking.address.state,
      country: newBooking.address.country,
      pinCode: newBooking.address.pinCode,
      deliveryCharge: newBooking.deliveryCharge,
      landmark: newBooking.address.landmark || "",
    },
    bookingDate: newBooking.bookingDate.toISOString(),
    deliveryCharges: newBooking.deliveryCharge || null,
    referralCode: referralCode || "N/A",
  });
};


/** GET /fetch-booked-prasad-by-user-id/:userID */
export const fetchPrasadByUserId = async (
  req: Request<{ userID: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { userID } = req.params;
    const prasadBookings = await PrasadBooking.find({ userID }).populate({
      path: "prasadDeliveries.mandirID",
      select: "nameEnglish location",
    });
    if (!prasadBookings || prasadBookings.length === 0) {
      throw ApiError.notFound("No prasad bookings found for this user.");
    }
    res.status(200).json({ prasadBookings });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error }, "Error fetching prasad bookings");
    throw new ApiError(500, "Server error while fetching prasad bookings.");
  }
};

/** GET /fetch-booked-prasad-by-id/:id */
export const fetchPrasadById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const prasadBooking = await PrasadBooking.findById(id).populate("prasadDeliveries.mandirID");
    if (!prasadBooking) {
      throw ApiError.notFound("No prasad booking found with the provided ID.");
    }
    res.status(200).json({ prasadBooking });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error }, "Error fetching prasad booking");
    throw new ApiError(500, "Server error while fetching prasad booking.");
  }
};

/** GET /fetch-booked-prasad-on-mandirVendor-end/:mandirID */
export const fetchPrasadByMandirId = async (
  req: Request<{ mandirID: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { mandirID } = req.params;
    const prasadBookings = await PrasadBooking.find({ "prasadDeliveries.mandirID": mandirID });
    if (!prasadBookings || prasadBookings.length === 0) {
      throw ApiError.notFound("No prasad bookings found for this mandir.");
    }
    const filtered = prasadBookings.map((booking) => {
      const matchedPrasad = booking.prasadDeliveries.filter(
        (delivery) => delivery.mandirID.toString() === mandirID,
      );
      return {
        orderID: booking.orderID,
        address: booking.address,
        prasadDeliveries: matchedPrasad,
        sangamPrasadDelivery: booking.sangamPrasadDelivery,
        statusDate: booking.statusDate,
        bookingDate: booking.bookingDate,
        createdAt: booking.bookingDate,
        updatedAt: booking.statusDate,
        allCouriers: booking.allCouriers,
      };
    });
    res.status(200).json({ prasadBookings: filtered });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error }, "Error fetching prasad bookings by mandirID");
    throw new ApiError(500, "Server error while fetching prasad bookings.");
  }
};

// ── Razorpay flow (initiate + verify) ─────────────────────────────────────────

interface InitiatePrasadPaymentBody {
  packageName?: string;
  amount?: number | string;
  userId?: string | number;
  bhaktaNames?: unknown[];
  poojaDate?: string | null;
  referralCode?: string | null;
  panditPincode?: number | string;
  address?: {
    name?: string;
    address?: string;
    landmark?: string;
    city?: string;
    state?: string;
    country?: string;
    email?: string;
    number?: string | number;
    pinCode?: string | number;
  };
  mandirID?: string;
  mandirName?: string;
  mandirImage?: string;
  prasadPrice?: number | string;
  prasadCount?: number | string;
  deliveryCharge?: number | string;
  // The app client sends orderSource: 'APP' so the app-referral-order-cap applies;
  // defaults to WEBSITE.
  orderSource?: string;
}

/** POST /prasad/initiate-payment — Razorpay order + pending booking. */
export const initiatePrasadPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      packageName,
      amount,
      userId,
      bhaktaNames,
      poojaDate,
      referralCode,
      panditPincode,
      address,
      mandirID,
      mandirName,
      mandirImage,
      prasadPrice,
      prasadCount,
      deliveryCharge,
      orderSource,
    } = req.body as InitiatePrasadPaymentBody;

    if (!amount || !userId || !address || !panditPincode) {
      throw ApiError.badRequest("Missing required fields");
    }

    if (!mandirID) {
      throw ApiError.badRequest("Missing mandirID for prasad order");
    }

    // Create Razorpay order (amount in paise).
    const order = await razorpay.orders.create({
      amount: Number(amount) * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    // Build the prasad delivery so verify-payment can fully finalize the order.
    const prasadDelivery: IPrasadDelivery = {
      mandirID: new Types.ObjectId(String(mandirID)),
      mandirName: mandirName || "Generic Mandir",
      packageName: packageName || "Special Mahaprasad",
      prasadPrice: Number(prasadPrice) || 0,
      prasadCount: Number(prasadCount) || 1,
      prasadStatus: "pending",
      statusDate: new Date(),
      mandirImage: mandirImage || "",
      allCouriers: [],
    };

    // Save the pending booking. city/state/country are required schema paths and
    // Mongoose rejects empty strings, so fall back to safe defaults (direct Buy Now).
    const newBooking = new PendingPrasadBooking({
      orderID: order.id,
      bookingDetails: {
        userID: String(userId),
        address: {
          name: address.name,
          address: address.address,
          landmark: address.landmark || "",
          city: address.city || "NA",
          state: address.state || "NA",
          country: address.country || "India",
          email: address.email || "",
          number: String(address.number || ""),
          pinCode: Number(address.pinCode) || 0,
        },
        prasadDeliveries: [prasadDelivery],
        sangamPrasadDelivery: [],
        deliveryCharge: Number(deliveryCharge) || 0,
        referralCode: referralCode || null,
        orderSource: orderSource === "APP" ? "APP" : "WEBSITE",
        // Stash extra client fields that aren't first-class schema paths.
        meta: {
          packageName: packageName || null,
          mandirID: String(mandirID),
          amount: Number(amount) || 0,
          bhaktaNames: bhaktaNames || [],
          poojaDate: poojaDate || null,
        },
      },
      status: "pending",
      panditPincode: Number(panditPincode) || 0,
      razorpayOrderId: order.id,
    });

    await newBooking.save();

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: razorpayKeyId,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error }, "Error in /prasad/initiate-payment");
    throw new ApiError(500, error instanceof Error ? error.message : "Server error");
  }
};

interface VerifyPaymentBody {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

/** POST /prasad/verify-payment — verify Razorpay signature + finalize the booking. */
export const verifyPrasadPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body as VerifyPaymentBody;

    // 1) Verify Razorpay signature.
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
    if (!signatureValid) {
      throw ApiError.badRequest("Invalid signature");
    }

    const orderID = String(razorpay_order_id);

    // 2) Idempotency — if already finalized, return success.
    const existingBooking = await PrasadBooking.findOne({ orderID });
    if (existingBooking) {
      res.status(200).json({ success: true, message: "Booking already confirmed." });
      return;
    }

    // 3) Load pending booking (orderID === razorpay order id).
    const pendingBooking = await PendingPrasadBooking.findOne({
      $or: [{ razorpayOrderId: orderID }, { orderID }],
    });
    if (!pendingBooking || !pendingBooking.bookingDetails) {
      throw ApiError.badRequest("Booking details missing for this order.");
    }

    const bookingDetails = pendingBooking.bookingDetails;
    const prasadDeliveries = bookingDetails.prasadDeliveries || [];
    const sangamPrasadDelivery = bookingDetails.sangamPrasadDelivery || [];

    // 4) Mark items confirmed.
    const confirmedPrasad: IPrasadDelivery[] = prasadDeliveries.map((d) => ({
      ...d,
      prasadStatus: "confirmed",
      statusDate: new Date(),
      prasadPrice: Number(d.prasadPrice),
      prasadCount: Number(d.prasadCount),
    }));
    const confirmedSangam: ISangamPrasadDelivery[] = sangamPrasadDelivery.map((s) => ({
      ...s,
      originalPrice: Number(s.originalPrice),
      discountedPrice: Number(s.discountedPrice),
      quantity: Number(s.quantity),
    }));

    // 5) Recompute totals (items + delivery).
    const prasadTotal = confirmedPrasad.reduce((sum, d) => sum + d.prasadPrice * d.prasadCount, 0);
    const sangamTotal = confirmedSangam.reduce(
      (sum, s) => sum + (s.discountedPrice || 0) * (s.quantity || 0),
      0,
    );
    const finalDeliveryCharge = Number(bookingDetails.deliveryCharge || 0);
    const totalPriceCalculated = prasadTotal + sangamTotal + finalDeliveryCharge;

    // 6) Create the confirmed PrasadBooking.
    const newBooking = new PrasadBooking({
      userID: bookingDetails.userID,
      transactionID: razorpay_payment_id,
      orderID,
      address: bookingDetails.address,
      totalPrice: totalPriceCalculated,
      deliveryCharge: finalDeliveryCharge,
      prasadDeliveries: confirmedPrasad,
      sangamPrasadDelivery: confirmedSangam,
      bookingDate: new Date(),
      statusDate: new Date(),
      panditPincode: 0,
      referralCode: bookingDetails.referralCode || null,
      orderSource: bookingDetails.orderSource || "WEBSITE",
    });
    try {
      await newBooking.save();
    } catch (saveErr: any) {
      // `orderID`/`transactionID` are unique indexes and the idempotency read at
      // step 2 is a lock-free check-then-act, so the browser's verify call and the
      // Razorpay webhook can both pass it and race to insert. A duplicate key here
      // means the other one already confirmed this booking — a success, not the
      // 500 that used to reach the user as "payment verification failed".
      if (saveErr?.code !== 11000) throw saveErr;
      const winner = await PrasadBooking.findOne({ orderID });
      if (!winner) throw saveErr;
      res.status(200).json({ success: true, message: "Booking already confirmed." });
      return;
    }

    // 7) Remove pending booking — the confirmed one above is now the source of truth.
    await PendingPrasadBooking.deleteOne({ _id: pendingBooking._id });

    // 8) Answer the browser NOW. Everything past this point is fulfilment and
    //    analytics: it must not hold the checkout open, and — more importantly —
    //    must not be able to fail it. These steps run *after* the booking row is
    //    saved, so an unguarded throw in Shiprocket or the affiliate push used to
    //    return a 500 for a booking that was already confirmed, which the checkout
    //    showed as "payment verification failed". Shiprocket alone is N sequential
    //    HTTP calls and could exhaust the client's 20s budget on its own.
    res.json({ success: true, message: "Payment verified and booking confirmed." });

    // Snapshot request-scoped values before the handler returns.
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;
    const userAgent = (req.headers["user-agent"] as string) || null;
    const fbp = (req.headers["x-fbp"] as string) || null;
    const fbc = (req.headers["x-fbc"] as string) || null;
    const eventSourceUrl =
      (req.headers["x-event-source-url"] as string) || env.metaCapi.defaultEventSourceUrl || null;

    void (async () => {
      // Partner affiliate (no-op if no referral code).
      try {
        await sendPrasadOrderToPartnerAffiliate(newBooking);
      } catch (e) {
        logger.error({ err: e }, "[Prasad][BG] Partner affiliate failed");
      }

      // Create Shiprocket orders, grouped by pandit pickup pincode, and persist them.
      try {
        const allCouriersArray = await createPrasadShiprocketOrders(newBooking);
        newBooking.prasadDeliveries = [...newBooking.prasadDeliveries];
        newBooking.allCouriers = [...(newBooking.allCouriers || []), ...allCouriersArray];
        await newBooking.save();
      } catch (e) {
        logger.error({ err: e }, "[Prasad][BG] Shiprocket order creation failed");
      }

      // Confirmation emails (best-effort).
      try {
        await sendPrasadConfirmationEmails(newBooking, bookingDetails.referralCode);
      } catch (mailErr) {
        logger.error(
          `Prasad confirmation email failed: ${mailErr instanceof Error ? mailErr.message : String(mailErr)}`,
        );
      }

      // Meta CAPI purchase (best-effort).
      try {
        await sendMetaPurchaseEvent({
          orderID: String(orderID),
          value: Number(totalPriceCalculated || 0),
          currency: "INR",
          contentId: String(bookingDetails.meta?.packageName || "PRASAD"),
          deliveryCategory: "home_delivery",
          actionSource: "website",
          phone: String(newBooking.address.number || ""),
          email: newBooking.address.email || null,
          externalId: String(newBooking.userID || ""),
          clientIp,
          userAgent,
          fbp,
          fbc,
          eventSourceUrl,
          eventIdPrefix: "prasad_purchase_",
        });
      } catch (e) {
        logger.error(
          { err: axios.isAxiosError(e) ? e.response?.data || e.message : e },
          "[MetaCAPI][Prasad] Purchase failed",
        );
      }
    })();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error }, "Error in /prasad/verify-payment");
    throw new ApiError(500, "Server error");
  }
};
