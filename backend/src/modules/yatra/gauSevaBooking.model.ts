import { Schema, type Model, type Types } from "mongoose";
import { dbMain } from "../../config/db";
import {
  internationalSchemaFields,
  type IInternationalFields,
} from "../../lib/internationalSchema";
import type { IVvUtm } from "./fourDhamYatraBooking.model";

export type OccasionType = "none" | "birthday" | "anniversary" | "newborn" | "pitru_paksha";

export interface IOccasionDetails {
  personName?: string; // birthday honoree or anniversary partner 1
  partnerName?: string; // anniversary partner 2
  celebrationDate?: Date;
  newbornName?: string;
  pitruName?: string; // ancestor name for Pitra Paksha
  pitruRelation?: string; // e.g. "father", "grandfather"
}

export interface IGauSevaBooking extends IInternationalFields {
  _id: Types.ObjectId;
  bookingId: string;
  packageId: string;
  packageName: string;
  packagePrice: number;
  quantity: number;
  totalAmount: number;
  devoteeName: string;
  whatsapp: string;
  email?: string;
  gotra?: string;
  occasionType?: OccasionType;
  occasionDetails?: IOccasionDetails | null;
  occasionPremium?: number;
  tag?: string;
  specialMessage?: string;
  sevaDate?: Date | null;
  deliveryStatus: "pending" | "delivered";
  deliveredAt?: Date | null;
  certificateUrl?: string;
  photoUrls?: string[];
  paymentStatus: "created" | "paid" | "failed";
  bookingStatus: "initiated" | "processing" | "confirmed" | "cancelled";
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  paidAt?: Date | null;
  referralCode?: string | null;
  /** Which surface the order was placed from — decides app vs website referral caps. */
  orderSource?: "APP" | "WEBSITE";
  vv_utm?: IVvUtm;
  createdAt?: Date;
  updatedAt?: Date;
}

export const occasionDetailsSchema = new Schema<IOccasionDetails>(
  {
    personName: { type: String, default: "" },
    partnerName: { type: String, default: "" },
    celebrationDate: { type: Date, default: null },
    newbornName: { type: String, default: "" },
    pitruName: { type: String, default: "" },
    pitruRelation: { type: String, default: "" },
  },
  { _id: false },
);

const gauSevaBookingSchema = new Schema<IGauSevaBooking>(
  {
    /** Presentment currency, charged amount, FX rate, market. See lib/internationalSchema. */
    ...internationalSchemaFields,
    bookingId: { type: String, required: true, unique: true, trim: true },
    referralCode: { type: String, default: null },
    orderSource: { type: String, enum: ["APP", "WEBSITE"], default: "WEBSITE" },
    packageId: { type: String, required: true, trim: true },
    packageName: { type: String, required: true, trim: true },
    packagePrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, default: 1, min: 1 },
    totalAmount: { type: Number, required: true, min: 0 },
    devoteeName: { type: String, required: true, trim: true },
    whatsapp: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    gotra: { type: String, default: "", trim: true },
    occasionType: {
      type: String,
      enum: ["none", "birthday", "anniversary", "newborn", "pitru_paksha"],
      default: "none",
    },
    occasionDetails: { type: occasionDetailsSchema, default: null },
    occasionPremium: { type: Number, default: 0, min: 0 },
    tag: { type: String, default: "", trim: true },
    specialMessage: { type: String, default: "", trim: true },
    sevaDate: { type: Date, default: null },
    deliveryStatus: { type: String, enum: ["pending", "delivered"], default: "pending" },
    deliveredAt: { type: Date, default: null },
    certificateUrl: { type: String, default: "" },
    photoUrls: { type: [String], default: [] },
    paymentStatus: { type: String, enum: ["created", "paid", "failed"], default: "created" },
    bookingStatus: {
      type: String,
      enum: ["initiated", "processing", "confirmed", "cancelled"],
      default: "initiated",
    },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    paidAt: { type: Date, default: null },
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

gauSevaBookingSchema.index({ whatsapp: 1, createdAt: -1 });
gauSevaBookingSchema.index({ razorpayOrderId: 1 });
gauSevaBookingSchema.index({ sevaDate: 1, deliveryStatus: 1 });
gauSevaBookingSchema.index({ occasionType: 1 });

const GauSevaBookingModel: Model<IGauSevaBooking> = dbMain.model<IGauSevaBooking>(
  "GauSevaBooking",
  gauSevaBookingSchema,
  "GauSevaBooking",
);

export default GauSevaBookingModel;
