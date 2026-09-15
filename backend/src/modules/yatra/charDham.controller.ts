import type { Request, Response } from "express";
import { razorpay, razorpayKeyId, verifyPaymentSignature, verifyWebhookSignature } from "../../lib/razorpay";
import { isAcceptablePhone, markUpInr, normalizePhone, resolveCurrency } from "../../config/currency";
import {
  createOrderWithFallback,
  internationalFields,
  orderResponseFields,
} from "../../utils/internationalOrder";
import { ApiError } from "../../lib/apiError";
import { logger } from "../../lib/logger";
import { env } from "../../config/env";
import FourDhamPoojaModel, {
  type IFixedDhamSection,
  type IFourDhamPackage,
  type IFourDhamSlot,
} from "./fourDhamPooja.model";
import FourDhamYatraBookingModel from "./fourDhamYatraBooking.model";
import {
  createConfirmedUpfrontBookingFromPending,
  createConfirmedAutopayBookingFromPending,
} from "../jyotirlinga/subscription.controller";
import { PendingJyotirlingaBooking, RazorpayWebhookEvent } from "../jyotirlinga/subscription.model";
import { extractClientMeta, sendOrderIdSms, toWhatsappNumber } from "./notify";
import { normalizeOrderSource, pushVedicVaibhavOrderCommission } from "../../utils/partnerAffiliateCommission";
import { sendWhatsappTemplateMessage } from "../../utils/whatsapp";
import { fourDhamBookingToAdmin, fourDhamBookingToUser } from "../../utils/mail/smtpUs";
import { sendMetaPurchaseEvent } from "../../utils/metaCapi";

type FrontendPackageInclusion = {
  dhamName: string;
  details: string;
};

type FrontendPackage = {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  packageImage: string;
  mainInclusions: FrontendPackageInclusion[];
  freeInclusions: FrontendPackageInclusion[];
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter((item) => item.length > 0);
};

const mapSectionForFrontend = (section: Partial<IFixedDhamSection> | undefined): FrontendPackageInclusion[] => [
  { dhamName: "Kedarnath", details: normalizeStringArray(section?.Kedarnath).join(", ") },
  { dhamName: "Badrinath", details: normalizeStringArray(section?.Badrinath).join(", ") },
  { dhamName: "Gangotri", details: normalizeStringArray(section?.Gangotri).join(", ") },
  { dhamName: "Yamunotri", details: normalizeStringArray(section?.Yamunotri).join(", ") },
];

const resolveActiveSlot = (slots: IFourDhamSlot[] = []): IFourDhamSlot | null => {
  if (!Array.isArray(slots) || slots.length === 0) return null;

  const manuallyActive = slots.find((slot) => slot?.isActive);
  if (manuallyActive) return manuallyActive;

  const now = new Date();
  const dateMatched = slots.find((slot) => {
    const startDate = new Date(slot?.startDate);
    const endDate = new Date(slot?.endDate);
    return !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && now >= startDate && now <= endDate;
  });

  return dateMatched || null;
};

const getFamilyPricing = (price: number, title?: string): { limit: number; rate: number } => {
  const t = title?.toLowerCase() || "";
  if (price === 3100) return { limit: 2, rate: 99 };
  if (price === 5100) return { limit: 3, rate: 99 };
  if (price === 7100) return { limit: 4, rate: 99 };
  if (price >= 9000 || t.includes("premium") || t.includes("highest")) {
    return { limit: 5, rate: 199 };
  }
  return { limit: 2, rate: 99 }; // Default fallback
};

const generateBookingId = (): string => {
  const stamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `4DHAM-${stamp}-${random}`;
};

/** Checkout-signature check that treats malformed signatures as invalid (never throws). */
const isValidCheckoutSignature = (orderId: string, paymentId: string, signature: string): boolean => {
  try {
    return verifyPaymentSignature({ orderId, paymentId, signature });
  } catch {
    return false;
  }
};

