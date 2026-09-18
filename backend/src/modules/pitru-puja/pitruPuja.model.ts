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

interface IPitruPujaBenefit {
  title: string;
  description: string;
}

interface IPitruPujaFaq {
  question: string;
  answer: string;
}

export interface IPitruPuja extends Document {
  pujaId: string;
  pujaName: string;
  subName: string;
  bannerImages: string[];
  cardImage: string;
  festiveTags: string[];
  reason: string;
  mandirDate: Date[];
  about: string;
  benefits: IPitruPujaBenefit[];
  aboutMandir: string;
  packages: IPitruPujaPackage[];
  isActive: boolean;
  festiveName: string;
  mandirName: string;
  mandirPlace: string;
  featureCards: IPitruPujaFeatureCard[];
  faqs: IPitruPujaFaq[];
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

const pitruPujaBenefitSchema = new Schema<IPitruPujaBenefit>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const pitruPujaFaqSchema = new Schema<IPitruPujaFaq>(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true },
  },
  { _id: false },
);

const pitruPujaSchema = new Schema<IPitruPuja>(
  {
    pujaId: { type: String, required: true, trim: true, unique: true },
    pujaName: { type: String, required: true, trim: true },
    subName: { type: String, trim: true, default: "" },
    bannerImages: { type: [String], default: [] },
    // Listing/home card image, 1.85:1 like poojaCardImage; the banner is used when empty.
    cardImage: { type: String, trim: true, default: "" },
    festiveTags: { type: [String], default: [] },
    reason: { type: String, trim: true, default: "" },
    mandirDate: { type: [Date], default: [] },
    about: { type: String, default: "" },
    benefits: { type: [pitruPujaBenefitSchema], default: [] },
    aboutMandir: { type: String, default: "" },
    packages: { type: [pitruPujaPackageSchema], default: [] },
    isActive: { type: Boolean, default: true },
    festiveName: { type: String, trim: true, default: "" },
    mandirName: { type: String, trim: true, default: "" },
    mandirPlace: { type: String, trim: true, default: "" },
    featureCards: { type: [pitruPujaFeatureCardSchema], default: [] },
    faqs: { type: [pitruPujaFaqSchema], default: [] },
  },
  { timestamps: true, autoIndex: true },
);

const PitruPuja: Model<IPitruPuja> = dbMain.model<IPitruPuja>("PitruPuja", pitruPujaSchema, "pitrupujas");

export default PitruPuja;
