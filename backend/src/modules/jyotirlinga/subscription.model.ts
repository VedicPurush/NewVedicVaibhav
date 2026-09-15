import { Schema, Types, type Document, type Model } from "mongoose";
import { dbJyotirling } from "../../config/db";

export type JyotirlingaPaymentMode = "upfront" | "autopay";

export interface IDeliveryAddress {
  name: string;
  mobile: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pinCode: string;
}

const DeliveryAddressSchema = new Schema<IDeliveryAddress>(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String, default: "" },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pinCode: { type: String, required: true },
  },
  { _id: false },
);

export interface IFamilyMember {
  name: string;
  gotra: string;
}

const FamilyMemberSchema = new Schema<IFamilyMember>(
  {
    name: { type: String, required: true },
    gotra: { type: String, required: true },
  },
  { _id: false },
);

export interface IPricingSnapshot {
  selectedCount: number;
  planPercentage: number;
  baseSelectedTotal: number;
  planAdjustedBase: number;
  familyAddOnTotal: number;
  upfrontDiscountPercent: number;
  upfrontDiscountAmount: number;
  upfrontPayable: number;
  autopayMarkupPercent: number;
  autopayCycleAmount: number;
  autopayTotalPayable: number;
  autopayTotalCount: number;
  addonPerFamilyMemberPerJyotirlinga: number;
}

const PricingSnapshotSchema = new Schema<IPricingSnapshot>(
  {
    selectedCount: { type: Number, required: true },
    planPercentage: { type: Number, required: true },
    baseSelectedTotal: { type: Number, required: true },
    planAdjustedBase: { type: Number, required: true },
    familyAddOnTotal: { type: Number, required: true },
    upfrontDiscountPercent: { type: Number, required: true },
    upfrontDiscountAmount: { type: Number, required: true },
    upfrontPayable: { type: Number, required: true },
    autopayMarkupPercent: { type: Number, required: true },
    autopayCycleAmount: { type: Number, required: true },
    autopayTotalPayable: { type: Number, required: true },
    autopayTotalCount: { type: Number, required: true },
    addonPerFamilyMemberPerJyotirlinga: { type: Number, required: true },
  },
  { _id: false },
);

export interface IAutopayCharge {
  cycleNumber: number;
  amount: number;
  status: "initiated" | "captured" | "failed";
  initiatedAt?: Date | null;
  capturedAt?: Date | null;
  failedAt?: Date | null;
  errorMessage?: string;
  gateway: {
    orderId?: string;
    paymentId?: string;
    signature?: string;
    notificationId?: string;
  };
}

const AutopayChargeSchema = new Schema<IAutopayCharge>(
  {
    cycleNumber: { type: Number, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["initiated", "captured", "failed"],
      required: true,
      default: "initiated",
    },
    initiatedAt: { type: Date, default: null },
    capturedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    errorMessage: { type: String, default: "" },
    gateway: {
      orderId: { type: String, default: "" },
      paymentId: { type: String, default: "" },
      signature: { type: String, default: "" },
      notificationId: { type: String, default: "" },
    },
  },
  { _id: false },
);

export interface IAutopayMeta {
  customerId: string;
  tokenId: string;
  authOrderId: string;
  authPaymentId: string;
  authSignature: string;
  authAmount: number;
  mandateStatus: "pending_confirmation" | "confirmed" | "rejected" | "paused" | "cancelled";
  maxChargeAmount: number;
  frequency: "monthly";
  recurringValue: number;
  recurringType: "on";
  cyclesTotal: number;
  cyclesCharged: number;
  nextChargeAt?: Date | null;
  lastChargeAt?: Date | null;
  charges: IAutopayCharge[];
}

const AutopayMetaSchema = new Schema<IAutopayMeta>(
  {
    customerId: { type: String, default: "" },
    tokenId: { type: String, default: "" },
    authOrderId: { type: String, default: "" },
    authPaymentId: { type: String, default: "" },
    authSignature: { type: String, default: "" },
    authAmount: { type: Number, required: true },
    mandateStatus: {
      type: String,
      enum: ["pending_confirmation", "confirmed", "rejected", "paused", "cancelled"],
      default: "pending_confirmation",
    },
    maxChargeAmount: { type: Number, required: true },
    frequency: { type: String, enum: ["monthly"], default: "monthly" },
    recurringValue: { type: Number, required: true },
    recurringType: { type: String, enum: ["on"], default: "on" },
    cyclesTotal: { type: Number, required: true },
    cyclesCharged: { type: Number, default: 0 },
    nextChargeAt: { type: Date, default: null },
    lastChargeAt: { type: Date, default: null },
    charges: { type: [AutopayChargeSchema], default: [] },
  },
  { _id: false },
);

export interface IPaymentMeta {
  provider: "razorpay" | "easebuzz";
  mode: JyotirlingaPaymentMode;
  status: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  easebuzzPaymentId?: string;
  verifiedAt?: Date | null;
  lastWebhookEvent?: string;
  lastWebhookAt?: Date | null;
}

const PaymentMetaSchema = new Schema<IPaymentMeta>(
  {
    provider: { type: String, enum: ["razorpay", "easebuzz"], default: "razorpay" },
    mode: { type: String, enum: ["upfront", "autopay"], required: true },
    status: { type: String, required: true },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
    easebuzzPaymentId: { type: String, default: "" },
    verifiedAt: { type: Date, default: null },
    lastWebhookEvent: { type: String, default: "" },
    lastWebhookAt: { type: Date, default: null },
  },
  { _id: false },
);

