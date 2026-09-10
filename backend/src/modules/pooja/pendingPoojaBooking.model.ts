import { Schema, type Document, type Model } from "mongoose";
import { dbMain } from "../../config/db";

export interface IPendingBooking extends Document {
  merchantTransactionId: string;
  orderId?: string;
  /** Free-form booking snapshot captured at checkout (contains referralCode when sent). */
  bookingDetails: Record<string, any>;
  /** 'pending' or 'completed' */
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const pendingBookingSchema = new Schema<IPendingBooking>(
  {
    merchantTransactionId: { type: String, required: true, unique: true },
    orderId: { type: String, required: false },
    bookingDetails: { type: Object, required: true },
    status: { type: String, required: false, default: "pending" },
  },
  { timestamps: true },
);

const PendingBooking: Model<IPendingBooking> = dbMain.model<IPendingBooking>(
  "PendingBooking",
  pendingBookingSchema,
  "pendingBookings",
);

export default PendingBooking;
