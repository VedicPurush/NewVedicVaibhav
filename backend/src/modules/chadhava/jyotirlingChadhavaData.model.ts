import { Schema, type Document, type Model } from "mongoose";
import { dbMain } from "../../config/db";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

interface IFileMeta {
  fieldname?: string;
  originalname?: string;
  encoding?: string;
  mimetype?: string;
  destination?: string;
  filename?: string;
  path?: string;
  size?: number;
  location?: string;
  key?: string;
}

export interface IJyotirlingTemple {
  id: string; // e.g. "somnath"
  nameEnglish: string;
  location: string;
  state: string;
  image?: IFileMeta | null;
  shortDescription?: string;
  fullDescription?: string;
  importance?: string;
  relatedDeity?: string;

  // Schedule
  defaultMonth: number; // 0-11
  defaultDate: number;
  time?: string;

  availabilityStatus: boolean;
  displayOrder: number;
  isActive: boolean;
}

interface IChadhavaOffering {
  id: string; // e.g. "bel-patra"
  name: string;
  image?: IFileMeta | null;
  shortDescription?: string;
  fullDescription?: string;

  price: number;
  originalPrice?: number;
  discountedPrice?: number;

  itemsIncluded?: string[];
  benefits?: string[];
  estimatedCompletion?: string;

  availabilityStatus: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface IJyotirlingChadhavaData extends Document {
  // Banners
  topBannerImage?: IFileMeta | null;
  bottomBannerImage?: IFileMeta | null;
  mobileBannerImage?: IFileMeta | null;
  desktopBannerImage?: IFileMeta | null;

  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerCtaText?: string;

  // Arrays of Temples and Offerings
  jyotirlingTemples: IJyotirlingTemple[];
  chadhavaOfferings: IChadhavaOffering[];

  // Status of the entire service
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/*                                  SCHEMAS                                   */
/* -------------------------------------------------------------------------- */

const fileSchema = new Schema<IFileMeta>(
  {
    fieldname: { type: String },
    originalname: { type: String },
    encoding: { type: String },
    mimetype: { type: String },
    destination: { type: String },
    filename: { type: String },
    path: { type: String },
    size: { type: Number },
    location: { type: String },
    key: { type: String },
  },
  { _id: false },
);

const jyotirlingTempleSchema = new Schema<IJyotirlingTemple>(
  {
    id: { type: String, required: true },
    nameEnglish: { type: String, required: true },
    location: { type: String, required: true },
    state: { type: String, default: "" },
    image: { type: fileSchema, default: null },
    shortDescription: { type: String, default: "" },
    fullDescription: { type: String, default: "" },
    importance: { type: String, default: "" },
    relatedDeity: { type: String, default: "Lord Shiva" },

    defaultMonth: { type: Number, required: true },
    defaultDate: { type: Number, required: true },
    time: { type: String, default: "" },

    availabilityStatus: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const chadhavaOfferingSchema = new Schema<IChadhavaOffering>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: fileSchema, default: null },
    shortDescription: { type: String, default: "" },
    fullDescription: { type: String, default: "" },

    price: { type: Number, required: true },
    originalPrice: { type: Number, default: 0 },
    discountedPrice: { type: Number, default: 0 },

    itemsIncluded: { type: [String], default: [] },
    benefits: { type: [String], default: [] },
    estimatedCompletion: { type: String, default: "" },

    availabilityStatus: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

/* -------------------------------------------------------------------------- */
/*                               MAIN SCHEMA                                  */
/* -------------------------------------------------------------------------- */

const jyotirlingChadhavaDataSchema = new Schema<IJyotirlingChadhavaData>(
  {
    // Banners
    topBannerImage: { type: fileSchema, default: null },
    bottomBannerImage: { type: fileSchema, default: null },
    mobileBannerImage: { type: fileSchema, default: null },
    desktopBannerImage: { type: fileSchema, default: null },

    bannerTitle: { type: String, default: "" },
    bannerSubtitle: { type: String, default: "" },
    bannerCtaText: { type: String, default: "" },

    // Data Arrays
    jyotirlingTemples: { type: [jyotirlingTempleSchema], default: [] },
    chadhavaOfferings: { type: [chadhavaOfferingSchema], default: [] },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

/* -------------------------------------------------------------------------- */
/*                                   MODEL                                    */
/* -------------------------------------------------------------------------- */

const JyotirlingChadhavaData: Model<IJyotirlingChadhavaData> =
  (dbMain.models.JyotirlingChadhavaData as Model<IJyotirlingChadhavaData> | undefined) ||
  dbMain.model<IJyotirlingChadhavaData>(
    "JyotirlingChadhavaData",
    jyotirlingChadhavaDataSchema,
    "jyotirlingChadhavaData",
  );

export default JyotirlingChadhavaData;
