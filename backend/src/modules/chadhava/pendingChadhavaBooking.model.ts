import { Schema, type Document, type Model } from "mongoose";
import { dbMain } from "../../config/db";

/** Flexible booking-details payload stored as a Mixed sub-document. */
export type PendingBookingDetails = Record<string, any>;

export interface IPendingChadhavaBooking extends Document {
  orderID: string;
  bookingDetails: PendingBookingDetails;
  /** 'pending' initially; the payment flows also write 'paid' | 'processing' |
   *  'completed' | 'failed' | 'confirmed'. */
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const pendingChadhavaBookingSchema = new Schema<IPendingChadhavaBooking>(
  {
    orderID: {
      type: String,
      required: true,
      unique: true, // The top-level orderID is the only unique key needed here.
    },
    // Schema.Types.Mixed prevents Mongoose from creating unwanted indexes on sub-fields.
    bookingDetails: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      default: "pending",
    },
  },
  { timestamps: true },
);

const PendingChadhavaBooking: Model<IPendingChadhavaBooking> = dbMain.model<IPendingChadhavaBooking>(
  "PendingChadhavaBooking",
  pendingChadhavaBookingSchema,
  "pendingChadhavaBookings",
);

export default PendingChadhavaBooking;
