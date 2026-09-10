import type { Request, Response } from "express";
import axios from "axios";
import type { Types } from "mongoose";

import Jyotirlinga from "./jyotirlinga.model";
import Plan from "./plans.model";
import {
  JyotirlingaSubscriptionBooking,
  PendingJyotirlingaBooking,
  RazorpayWebhookEvent,
  type IAutopayMeta,
  type IDeliveryAddress,
  type IFamilyMember,
  type IJyotirlingaSubscriptionBooking,
  type IPendingJyotirlingaBooking,
  type IPricingSnapshot,
  type IRazorpayWebhookEvent,
  type IVvUtm,
  type JyotirlingaPaymentMode,
} from "./subscription.model";
import { pushVedicVaibhavOrderCommission } from "../../utils/partnerAffiliateCommission";
import { jyotirlingaBookingToAdmin, jyotirlingaBookingToUser } from "../../utils/mail/smtpUs";
import { sendWhatsappTemplateMessage } from "../../utils/whatsapp";
import { sendMetaPurchaseEvent } from "../../utils/metaCapi";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import {
  razorpay,
  razorpayKeyId,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../../lib/razorpay";

const FAMILY_MEMBER_ADDON_PER_MEMBER = 99;
const AUTOPAY_MARKUP_PERCENT = 6;
const AUTOPAY_AUTH_AMOUNT_PAISE = 100;

// Free family members included per plan (must match frontend FREE_FAMILY_COUNT)
const FREE_FAMILY_COUNT: Record<string, number> = {
  Basic: 2,
  Intermediate: 3,
  Advance: 4,
};

type OrdersCreateParams = Parameters<typeof razorpay.orders.create>[0];
type CustomersCreateParams = Parameters<typeof razorpay.customers.create>[0];

/** Minimal shape of a Razorpay payment entity as used by this controller. */
interface RazorpayPaymentEntity {
  id: string;
  status?: string;
  captured?: boolean;
  amount: number;
  currency: string;
  order_id?: string;
  token_id?: string;
  customer_id?: string;
  error_description?: string;
}

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    token?: { entity?: { id?: string } };
    order?: { entity?: { id?: string } };
  };
}

/** Shape stored inside PendingJyotirlingaBooking.bookingDetails (Mixed in the schema). */
interface SubscriptionBookingDetails {
  name: string;
  mobile: string;
  email?: string;
  gotra: string;
  planId: "Basic" | "Intermediate" | "Advance";
  planName: string;
  paymentMode: JyotirlingaPaymentMode;
  jyotirlingaIds: Types.ObjectId[];
  selectedJyotirlingaCount: number;
  familyMembers?: IFamilyMember[];
  deliveryAddress?: IDeliveryAddress | null;
  // `autopayMonthly` is a legacy field name still referenced by Meta CAPI calls.
  pricingSnapshot: IPricingSnapshot & { autopayMonthly?: number };
  bookingDate?: Date;
  referralCode?: string;
  userID?: string;
  vv_utm?: IVvUtm;
}

const errMessage = (err: unknown): string => {
  const message = (err as { message?: unknown } | null | undefined)?.message;
  return typeof message === "string" && message ? message : String(err);
};

const errDetail = (err: unknown): unknown =>
  (err as { response?: { data?: unknown } } | null | undefined)?.response?.data || errMessage(err);

const generateOrderID = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `JYOT${timestamp}${random}`;
};

const normalizeString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const uniqueStringIds = (ids: unknown[]): string[] =>
  [...new Set((ids || []).map((id) => String(id)).filter(Boolean))];

const isValidMobile = (mobile: string): boolean => /^[6-9]\d{9}$/.test(mobile);

const getISTDayOfMonth = (): number => {
  const day = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
  }).format(new Date());
  return Number(day);
};

const addMonthsSafe = (date: Date, months: number): Date => {
  const d = new Date(date);
  const originalDate = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(originalDate, lastDay));
  return d;
};

const getBasicAuthHeader = (): string => {
  const token = Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString("base64");
  return `Basic ${token}`;
};

