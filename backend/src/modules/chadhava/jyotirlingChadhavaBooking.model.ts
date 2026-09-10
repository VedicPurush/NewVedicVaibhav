import { Schema, type Document, type Model, type Types } from "mongoose";
import { dbMain } from "../../config/db";
import {
  internationalSchemaFields,
  type IInternationalFields,
} from "../../lib/internationalSchema";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

interface IJyotirlingSnapshot {
  id: string;
  nameEnglish: string;
  location: string;
  state: string;
  image?: string | null;
}

interface IOfferingSnapshot {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
}

export interface IAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  number: string;
  email?: string;
  pinCode: number;
}

export interface IPrasad {
  name: string;
  desc: string;
  price: number;
  image: string;
}

/** Loose meta payload (Mixed in the schema) — tracking, session + Meta CAPI context. */
export interface IJyotirlingBookingMeta {
  bookingSessionId?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  actionSource?: string;
  eventSourceUrl?: string | null;
  utm?: unknown;
  pageStep?: unknown;
  [key: string]: unknown;
}

export interface IJyotirlingChadhavaBooking extends Document, IInternationalFields {
  userID?: string; // Optional if guest checkout

  name: string;
  whatsapp: string;
  gotra?: string | null;
  familyMembers: string[];

  transactionID?: string;
  orderID: string;

  // Selected Data Snapshots
  dataId?: Types.ObjectId; // Reference to the Data Model version
  selectedTemples: IJyotirlingSnapshot[];
  selectedOfferings: IOfferingSnapshot[];

  totalPrice: number;
  familyMemberExtraCharge: number;

  bookingDate: Date;

  // Statuses
  status: "pending" | "confirmed" | "failed" | "abandoned_cart" | "payment_pending";
  statusDate: Date;
  paymentFailureReason?: string;
  paymentAttemptCount: number;
  paymentProvider: string;
  backendVerificationStatus: boolean;

  // Tracking details
  devicePlatform?: string;
  bookingSource?: string;
  referralCode?: string | null;

  // WhatsApp Tracking
  whatsappNotificationSent: boolean;
  notificationType: string;
  notificationStatus: string;
  notificationSentTime?: Date;

  paymentReminderSent: boolean;
  reminderCount: number;
  lastReminderSentTime?: Date;

  abandonedBookingNudgeStatus: string;
  confirmationMessageStatus: string;

  meta?: IJyotirlingBookingMeta | null;

  address?: IAddress | null;
  prasad?: IPrasad | null;

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/*                                  SCHEMAS                                   */
/* -------------------------------------------------------------------------- */

const jyotirlingSnapshotSchema = new Schema<IJyotirlingSnapshot>(
  {
    id: { type: String, required: true },
    nameEnglish: { type: String, required: true },
    location: { type: String, required: true },
    state: { type: String, default: "" },
    image: { type: String, default: null },
  },
  { _id: false },
);

const offeringSnapshotSchema = new Schema<IOfferingSnapshot>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    image: { type: String, default: null },
  },
  { _id: false },
);

const prasadSchema = new Schema<IPrasad>(
  {
    name: { type: String, required: true },
    desc: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
  },
  { _id: false },
);

const addressSchema = new Schema<IAddress>(
  {
    name: { type: String, required: true },
    address1: { type: String, required: true },
    address2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    number: { type: String, required: true },
    email: { type: String },
    pinCode: { type: Number, required: true },
  },
  { _id: false },
);

/* -------------------------------------------------------------------------- */
/*                               BOOKING SCHEMA                               */
/* -------------------------------------------------------------------------- */

const jyotirlingChadhavaBookingSchema = new Schema<IJyotirlingChadhavaBooking>(
  {
    /** Presentment currency, charged amount, FX rate, market. See lib/internationalSchema. */
    ...internationalSchemaFields,
    userID: { type: String },

    name: { type: String, required: true },
    whatsapp: { type: String, required: true },
    gotra: { type: String, default: null },
    familyMembers: { type: [String], default: [] },

    transactionID: { type: String },
    orderID: { type: String, required: true, unique: true },

    dataId: { type: Schema.Types.ObjectId, ref: "JyotirlingChadhavaData" },
    selectedTemples: { type: [jyotirlingSnapshotSchema], required: true },
    selectedOfferings: { type: [offeringSnapshotSchema], required: true },

    totalPrice: { type: Number, required: true },
    familyMemberExtraCharge: { type: Number, default: 0 },

    bookingDate: { type: Date, default: Date.now, required: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "failed", "abandoned_cart", "payment_pending"],
      default: "pending",
    },
    statusDate: { type: Date, default: Date.now },

    paymentFailureReason: { type: String },
    paymentAttemptCount: { type: Number, default: 0 },
    paymentProvider: { type: String, default: "razorpay" },
    backendVerificationStatus: { type: Boolean, default: false },

    devicePlatform: { type: String },
    bookingSource: { type: String },
    referralCode: { type: String, default: null },

    // WhatsApp Tracking
    whatsappNotificationSent: { type: Boolean, default: false },
    notificationType: { type: String, default: "" },
    notificationStatus: { type: String, default: "" },
    notificationSentTime: { type: Date },

    paymentReminderSent: { type: Boolean, default: false },
    reminderCount: { type: Number, default: 0 },
    lastReminderSentTime: { type: Date },

    abandonedBookingNudgeStatus: { type: String, default: "" },
    confirmationMessageStatus: { type: String, default: "" },

    address: { type: addressSchema, default: null },
    prasad: { type: prasadSchema, default: null },

    meta: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

// orderID already has a unique index from the schema path definition.
jyotirlingChadhavaBookingSchema.index({ status: 1 });

/* -------------------------------------------------------------------------- */
/*                                   MODEL                                    */
/* -------------------------------------------------------------------------- */

const JyotirlingChadhavaBooking: Model<IJyotirlingChadhavaBooking> =
  (dbMain.models.JyotirlingChadhavaBooking as Model<IJyotirlingChadhavaBooking> | undefined) ||
  dbMain.model<IJyotirlingChadhavaBooking>(
    "JyotirlingChadhavaBooking",
    jyotirlingChadhavaBookingSchema,
    "jyotirlingChadhavaBookings",
  );

export default JyotirlingChadhavaBooking;
