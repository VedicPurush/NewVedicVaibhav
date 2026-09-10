import { Schema } from "mongoose";
import type { Model, Types } from "mongoose";
import { dbMain } from "../../config/db";

export interface IPendingPitruPujaBooking {
  orderId: string;
  bookingDetails: Types.ObjectId; // ref PitruPujaBooking
  status: string; // 'pending' | 'completed'
}

const pendingPitruPujaBookingSchema = new Schema<IPendingPitruPujaBooking>(
  {
    orderId: { type: String, required: true, unique: true },
    bookingDetails: { type: Schema.Types.ObjectId, ref: "PitruPujaBooking", required: true },
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
  },
  { timestamps: true },
);

const PendingPitruPujaBooking: Model<IPendingPitruPujaBooking> = dbMain.model<IPendingPitruPujaBooking>(
  "PendingPitruPujaBooking",
  pendingPitruPujaBookingSchema,
);

export default PendingPitruPujaBooking;
