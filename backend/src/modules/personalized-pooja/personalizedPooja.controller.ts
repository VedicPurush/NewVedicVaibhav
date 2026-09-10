import type { NextFunction, Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import type { Types } from "mongoose";
import PersonalizedPoojaBooking from "./personalizedPooja.model";
import type { IVvUtm } from "./personalizedPooja.model";
import PendingPersonalizedPoojaBooking from "./pendingPersonalizedPooja.model";
import { User } from "../users/user.model";
import {
  razorpayKeyId,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../../lib/razorpay";
import { markUpInr, resolveCurrency } from "../../config/currency";
import {
  createOrderWithFallback,
  internationalFields,
  orderResponseFields,
} from "../../utils/internationalOrder";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { ApiError } from "../../lib/apiError";
import { sendPersonalizedPoojaMail } from "../../utils/mail/smtp";
import {
  personalizedPoojaBookingToAdmin,
  personalizedPoojaBookingToUser,
} from "../../utils/mail/smtpUs";
import { pushVedicVaibhavOrderCommission } from "../../utils/partnerAffiliateCommission";
import { sendMetaPurchaseEvent } from "../../utils/metaCapi";

function generateOrderID(): string {
  const prefix = "VVP";
  const suffix = Math.random().toString(36).substring(2, 10).toUpperCase();
  return prefix + suffix;
}

/** GET /personalized-pooja-bookings-by-user-id/:id */
export const fetchPersonalizedPoojaByUserId = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const poojaBooked = await PersonalizedPoojaBooking.find({ userID: id });

    if (!poojaBooked || poojaBooked.length === 0) {
      throw ApiError.notFound("No pooja bookings found for this user.");
    }

    res.status(200).json({ poojaBooked });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error }, "Error fetching pooja bookings");
    throw new ApiError(500, "Server error while fetching pooja bookings.");
  }
};

/** GET /personalized-pooja-bookings/:id */
export const getPoojaBookingById = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      throw ApiError.badRequest("Invalid Booking ID format.");
    }

    const booking = await PersonalizedPoojaBooking.findById(id);
    if (!booking) {
      throw ApiError.notFound("Pooja booking not found.");
    }

    res.status(200).json(booking);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error }, "Error fetching Pooja booking by ID");
    throw new ApiError(500, "Server error while fetching Pooja booking.");
  }
};

interface AddPoojaBookingBody {
  userID?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string[];
  gotra?: string[];
  mobile?: string;
  email?: string;
  poojaName?: string;
  problemName?: string;
  description?: string;
  poojaDate?: string;
  selectedMandir?: string;
  mandirName?: string;
  isFromApp?: boolean;
  price?: number;
  vv_utm?: IVvUtm;
  referralCode?: string | number | null;
  /** Razorpay payment this booking is being created for. Used only as an
   *  idempotency key so the checkout can safely retry this call (see below). */
  razorpay_payment_id?: string;
}