export const fetchActive4DhamYatra = async (_req: Request, res: Response): Promise<void> => {
  const pooja = await FourDhamPoojaModel.findOne({ poojaType: "4DhamYatra", isActive: true })
    .sort({ updatedAt: -1 })
    .lean();

  if (!pooja) {
    throw ApiError.notFound("No active 4 Dham Yatra found.");
  }

  const activeSlot = resolveActiveSlot(pooja.slots || []);
  if (!activeSlot) {
    throw ApiError.notFound("No active slot found for this 4 Dham Yatra.");
  }

  const bookedCount = await FourDhamYatraBookingModel.countDocuments({
    poojaId: pooja.poojaId,
    slotId: String(activeSlot._id),
    paymentStatus: "paid",
    bookingStatus: "confirmed",
  });

  const packages: FrontendPackage[] = (pooja.packages || []).map((pkg: IFourDhamPackage) => ({
    id: pkg.packageName,
    title: pkg.packageName,
    description: pooja.poojaName,
    price: Number(pkg.discountedPrice || 0),
    originalPrice: Number(pkg.realPrice || 0),
    packageImage: String(pkg.packageImage || ""),
    mainInclusions: mapSectionForFrontend(pkg.section1),
    freeInclusions: mapSectionForFrontend(pkg.section2),
  }));

  res.status(200).json({
    pooja: {
      poojaDocumentId: String(pooja._id),
      poojaId: pooja.poojaId,
      poojaName: pooja.poojaName,
      poojaDate: pooja.poojaDate || [],
    },
    activeSlot: {
      id: String(activeSlot._id),
      slotName: activeSlot.slotName,
      startDate: activeSlot.startDate,
      endDate: activeSlot.endDate,
      bookedCount,
      totalSlots: 1000,
      remainingSlots: Math.max(1000 - bookedCount, 0),
    },
    packages,
  });
};