export interface IVvUtm {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export interface IJyotirlingaSubscriptionBooking extends Document {
  orderID: string;
  referralCode?: string;
  /** Which surface the order was placed from — decides app vs website referral caps. */
  orderSource?: "APP" | "WEBSITE";
  name: string;
  mobile: string;
  email?: string;
  gotra: string;
  planId: "Basic" | "Intermediate" | "Advance";
  planName: string;
  paymentMode: JyotirlingaPaymentMode;
  jyotirlingaIds: Types.ObjectId[];
  selectedJyotirlingaCount: number;
  totalPrice: number;
  pricingSnapshot: IPricingSnapshot;
  familyMembers: IFamilyMember[];
  deliveryAddress?: IDeliveryAddress | null;
  payment: IPaymentMeta;
  autopay?: IAutopayMeta | null;
  status: "confirmed" | "active" | "paused" | "cancelled" | "completed" | "failed";
  rating?: number;
  review?: string;
  vv_utm?: IVvUtm;
  bookingDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const JyotirlingaSubscriptionBookingSchema = new Schema<IJyotirlingaSubscriptionBooking>(
  {
    orderID: { type: String, required: true, unique: true, index: true },
    referralCode: { type: String, default: null },
    orderSource: { type: String, enum: ["APP", "WEBSITE"], default: "WEBSITE" },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, default: "" },
    gotra: { type: String, required: true },
    planId: {
      type: String,
      required: true,
      enum: ["Basic", "Intermediate", "Advance"],
    },
    planName: { type: String, required: true },
    paymentMode: {
      type: String,
      required: true,
      enum: ["upfront", "autopay"],
    },
    jyotirlingaIds: [{ type: Schema.Types.ObjectId, ref: "Jyotirlinga" }],
    selectedJyotirlingaCount: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    pricingSnapshot: { type: PricingSnapshotSchema, required: true },
    familyMembers: { type: [FamilyMemberSchema], default: [] },
    deliveryAddress: { type: DeliveryAddressSchema, default: null },
    payment: { type: PaymentMetaSchema, required: true },
    autopay: { type: AutopayMetaSchema, default: null },
    status: {
      type: String,
      required: true,
      enum: ["confirmed", "active", "paused", "cancelled", "completed", "failed"],
    },
    bookingDate: { type: Date, default: Date.now },
    rating: { type: Number, min: 1, max: 5, default: null },
    review: { type: String, default: "" },
    vv_utm: {
      type: {
        utm_source: { type: String, default: "" },
        utm_medium: { type: String, default: "" },
        utm_campaign: { type: String, default: "" },
        utm_content: { type: String, default: "" },
        utm_term: { type: String, default: "" },
      },
      required: false,
    },
  },
  { timestamps: true },
);

export const JyotirlingaSubscriptionBooking: Model<IJyotirlingaSubscriptionBooking> =
  dbJyotirling.model<IJyotirlingaSubscriptionBooking>(
    "JyotirlingaSubscriptionBooking",
    JyotirlingaSubscriptionBookingSchema,
    "jyotirlingaSubscriptionBookings",
  );

export interface IPendingJyotirlingaBooking extends Document {
  orderID: string;
  bookingDetails: unknown;
  gatewayRefs: {
    paymentMode: JyotirlingaPaymentMode;
    authCustomerId?: string;
    authOrderId?: string;
  };
  status: "pending" | "failed";
  statusDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const PendingJyotirlingaBookingSchema = new Schema<IPendingJyotirlingaBooking>(
  {
    orderID: { type: String, required: true, unique: true, index: true },
    bookingDetails: { type: Schema.Types.Mixed, required: true },
    gatewayRefs: {
      paymentMode: {
        type: String,
        enum: ["upfront", "autopay"],
        required: true,
      },
      authCustomerId: { type: String, default: "" },
      authOrderId: { type: String, default: "" },
    },
    status: { type: String, enum: ["pending", "failed"], default: "pending" },
    statusDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const PendingJyotirlingaBooking: Model<IPendingJyotirlingaBooking> =
  dbJyotirling.model<IPendingJyotirlingaBooking>(
    "PendingJyotirlingaBooking",
    PendingJyotirlingaBookingSchema,
    "pendingJyotirlingaBookings",
  );

export interface IRazorpayWebhookEvent extends Document {
  eventId: string;
  event: string;
  entityId?: string;
  status: "processing" | "processed" | "failed" | "ignored";
  payload?: unknown;
  errorMessage?: string;
  receivedAt: Date;
  processedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const RazorpayWebhookEventSchema = new Schema<IRazorpayWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    event: { type: String, required: true },
    entityId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["processing", "processed", "failed", "ignored"],
      default: "processing",
    },
    payload: { type: Schema.Types.Mixed, default: null },
    errorMessage: { type: String, default: "" },
    receivedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const RazorpayWebhookEvent: Model<IRazorpayWebhookEvent> = dbJyotirling.model<IRazorpayWebhookEvent>(
  "RazorpayWebhookEvent",
  RazorpayWebhookEventSchema,
  "razorpayWebhookEvents",
);
