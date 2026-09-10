import { Schema, type Model, type Types } from "mongoose";
import { dbMain } from "../../config/db";
import {
  internationalSchemaFields,
  type IInternationalFields,
} from "../../lib/internationalSchema";
import type { IOccasionDetails, OccasionType } from "./gauSevaBooking.model";
import type { IVvUtm } from "./fourDhamYatraBooking.model";

export interface IPendingGauSevaBooking extends IInternationalFields {
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
  razorpayOrderId?: string | null;
  vv_utm?: IVvUtm;
  createdAt?: Date;
  updatedAt?: Date;
}

const occasionDetailsSchema = new Schema<IOccasionDetails>(
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

const pendingGauSevaBookingSchema = new Schema<IPendingGauSevaBooking>(
  {
    /** Presentment currency, charged amount, FX rate, market. See lib/internationalSchema. */
    ...internationalSchemaFields,
    bookingId: { type: String, required: true, unique: true, trim: true },
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
    razorpayOrderId: { type: String, default: null },
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

pendingGauSevaBookingSchema.index({ whatsapp: 1 });
pendingGauSevaBookingSchema.index({ razorpayOrderId: 1 });
pendingGauSevaBookingSchema.index({ createdAt: 1 });

const PendingGauSevaBookingModel: Model<IPendingGauSevaBooking> = dbMain.model<IPendingGauSevaBooking>(
  "PendingGauSevaBooking",
  pendingGauSevaBookingSchema,
  "PendingGauSevaBooking",
);

export default PendingGauSevaBookingModel;
