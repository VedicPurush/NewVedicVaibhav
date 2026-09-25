import { Schema, type Model } from "mongoose";
import { dbMain } from "../../config/db";

/**
 * A delivered video for one booking, keyed to the devotee by order id + phone.
 *
 * The rows are written by the ops/admin tool after a ritual is performed, into
 * the long-standing `links` collection — this model only reads them (and gives
 * anything created here the same shape).
 */
export interface IServiceVideo {
  /** Devotee name as typed by ops — display only, never matched on. */
  name: string;
  /** Bare 10 digits for India, mirroring `newchadhavaBookings.whatsapp`. */
  number: string;
  /** Usually a Drive path with no host ("file/d/<id>/view?usp=drive_link"). */
  link: string;
  orderId: string;
  /** Which offering the video belongs to — "chadhava", "puja", … */
  service: string;
  /** The offering's own name, e.g. "Shri Krishna Janmashtami Special Chadhava".
   *  One order can hold several of these — a Tri-Jyotirling chadhava is one
   *  order id with a video per temple. */
  serviceName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Known values. Kept as plain strings, NOT a schema enum: the rows are written
 *  by a separate admin tool, and a validation error there must never be this
 *  file's doing. A new service just starts appearing. */
export const SERVICE_CHADHAVA = "chadhava";
export const SERVICE_PUJA = "puja";

const serviceVideoSchema = new Schema<IServiceVideo>(
  {
    name: { type: String, trim: true, default: "" },
    number: { type: String, trim: true, required: true, index: true },
    link: { type: String, trim: true, required: true },
    orderId: { type: String, trim: true, required: true, index: true },
    /**
     * Everything in the collection before this field existed is a chadhava
     * video, so that is the default — an admin tool that does not know about
     * `service` yet keeps producing correct chadhava rows.
     */
    service: {
      type: String,
      trim: true,
      lowercase: true,
      default: SERVICE_CHADHAVA,
      index: true,
    },
    serviceName: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const ServiceVideo: Model<IServiceVideo> =
  (dbMain.models.ServiceVideo as Model<IServiceVideo> | undefined) ||
  dbMain.model<IServiceVideo>("ServiceVideo", serviceVideoSchema, "links");

export default ServiceVideo;
