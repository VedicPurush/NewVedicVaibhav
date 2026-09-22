import { Schema, type Document, type Model } from "mongoose";
import { dbMain } from "../../config/db";

export interface IPromo extends Document {
  promoName: string;
  discountAmount: number;
  startDate: Date;
  expiryDate: Date;
  promoType: string;
  isActive: boolean;
  isAppOnly: boolean;
  /** When true, only a devotee with no earlier paid booking may use this code. */
  firstOrderOnly: boolean;
  addedOn: Date;
  startRange: number;
  description: string;
}

const promoSchema = new Schema<IPromo>(
  {
    promoName: { type: String, required: true, unique: true },
    discountAmount: { type: Number, required: true, default: 0 },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    promoType: {
      type: String,
      required: true,
      enum: ["OrderValue-Promo", "Influencer-Promo", "Festival-Promo"],
      default: "OrderValue-Promo",
    },
    startRange: { type: Number, default: 0 },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    isAppOnly: { type: Boolean, default: false },
    // Set from the admin tool. Missing on every promo already in the database,
    // which `default` reads back as false — so no code in circulation changes
    // meaning when this ships.
    firstOrderOnly: { type: Boolean, default: false },
    addedOn: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const Promo: Model<IPromo> = dbMain.model<IPromo>("Promo", promoSchema, "promo");

export default Promo;