/** Checkout signature check — legacy behaviour returns false on any mismatch. */
const isPaymentSignatureValid = (params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean => {
  try {
    return verifyPaymentSignature({
      orderId: params.razorpayOrderId,
      paymentId: params.razorpayPaymentId,
      signature: params.razorpaySignature,
    });
  } catch {
    return false;
  }
};

const isWebhookSignatureValid = (rawBody: string, signature: string): boolean =>
  verifyWebhookSignature(Buffer.from(rawBody, "utf8"), signature, env.razorpay.webhookSecret);

const runJyotirlingaPostConfirmSideEffects = async (
  booking: IJyotirlingaSubscriptionBooking,
): Promise<void> => {
  if (!booking) return;

  try {
    const jyotirlingaDocs = await Jyotirlinga.find({
      _id: { $in: booking.jyotirlingaIds },
    }).lean();
    const jyotirlingaNames = jyotirlingaDocs.map(
      (j) => j.nameEnglish || (j as { name?: string }).name || "Jyotirlinga",
    );

    // 1. Admin Email
    await jyotirlingaBookingToAdmin({
      orderID: booking.orderID,
      name: booking.name,
      mobile: booking.mobile,
      email: booking.email,
      gotra: booking.gotra,
      planName: booking.planName,
      paymentMode: booking.paymentMode,
      selectedJyotirlingaCount: booking.selectedJyotirlingaCount,
      totalPrice: booking.totalPrice,
      pricingSnapshot: booking.pricingSnapshot,
      familyMembers: booking.familyMembers || [],
      deliveryAddress: booking.deliveryAddress,
      status: booking.status,
      bookingDate: booking.bookingDate,
      jyotirlingaNames,
    } as Parameters<typeof jyotirlingaBookingToAdmin>[0]);
  } catch (e) {
    logger.error({ err: e }, "[Jyotirlinga][BG] Admin mail failed");
  }

  // 2. User Confirmation Email
  try {
    const jyotirlingaDocs = await Jyotirlinga.find({
      _id: { $in: booking.jyotirlingaIds },
    }).lean();
    const jyotirlingaNames = jyotirlingaDocs.map(
      (j) => j.nameEnglish || (j as { name?: string }).name || "Jyotirlinga",
    );

    const userEmail = booking.email || "";

    if (userEmail && userEmail.includes("@")) {
      await jyotirlingaBookingToUser({
        orderID: booking.orderID,
        name: booking.name,
        mobile: booking.mobile,
        email: userEmail,
        planName: booking.planName,
        paymentMode: booking.paymentMode,
        selectedJyotirlingaCount: booking.selectedJyotirlingaCount,
        totalPrice: booking.totalPrice,
        pricingSnapshot: booking.pricingSnapshot,
        jyotirlingaNames,
        bookingDate: booking.bookingDate,
      });
    }
  } catch (e) {
    logger.error({ err: e }, "[Jyotirlinga][BG] User mail failed");
  }

  // 3. WhatsApp Template Message
  try {
    let phone = String(booking.mobile || "").replace(/\D/g, "");
    if (phone.length === 10) phone = `91${phone}`;
    if (!phone.startsWith("91")) phone = `91${phone}`;

    await sendWhatsappTemplateMessage({
      to: phone,
      templateName: "thankyouchadhava",
      headerImageUrl:
        "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/chadhavathankyou.png",
      templateId: "3679680",
      parameters: [
        "*All Jyotirlinga*",
        new Date(booking.bookingDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        booking.orderID,
        "*All Jyotirlinga*",
      ],
    });
  } catch (e) {
    logger.error({ err: e }, "[Jyotirlinga][BG] WhatsApp failed");
  }

  // 4. Fast2SMS
  try {
    let num = String(booking.mobile || "").replace(/\D/g, "");
    if (num.startsWith("91") && num.length === 12) num = num.slice(2);
    if (env.fast2sms.apiKey) {
      await axios.get("https://www.fast2sms.com/dev/bulkV2", {
        params: {
          authorization: env.fast2sms.apiKey,
          route: "dlt",
          sender_id: "VVORDR",
          message: "194832",
          variables_values: booking.orderID,
          flash: 0,
          numbers: num,
          schedule_time: "",
        },
        timeout: 10000,
        headers: { Accept: "application/json" },
      });
    }
  } catch (e) {
    logger.error({ err: errDetail(e) }, "[Jyotirlinga][BG] Fast2SMS failed");
  }

  // 5. Meta CAPI Purchase — fired from webhook path
  // Uses a distinct eventIdPrefix ("webhook_jyotirlinga_purchase_") so Meta's deduplication
  // engine treats it as different from the verify-payment call ("jyotirlinga_purchase_").
  // Backend CAPI fires once per path; frontend fbq Purchase is disabled to avoid double-counting.
  try {
    const isAutopay = booking.paymentMode === "autopay";
    const value = isAutopay
      ? booking.pricingSnapshot?.autopayCycleAmount || booking.totalPrice || 0
      : booking.pricingSnapshot?.upfrontPayable || booking.totalPrice || 0;

    await sendMetaPurchaseEvent({
      orderID: String(booking.orderID),
      value,
      currency: "INR",
      contentId: String(booking.planName || "JYOTIRLINGA"),
      deliveryCategory: "home_delivery",
      actionSource: "website",
      phone: String(booking.mobile || ""),
      email: booking.email || null,
      externalId: String((booking as unknown as { userID?: string }).userID || ""),
      // No req available in webhook path — use env fallback for event source URL
      clientIp: null,
      userAgent: null,
      fbp: null,
      fbc: null,
      eventSourceUrl: env.metaCapi.defaultEventSourceUrl || null,
      eventIdPrefix: "webhook_jyotirlinga_purchase_",
    });
  } catch (e) {
    logger.error({ err: errDetail(e) }, "[MetaCAPI][Jyotirlinga][Webhook] Purchase failed");
  }
};

const calculatePricing = ({
  selectedJyotirlingas,
  plan,
  familyMembersCount,
  planId,
}: {
  selectedJyotirlingas: Array<{ price: number }>;
  plan: {
    pricePercentage: number;
    yearlyPercentageDiscount: number;
  };
  familyMembersCount: number;
  planId: string;
}): IPricingSnapshot => {
  const selectedCount = selectedJyotirlingas.length;

  const baseSelectedTotal = selectedJyotirlingas.reduce((sum, item) => sum + (item.price || 0), 0);

  const planAdjustedBase = Math.round((baseSelectedTotal * plan.pricePercentage) / 100);

  const freeFamilyCount = FREE_FAMILY_COUNT[planId] ?? 0;
  const paidFamilyMembersCount = Math.max(0, familyMembersCount - freeFamilyCount);
  const familyAddOnTotal = paidFamilyMembersCount * FAMILY_MEMBER_ADDON_PER_MEMBER;

  const upfrontDiscountPercent = selectedCount > 1 ? plan.yearlyPercentageDiscount : 0;

  const upfrontDiscountAmount = Math.round((planAdjustedBase * upfrontDiscountPercent) / 100);

  const upfrontPayable = Math.max(planAdjustedBase - upfrontDiscountAmount + familyAddOnTotal, 0);

  const autopayBaseJourney = planAdjustedBase + familyAddOnTotal;
  const autopayJourneyWithMarkup =
    selectedCount > 1
      ? Math.round((autopayBaseJourney * (100 + AUTOPAY_MARKUP_PERCENT)) / 100)
      : 0;

  const autopayCycleAmount =
    selectedCount > 1 ? Math.ceil(autopayJourneyWithMarkup / selectedCount) : 0;

  const autopayTotalPayable = selectedCount > 1 ? autopayCycleAmount * selectedCount : 0;

  return {
    selectedCount,
    planPercentage: plan.pricePercentage,
    baseSelectedTotal,
    planAdjustedBase,
    familyAddOnTotal,
    upfrontDiscountPercent,
    upfrontDiscountAmount,
    upfrontPayable,
    autopayMarkupPercent: AUTOPAY_MARKUP_PERCENT,
    autopayCycleAmount,
    autopayTotalPayable,
    autopayTotalCount: selectedCount,
    addonPerFamilyMemberPerJyotirlinga: FAMILY_MEMBER_ADDON_PER_MEMBER,
  };
};

const createRazorpayCustomer = async ({
  name,
  email,
  mobile,
  orderID,
}: {
  name: string;
  email: string;
  mobile: string;
  orderID: string;
}): Promise<{ id: string }> => {
  const customer = await razorpay.customers.create({
    name,
    email: email || undefined,
    contact: mobile,
    fail_existing: "0",
    notes: {
      internal_order_id: orderID,
      product: "12_jyotirlinga",
    },
  } as unknown as CustomersCreateParams);

  return customer as unknown as { id: string };
};

const fetchPaymentById = async (paymentId: string): Promise<RazorpayPaymentEntity> =>
  (await razorpay.payments.fetch(paymentId)) as unknown as RazorpayPaymentEntity;

interface RecurringPaymentResponse {
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

const createRecurringPaymentViaAPI = async ({
  email,
  contact,
  amountPaise,
  orderId,
  customerId,
  tokenId,
  description,
  notes,
}: {
  email: string;
  contact: string;
  amountPaise: number;
  orderId: string;
  customerId: string;
  tokenId: string;
  description: string;
  notes?: Record<string, string>;
}): Promise<RecurringPaymentResponse> => {
  const response = await axios.post<RecurringPaymentResponse>(
    "https://api.razorpay.com/v1/payments/create/recurring",
    {
      email,
      contact,
      amount: amountPaise,
      currency: "INR",
      order_id: orderId,
      customer_id: customerId,
      token: tokenId,
      recurring: true,
      description,
      notes: notes || {},
    },
    {
      headers: {
        Authorization: getBasicAuthHeader(),
        "Content-Type": "application/json",
      },
      timeout: 30000,
    },
  );

  return response.data;
};

export const createConfirmedUpfrontBookingFromPending = async ({
  pending,
  razorpayPaymentId,
  razorpayOrderId,
  razorpaySignature,
  paymentStatus,
  source,
}: {
  pending: IPendingJyotirlingaBooking;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  paymentStatus: string;
  source: string;
}): Promise<IJyotirlingaSubscriptionBooking> => {
  const existing = await JyotirlingaSubscriptionBooking.findOne({
    orderID: pending.orderID,
  });

  if (existing) {
    await PendingJyotirlingaBooking.deleteOne({ _id: pending._id });
    return existing;
  }

  const details = pending.bookingDetails as SubscriptionBookingDetails;

  const booking = await JyotirlingaSubscriptionBooking.create({
    orderID: pending.orderID,
    name: details.name,
    mobile: details.mobile,
    email: details.email || "",
    gotra: details.gotra,
    planId: details.planId,
    planName: details.planName,
    referralCode: details.referralCode,
    paymentMode: "upfront",
    jyotirlingaIds: details.jyotirlingaIds,
    selectedJyotirlingaCount: details.selectedJyotirlingaCount,
    totalPrice: details.pricingSnapshot.upfrontPayable,
    pricingSnapshot: details.pricingSnapshot,
    familyMembers: details.familyMembers || [],
    deliveryAddress: details.deliveryAddress || null,
    payment: {
      provider: "razorpay",
      mode: "upfront",
      status: paymentStatus,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      verifiedAt: new Date(),
      lastWebhookEvent: source,
      lastWebhookAt: new Date(),
    },
    autopay: null,
    status: "confirmed",
    bookingDate: details.bookingDate || new Date(),
    ...(details.vv_utm ? { vv_utm: details.vv_utm } : {}),
  });

  void runJyotirlingaPostConfirmSideEffects(booking);

  // Partner-affiliate commission — 12 Jyotirlinga Subscription. Best-effort, non-blocking.
  void pushVedicVaibhavOrderCommission({
    referralCode: booking.referralCode,
    orderId: booking.orderID,
    orderPrice: Number(booking.totalPrice) || 0,
    department: "JYOTIRLINGA_SUBSCRIPTION",
    productName: "JYOTIRLINGA_SUBSCRIPTION",
    phone: booking.mobile,
  });

  await PendingJyotirlingaBooking.deleteOne({ _id: pending._id });
  return booking;
};

export const createConfirmedAutopayBookingFromPending = async ({
  pending,
  razorpayPaymentId,
  razorpayOrderId,
  razorpaySignature,
  customerId,
  tokenId,
  paymentStatus,
  source,
  provider = "razorpay",
  easebuzzPaymentId = "",
}: {
  pending: IPendingJyotirlingaBooking;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  customerId: string;
  tokenId: string;
  paymentStatus: string;
  source: string;
  provider?: "razorpay" | "easebuzz";
  easebuzzPaymentId?: string;
}): Promise<IJyotirlingaSubscriptionBooking> => {
  const existing = await JyotirlingaSubscriptionBooking.findOne({
    orderID: pending.orderID,
  });

  if (existing) {
    if (!existing.autopay?.tokenId && tokenId) {
      existing.autopay = {
        ...(existing.autopay as IAutopayMeta),
        tokenId,
      };
      await existing.save();
    }
    await PendingJyotirlingaBooking.deleteOne({ _id: pending._id });
    return existing;
  }

  const details = pending.bookingDetails as SubscriptionBookingDetails;
  const recurringValue = getISTDayOfMonth();

  const booking = await JyotirlingaSubscriptionBooking.create({
    orderID: pending.orderID,
    name: details.name,
    mobile: details.mobile,
    email: details.email || "",
    gotra: details.gotra,
    planId: details.planId,
    planName: details.planName,
    referralCode: details.referralCode,
    paymentMode: "autopay",
    jyotirlingaIds: details.jyotirlingaIds,
    selectedJyotirlingaCount: details.selectedJyotirlingaCount,
    totalPrice: details.pricingSnapshot.autopayTotalPayable,
    pricingSnapshot: details.pricingSnapshot,
    familyMembers: details.familyMembers || [],
    deliveryAddress: details.deliveryAddress || null,
    payment: {
      provider,
      mode: "autopay",
      status: paymentStatus,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      easebuzzPaymentId,
      verifiedAt: new Date(),
      lastWebhookEvent: source,
      lastWebhookAt: new Date(),
    },
    autopay: {
      customerId,
      tokenId,
      authOrderId: razorpayOrderId || pending.orderID,
      authPaymentId: razorpayPaymentId || easebuzzPaymentId,
      authSignature: razorpaySignature,
      authAmount: AUTOPAY_AUTH_AMOUNT_PAISE / 100,
      mandateStatus: "confirmed",
      maxChargeAmount: details.pricingSnapshot.autopayCycleAmount,
      frequency: "monthly",
      recurringValue,
      recurringType: "on",
      cyclesTotal: details.pricingSnapshot.autopayTotalCount,
      cyclesCharged: 0,
      nextChargeAt: addMonthsSafe(new Date(), 1),
      lastChargeAt: null,
      charges: [],
    },
    status: "confirmed",
    bookingDate: details.bookingDate || new Date(),
    ...(details.vv_utm ? { vv_utm: details.vv_utm } : {}),
  });

  void runJyotirlingaPostConfirmSideEffects(booking);

  // Partner-affiliate commission — 12 Jyotirlinga Subscription. Best-effort, non-blocking.
  void pushVedicVaibhavOrderCommission({
    referralCode: booking.referralCode,
    orderId: booking.orderID,
    orderPrice: Number(booking.totalPrice) || 0,
    department: "JYOTIRLINGA_SUBSCRIPTION",
    productName: "JYOTIRLINGA_SUBSCRIPTION",
    phone: booking.mobile,
  });

  await PendingJyotirlingaBooking.deleteOne({ _id: pending._id });
  return booking;
};

const markAutopayChargeCaptured = async ({
  booking,
  orderId,
  paymentId,
  signature = "",
  source,
}: {
  booking: IJyotirlingaSubscriptionBooking;
  orderId: string;
  paymentId: string;
  signature?: string;
  source: string;
}): Promise<IJyotirlingaSubscriptionBooking> => {
  const autopay = booking.autopay;
  if (!autopay) return booking;

  const targetCharge = autopay.charges.find(
    (charge) => charge.gateway?.orderId === orderId || charge.gateway?.paymentId === paymentId,
  );

  if (targetCharge) {
    if (targetCharge.status !== "captured") {
      targetCharge.status = "captured";
      targetCharge.capturedAt = new Date();
      targetCharge.gateway.paymentId = paymentId;
      if (signature) targetCharge.gateway.signature = signature;
      autopay.cyclesCharged += 1;
      autopay.lastChargeAt = new Date();
      autopay.nextChargeAt =
        autopay.cyclesCharged >= autopay.cyclesTotal ? null : addMonthsSafe(new Date(), 1);
    }
  }

  booking.payment.lastWebhookEvent = source;
  booking.payment.lastWebhookAt = new Date();
  booking.status = autopay.cyclesCharged >= autopay.cyclesTotal ? "completed" : "active";

  await booking.save();
  return booking;
};

const markAutopayChargeFailed = async ({
  booking,
  orderId,
  paymentId,
  message,
  source,
}: {
  booking: IJyotirlingaSubscriptionBooking;
  orderId: string;
  paymentId: string;
  message: string;
  source: string;
}): Promise<IJyotirlingaSubscriptionBooking> => {
  const autopay = booking.autopay;
  if (!autopay) return booking;

  const charge = autopay.charges.find(
    (item) => item.gateway?.orderId === orderId || item.gateway?.paymentId === paymentId,
  );

  if (charge) {
    charge.status = "failed";
    charge.failedAt = new Date();
    charge.errorMessage = message || "Payment failed";
    if (paymentId) charge.gateway.paymentId = paymentId;
  }

  booking.payment.lastWebhookEvent = source;
  booking.payment.lastWebhookAt = new Date();
  booking.status = "failed";

  await booking.save();
  return booking;
};

export const initiateJyotirlingaPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const name = normalizeString(req.body?.name);
    const mobile = normalizeString(req.body?.mobile);
    const email = normalizeString(req.body?.email);
    const gotra = normalizeString(req.body?.gotra) || "Kashyap";
    const planId = normalizeString(req.body?.planId) as "Basic" | "Intermediate" | "Advance";
    const paymentMode = normalizeString(req.body?.paymentMode) as JyotirlingaPaymentMode;
    const jyotirlingaIds = uniqueStringIds(req.body?.jyotirlingaIds || []);
    const familyMembers: IFamilyMember[] = Array.isArray(req.body?.familyMembers)
      ? (req.body.familyMembers as unknown[]).map((m) => ({
          name: normalizeString((m as { name?: unknown } | null | undefined)?.name),
          gotra: normalizeString((m as { gotra?: unknown } | null | undefined)?.gotra),
        }))
      : [];
    const deliveryAddress = (req.body?.deliveryAddress || null) as {
      name?: unknown;
      line1?: unknown;
      line2?: unknown;
      city?: unknown;
      state?: unknown;
      pinCode?: unknown;
    } | null;
    const discountedAmount = req.body?.discountedAmount;
    const vv_utm = (req.body?.vv_utm || undefined) as IVvUtm | undefined;

    if (!name || !mobile || !gotra || !planId || !paymentMode) {
      res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
      return;
    }

    if (!isValidMobile(mobile)) {
      res.status(400).json({
        success: false,
        message: "Invalid mobile number.",
      });
      return;
    }

    if (!["upfront", "autopay"].includes(paymentMode)) {
      res.status(400).json({
        success: false,
        message: "Invalid payment mode.",
      });
      return;
    }

    if (!jyotirlingaIds.length) {
      res.status(400).json({
        success: false,
        message: "Please select at least one Jyotirlinga.",
      });
      return;
    }

    if (paymentMode === "autopay" && jyotirlingaIds.length < 2) {
      res.status(400).json({
        success: false,
        message: "Monthly AutoPay is available only for multiple Jyotirlingas.",
      });
      return;
    }

    if (!env.razorpay.keyId || !env.razorpay.keySecret) {
      res.status(500).json({
        success: false,
        message: "Server misconfiguration: Razorpay keys missing.",
      });
      return;
    }

    const [selectedJyotirlingas, plan] = await Promise.all([
      Jyotirlinga.find({ _id: { $in: jyotirlingaIds } })
        .sort({ monthNumber: 1 })
        .lean(),
      Plan.findOne({ planId }).lean(),
    ]);

    if (!plan) {
      res.status(404).json({
        success: false,
        message: "Plan not found.",
      });
      return;
    }

    if (selectedJyotirlingas.length !== jyotirlingaIds.length) {
      res.status(400).json({
        success: false,
        message: "Some selected Jyotirlingas were not found.",
      });
      return;
    }

    const requiresAddress = planId === "Intermediate" || planId === "Advance";
    if (requiresAddress) {
      if (
        !normalizeString(deliveryAddress?.name) ||
        !normalizeString(deliveryAddress?.line1) ||
        !normalizeString(deliveryAddress?.city) ||
        !normalizeString(deliveryAddress?.state) ||
        !/^\d{6}$/.test(normalizeString(deliveryAddress?.pinCode))
      ) {
        res.status(400).json({
          success: false,
          message: "Valid delivery address is required for this plan.",
        });
        return;
      }
    }

    if (familyMembers.some((m) => !m.name || !m.gotra)) {
      res.status(400).json({
        success: false,
        message: "Each family member must have name and gotra.",
      });
      return;
    }

    const pricingSnapshot = calculatePricing({
      selectedJyotirlingas,
      plan: {
        pricePercentage: Number(plan.pricePercentage || 0),
        yearlyPercentageDiscount: Number(plan.yearlyPercentageDiscount || 0),
      },
      familyMembersCount: familyMembers.length,
      planId,
    });

    const parsedDiscount = Number(discountedAmount);
    if (parsedDiscount && parsedDiscount >= 1 && parsedDiscount <= pricingSnapshot.upfrontPayable) {
      pricingSnapshot.upfrontPayable = parsedDiscount;
    }

    const orderID = generateOrderID();

    const bookingDetails: SubscriptionBookingDetails = {
      name,
      mobile,
      email,
      gotra,
      planId,
      planName: plan.uiName || (plan as { name?: string }).name || planId,
      paymentMode,
      jyotirlingaIds: selectedJyotirlingas.map((j) => j._id as Types.ObjectId),
      selectedJyotirlingaCount: selectedJyotirlingas.length,
      familyMembers,
      deliveryAddress: requiresAddress
        ? {
            name: normalizeString(deliveryAddress?.name),
            mobile,
            line1: normalizeString(deliveryAddress?.line1),
            line2: normalizeString(deliveryAddress?.line2),
            city: normalizeString(deliveryAddress?.city),
            state: normalizeString(deliveryAddress?.state),
            pinCode: normalizeString(deliveryAddress?.pinCode),
          }
        : null,
      pricingSnapshot,
      bookingDate: new Date(),
      referralCode: req.body?.referralCode ? String(req.body.referralCode).trim() : undefined,
      ...(vv_utm ? { vv_utm } : {}),
    };

    if (paymentMode === "upfront") {
      const amountPaise = pricingSnapshot.upfrontPayable * 100;

      const razorpayOrder = await razorpay.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: orderID,
        notes: {
          internal_order_id: orderID,
          payment_mode: "upfront",
          selected_count: String(selectedJyotirlingas.length),
          plan_id: planId,
        },
      } as unknown as OrdersCreateParams);

      await PendingJyotirlingaBooking.create({
        orderID,
        bookingDetails,
        gatewayRefs: {
          paymentMode: "upfront",
          authOrderId: razorpayOrder.id,
        },
        status: "pending",
        statusDate: new Date(),
      });

      res.status(200).json({
        success: true,
        mode: "upfront",
        gateway: "razorpay",
        orderID,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: razorpayKeyId,
      });
      return;
    }

    // Razorpay Autopay Logic ...
    const customer = await createRazorpayCustomer({
      name,
      email,
      mobile,
      orderID,
    });

    const recurringValue = getISTDayOfMonth();
    const expireAt = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60;

    const authOrder = await razorpay.orders.create({
      amount: AUTOPAY_AUTH_AMOUNT_PAISE,
      currency: "INR",
      customer_id: customer.id,
      method: "upi",
      receipt: orderID,
      token: {
        max_amount: pricingSnapshot.autopayCycleAmount * 100,
        expire_at: expireAt,
        frequency: "monthly",
        recurring_value: recurringValue,
        recurring_type: "on",
      },
      notes: {
        internal_order_id: orderID,
        payment_mode: "autopay",
        selected_count: String(selectedJyotirlingas.length),
        plan_id: planId,
      },
    } as unknown as OrdersCreateParams);

    await PendingJyotirlingaBooking.create({
      orderID,
      bookingDetails,
      gatewayRefs: {
        paymentMode: "autopay",
        authCustomerId: customer.id,
        authOrderId: authOrder.id,
      },
      status: "pending",
      statusDate: new Date(),
    });

    res.status(200).json({
      success: true,
      mode: "autopay",
      orderID,
      customerId: customer.id,
      razorpayOrderId: authOrder.id,
      amount: authOrder.amount,
      currency: authOrder.currency,
      authPurpose: "upi_mandate_registration",
      cycleAmount: pricingSnapshot.autopayCycleAmount,
      totalCount: pricingSnapshot.autopayTotalCount,
      key: razorpayKeyId,
    });
  } catch (err) {
    logger.error({ err }, "[Jyotirlinga] initiateJyotirlingaPayment error");
    res.status(500).json({
      success: false,
      message: "Payment initiation failed.",
      error: errMessage(err),
    });
  }
};

