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
  // cloud storage (optional)
  location?: string;
  key?: string;
}

interface IMandirInfo {
  mandirId: Schema.Types.ObjectId;
  nameEnglish?: string;
  images?: string[];
  city?: string;
  mandirAppImage?: string;
  nameID?: string;
  mandirSectionIntro?: string;
  mandirSectionHistory?: string;
}

interface IBenefit {
  description: string;
}

interface IChadhavaSectionItem {
  itemName: string;
  itemPrice: number;
  itemDesc: string;
  itemImage?: IFileMeta | null;
  type: "item" | "combo";
  discountedPrice?: number;
}

interface IChadhavaSection {
  sectionName: string;
  items: IChadhavaSectionItem[];
}

interface IExclusiveSection {
  name: string;
  desc: string;
  price: number;
  images: IFileMeta[];
}

interface IOffer {
  offerName: string;
  offerStartPrice: number;
  offerPrice: number;
  offerDescription: string;
  sendTo: "home" | "temple";
  images: IFileMeta[];
}

export interface INewChadhavaData extends Document {
  chadhavaName: string;

  selectedMandirs: IMandirInfo[];

  availableDates: string[]; // YYYY-MM-DD
  rating: number | null;

  description: string;

  chadhavaWebCardImage: IFileMeta | null;
  chadhavaAppImage: IFileMeta | null;
  chadhavaInnerImages: IFileMeta[];

  benefits: IBenefit[];

  chadhavaSections: IChadhavaSection[];

  exclusiveSections: IExclusiveSection[];

  isOfferAvailable: boolean;
  offer: IOffer | null;

  isActive: boolean;
  isFeatured: boolean;
  isExclusive: boolean;

  // backward-compat fields
  chadhavaItems: unknown[];
  offers: unknown[];
  combos: unknown[];

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

const mandirInfoSchema = new Schema<IMandirInfo>(
  {
    mandirId: { type: Schema.Types.ObjectId, required: true, ref: "Mandir" },
    nameEnglish: { type: String },
    images: { type: [String], default: [] },
    city: { type: String },
    mandirAppImage: { type: String },
    nameID: { type: String },
    mandirSectionIntro: { type: String },
    mandirSectionHistory: { type: String },
  },
  { _id: false },
);

const benefitSchema = new Schema<IBenefit>(
  {
    description: { type: String, default: "" },
  },
  { _id: false },
);

const chadhavaSectionItemSchema = new Schema<IChadhavaSectionItem>(
  {
    itemName: { type: String, default: "" },
    itemPrice: { type: Number, default: 0 },
    itemDesc: { type: String, default: "" },
    itemImage: { type: fileSchema, default: null },
    type: { type: String, enum: ["item", "combo"], default: "item" },
    discountedPrice: { type: Number },
  },
  { _id: false },
);

const chadhavaSectionSchema = new Schema<IChadhavaSection>(
  {
    sectionName: { type: String, default: "" },
    items: { type: [chadhavaSectionItemSchema], default: [] },
  },
  { _id: false },
);

const exclusiveSectionSchema = new Schema<IExclusiveSection>(
  {
    name: { type: String, default: "" },
    desc: { type: String, default: "" },
    price: { type: Number, default: 0 },
    images: { type: [fileSchema], default: [] },
  },
  { _id: false },
);

const offerSchema = new Schema<IOffer>(
  {
    offerName: { type: String, default: "" },
    offerStartPrice: { type: Number, default: 0 },
    offerPrice: { type: Number, default: 0 },
    offerDescription: { type: String, default: "" },
    sendTo: { type: String, enum: ["home", "temple"], default: "home" },
    images: { type: [fileSchema], default: [] },
  },
  { _id: false },
);

/* -------------------------------------------------------------------------- */
/*                               MAIN SCHEMA                                  */
/* -------------------------------------------------------------------------- */

const newChadhavaDataSchema = new Schema<INewChadhavaData>(
  {
    chadhavaName: { type: String, required: true, trim: true },

    selectedMandirs: { type: [mandirInfoSchema], default: [] },

    availableDates: { type: [String], default: [] }, // YYYY-MM-DD strings
    rating: { type: Number, default: null },

    description: { type: String, default: "" },

    chadhavaWebCardImage: { type: fileSchema, default: null },
    chadhavaAppImage: { type: fileSchema, default: null },
    chadhavaInnerImages: { type: [fileSchema], default: [] },

    benefits: { type: [benefitSchema], default: [] },

    chadhavaSections: { type: [chadhavaSectionSchema], default: [] },

    exclusiveSections: { type: [exclusiveSectionSchema], default: [] },

    isOfferAvailable: { type: Boolean, default: false },
    offer: { type: offerSchema, default: null },

    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isExclusive: { type: Boolean, default: false },

    // legacy fields (keep if needed)
    chadhavaItems: { type: Schema.Types.Mixed, default: [] },
    offers: { type: Schema.Types.Mixed, default: [] },
    combos: { type: Schema.Types.Mixed, default: [] },
  },
  { timestamps: true },
);

/* -------------------------------------------------------------------------- */
/*                                   MODEL                                    */
/* -------------------------------------------------------------------------- */

const NewChadhavaData: Model<INewChadhavaData> =
  (dbMain.models.NewChadhavaData as Model<INewChadhavaData> | undefined) ||
  dbMain.model<INewChadhavaData>(
    "NewChadhavaData",
    newChadhavaDataSchema,
    "NewChadhavaData", // collection name intentionally matches the legacy DB
  );

export default NewChadhavaData;
