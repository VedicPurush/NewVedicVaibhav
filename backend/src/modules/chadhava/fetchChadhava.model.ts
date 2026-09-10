import { Schema, type Document, type Model } from "mongoose";
import { dbMain } from "../../config/db";

interface IMandirInfo {
  mandirId: Schema.Types.ObjectId;
  nameEnglish: string;
  images: string[];
  city: string;
  mandirAppImage: string;
  nameID: string;
  mandirSectionIntro: string;
  mandirSectionHistory: string;
}

interface IChadhavaItem {
  chadhavaName: string;
  chadhavaDescription: string;
  chadhavaPrice: number;
  chadhavaImage: string;
}

interface IChadhavaBenefit {
  heading: string;
  description: string;
}

interface IChadhavaCombo {
  comboName: string;
  comboDescription: string;
  comboItems: number[];
  comboPrice: number;
  comboImage: string;
}

export interface IChadhavaData extends Document {
  chadhavaName: string;
  mandirs: IMandirInfo[];
  availableDates: Date[];
  descriptionName: string;
  description: string;
  chadhavaWebCardImage: string;
  chadhavaAppImage: string;
  chadhavaInnerImages: string[];
  chadhavaItems: IChadhavaItem[];
  chadhavaCombos: IChadhavaCombo[];
  benefits: IChadhavaBenefit[];
  isActive: boolean;
  isFeatured: boolean;
  isExclusive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const mandirInfoSchema = new Schema<IMandirInfo>(
  {
    mandirId: { type: Schema.Types.ObjectId, required: true, ref: "Mandir" },
    nameEnglish: { type: String, required: true },
    images: [{ type: String }],
    city: { type: String },
    mandirAppImage: { type: String },
    nameID: { type: String },
    mandirSectionIntro: { type: String },
    mandirSectionHistory: { type: String },
  },
  { _id: false },
);

const chadhavaItemSchema = new Schema<IChadhavaItem>(
  {
    chadhavaName: { type: String, required: true },
    chadhavaDescription: { type: String, required: true },
    chadhavaPrice: { type: Number, required: true },
    chadhavaImage: { type: String, required: true },
  },
  { _id: false },
);

const chadhavaBenefitSchema = new Schema<IChadhavaBenefit>(
  {
    heading: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false },
);

const chadhavaComboSchema = new Schema<IChadhavaCombo>(
  {
    comboName: { type: String, required: true },
    comboDescription: { type: String, required: true },
    comboItems: [{ type: String, required: true }],
    comboPrice: { type: Number, required: true },
    comboImage: { type: String, required: true },
  },
  { _id: false },
);

// --- MAIN CHADHAVA DATA SCHEMA ---
const chadhavaDataSchema = new Schema<IChadhavaData>(
  {
    chadhavaName: { type: String, required: true },
    mandirs: [mandirInfoSchema],
    availableDates: [{ type: Date, required: true }],
    descriptionName: { type: String, required: true },
    description: { type: String, required: true },
    chadhavaWebCardImage: { type: String, required: true },
    chadhavaAppImage: { type: String, required: true },
    chadhavaInnerImages: [{ type: String }],
    chadhavaItems: [chadhavaItemSchema],
    benefits: [chadhavaBenefitSchema],
    chadhavaCombos: [chadhavaComboSchema],
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isExclusive: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const ChadhavaData: Model<IChadhavaData> = dbMain.model<IChadhavaData>(
  "ChadhavaData",
  chadhavaDataSchema,
  "chadhavaDatas",
);

export default ChadhavaData;