export const verifyJyotirlingaPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderID = normalizeString(req.body?.orderID);
    const paymentMode = normalizeString(req.body?.paymentMode) as JyotirlingaPaymentMode;

    const razorpayPaymentId = normalizeString(req.body?.razorpay_payment_id);
    const razorpayOrderId = normalizeString(req.body?.razorpay_order_id);
    const razorpaySignature = normalizeString(req.body?.razorpay_signature);

    if (!orderID || !paymentMode) {
      res.status(400).json({
        success: false,
        message: "Missing orderID or paymentMode.",
      });
      return;
    }

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      res.status(400).json({
        success: false,
        message: "Missing Razorpay payment fields.",
      });
      return;
    }

    if (!env.razorpay.keySecret) {
      res.status(500).json({
        success: false,
        message: "Server misconfiguration: RAZORPAY_KEY_SECRET missing.",
      });
      return;
    }

    const valid = isPaymentSignatureValid({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!valid) {
      res.status(400).json({
        success: false,
        message: "Invalid payment signature.",
      });
      return;
    }

    const pending = await PendingJyotirlingaBooking.findOne({ orderID });
    const existing = await JyotirlingaSubscriptionBooking.findOne({ orderID });

    if (existing) {
      if (pending) {
        await PendingJyotirlingaBooking.deleteOne({ _id: pending._id });
      }
      res.status(200).json({
        success: true,
        alreadyExists: true,
        message: "Booking already confirmed.",
        orderID,
        bookingId: existing._id,
      });
      return;
    }

    if (!pending) {
      res.status(404).json({
        success: false,
        message: "Pending booking not found.",
      });
      return;
    }

    if (paymentMode === "upfront") {
      let payment = await fetchPaymentById(razorpayPaymentId);

      if (payment.status === "authorized" && !payment.captured) {
        try {
          await razorpay.payments.capture(razorpayPaymentId, payment.amount, payment.currency);
          payment = await fetchPaymentById(razorpayPaymentId);
        } catch (captureError) {
          logger.error({ err: captureError }, "[Jyotirlinga] upfront capture failed");
        }
      }

      const booking = await createConfirmedUpfrontBookingFromPending({
        pending,
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature,
        paymentStatus: payment.status || "captured",
        source: "verify:upfront",
      });

      // Meta CAPI purchase — Razorpay upfront path
      try {
        const d = pending.bookingDetails as SubscriptionBookingDetails;
        await sendMetaPurchaseEvent({
          orderID: String(orderID),
          value: d?.pricingSnapshot?.upfrontPayable || 0,
          currency: "INR",
          contentId: String(d?.planName || "JYOTIRLINGA"),
          deliveryCategory: "home_delivery",
          actionSource: "website",
          phone: String(d?.mobile || ""),
          email: d?.email || null,
          externalId: String(d?.userID || ""),
          clientIp:
            (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
            req.socket?.remoteAddress ||
            null,
          userAgent: (req.headers["user-agent"] as string) || null,
          fbp: (req.headers["x-fbp"] as string) || null,
          fbc: (req.headers["x-fbc"] as string) || null,
          eventSourceUrl:
            (req.headers["x-event-source-url"] as string) || env.metaCapi.defaultEventSourceUrl || null,
          eventIdPrefix: "jyotirlinga_purchase_",
        });
      } catch (e) {
        logger.error({ err: errDetail(e) }, "[MetaCAPI][Jyotirlinga][Upfront] Purchase failed");
      }

      res.status(200).json({
        success: true,
        message: "Payment verified and booking confirmed.",
        orderID,
        bookingId: booking._id,
      });
      return;
    }

    let payment = await fetchPaymentById(razorpayPaymentId);

    if (payment.status === "authorized" && !payment.captured) {
      try {
        await razorpay.payments.capture(razorpayPaymentId, payment.amount, payment.currency);
        payment = await fetchPaymentById(razorpayPaymentId);
      } catch (captureError) {
        logger.error({ err: captureError }, "[Jyotirlinga] autopay auth capture failed");
      }
    }

    const tokenId = payment?.token_id;
    const customerId = payment?.customer_id || pending.gatewayRefs?.authCustomerId || "";

    if (!tokenId || !customerId) {
      res.status(400).json({
        success: false,
        message:
          "Mandate payment succeeded but token/customer was not returned yet. Please retry after a moment.",
      });
      return;
    }

    const booking = await createConfirmedAutopayBookingFromPending({
      pending,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      customerId,
      tokenId,
      paymentStatus: payment.status || "captured",
      source: "verify:autopay",
    });

    // Meta CAPI purchase — Razorpay autopay path
    try {
      const d = pending.bookingDetails as SubscriptionBookingDetails;
      await sendMetaPurchaseEvent({
        orderID: String(orderID),
        value: d?.pricingSnapshot?.autopayMonthly || 0,
        currency: "INR",
        contentId: String(d?.planName || "JYOTIRLINGA_AUTOPAY"),
        deliveryCategory: "home_delivery",
        actionSource: "website",
        phone: String(d?.mobile || ""),
        email: d?.email || null,
        externalId: String(d?.userID || ""),
        clientIp:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          req.socket?.remoteAddress ||
          null,
        userAgent: (req.headers["user-agent"] as string) || null,
        fbp: (req.headers["x-fbp"] as string) || null,
        fbc: (req.headers["x-fbc"] as string) || null,
        eventSourceUrl:
          (req.headers["x-event-source-url"] as string) || env.metaCapi.defaultEventSourceUrl || null,
        eventIdPrefix: "jyotirlinga_purchase_",
      });
    } catch (e) {
      logger.error({ err: errDetail(e) }, "[MetaCAPI][Jyotirlinga][Autopay] Purchase failed");
    }

    res.status(200).json({
      success: true,
      message: "UPI AutoPay mandate verified and booking confirmed.",
      orderID,
      bookingId: booking._id,
      tokenId,
    });
  } catch (err) {
    logger.error({ err }, "[Jyotirlinga] verifyJyotirlingaPayment error");
    res.status(500).json({
      success: false,
      message: "Payment verification failed.",
      error: errMessage(err),
    });
  }
};