/** POST /add-personalized-pooja-booking */
export const addPoojaBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      userID,
      firstName,
      lastName,
      fullName,
      gotra,
      mobile,
      email,
      poojaName,
      problemName,
      description,
      poojaDate,
      selectedMandir,
      mandirName,
      isFromApp,
      price,
      vv_utm,
      referralCode,
      razorpay_payment_id,
    } = req.body as AddPoojaBookingBody;

    if (
      !userID ||
      !firstName ||
      !lastName ||
      !fullName ||
      !gotra ||
      !mobile ||
      !email ||
      !problemName ||
      !selectedMandir ||
      !mandirName ||
      !description ||
      !poojaDate ||
      !price
    ) {
      throw ApiError.badRequest("All fields are required including price & mandirName.");
    }

    // Idempotency. This endpoint runs *after* the user has been charged, so the
    // checkout must be able to retry it — otherwise a single failed call loses
    // the booking for a payment that already went through. Every call used to
    // mint a fresh orderId, which made a retry silently double-book. Keyed on the
    // Razorpay payment id: one payment is always exactly one booking.
    if (razorpay_payment_id) {
      const already = await PersonalizedPoojaBooking.findOne({
        transactionID: razorpay_payment_id,
      });
      if (already) {
        res.status(200).json({
          success: true,
          message: "Booking already created for this payment.",
          orderId: already.orderId,
          booking: already,
          alreadyExists: true,
        });
        return;
      }
    }

    const orderId = generateOrderID();

    const newBooking = new PersonalizedPoojaBooking({
      // Recorded at creation so a retry of this same call is recognised above.
      // Payment status itself is still set only by the signature-verified status
      // endpoint / webhook — writing the id here does not mark anything as paid.
      ...(razorpay_payment_id ? { transactionID: razorpay_payment_id } : {}),
      userID,
      firstName,
      lastName,
      fullName,
      gotra,
      mobile,
      email,
      poojaName,
      problemName,
      description,
      poojaDate: new Date(poojaDate),
      selectedMandir,
      mandirName,
      orderId,
      referralCode: referralCode ? String(referralCode).trim() : undefined,
      price,
      isApproved: false,
      prasadDeliveryStatus: "pending",
      showPaymentToUser: true,
      isFromApp,
      ...(vv_utm ? { vv_utm } : {}),
    });

    const savedBooking = await newBooking.save();

    // Send mails (with mandirName included).
    await sendPersonalizedPoojaMail(
      email,
      fullName,
      gotra,
      problemName,
      email,
      selectedMandir,
      price,
      mandirName,
    );
    await personalizedPoojaBookingToAdmin({
      userID,
      firstName,
      lastName,
      fullName,
      gotra,
      mobile,
      email,
      // Legacy behavior: poojaName is not validated above and may be undefined.
      poojaName: poojaName as string,
      problemName,
      description,
      poojaDate: new Date(poojaDate),
      selectedMandir,
      mandirName,
    });

    // User confirmation via support@vedicvaibhav.com (best-effort, non-blocking).
    void personalizedPoojaBookingToUser({
      name: `${firstName} ${lastName}`.trim() || fullName?.[0] || "Devotee",
      email,
      orderId,
      poojaName,
      mandirName,
      problemName,
      poojaDate: new Date(poojaDate),
      // This email fires when the REQUEST is submitted, before any payment —
      // there is no currency on the booking yet, so it stays in rupees.
      price: Number(price),
    }).catch((e: unknown) => {
      logger.error(
        `[PersonalizedPooja] User email fire-and-forget error: ${e instanceof Error ? e.message : String(e)}`,
      );
    });

    res.status(201).json({
      message: "Pooja booking created successfully. Proceed to payment.",
      booking: savedBooking,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error }, "Error adding Pooja booking");
    throw new ApiError(500, "Server error while adding Pooja booking.");
  }
};

/** POST /personalized-pooja-payment — initiate Razorpay order. */
export const personalizedPoojaPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body as { orderId?: string };

    const booking = await PersonalizedPoojaBooking.findOne({ orderId });
    if (!booking) {
      throw ApiError.notFound("Booking not found.");
    }

    if (booking.paymentStatus) {
      throw ApiError.badRequest("Payment already completed for this booking.");
    }

    if (!booking.price || booking.price <= 0) {
      throw ApiError.badRequest("Invalid booking price.");
    }

    /**
     * A SERVER-PRICED flow: the price lives on the booking row, the browser only
     * names the order. So the foreign markup is applied here, from the catalog
     * figure — the client never sends an amount at all.
     *
     * `listAmount` is what makes this safe to RETRY. Payment can be initiated
     * more than once for the same booking (a closed checkout, a failed card),
     * and reading the markup source from `price` would compound it on every
     * attempt: ₹2,100 -> ₹6,930 -> ₹22,869. The India list price is recorded
     * once and every attempt marks up from that.
     */
    const orderCurrency = resolveCurrency((req.body as { currency?: unknown }).currency);
    const listInr = Number(booking.listAmount ?? booking.price);
    const amountInr = markUpInr(listInr, orderCurrency);

    const { order, pricing: fx } = await createOrderWithFallback(
      amountInr,
      orderCurrency,
      { receipt: booking.orderId },
      "PersonalizedPooja",
    );

    // Persist the pricing the gateway ACTUALLY accepted, not what was requested.
    booking.listAmount = listInr;
    booking.price = amountInr;
    Object.assign(booking, internationalFields(fx, req.body as Record<string, unknown>));
    await booking.save();

    await PendingPersonalizedPoojaBooking.deleteOne({ orderId });
    const pendingBooking = new PendingPersonalizedPoojaBooking({
      orderId: booking.orderId,
      bookingDetails: booking._id,
      status: "pending",
    });
    await pendingBooking.save();

    // The checkout must open on the SAME currency + amount the order carries.
    res.status(200).json({ order, ...orderResponseFields(fx) });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error }, "Error initiating Razorpay payment");
    throw new ApiError(500, "Server error while initiating payment.");
  }
};

