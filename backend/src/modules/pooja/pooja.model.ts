import { Schema, Types, type Document, type Model } from "mongoose";
import { dbMain } from "../../config/db";

interface IPackage {
  price: number;
  description: string;
}

export interface IMandir extends Document {
  mandirId: Types.ObjectId;
  originalPrice: number;
  discountPrice: number;
  poojaMandirTime: string;
  poojaMandirDates: Date[];
  poojaMandirBenefits: string;
  singlePackage: IPackage;
  partnerPackage: IPackage;
  familyBhogPackage: IPackage;
  jointFamilyPackage: IPackage;
}

interface IPoojaBenefits {
  benefit1Heading: string;
  benefit1Desc: string;
  benefit2Heading: string;
  benefit2Desc: string;
  benefit3Heading: string;
  benefit3Desc: string;
}

interface IIdolDetails {
  isIdolAvailable: boolean;
  idolName?: string;
  idolPrice?: number;
  idolDescription?: string;
  idolImages?: string[];
  stock?: number;
  length?: number;
  lengthUnit?: string;
  width?: number;
  widthUnit?: string;
  height?: number;
  heightUnit?: string;
  weight?: number;
  weightUnit?: string;
  idolBenefitHeading?: string;
  idolBenefitDescriptions?: string[];
  idolMrpPrice?: number;
  idolBigDescription?: string;
  rating?: number;
  numberOfReviews?: number;
}

export interface IPooja extends Document {
  poojaID: string;
  title: string;
  titleHindi: string;
  poojaGod: string;
  moolmantra: string;
  poojaBenefits: IPoojaBenefits;
  poojaDescription: string;
  images: string[];
  poojaCardBenefit: string;
  poojaCardImage: string;
  appImage: string;
  poojaColor: string;
  isActive: boolean;
  isExclusive: boolean;
  isFeatured: boolean;
  mandirLists: IMandir[];
  idolDetails?: IIdolDetails;
}

const packageSchema = new Schema<IPackage>({
  price: { type: Number, required: true },
  description: { type: String, required: true },
});

const mandirSubSchema = new Schema<IMandir>({
  mandirId: { type: Schema.Types.ObjectId, ref: "Mandir", required: true },
  originalPrice: { type: Number, required: true },
  discountPrice: { type: Number, required: true },
  poojaMandirTime: { type: String, required: true },
  poojaMandirDates: [{ type: Date, required: true }],
  poojaMandirBenefits: { type: String, required: true },
  singlePackage: { type: packageSchema, required: true },
  partnerPackage: { type: packageSchema, required: true },
  familyBhogPackage: { type: packageSchema, required: true },
  jointFamilyPackage: { type: packageSchema, required: true },
});

const poojaBenefitsSchema = new Schema<IPoojaBenefits>(
  {
    benefit1Heading: { type: String, required: true },
    benefit1Desc: { type: String, required: true },
    benefit2Heading: { type: String, required: true },
    benefit2Desc: { type: String, required: true },
    benefit3Heading: { type: String, required: true },
    benefit3Desc: { type: String, required: true },
  },
  { _id: false },
);

const idolDetailsSchema = new Schema<IIdolDetails>(
  {
    isIdolAvailable: { type: Boolean, default: false },
    idolName: { type: String, default: "" },
    idolPrice: { type: Number, default: 0 },
    idolDescription: { type: String, default: "" },
    idolImages: { type: [String], default: [] },
    stock: { type: Number, default: 0 },
    length: { type: Number, default: 0 },
    lengthUnit: { type: String, default: "" },
    width: { type: Number, default: 0 },
    widthUnit: { type: String, default: "" },
    height: { type: Number, default: 0 },
    heightUnit: { type: String, default: "" },
    weight: { type: Number, default: 0 },
    weightUnit: { type: String, default: "" },
    idolBenefitHeading: { type: String, default: "" },
    idolBenefitDescriptions: { type: [String], default: [] },
    idolMrpPrice: { type: Number, default: 0 },
    idolBigDescription: { type: String, default: "" },
    rating: { type: Number, default: 0 },
    numberOfReviews: { type: Number, default: 0 },
  },
  { _id: false },
);

const poojaSchema = new Schema<IPooja>(
  {
    poojaID: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    titleHindi: { type: String, required: true, trim: true },
    poojaGod: { type: String, required: true, trim: true },
    moolmantra: { type: String, required: true, trim: true },
    poojaBenefits: { type: poojaBenefitsSchema, required: true },
    poojaDescription: { type: String, required: true, trim: true },
    poojaCardBenefit: { type: String, required: true, trim: true },
    images: { type: [String], required: true },
    poojaCardImage: { type: String },
    appImage: { type: String },
    // theme colour for the pooja page, stored as a hex string (e.g. "#16264A")
    poojaColor: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
    isExclusive: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    mandirLists: [mandirSubSchema],
    idolDetails: { type: idolDetailsSchema, default: () => ({}) },
  },
  { timestamps: true, autoIndex: true },
);

const Pooja: Model<IPooja> = dbMain.model<IPooja>("Pooja", poojaSchema, "poojas");

export default Pooja;