export const create4DhamRazorpayOrder = async (req: Request, res: Response): Promise<void> => {
  const {
    poojaId,
    slotId,
    packageName,
    devoteeName,
    whatsapp,
    gotra,
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

  if (!poojaId || !String(poojaId).trim()) throw ApiError.badRequest("poojaId is required.");
  if (!slotId || !String(slotId).trim()) throw ApiError.badRequest("slotId is required.");
  if (!packageName || !String(packageName).trim()) throw ApiError.badRequest("packageName is required.");
  if (!devoteeName || String(devoteeName).trim().length < 3) throw ApiError.badRequest("Valid devoteeName is required.");
  /** Indian numbers keep exactly the old rule; foreign ones get a length sanity
   *  check. See bbSeva.controller.ts. No `dialCode` means India. */
  if (!whatsapp || !isAcceptablePhone(whatsapp, dialCode)) {
    throw ApiError.badRequest("Valid WhatsApp number is required.");
  }
  if (!gotra || !String(gotra).trim()) throw ApiError.badRequest("gotra is required.");
  if (!address || String(address).trim().length < 10) throw ApiError.badRequest("Complete address is required.");
  if (!city || !String(city).trim()) throw ApiError.badRequest("city is required.");
  if (!state || !String(state).trim()) throw ApiError.badRequest("state is required.");
  /** The 6-digit rule is an India Pincode rule. A devotee booking this yatra from
   *  abroad has a ZIP/postcode of some other shape entirely, so outside India this
   *  falls back to "present and plausible" rather than rejecting the booking. */
  const isIndianAddress = !countryCode || String(countryCode).toUpperCase() === "IN";
  const pincodeStr = String(pincode ?? "").trim();
  if (isIndianAddress ? !/^\d{6}$/.test(pincodeStr) : pincodeStr.length < 3 || pincodeStr.length > 12) {
    throw ApiError.badRequest(
      isIndianAddress ? "Valid 6-digit pincode is required." : "Valid postal code is required.",
    );
  }

  const pooja = await FourDhamPoojaModel.findOne({
    poojaType: "4DhamYatra",
    poojaId: String(poojaId).trim(),
    isActive: true,
  });

  if (!pooja) {
    throw ApiError.notFound("Active 4 Dham Yatra not found.");
  }

  const activeSlot = resolveActiveSlot(pooja.slots);
  if (!activeSlot) {
    throw ApiError.notFound("No active slot is available right now.");
  }
  if (String(activeSlot._id) !== String(slotId).trim()) {
    throw ApiError.badRequest("Only the active slot can be booked.");
  }

  const selectedPackage = (pooja.packages || []).find(
    (pkg) => String(pkg.packageName).trim() === String(packageName).trim(),
  );
  if (!selectedPackage) {
    throw ApiError.notFound("Selected package not found.");
  }

  const amount = Number(selectedPackage.discountedPrice || 0);
  const fullPrice = amount;
  if (!amount || amount <= 0) {
    throw ApiError.badRequest("Invalid package price.");
  }

  // Family member pricing calculation
  const { limit: freeLimit, rate: extraRate } = getFamilyPricing(fullPrice, selectedPackage.packageName);
  const membersList = normalizeStringArray(familyMembers);
  const extraMembersCount = Math.max(0, membersList.length - freeLimit);
  const extraCharges = extraMembersCount * extraRate;

  const parsedDiscount = Number(discountedAmount);
  const chargeAmount =
    parsedDiscount && parsedDiscount >= 1 && parsedDiscount <= fullPrice + extraCharges
      ? parsedDiscount
      : fullPrice + extraCharges;

  const bookingId = generateBookingId();

  /**
   * A SERVER-PRICED flow: the package price comes from the catalog. The foreign
   * markup is applied here, to the India list total (`chargeAmount`).
   */
  const orderCurrency = resolveCurrency(currency);
  const amountInr = markUpInr(chargeAmount, orderCurrency);

  const { order: razorpayOrder, pricing: fx } = await createOrderWithFallback(
    amountInr,
    orderCurrency,
    {
      receipt: bookingId,
      notes: {
        bookingId,
        poojaId: pooja.poojaId,
        slotId: String(activeSlot._id),
        packageName: String(selectedPackage.packageName),
      },
    },
    "FourDhamYatra",
  );

  const booking = await FourDhamYatraBookingModel.create({
    bookingId,
    referralCode: referralCode ? String(referralCode).trim() : undefined,
    orderSource: normalizeOrderSource(orderSource),
    poojaDocumentId: String(pooja._id),
    poojaId: pooja.poojaId,
    poojaName: pooja.poojaName,
    slotId: String(activeSlot._id),
    slotName: activeSlot.slotName,
    slotStartDate: activeSlot.startDate,
    slotEndDate: activeSlot.endDate,
    packageName: String(selectedPackage.packageName),
    packagePrice: Number(selectedPackage.discountedPrice || 0),
    packageOriginalPrice: Number(selectedPackage.realPrice || 0),
    devoteeName: String(devoteeName).trim(),
    whatsapp: normalizePhone(whatsapp, dialCode),
    gotra: String(gotra).trim(),
    familyMembers: membersList,
    freeMemberLimit: freeLimit,
    extraMembersCount,
    extraCharges,
    address: String(address).trim(),
    city: String(city).trim(),
    state: String(state).trim(),
    pincode: pincodeStr,
    // Was hardcoded "India" — which is simply wrong for a devotee booking from
    // abroad, and is the field the confirmation and courier both read.
    country: country ? String(country).slice(0, 64) : "India",
    // The INR value of the sale, already marked up.
    totalAmount: amountInr,
    listAmount: chargeAmount,
    // From the pricing the gateway ACCEPTED, never what was requested. `country`
    // is set above from the same request value, so it is not passed again here.
    ...internationalFields(fx, { countryCode }),
    paymentStatus: "created",
    bookingStatus: "initiated",
    razorpayOrderId: razorpayOrder.id,
    ...(vv_utm ? { vv_utm } : {}),
  });

  res.status(201).json({
    message: "Razorpay order created successfully.",
    bookingId: booking.bookingId,
    razorpayOrderId: razorpayOrder.id,
    // The checkout must open on the SAME currency + amount the order carries.
    amount: razorpayOrder.amount,
    ...orderResponseFields(fx),
    key: razorpayKeyId,
    poojaName: pooja.poojaName,
    packageName: selectedPackage.packageName,
    devoteeName: booking.devoteeName,
    whatsapp: booking.whatsapp,
  });
};

export const finalize4DhamBookingRecord = async ({
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
  const booking = await FourDhamYatraBookingModel.findOne({
    bookingId: String(bookingId).trim(),
    razorpayOrderId: String(razorpay_order_id).trim(),
  });

  if (!booking) {
    throw new Error("Booking not found.");
  }

  // Idempotency: skip if already paid
  if (booking.paymentStatus === "paid" && booking.bookingStatus === "confirmed") {
    return { booking, alreadyExists: true };
  }

  booking.paymentStatus = "paid";
  booking.bookingStatus = "confirmed";
  booking.razorpayPaymentId = String(razorpay_payment_id).trim();
  booking.razorpaySignature = String(razorpay_signature).trim();
  booking.paidAt = new Date();

  await booking.save();

  // Partner-affiliate commission — 4 Dham Yatra. Best-effort, non-blocking.
  void pushVedicVaibhavOrderCommission({
    referralCode: booking.referralCode,
    orderId: booking.bookingId,
    orderPrice: (Number(booking.packagePrice) || 0) + (Number(booking.extraCharges) || 0),
    department: "DHAM_YATRA",
    productName: "DHAM_YATRA",
    phone: booking.whatsapp,
    orderSource: normalizeOrderSource(booking.orderSource),
  });

  // Fire background notifications
  void (async () => {
    // 1. Admin email
    try {
      await fourDhamBookingToAdmin({
        bookingId: booking.bookingId,
        poojaName: booking.poojaName,
        slotName: booking.slotName,
        slotStartDate: booking.slotStartDate,
        slotEndDate: booking.slotEndDate,
        packageName: booking.packageName,
        packagePrice: booking.packagePrice,
        devoteeName: booking.devoteeName,
        whatsapp: booking.whatsapp,
        gotra: booking.gotra,
        familyMembers: booking.familyMembers || [],
        address: booking.address,
        city: booking.city,
        state: booking.state,
        pincode: booking.pincode,
        transactionId: booking.razorpayPaymentId || "N/A",
        paidAt: booking.paidAt || new Date(),
      });
    } catch (e) {
      logger.error({ err: e }, "[4Dham][BG] Admin mail failed");
    }

    // 1b. User confirmation email (legacy parity: the booking schema stores no
    // email, so this only fires if one is ever present on the document).
    try {
      const userEmail = booking.email;
      if (userEmail && userEmail.includes("@")) {
        await fourDhamBookingToUser({
          name: booking.devoteeName || "Devotee",
          email: userEmail,
          bookingId: booking.bookingId,
          poojaName: booking.poojaName,
          packageName: booking.packageName,
          slotName: booking.slotName,
          slotStartDate: booking.slotStartDate,
          slotEndDate: booking.slotEndDate,
          // The devotee paid the package price PLUS any extra-member charges,
          // so the receipt's "Amount Paid" reads the booking's own total. It is
          // also the marked-up figure the foreign charge was derived from.
          packagePrice: booking.totalAmount ?? booking.packagePrice,
        // Presentment fields, so the receipt shows what the card was
        // actually billed rather than the internal rupee figure.
          currency: booking.currency,
          chargedAmount: booking.chargedAmount,
          fxRate: booking.fxRate,
          priceMultiplier: booking.priceMultiplier,
          familyMembers: booking.familyMembers || [],
        });
      }
    } catch (e) {
      logger.error({ err: e }, "[4Dham][BG] User mail failed");
    }

    // 2. WhatsApp
    try {
      const phone = toWhatsappNumber(booking.whatsapp);
      const chadhavaDate = booking.slotStartDate
        ? new Date(booking.slotStartDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "the scheduled date";

      await sendWhatsappTemplateMessage({
        to: phone,
        templateName: "4dhamyatra",
        headerImageUrl: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/chadhavathankyou.png",
        templateId: "3101475",
        parameters: [booking.devoteeName || "Devotee", booking.bookingId, chadhavaDate],
        languageCode: "en",
      });
    } catch (e) {
      logger.error({ err: e }, "[4Dham][BG] WhatsApp failed");
    }

    // 3. Fast2SMS (template 194832)
    try {
      await sendOrderIdSms(booking.whatsapp, booking.bookingId);
    } catch (e) {
      logger.error({ err: e }, "[4Dham][BG] Fast2SMS failed");
    }
  })();

  return { booking, alreadyExists: false };
};

export const verify4DhamRazorpayPayment = async (req: Request, res: Response): Promise<void> => {
  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as Record<
    string,
    string | undefined
  >;

  if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw ApiError.badRequest(
      "bookingId, razorpay_order_id, razorpay_payment_id and razorpay_signature are required.",
    );
  }

  const booking = await FourDhamYatraBookingModel.findOne({
    bookingId: String(bookingId).trim(),
    razorpayOrderId: String(razorpay_order_id).trim(),
  });

  if (!booking) {
    throw ApiError.notFound("Booking not found.");
  }

  if (!isValidCheckoutSignature(razorpay_order_id, razorpay_payment_id, String(razorpay_signature).trim())) {
    throw ApiError.badRequest("Payment signature verification failed.");
  }

  const { booking: finalizedBooking, alreadyExists } = await finalize4DhamBookingRecord({
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
        value: finalizedBooking.packagePrice || 0,
        currency: "INR",
        contentId: String(finalizedBooking.packageName || "4DHAM"),
        deliveryCategory: "home_delivery",
        actionSource: "website",
        phone: String(finalizedBooking.whatsapp || ""),
        email: finalizedBooking.email || null,
        externalId: "", // legacy parity: bookings carry no userID
        clientIp: meta.clientIp,
        userAgent: meta.userAgent,
        fbp: meta.fbp,
        fbc: meta.fbc,
        eventSourceUrl: meta.eventSourceUrl,
        eventIdPrefix: "4dham_purchase_",
      });
    } catch (e) {
      logger.error({ err: e, bookingId }, "[MetaCAPI][4Dham] Purchase failed");
    }
  }

  res.status(200).json({
    message: alreadyExists ? "Booking already confirmed." : "Payment verified and booking confirmed successfully.",
    booking: {
      bookingId: finalizedBooking.bookingId,
      poojaId: finalizedBooking.poojaId,
      poojaName: finalizedBooking.poojaName,
      slotName: finalizedBooking.slotName,
      packageName: finalizedBooking.packageName,
      devoteeName: finalizedBooking.devoteeName,
      whatsapp: finalizedBooking.whatsapp,
      paymentStatus: finalizedBooking.paymentStatus,
      bookingStatus: finalizedBooking.bookingStatus,
    },
  });
};