/** GET /personalized-pooja-payment-status — verify Razorpay payment (legacy GET-with-body). */
export const personalizedPoojaPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // Registered as a GET (personalizedPooja.routes.ts), and the payment-handler
    // page calls it as `GET ...?orderId=<id>` with no signature. Reading only
    // req.body meant the required fields were always absent, so every visit threw
    // "Missing payment details" and the handler redirected to the failure page —
    // 100% of the time, for payments that had actually succeeded.
    // Accept query params as well as body, and support two shapes:
    //   * signature present  → verify and confirm the booking (original behaviour)
    //   * orderId only       → read-only status poll; the webhook does the writing
    const source = { ...(req.query as Record<string, unknown>), ...(req.body ?? {}) } as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
      orderId?: string;
    };
    const { razorpay_payment_id, razorpay_signature } = source;
    const razorpay_order_id = source.razorpay_order_id || source.orderId;

    if (!razorpay_order_id) {
      throw ApiError.badRequest("Missing payment details.");
    }

    // Status-only poll: never mutates, so it needs no signature.
    if (!razorpay_payment_id || !razorpay_signature) {
      const known = await PersonalizedPoojaBooking.findOne({ orderId: razorpay_order_id });
      if (known?.paymentStatus) {
        res.status(200).json({ success: true, message: "Payment successful." });
        return;
      }
      // Not confirmed yet — 202 tells the caller to keep polling rather than
      // treating an in-flight confirmation as a failure.
      res.status(202).json({ success: false, message: "Payment is still being confirmed." });
      return;
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
      throw ApiError.badRequest("Invalid signature.");
    }

    const booking = await PersonalizedPoojaBooking.findOne({ orderId: razorpay_order_id });
    if (!booking) {
      throw ApiError.notFound("Booking not found.");
    }

    booking.paymentStatus = true;
    booking.transactionID = razorpay_payment_id;
    booking.paymentDate = new Date();
    booking.showPaymentToUser = true;
    await booking.save();

    await PendingPersonalizedPoojaBooking.deleteOne({ orderId: razorpay_order_id });

    // Partner-affiliate commission — Personalized Pooja. Best-effort, non-blocking.
    void pushVedicVaibhavOrderCommission({
      referralCode: booking.referralCode,
      orderId: booking.orderId,
      orderPrice: Number(booking.price) || 0,
      department: "PERSONALIZED_POOJA",
      productName: "PERSONALIZED_POOJA",
      phone: booking.mobile,
      orderSource: booking.isFromApp ? "APP" : "WEBSITE",
    });

    // Meta CAPI purchase (best-effort).
    try {
      await sendMetaPurchaseEvent({
        orderID: String(booking.orderId),
        value: booking.price || 0,
        currency: "INR",
        contentId: String(booking.poojaName || "PERSONALIZED_POOJA"),
        deliveryCategory: "home_delivery",
        actionSource: "website",
        phone: String(booking.mobile || ""),
        email: booking.email || null,
        externalId: String(booking.userID || ""),
        clientIp:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          req.socket?.remoteAddress ||
          null,
        userAgent: (req.headers["user-agent"] as string) || null,
        fbp: (req.headers["x-fbp"] as string) || null,
        fbc: (req.headers["x-fbc"] as string) || null,
        eventSourceUrl:
          (req.headers["x-event-source-url"] as string) ||
          env.metaCapi.defaultEventSourceUrl ||
          null,
        eventIdPrefix: "personalized_pooja_purchase_",
      });
    } catch (e) {
      logger.error(
        `[MetaCAPI][PersonalizedPooja] Purchase failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    res.status(200).json({ success: true, message: "Payment successful." });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error }, "Error verifying Razorpay payment");
    throw new ApiError(500, "Server error while verifying payment.");
  }
};

/** GET /personalized-pooja-bookings */
export const getAllPoojaBookings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const bookings = await PersonalizedPoojaBooking.find().sort({ addedOn: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    logger.error({ err: error }, "Error fetching Pooja bookings");
    throw new ApiError(500, "Server error while fetching Pooja bookings.");
  }
};

// ── Lookup by phone ───────────────────────────────────────────────────────────

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const digitsEndsWithRegex = (input: string): RegExp | null => {
  const digits = (input || "").replace(/\D+/g, "");
  if (!digits) return null;
  const tail = digits
    .split("")
    .map((d) => `${escapeRegExp(d)}\\D*`)
    .join("");
  return new RegExp(`${tail}$`, "i");
};

interface LeanUser {
  _id: Types.ObjectId;
  phone?: string;
  name?: string;
  email?: string;
}

/** GET /get-personalizedpooja-by-number/:phone */
export const getPersonalizedPoojaBookingsByUserPhone = async (
  req: Request<{ phone: string }>,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  try {
    const rawPhone = String(req.params.phone || "").trim();

    if (!rawPhone) {
      res.status(400).json({ message: "Phone number is required as a route parameter." });
      return;
    }

    if (rawPhone.length > 50) {
      res.status(400).json({ message: "Phone number is too long." });
      return;
    }

    const endsWithRx = digitsEndsWithRegex(rawPhone);

    const user = (await User.findOne(
      endsWithRx
        ? { $or: [{ phone: rawPhone }, { phone: { $regex: endsWithRx } }] }
        : { phone: rawPhone },
    )
      .select("_id phone name email")
      .lean()) as LeanUser | null;

    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "20"), 10) || 20, 1), 100);
    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
    const skip = (page - 1) * limit;

    const sortParam = String(req.query.sort ?? "-createdAt");
    const sort: Record<string, 1 | -1> = {};
    sortParam.split(",").forEach((token) => {
      const f = token.trim();
      if (!f) return;
      if (f.startsWith("-")) sort[f.slice(1)] = -1;
      else sort[f] = 1;
    });

    const primaryQuery = user
      ? { userID: String(user._id) }
      : { mobile: endsWithRx ? { $in: [rawPhone, endsWithRx] } : rawPhone };

    let [bookings, total] = await Promise.all([
      PersonalizedPoojaBooking.find(primaryQuery).sort(sort).skip(skip).limit(limit).lean(),
      PersonalizedPoojaBooking.countDocuments(primaryQuery),
    ]);

    if (user && bookings.length === 0) {
      const fallbackQuery = {
        mobile: endsWithRx ? { $in: [user.phone, endsWithRx] } : user.phone,
      };
      [bookings, total] = await Promise.all([
        PersonalizedPoojaBooking.find(fallbackQuery).sort(sort).skip(skip).limit(limit).lean(),
        PersonalizedPoojaBooking.countDocuments(fallbackQuery),
      ]);

      if (bookings.length > 0) {
        res.json({
          userFound: true,
          matchedBy: "booking.mobile",
          user: { _id: user._id, phone: user.phone, name: user.name, email: user.email },
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
          data: bookings,
        });
        return;
      }
    }

    if (bookings.length === 0) {
      res.status(404).json({
        message: "No bookings found for the given phone number.",
        userFound: Boolean(user),
      });
      return;
    }

    res.json({
      userFound: Boolean(user),
      matchedBy: user ? "userID" : "booking.mobile",
      user: user
        ? { _id: user._id, phone: user.phone, name: user.name, email: user.email }
        : null,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      data: bookings,
    });
  } catch (err) {
    logger.error({ err }, "getPersonalizedPoojaBookingsByUserPhone error");
    res.status(500).json({
      message: "Internal server error",
      error: err instanceof Error ? err.message : undefined,
    });
  }
};

// ── Razorpay webhook (mounted with express.raw by the payments/webhook router) ─

interface RazorpayWebhookBody {
  event?: string;
  payload?: { payment?: { entity?: { order_id?: string; id?: string } } };
}

/** POST /api/webhook/personalized-puja-razorpay */
export const handlePersonalizedPujaWebhook = async (req: Request, res: Response): Promise<void> => {
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

    // Webhook routes are mounted with express.raw(), so req.body is the raw byte
    // Buffer Razorpay signed. Fall back to re-serializing if a parsed body arrives
    // (legacy JSON.stringify behavior).
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body));

    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      logger.warn("[PersonalizedPuja Webhook] Invalid signature");
      res.status(400).json({ status: "error", message: "Invalid signature" });
      return;
    }

    const body = (
      Buffer.isBuffer(req.body) ? JSON.parse(rawBody.toString("utf8")) : req.body
    ) as RazorpayWebhookBody;

    const event = body.event;
    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = body.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const booking = await PersonalizedPoojaBooking.findOne({ orderId });
        if (booking && !booking.paymentStatus) {
          booking.paymentStatus = true;
          booking.transactionID = paymentId || "";
          booking.paymentDate = new Date();
          booking.showPaymentToUser = true;
          await booking.save();
          await PendingPersonalizedPoojaBooking.deleteOne({ orderId });
        } else if (!booking) {
          logger.warn(`[PersonalizedPuja Webhook] Booking not found for orderId: ${orderId}`);
        }
      }
    }

    res.status(200).json({ status: "ok" });
  } catch (err) {
    logger.error(
      `[PersonalizedPuja Webhook] Error: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ status: "error" });
  }
};

