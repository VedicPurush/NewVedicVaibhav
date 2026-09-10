import { Schema } from "mongoose";
import type { Model, Types } from "mongoose";
import { dbMain } from "../../config/db";

export interface IPendingPersonalizedPoojaBooking {
  orderId: string;
  bookingDetails: Types.ObjectId; // ref PersonalizedPoojaBooking
  status: string; // 'pending' | 'completed'
}

const PendingPersonalizedPoojaBookingSchema = new Schema<IPendingPersonalizedPoojaBooking>(
  {
    orderId: { type: String, required: true, unique: true },
    bookingDetails: {
      type: Schema.Types.ObjectId,
      ref: "PersonalizedPoojaBooking",
      required: true,
    },
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
  },
  { timestamps: true },
);

const PendingPersonalizedPoojaBooking: Model<IPendingPersonalizedPoojaBooking> =
  dbMain.model<IPendingPersonalizedPoojaBooking>(
    "PendingPersonalizedPoojaBooking",
    PendingPersonalizedPoojaBookingSchema,
  );

export default PendingPersonalizedPoojaBooking;