export const chargeNextAutopayInstallment = async (req: Request, res: Response): Promise<void> => {
  try {
    const bookingId = normalizeString(req.params?.bookingId);

    if (!bookingId) {
      res.status(400).json({
        success: false,
        message: "Missing bookingId.",
      });
      return;
    }

    const booking = await JyotirlingaSubscriptionBooking.findById(bookingId);

    if (!booking) {
      res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
      return;
    }

    const autopay = booking.autopay;
    if (booking.paymentMode !== "autopay" || !autopay) {
      res.status(400).json({
        success: false,
        message: "This booking is not an AutoPay booking.",
      });
      return;
    }

    if (
      !autopay.customerId ||
      !autopay.tokenId ||
      autopay.mandateStatus === "rejected" ||
      autopay.mandateStatus === "cancelled" ||
      autopay.mandateStatus === "paused"
    ) {
      res.status(400).json({
        success: false,
        message: "Mandate is not active for charging.",
      });
      return;
    }

    if (autopay.cyclesCharged >= autopay.cyclesTotal) {
      res.status(400).json({
        success: false,
        message: "All installments are already completed.",
      });
      return;
    }

    const latestPendingCharge = autopay.charges.find((charge) => charge.status === "initiated");

    if (latestPendingCharge) {
      res.status(400).json({
        success: false,
        message:
          "Previous installment is still pending. Wait for webhook/API status before creating another charge.",
      });
      return;
    }

    const nextCycle = autopay.cyclesCharged + 1;
    const amountPaise = booking.pricingSnapshot.autopayCycleAmount * 100;
    const receipt = `${booking.orderID}-CYCLE-${nextCycle}`;

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      payment_capture: true,
      receipt,
      notes: {
        internal_order_id: booking.orderID,
        booking_id: String(booking._id),
        cycle_number: String(nextCycle),
        payment_mode: "autopay_recurring",
      },
    } as unknown as OrdersCreateParams);

    const recurringResponse = await createRecurringPaymentViaAPI({
      email: booking.email || `${booking.mobile}@gmail.com`,
      contact: booking.mobile,
      amountPaise,
      orderId: order.id,
      customerId: autopay.customerId,
      tokenId: autopay.tokenId,
      description: `Jyotirlinga AutoPay installment ${nextCycle}`,
      notes: {
        internal_order_id: booking.orderID,
        booking_id: String(booking._id),
        cycle_number: String(nextCycle),
      },
    });

    autopay.charges.push({
      cycleNumber: nextCycle,
      amount: booking.pricingSnapshot.autopayCycleAmount,
      status: "initiated",
      initiatedAt: new Date(),
      gateway: {
        orderId: order.id,
        paymentId: recurringResponse?.razorpay_payment_id || "",
        signature: recurringResponse?.razorpay_signature || "",
      },
    });

    booking.payment.lastWebhookEvent = "manual:charge_next_installment";
    booking.payment.lastWebhookAt = new Date();
    await booking.save();

    res.status(200).json({
      success: true,
      message: "Recurring installment initiated.",
      bookingId: booking._id,
      cycleNumber: nextCycle,
      razorpayOrderId: order.id,
      razorpayPaymentId: recurringResponse?.razorpay_payment_id || "",
    });
  } catch (err) {
    logger.error({ err }, "[Jyotirlinga] chargeNextAutopayInstallment error");
    res.status(500).json({
      success: false,
      message: "Failed to initiate recurring installment.",
      error: errDetail(err),
    });
  }
};

