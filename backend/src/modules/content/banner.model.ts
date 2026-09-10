import { Schema } from "mongoose";
import { dbMain } from "../../config/db";

export interface IButtonPosition {
  top: string;
  left: string;
}

export interface IBanner {
  bannerName: string;
  bannerWebImage: string;
  bannerMobileImage: string;
  bannerLink: string;
  index: number;
  showOnWebsite: boolean;
  buttonLabel?: string;
  buttonPosition?: IButtonPosition;
  buttonPositionmob?: IButtonPosition;
  dueDate?: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    bannerName: { type: String, required: true },
    bannerWebImage: { type: String, required: true },
    bannerMobileImage: { type: String, required: true },
    bannerLink: { type: String, required: true },
    index: { type: Number, default: 0 },
    showOnWebsite: { type: Boolean, default: false },
    buttonLabel: { type: String },
    buttonPosition: {
      top: { type: String },
      left: { type: String },
    },
    buttonPositionmob: {
      top: { type: String },
      left: { type: String },
    },
    dueDate: { type: Date },
  },
  { timestamps: true },
);

export const Banner = dbMain.model<IBanner>("poojaBannerData", bannerSchema, "poojaBannerData");