export const fetch4DhamBookingByBookingId = async (req: Request, res: Response): Promise<void> => {
  const booking = await FourDhamYatraBookingModel.findOne({ bookingId: req.params.bookingId }).lean();

  if (!booking) {
    throw ApiError.notFound("Booking not found.");
  }

  res.status(200).json({ booking });
};

export const fetchUser4DhamBookings = async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.params;

  if (!phone) {
    throw ApiError.badRequest("Phone number is required");
  }

  const bookings = await FourDhamYatraBookingModel.find({ whatsapp: String(phone).trim() })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, bookings });
};

// ── Dedicated webhook handler for 4-Dham Yatra ───────────────────────────────

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: { order_id?: string; id?: string } };
    order?: { entity?: { id?: string } };
  };
};

export const handle4DhamRazorpayWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const webhookSecret = env.razorpay.fourDhamWebhookSecret || env.razorpay.webhookSecret;
    if (!webhookSecret) {
      logger.error("[Webhook][4Dham] Razorpay webhook secret is not set");
      res.status(500).json({ status: "error", message: "Server misconfig" });
      return;
    }

    const signature = req.headers["x-razorpay-signature"];
    if (!signature || typeof signature !== "string") {
      res.status(400).json({ status: "error", message: "Missing signature" });
      return;
    }

    // Support both raw Buffer (express.raw() is mounted on /api/webhook) and
    // a pre-parsed JSON body.
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body || {});

    if (!verifyWebhookSignature(Buffer.from(rawBody), signature, webhookSecret)) {
      logger.warn("[Webhook][4Dham] Invalid signature attempt");
      res.status(400).json({ status: "error", message: "Invalid signature" });
      return;
    }

    const payload: RazorpayWebhookPayload = Buffer.isBuffer(req.body)
      ? (JSON.parse(rawBody) as RazorpayWebhookPayload)
      : (req.body as RazorpayWebhookPayload);
    const event: string = payload?.event || "";

    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload?.payload?.payment?.entity;
      const orderEntity = payload?.payload?.order?.entity;
      const orderId = paymentEntity?.order_id || orderEntity?.id || "";
      const paymentId = paymentEntity?.id || "";

      if (orderId) {
        const dhamBooking = await FourDhamYatraBookingModel.findOne({ razorpayOrderId: orderId });
        if (dhamBooking) {
          await finalize4DhamBookingRecord({
            bookingId: dhamBooking.bookingId,
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: "webhook_verified",
          });
          logger.info(`[Webhook][4Dham] Confirmed order: ${orderId}`);
        }

        if (!dhamBooking) {
          // Legacy parity: the shared Razorpay webhook destination may also carry
          // Jyotirlinga-subscription payments.
          try {
            // Idempotency — skip if already processed
            const eventIdHeader = req.headers["x-razorpay-event-id"];
            const eventId =
              (typeof eventIdHeader === "string" ? eventIdHeader : eventIdHeader?.[0]) ||
              `shared-wh-${orderId}-${Date.now()}`;
            try {
              await RazorpayWebhookEvent.create({
                eventId,
                event,
                entityId: paymentId,
                payload,
                status: "processing",
                receivedAt: new Date(),
              });
            } catch (dupErr) {
              if ((dupErr as { code?: number })?.code === 11000) {
                // Duplicate webhook — already processed
                res.status(200).json({ status: "ok", note: "duplicate" });
                return;
              }
              throw dupErr;
            }

            const pending = await PendingJyotirlingaBooking.findOne({
              "gatewayRefs.authOrderId": orderId,
            });

            if (pending) {
              if (pending.gatewayRefs.paymentMode === "upfront") {
                await createConfirmedUpfrontBookingFromPending({
                  pending,
                  razorpayPaymentId: paymentId,
                  razorpayOrderId: orderId,
                  razorpaySignature: "webhook_verified",
                  paymentStatus: "captured",
                  source: `webhook:${event}`,
                });
                logger.info(`[Webhook][Jyotirlinga][Upfront] Confirmed order: ${orderId}`);
              } else if (pending.gatewayRefs.paymentMode === "autopay") {
                // For autopay mandate auth, fetch token_id from Razorpay
                const payment = (await razorpay.payments.fetch(paymentId)) as {
                  token_id?: string;
                  customer_id?: string;
                  status?: string;
                };
                const tokenId = payment?.token_id || "";
                const customerId = payment?.customer_id || pending.gatewayRefs?.authCustomerId || "";

                if (tokenId && customerId) {
                  await createConfirmedAutopayBookingFromPending({
                    pending,
                    razorpayPaymentId: paymentId,
                    razorpayOrderId: orderId,
                    razorpaySignature: "webhook_verified",
                    customerId,
                    tokenId,
                    paymentStatus: payment?.status || "captured",
                    source: `webhook:${event}`,
                  });
                  logger.info(`[Webhook][Jyotirlinga][Autopay] Confirmed order: ${orderId}`);
                }
              }

              // Mark webhook event as processed
              await RazorpayWebhookEvent.updateOne(
                { eventId },
                { $set: { status: "processed", processedAt: new Date() } },
              );
            }
          } catch (jyotErr) {
            logger.error({ err: jyotErr }, "[Webhook][Jyotirlinga] Processing error");
            // Don't throw — still return 200 so Razorpay doesn't retry infinitely
          }
        }
      }
    }

    if (event === "payment.failed") {
      const paymentEntity = payload?.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || "";

      if (orderId) {
        // Mark pending Jyotirlinga booking as failed if present
        try {
          await PendingJyotirlingaBooking.updateOne(
            { "gatewayRefs.authOrderId": orderId },
            { $set: { status: "failed", statusDate: new Date() } },
          );
        } catch {
          // best-effort, mirrors legacy silent catch
        }
      }
    }

    res.status(200).json({ status: "ok" });
  } catch (err) {
    logger.error({ err }, "[Webhook][4Dham] Processing error");
    // Always return 200 to prevent Razorpay from retrying on server errors
    if (!res.headersSent) {
      res.status(200).json({ status: "error_handled" });
    }
  }
};
