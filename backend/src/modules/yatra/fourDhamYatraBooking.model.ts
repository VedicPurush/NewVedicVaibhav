import { Schema, type Model, type Types } from "mongoose";
import { dbMain } from "../../config/db";
import {
  internationalSchemaFields,
  type IInternationalFields,
} from "../../lib/internationalSchema";

export interface IVvUtm {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export interface IFourDhamYatraBooking extends IInternationalFields {
  _id: Types.ObjectId;
  bookingId: string;
  referralCode?: string | null;
  poojaDocumentId: string;
  poojaId: string;
  poojaName: string;
  slotId: string;
  slotName: string;
  slotStartDate: Date;
  slotEndDate: Date;
  packageName: string;
  packagePrice: number;
  packageOriginalPrice?: number;
  devoteeName: string;
  whatsapp: string;
  gotra: string;
  familyMembers: string[];
  freeMemberLimit?: number;
  extraMembersCount?: number;
  extraCharges?: number;
  /** The INR value of the sale (package + extras, foreign markup applied).
   *  Previously implied by packagePrice + extraCharges; recorded explicitly now
   *  that a foreign order's charged total is no longer derivable from them. */
  totalAmount?: number;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  paymentStatus: "created" | "paid" | "failed";
  bookingStatus: "initiated" | "confirmed" | "cancelled";
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  paidAt?: Date | null;
  /** Not part of the schema (legacy parity) — always undefined on hydrated docs. */
  email?: string;
  vv_utm?: IVvUtm;
  createdAt?: Date;
  updatedAt?: Date;
}

const fourDhamYatraBookingSchema = new Schema<IFourDhamYatraBooking>(
  {
    /** Presentment currency, charged amount, FX rate, market. See lib/internationalSchema. */
    ...internationalSchemaFields,
    totalAmount: { type: Number },
    bookingId: { type: String, required: true, unique: true, trim: true },
    referralCode: { type: String, default: null },
    poojaDocumentId: { type: String, required: true, trim: true },
    poojaId: { type: String, required: true, trim: true },
    poojaName: { type: String, required: true, trim: true },
    slotId: { type: String, required: true, trim: true },
    slotName: { type: String, required: true, trim: true },
    slotStartDate: { type: Date, required: true },
    slotEndDate: { type: Date, required: true },
    packageName: { type: String, required: true, trim: true },
    packagePrice: { type: Number, required: true, min: 0 },
    packageOriginalPrice: { type: Number, default: 0, min: 0 },
    devoteeName: { type: String, required: true, trim: true },
    whatsapp: { type: String, required: true, trim: true },
    gotra: { type: String, required: true, trim: true },
    familyMembers: { type: [String], default: [] },
    freeMemberLimit: { type: Number, default: 0 },
    extraMembersCount: { type: Number, default: 0 },
    extraCharges: { type: Number, default: 0 },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, default: "India", trim: true },
    paymentStatus: { type: String, enum: ["created", "paid", "failed"], default: "created" },
    bookingStatus: { type: String, enum: ["initiated", "confirmed", "cancelled"], default: "initiated" },
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

const FourDhamYatraBookingModel: Model<IFourDhamYatraBooking> = dbMain.model<IFourDhamYatraBooking>(
  "4DhamYatraBooking",
  fourDhamYatraBookingSchema,
  "4DhamYatraBooking",
);

export default FourDhamYatraBookingModel;