export const handleJyotirlingaRazorpayWebhook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  let eventLog: IRazorpayWebhookEvent | null = null;

  try {
    if (!env.razorpay.webhookSecret) {
      res.status(500).json({
        success: false,
        message: "RAZORPAY_WEBHOOK_SECRET is missing.",
      });
      return;
    }

    const signatureHeader = req.headers["x-razorpay-signature"];
    const eventIdHeader = req.headers["x-razorpay-event-id"];

    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader || "";

    const eventId = Array.isArray(eventIdHeader)
      ? eventIdHeader[0]
      : eventIdHeader || `no-event-id-${Date.now()}`;

    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body || {});

    if (!signature) {
      res.status(400).json({
        success: false,
        message: "Missing webhook signature.",
      });
      return;
    }

    if (!isWebhookSignatureValid(rawBody, signature)) {
      res.status(400).json({
        success: false,
        message: "Invalid webhook signature.",
      });
      return;
    }

    let payload: RazorpayWebhookPayload = {};
    try {
      payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    } catch {
      res.status(400).json({
        success: false,
        message: "Invalid webhook payload.",
      });
      return;
    }

    try {
      eventLog = await RazorpayWebhookEvent.create({
        eventId,
        event: payload?.event || "unknown",
        entityId:
          payload?.payload?.payment?.entity?.id ||
          payload?.payload?.token?.entity?.id ||
          payload?.payload?.order?.entity?.id ||
          "",
        payload,
        status: "processing",
        receivedAt: new Date(),
      });
    } catch (createErr) {
      if ((createErr as { code?: number } | null | undefined)?.code === 11000) {
        res.status(200).json({
          success: true,
          duplicate: true,
          message: "Duplicate webhook ignored.",
        });
        return;
      }
      throw createErr;
    }

    const eventName = payload?.event;
    const paymentEntity = payload?.payload?.payment?.entity;
    const tokenEntity = payload?.payload?.token?.entity;
    const orderEntity = payload?.payload?.order?.entity;

    if (eventName === "payment.authorized") {
      if (paymentEntity?.status === "authorized" && paymentEntity?.id) {
        try {
          await razorpay.payments.capture(
            paymentEntity.id,
            paymentEntity.amount,
            paymentEntity.currency,
          );
        } catch (captureError) {
          logger.error({ err: captureError }, "[Webhook] capture failed");
        }

        const pending = await PendingJyotirlingaBooking.findOne({
          "gatewayRefs.authOrderId": paymentEntity.order_id,
        });

        if (pending?.gatewayRefs.paymentMode === "autopay") {
          try {
            const payment = await fetchPaymentById(paymentEntity.id);
            if (payment?.token_id) {
              await createConfirmedAutopayBookingFromPending({
                pending,
                razorpayPaymentId: paymentEntity.id,
                razorpayOrderId: paymentEntity.order_id || "",
                razorpaySignature: "",
                customerId: payment.customer_id || pending.gatewayRefs.authCustomerId || "",
                tokenId: payment.token_id,
                paymentStatus: payment.status || "captured",
                source: eventName,
              });
            }
          } catch (err) {
            logger.error({ err }, "[Webhook] pending autopay auth confirm error");
          }
        }

        if (pending?.gatewayRefs.paymentMode === "upfront") {
          try {
            const payment = await fetchPaymentById(paymentEntity.id);
            await createConfirmedUpfrontBookingFromPending({
              pending,
              razorpayPaymentId: paymentEntity.id,
              razorpayOrderId: paymentEntity.order_id || "",
              razorpaySignature: "",
              paymentStatus: payment.status || "captured",
              source: eventName,
            });
          } catch (err) {
            logger.error({ err }, "[Webhook] pending upfront confirm error");
          }
        }
      }
    }

    if (eventName === "payment.captured" || eventName === "order.paid") {
      const orderId = paymentEntity?.order_id || orderEntity?.id;
      const paymentId = paymentEntity?.id || "";

      if (orderId && paymentId) {
        const pending = await PendingJyotirlingaBooking.findOne({
          "gatewayRefs.authOrderId": orderId,
        });

        if (pending?.gatewayRefs.paymentMode === "upfront") {
          const payment = await fetchPaymentById(paymentId);
          await createConfirmedUpfrontBookingFromPending({
            pending,
            razorpayPaymentId: paymentId,
            razorpayOrderId: orderId,
            razorpaySignature: "",
            paymentStatus: payment.status || "captured",
            source: eventName,
          });
        }

        if (pending?.gatewayRefs.paymentMode === "autopay") {
          const payment = await fetchPaymentById(paymentId);
          if (payment?.token_id) {
            await createConfirmedAutopayBookingFromPending({
              pending,
              razorpayPaymentId: paymentId,
              razorpayOrderId: orderId,
              razorpaySignature: "",
              customerId: payment.customer_id || pending.gatewayRefs.authCustomerId || "",
              tokenId: payment.token_id,
              paymentStatus: payment.status || "captured",
              source: eventName,
            });
          }
        }

        const booking = await JyotirlingaSubscriptionBooking.findOne({
          "autopay.charges.gateway.orderId": orderId,
        });

        if (booking) {
          await markAutopayChargeCaptured({
            booking,
            orderId,
            paymentId,
            source: eventName,
          });
        }
      }
    }

    if (eventName === "payment.failed") {
      const orderId = paymentEntity?.order_id || "";
      const paymentId = paymentEntity?.id || "";
      const errorMessage = paymentEntity?.error_description || "Payment failed";

      const pending = await PendingJyotirlingaBooking.findOne({
        "gatewayRefs.authOrderId": orderId,
      });

      if (pending) {
        await PendingJyotirlingaBooking.updateOne(
          { _id: pending._id },
          { $set: { status: "failed", statusDate: new Date() } },
        );
      }

      const chargeBooking = await JyotirlingaSubscriptionBooking.findOne({
        "autopay.charges.gateway.orderId": orderId,
      });

      if (chargeBooking) {
        await markAutopayChargeFailed({
          booking: chargeBooking,
          orderId,
          paymentId,
          message: errorMessage,
          source: eventName,
        });
      }
    }

    if (eventName === "token.confirmed" && tokenEntity?.id) {
      const booking = await JyotirlingaSubscriptionBooking.findOne({
        "autopay.tokenId": tokenEntity.id,
      });

      if (booking?.autopay) {
        booking.autopay.mandateStatus = "confirmed";
        booking.status =
          booking.autopay.cyclesCharged >= booking.autopay.cyclesTotal ? "completed" : "active";
        booking.payment.lastWebhookEvent = eventName;
        booking.payment.lastWebhookAt = new Date();
        await booking.save();
      }
    }

    if (eventName === "token.rejected" && tokenEntity?.id) {
      const booking = await JyotirlingaSubscriptionBooking.findOne({
        "autopay.tokenId": tokenEntity.id,
      });

      if (booking?.autopay) {
        booking.autopay.mandateStatus = "rejected";
        booking.status = "failed";
        booking.payment.lastWebhookEvent = eventName;
        booking.payment.lastWebhookAt = new Date();
        await booking.save();
      }
    }

    if (eventName === "token.cancelled" && tokenEntity?.id) {
      const booking = await JyotirlingaSubscriptionBooking.findOne({
        "autopay.tokenId": tokenEntity.id,
      });

      if (booking?.autopay) {
        booking.autopay.mandateStatus = "cancelled";
        booking.status = "cancelled";
        booking.payment.lastWebhookEvent = eventName;
        booking.payment.lastWebhookAt = new Date();
        await booking.save();
      }
    }

    if (eventName === "token.paused" && tokenEntity?.id) {
      const booking = await JyotirlingaSubscriptionBooking.findOne({
        "autopay.tokenId": tokenEntity.id,
      });

      if (booking?.autopay) {
        booking.autopay.mandateStatus = "paused";
        booking.status = "paused";
        booking.payment.lastWebhookEvent = eventName;
        booking.payment.lastWebhookAt = new Date();
        await booking.save();
      }
    }

    if (eventLog) {
      eventLog.status = "processed";
      eventLog.processedAt = new Date();
      await eventLog.save();
    }

    res.status(200).json({ success: true });
  } catch (err) {
    logger.error({ err }, "[Jyotirlinga] webhook error");

    if (eventLog) {
      eventLog.status = "failed";
      eventLog.errorMessage = errMessage(err);
      eventLog.processedAt = new Date();
      await eventLog.save();
    }

    res.status(500).json({
      success: false,
      message: "Webhook processing failed.",
      error: errMessage(err),
    });
  }
};

