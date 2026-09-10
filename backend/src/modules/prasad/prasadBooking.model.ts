import { Schema } from "mongoose";
import type { Model, Types } from "mongoose";
import { dbMain } from "../../config/db";
import {
  internationalSchemaFields,
  type IInternationalFields,
} from "../../lib/internationalSchema";

export interface IAddress {
  name: string;
  address: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  email?: string;
  number: string;
  pinCode: number;
}

export interface IPrasadDelivery {
  mandirID: Types.ObjectId;
  mandirName: string;
  packageName: string;
  prasadPrice: number;
  prasadCount: number;
  prasadStatus: string;
  statusDate: Date;
  mandirImage: string;
  shiprocketOrderId?: string;
  shiprocketShipmentId?: number;
  pickupPincode?: number;
  allCouriers?: unknown[];
}

export interface ISangamPrasadDelivery {
  bottleSize?: string;
  description?: string;
  originalPrice?: number;
  discountedPrice?: number;
  quantity?: number;
  bottleId?: string;
  shiprocketOrderId?: string;
  shiprocketShipmentId?: number;
  pickupPincode?: number;
  allCouriers?: unknown[];
}

export interface IPrasadBooking extends IInternationalFields {
  userID: string;
  transactionID: string; // Razorpay/PhonePe payment id
  orderID: string; // gateway order id / legacy VVPRASAD id
  address: IAddress;
  totalPrice: number; // in INR
  deliveryCharge: number;
  bookingDate: Date;
  prasadDeliveries: IPrasadDelivery[];
  sangamPrasadDelivery: ISangamPrasadDelivery[];
  statusDate: Date;
  panditPincode: number;
  shiprocketOrderId?: string;
  shiprocketShipmentId?: number;
  cheapestCourier?: unknown;
  allCouriers?: unknown[];
  referralCode?: string | null;
  // Which surface this order was placed from — the APP referral order cap (first N orders
  // per referred customer, admin-editable) only ever applies to orderSource === 'APP'.
  orderSource?: "APP" | "WEBSITE";
  // Extra info & payment snapshot.
  meta?: unknown;
}

const prasadDeliverySchema = new Schema<IPrasadDelivery>(
  {
    mandirID: { type: Schema.Types.ObjectId, required: true },
    mandirName: { type: String, required: true },
    packageName: { type: String },
    prasadPrice: { type: Number, required: true },
    prasadCount: { type: Number, required: true },
    prasadStatus: { type: String, default: "Pending" },
    statusDate: { type: Date, default: Date.now },
    mandirImage: { type: String, required: true },
    shiprocketOrderId: { type: String },
    shiprocketShipmentId: { type: Number },
    pickupPincode: { type: Number },
    allCouriers: { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: false },
);

const sangamPrasadSchema = new Schema<ISangamPrasadDelivery>(
  {
    bottleSize: { type: String },
    description: { type: String },
    originalPrice: { type: Number },
    discountedPrice: { type: Number },
    quantity: { type: Number },
    bottleId: { type: String },
    shiprocketOrderId: { type: String },
    shiprocketShipmentId: { type: Number },
    pickupPincode: { type: Number },
    allCouriers: { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: false },
);

const prasadBookingSchema = new Schema<IPrasadBooking>(
  {
    /** Presentment currency, charged amount, FX rate, market. See lib/internationalSchema. */
    ...internationalSchemaFields,
    userID: { type: String, required: true },
    transactionID: { type: String, required: true, unique: true }, // unique for idempotency
    orderID: { type: String, required: true, unique: true },
    address: {
      name: { type: String, required: true },
      address: { type: String, required: true },
      landmark: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      email: { type: String, required: false },
      number: { type: String, required: true },
      pinCode: { type: Number, required: true },
    },
    totalPrice: { type: Number, required: true },
    deliveryCharge: { type: Number, default: 0 },
    bookingDate: { type: Date, default: Date.now, required: true },
    prasadDeliveries: [prasadDeliverySchema],
    sangamPrasadDelivery: [sangamPrasadSchema],
    statusDate: { type: Date, default: Date.now },
    panditPincode: { type: Number, required: true },
    shiprocketOrderId: { type: String },
    shiprocketShipmentId: { type: Number },
    cheapestCourier: { type: Schema.Types.Mixed },
    allCouriers: { type: [Schema.Types.Mixed], default: [] },
    referralCode: { type: String, default: null },
    orderSource: { type: String, enum: ["APP", "WEBSITE"], default: "WEBSITE" },
    meta: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

prasadBookingSchema.index({ userID: 1, orderID: 1 });

const PrasadBooking: Model<IPrasadBooking> = dbMain.model<IPrasadBooking>(
  "PrasadBooking",
  prasadBookingSchema,
  "prasadBookings",
);

export default PrasadBooking;
