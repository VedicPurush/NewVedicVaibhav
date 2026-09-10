import { Schema } from "mongoose";
import type { Model } from "mongoose";
import { dbMain } from "../../config/db";
import {
  internationalSchemaFields,
  type IInternationalFields,
} from "../../lib/internationalSchema";
import type { IAddress, IPrasadDelivery, ISangamPrasadDelivery } from "./prasadBooking.model";

export interface IPendingPrasadBookingMeta {
  packageName?: string | null;
  mandirID?: string;
  amount?: number;
  bhaktaNames?: unknown[];
  poojaDate?: string | null;
  [key: string]: unknown;
}

export interface IPendingPrasadBookingDetails {
  userID: string;
  address: IAddress;
  prasadDeliveries: IPrasadDelivery[];
  sangamPrasadDelivery: ISangamPrasadDelivery[];
  deliveryCharge: number;
  referralCode?: string | null;
  // NOTE: intentionally NOT a schema path (legacy behavior) — Mongoose strips it on
  // save, so reading it back always yields undefined. Kept in the type because the
  // controllers still write it and read it with a "WEBSITE" fallback.
  orderSource?: "APP" | "WEBSITE";
  // Extra client fields stashed safely (packageName, bhaktaNames, poojaDate, etc.).
  meta?: IPendingPrasadBookingMeta | null;
}

export interface IPendingPrasadBooking extends IInternationalFields {
  orderID: string; // gateway order id
  bookingDetails: IPendingPrasadBookingDetails;
  status: string; // 'pending' | other housekeeping states
  razorpayOrderId?: string; // Razorpay order id (used to reconcile on verify)
  shiprocketOrderId?: string;
  shiprocketShipmentId?: number;
  cheapestCourier?: unknown;
  allCouriers?: unknown[];
  panditPincode: number;
}

const PrasadDeliverySchema = new Schema<IPrasadDelivery>(
  {
    mandirID: { type: Schema.Types.ObjectId, required: true },
    mandirName: { type: String, required: true },
    packageName: { type: String, required: true },
    prasadPrice: { type: Number, required: true },
    prasadCount: { type: Number, required: true },
    prasadStatus: { type: String, required: true },
    statusDate: { type: Date, required: true },
    mandirImage: { type: String, required: true },
    shiprocketOrderId: { type: String },
    shiprocketShipmentId: { type: Number },
    pickupPincode: { type: Number },
    allCouriers: { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: false },
);

const SangamPrasadDeliverySchema = new Schema<ISangamPrasadDelivery>(
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

const PendingPrasadBookingSchema = new Schema<IPendingPrasadBooking>(
  {
    /** Presentment currency, charged amount, FX rate, market. See lib/internationalSchema. */
    ...internationalSchemaFields,
    orderID: { type: String, required: true, unique: true },
    bookingDetails: {
      userID: { type: String, required: true },
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
      prasadDeliveries: { type: [PrasadDeliverySchema], default: [] },
      sangamPrasadDelivery: { type: [SangamPrasadDeliverySchema], default: [] },
      deliveryCharge: { type: Number, default: 0 },
      referralCode: { type: String, default: null },
      meta: { type: Schema.Types.Mixed, default: null },
    },
    status: { type: String, default: "pending", index: true },
    razorpayOrderId: { type: String, index: true },
    shiprocketOrderId: { type: String },
    shiprocketShipmentId: { type: Number },
    cheapestCourier: { type: Schema.Types.Mixed },
    allCouriers: { type: [Schema.Types.Mixed], default: [] },
    panditPincode: { type: Number, required: true },
  },
  { timestamps: true },
);

// Auto-clean abandoned pending orders after 30 minutes.
PendingPrasadBookingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 60 });

const PendingPrasadBooking: Model<IPendingPrasadBooking> = dbMain.model<IPendingPrasadBooking>(
  "PendingPrasadBooking",
  PendingPrasadBookingSchema,
  "PendingPrasadBooking",
);

export default PendingPrasadBooking;
