import { Schema, type Document, type Model } from "mongoose";
import { dbMain } from "../../config/db";

interface IPitruPujaPackage {
  personCount: number;
  price: number;
  label: string;
  image: string;
}

interface IPitruPujaFeatureCard {
  image?: string;
  title: string;
  description: string;
}

export interface IPitruPuja extends Document {
  pujaId: string;
  pujaName: string;
  subName: string;
  bannerImages: string[];
  festiveTags: string[];
  reason: string;
  mandirDate: Date[];
  about: string;
  benefits: string[];
  aboutMandir: string;
  packages: IPitruPujaPackage[];
  isActive: boolean;
  festiveName: string;
  mandirName: string;
  mandirPlace: string;
  featureCards: IPitruPujaFeatureCard[];
}

const pitruPujaPackageSchema = new Schema<IPitruPujaPackage>(
  {
    personCount: { type: Number, required: true },
    price: { type: Number, required: true },
    label: { type: String, required: true, trim: true },
    image: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const pitruPujaFeatureCardSchema = new Schema<IPitruPujaFeatureCard>(
  {
    image: { type: String, trim: true, default: "" },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const pitruPujaSchema = new Schema<IPitruPuja>(
  {
    pujaId: { type: String, required: true, trim: true, unique: true },
    pujaName: { type: String, required: true, trim: true },
    subName: { type: String, trim: true, default: "" },
    bannerImages: { type: [String], default: [] },
    festiveTags: { type: [String], default: [] },
    reason: { type: String, trim: true, default: "" },
    mandirDate: { type: [Date], default: [] },
    about: { type: String, default: "" },
    benefits: { type: [String], default: [] },
    aboutMandir: { type: String, default: "" },
    packages: { type: [pitruPujaPackageSchema], default: [] },
    isActive: { type: Boolean, default: true },
    festiveName: { type: String, trim: true, default: "" },
    mandirName: { type: String, trim: true, default: "" },
    mandirPlace: { type: String, trim: true, default: "" },
    featureCards: { type: [pitruPujaFeatureCardSchema], default: [] },
  },
  { timestamps: true, autoIndex: true },
);

const PitruPuja: Model<IPitruPuja> = dbMain.model<IPitruPuja>("PitruPuja", pitruPujaSchema, "pitrupujas");

export default PitruPuja;