// ── Generic Razorpay order + verify (legacy inline routes) ────────────────────

/** POST /create-order */
export const createRazorpayOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, currency } = req.body as {
      amount?: number | string;
      currency?: string;
    };

    /**
     * `amount` is the INDIA LIST TOTAL IN PAISE, exactly as this endpoint has
     * always received it. `currency` is only a request for which currency to
     * PRESENT in — the charge is re-derived from the rupee figure here, so a
     * tampered client can change which currency it is billed in, never how much.
     */
    const orderCurrency = resolveCurrency(currency);
    const listInr = Math.round(Number(amount) || 0) / 100;
    const amountInr = markUpInr(listInr, orderCurrency);

    const { order, pricing: fx } = await createOrderWithFallback(
      amountInr,
      orderCurrency,
      { receipt: "receipt_" + Date.now() },
      "MandirPooja",
    );

    // The checkout must open on the SAME currency + amount the order carries, so
    // the order's own fields are spread first and the resolved pricing after.
    res.json({ ...order, ...orderResponseFields(fx), key: razorpayKeyId });
  } catch (err) {
    logger.error({ err }, "Error creating Razorpay order");
    res.status(500).json({ error: "Failed to create order" });
  }
};

/** POST /verify-payment */
export const verifyRazorpayPayment = (req: Request, res: Response): void => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

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

    if (signatureValid) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    logger.error({ err }, "Error verifying Razorpay payment");
    res.status(500).json({ error: "Payment verification failed" });
  }
};
