import { Schema, type Document, type Model } from "mongoose";
import { dbMain } from "../../config/db";
import { internationalSchemaFields, type IInternationalFields } from "../../lib/internationalSchema";

export interface IPitruPujaBooking extends Document, IInternationalFields {
  pujaId: string;
  poojaName: string;
  packageLabel: string;
  personCount: number;
  price: number;
  whatsappNumber: string;
  callingNumber?: string;
  kartaName: string;
  kartaGotra: string;
  ancestorNames: string[];
  mandirName?: string;
  mandirPlace?: string;
  poojaDate?: string;
  orderId: string;
  razorpayOrderId?: string;
  paymentStatus: boolean;
  transactionID?: string;
  paymentDate?: Date | null;
}

const pitruPujaBookingSchema = new Schema<IPitruPujaBooking>(
  {
    ...internationalSchemaFields,
    pujaId: { type: String, required: true, trim: true },
    poojaName: { type: String, trim: true },
    packageLabel: { type: String, required: true, trim: true },
    personCount: { type: Number, required: true },
    price: { type: Number, required: true },
    whatsappNumber: { type: String, required: true, trim: true },
    callingNumber: { type: String, trim: true },
    kartaName: { type: String, required: true, trim: true },
    kartaGotra: { type: String, required: true, trim: true },
    ancestorNames: { type: [String], required: true },
    mandirName: { type: String, trim: true },
    mandirPlace: { type: String, trim: true },
    poojaDate: { type: String, trim: true },
    orderId: { type: String, required: true, unique: true },
    razorpayOrderId: { type: String },
    paymentStatus: { type: Boolean, default: false },
    transactionID: { type: String },
    paymentDate: { type: Date, default: null },
  },
  { timestamps: true },
);

const PitruPujaBooking: Model<IPitruPujaBooking> = dbMain.model<IPitruPujaBooking>(
  "PitruPujaBooking",
  pitruPujaBookingSchema,
  "pitruPujaBookings",
);

export default PitruPujaBooking;
