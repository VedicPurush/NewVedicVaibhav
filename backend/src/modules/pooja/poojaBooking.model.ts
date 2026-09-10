import { Schema, Types, type Document, type Model } from "mongoose";
import { dbMain } from "../../config/db";
import {
  internationalSchemaFields,
  type IInternationalFields,
} from "../../lib/internationalSchema";

interface IIdolDetails {
  isIdolAvailable: boolean;
  idolName?: string;
  idolPrice?: number;
  idolDescription?: string;
  idolImages?: string[];
  stock?: number;
  length?: number;
  lengthUnit?: string;
  width?: number;
  widthUnit?: string;
  height?: number;
  heightUnit?: string;
  weight?: number;
  weightUnit?: string;
}

export interface IPoojaBooking extends Document, IInternationalFields {
  userID: string;
  mandirID: Types.ObjectId;
  poojaID: Types.ObjectId;
  address1: string;
  address2: string;
  city: string;
  country: string;
  email: string;
  firstname: string;
  lastname: string;
  mobile: number;
  pincode: number;
  state: string;
  totalPrice: number;
  bookingDate: Date;
  completeDate: Date | null;
  package: string;
  gotra: string[];
  bhaktaNames: string[];
  dakshinaToPandit: number | null;
  donateToMandir: number | null;
  brahmanBhoj: number | null;
  poojaStatus: string | null;
  prasadStatus: string | null;
  mandirname: string;
  poojaname: string;
  mandirimage: string;
  completed: boolean;
  poojadate: string;
  poojatime: string;
  transactionId: string;
  poojaLink: string | null;
  isAddressSelected: boolean;

  // Shiprocket fields
  shiprocketOrderId?: string;
  shiprocketShipmentId?: number;
  cheapestCourier?: unknown;
  awb_code?: string;
  track_url?: string;

  idolDetails?: IIdolDetails;

  referralCode?: string;

  // Which surface this order was placed from — matters for commission because the APP
  // referral cap (first N orders per referred customer) only applies to APP orders; website
  // link referrals have no cap. Defaults to 'WEBSITE' for any legacy/in-flight bookings that
  // predate this field.
  orderSource?: "APP" | "WEBSITE";

  // Razorpay fields
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;

  /* Meta Tracking */
  fbp?: string;
  fbc?: string;
  clientIp?: string;
  userAgent?: string;
  eventSourceUrl?: string;

  vv_utm?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
}

const idolDetailsSchema = new Schema<IIdolDetails>(
  {
    isIdolAvailable: { type: Boolean, default: false },
    idolName: { type: String, default: "" },
    idolPrice: { type: Number, default: 0 },
    idolDescription: { type: String, default: "" },
    idolImages: { type: [String], default: [] },
    stock: { type: Number, default: 0 },
    length: { type: Number, default: 0 },
    lengthUnit: { type: String, default: "" },
    width: { type: Number, default: 0 },
    widthUnit: { type: String, default: "" },
    height: { type: Number, default: 0 },
    heightUnit: { type: String, default: "" },
    weight: { type: Number, default: 0 },
    weightUnit: { type: String, default: "" },
  },
  { _id: false },
);

const poojaBookingSchema = new Schema<IPoojaBooking>(
  {
    /** Presentment currency, charged amount, FX rate, market. See lib/internationalSchema. */
    ...internationalSchemaFields,
    userID: { type: String, ref: "User", required: true },
    mandirID: { type: Schema.Types.ObjectId, ref: "Mandir", required: true },
    poojaID: { type: Schema.Types.ObjectId, ref: "Pooja", required: true },
    totalPrice: { type: Number, required: true },
    address1: String,
    address2: String,
    city: String,
    country: String,
    email: { type: String },
    firstname: String,
    lastname: String,
    state: String,
    mobile: Number,
    pincode: Number,
    bookingDate: { type: Date, default: Date.now, required: true },
    completeDate: { type: Date, default: null },
    package: { type: String, required: true },
    gotra: { type: [String], required: true },
    bhaktaNames: { type: [String], required: true },
    dakshinaToPandit: { type: Number, default: null },
    donateToMandir: { type: Number, default: null },
    brahmanBhoj: { type: Number, default: null },
    poojaStatus: { type: String, default: null },
    prasadStatus: { type: String, default: null },
    mandirname: { type: String, default: null },
    poojaname: { type: String, default: null },
    mandirimage: { type: String, default: null },
    completed: { type: Boolean, default: false },
    poojadate: { type: String, default: null },
    poojatime: { type: String, default: null },
    transactionId: { type: String, default: null, unique: true },
    poojaLink: { type: String, default: null },
    isAddressSelected: { type: Boolean, required: true },
    // Shiprocket fields
    shiprocketOrderId: { type: String },
    shiprocketShipmentId: { type: Number },
    cheapestCourier: { type: Schema.Types.Mixed },
    awb_code: { type: String },
    track_url: { type: String, default: null },
    idolDetails: { type: idolDetailsSchema, default: () => ({}) },
    referralCode: { type: String, default: null },
    // order source (APP vs WEBSITE) — see interface above for why this matters for commission
    orderSource: { type: String, enum: ["APP", "WEBSITE"], default: "WEBSITE" },
    // Razorpay fields
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },

    /* Meta Tracking */
    fbp: { type: String },
    fbc: { type: String },
    clientIp: { type: String },
    userAgent: { type: String },
    eventSourceUrl: { type: String },

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

const PoojaBooking: Model<IPoojaBooking> = dbMain.model<IPoojaBooking>(
  "PoojaBooking",
  poojaBookingSchema,
  "poojaBookings",
);

export default PoojaBooking;