export const submitJyotirlingaReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderID, rating, review } = req.body as {
      orderID?: string;
      rating?: number;
      review?: string;
    };
    if (!orderID) {
      res.status(400).json({ success: false, message: "orderID is required" });
      return;
    }

    const booking = await JyotirlingaSubscriptionBooking.findOneAndUpdate(
      { orderID },
      { rating, review },
      { new: true },
    );

    if (!booking) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Review submitted successfully" });
  } catch (err) {
    logger.error({ err }, "[Jyotirlinga] review error");
    res.status(500).json({ success: false, message: "Failed to submit review" });
  }
};

export const getSubscriptionsByMobile = async (req: Request, res: Response): Promise<void> => {
  try {
    const mobile = normalizeString(req.params.mobile);

    if (!mobile || !isValidMobile(mobile)) {
      res.status(400).json({
        success: false,
        message: "A valid 10-digit mobile number is required.",
      });
      return;
    }

    const bookings = await JyotirlingaSubscriptionBooking.find({ mobile })
      .populate("jyotirlingaIds", "nameEnglish nameHindi location image")
      .sort({ bookingDate: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (err) {
    logger.error({ err }, "[Jyotirlinga] getSubscriptionsByMobile error");
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings.",
      error: errMessage(err),
    });
  }
};
