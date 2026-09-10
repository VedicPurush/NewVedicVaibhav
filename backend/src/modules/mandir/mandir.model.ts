import { Schema } from "mongoose";
import type { Model, Types } from "mongoose";
import { dbMain } from "../../config/db";

export interface IMandir {
  _id: Types.ObjectId;
  nameID: string;
  nameHindi: string;
  nameEnglish: string;
  mandirDirection: string;
  godName: string[];
  location: string;
  openTiming: string;
  closeTiming: string;
  state: string;
  city: string;
  pincode: number;
  images: string[];
  isActive: boolean;
  mandirSectionIntro: string;
  mandirSectionHistory: string;
  localLanguage: string;
  isPhotography: string;
  isPrasadAvailable: boolean;
  prasadPrice: number;
  mandirSectionImage: string | null;
  mandirIntroImage: string | null;
  mandirPoojaImage: string | null;
}

const mandirSchema = new Schema<IMandir>(
  {
    nameID: { type: String, required: true },
    nameHindi: { type: String, required: true },
    nameEnglish: { type: String, required: true },
    mandirDirection: { type: String, required: true },
    godName: { type: [String], required: true },
    location: { type: String, required: true },
    openTiming: { type: String, required: true },
    closeTiming: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    pincode: { type: Number, required: true },
    images: { type: [String], required: true },
    isActive: { type: Boolean, required: true },
    mandirSectionIntro: { type: String, required: true },
    mandirSectionHistory: { type: String, required: true },
    localLanguage: { type: String, required: true },
    isPhotography: { type: String, required: true },
    isPrasadAvailable: { type: Boolean, required: true },
    prasadPrice: { type: Number, required: false },
    mandirSectionImage: { type: String, required: false, default: null },
    mandirIntroImage: { type: String, required: false, default: null },
    mandirPoojaImage: { type: String, required: false, default: null },
  },
  { timestamps: true },
);

const Mandir: Model<IMandir> = dbMain.model<IMandir>("Mandir", mandirSchema, "mandirs");

export default Mandir;
