import { Schema, type Model, type Types } from "mongoose";
import { dbMain } from "../../config/db";
import {
  internationalSchemaFields,
  type IInternationalFields,
} from "../../lib/internationalSchema";
import type { IVvUtm } from "./fourDhamYatraBooking.model";

export interface IBBSevaBooking extends IInternationalFields {
  _id: Types.ObjectId;
  orderID: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  name: string;
  mobile: string;
  email?: string;
  gotra?: string;
  startDate?: string;
  sankalp?: string;
  packageName: string;
  packagePrice: number;
  numberOfDays: number;
  amount: number;
  currency: string;
  paymentStatus: "pending" | "paid" | "failed";
  familyMembers?: string[];
  freeMemberLimit?: number;
  extraMembersCount?: number;
  extraCharges?: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  referralCode?: string | null;
  rating?: number;
  review?: string;
  vv_utm?: IVvUtm;
  createdAt?: Date;
  updatedAt?: Date;
}

const vvUtmField = {
  type: {
    utm_source: { type: String, default: "" },
    utm_medium: { type: String, default: "" },
    utm_campaign: { type: String, default: "" },
    utm_content: { type: String, default: "" },
    utm_term: { type: String, default: "" },
  },
  required: false,
};

const bbSevaBookingSchema = new Schema<IBBSevaBooking>(
  {
    /** Presentment currency, charged amount, FX rate, market. See lib/internationalSchema. */
    ...internationalSchemaFields,
    orderID: { type: String, required: true, unique: true },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String },
    gotra: { type: String },
    startDate: { type: String },
    sankalp: { type: String },
    packageName: { type: String, required: true },
    packagePrice: { type: Number, required: true },
    numberOfDays: { type: Number, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    familyMembers: { type: [String], default: [] },
    freeMemberLimit: { type: Number, default: 2 },
    extraMembersCount: { type: Number, default: 0 },
    extraCharges: { type: Number, default: 0 },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    referralCode: { type: String, default: null },
    rating: { type: Number },
    review: { type: String },
    vv_utm: vvUtmField,
  },
  { timestamps: true },
);

// Pending (pre-payment) bookings
const pendingBBSevaBookingSchema = new Schema<IBBSevaBooking>(
  {
    /** Presentment currency, charged amount, FX rate, market. See lib/internationalSchema. */
    ...internationalSchemaFields,
    orderID: { type: String, required: true, unique: true },
    razorpayOrderId: { type: String, required: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String },
    gotra: { type: String },
    startDate: { type: String },
    sankalp: { type: String },
    packageName: { type: String, required: true },
    packagePrice: { type: Number, required: true },
    numberOfDays: { type: Number, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    familyMembers: { type: [String], default: [] },
    freeMemberLimit: { type: Number, default: 2 },
    extraMembersCount: { type: Number, default: 0 },
    extraCharges: { type: Number, default: 0 },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    referralCode: { type: String, default: null },
    vv_utm: vvUtmField,
  },
  { timestamps: true },
);

export const BBSevaBooking: Model<IBBSevaBooking> = dbMain.model<IBBSevaBooking>(
  "BBSevaBooking",
  bbSevaBookingSchema,
  "bbsevabookings",
);

export const PendingBBSevaBooking: Model<IBBSevaBooking> = dbMain.model<IBBSevaBooking>(
  "PendingBBSevaBooking",
  pendingBBSevaBookingSchema,
  "pendingbbsevabookings",
);
