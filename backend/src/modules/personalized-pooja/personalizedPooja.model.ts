import { Schema } from "mongoose";
import type { Model } from "mongoose";
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

export interface IPersonalizedPoojaBooking extends IInternationalFields {
  userID: string;
  firstName: string;
  completed: boolean;
  lastName: string;
  fullName: string[];
  gotra: string[];
  mobile: string;
  email: string;
  poojaName?: string; // required: false in the schema
  problemName: string;
  description: string;
  addedOn: Date;
  isApproved: boolean;
  poojaDate: Date;
  paymentStatus: boolean;
  price?: number | null;
  transactionID?: string | null;
  paymentDate?: Date | null;
  orderId: string;
  selectedMandir: string;
  mandirName: string;
  prasadDeliveryStatus: string;
  link?: string | null;
  showPaymentToUser: boolean;
  isFromApp: boolean;
  referralCode?: string | null;
  vv_utm?: IVvUtm;
}

const PersonalizedPoojaSchema = new Schema<IPersonalizedPoojaBooking>(
  {
    /** Presentment currency, charged amount, FX rate, market. See lib/internationalSchema. */
    ...internationalSchemaFields,
    userID: { type: String, ref: "User", required: true },
    firstName: { type: String, required: true },
    completed: { type: Boolean, default: false },
    lastName: { type: String, required: true },
    fullName: { type: [String], required: true },
    gotra: { type: [String], required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
    poojaName: { type: String, required: false },
    problemName: { type: String, required: true },
    description: { type: String, required: true },
    addedOn: { type: Date, default: Date.now },
    isApproved: { type: Boolean, default: false },
    poojaDate: { type: Date, required: true },
    paymentStatus: { type: Boolean, default: false },
    price: { type: Number, default: null },
    transactionID: { type: String, default: null },
    selectedMandir: { type: String, required: true },
    mandirName: { type: String, required: true },
    orderId: { type: String, required: true, unique: true },
    prasadDeliveryStatus: { type: String, default: "pending" },
    link: { type: String, default: null },
    showPaymentToUser: { type: Boolean, default: false },
    paymentDate: { type: Date },
    isFromApp: { type: Boolean, default: false },
    referralCode: { type: String, default: null },
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

const PersonalizedPoojaBooking: Model<IPersonalizedPoojaBooking> =
  dbMain.model<IPersonalizedPoojaBooking>("PersonalizedPoojaBooking", PersonalizedPoojaSchema);

export default PersonalizedPoojaBooking;
