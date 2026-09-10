import { Schema, type Document, type Model } from "mongoose";
import { dbMain } from "../../config/db";

/* ==========================================================================
   New pooja schema (`newpoojas` collection)
   --------------------------------------------------------------------------
   Differences from the legacy `poojas` collection:
     - the mandir is embedded (mandirDetails[]) instead of referenced, so no
       populate is needed and temple copy lives with the pooja
     - one price pair on the document (originalPrice / discountPrice) instead
       of four per-mandir packages
     - poojaTags[] replaces the hard-coded hero chips
   ========================================================================== */

interface IMandirDetails {
  name: string;
  nameHindi?: string;
  deity?: string;
  location?: string;
  state?: string;
  city?: string;
  significance?: string;
  sacredLandmarks?: string[];
  darshanSeason?: string;
  timings?: string;
  image?: string;
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

export interface INewPooja extends Document {
  poojaID: string;
  title: string;
  titleHindi: string;
  poojaGod: string;
  moolmantra: string;
  poojaColor: string;
  poojaTags: string[];
  poojaDescription: string;
  poojaCardBenefit: string;
  images: string[];
  poojaCardImage: string;
  appImage: string;
  isActive: boolean;
  isExclusive: boolean;
  isFeatured: boolean;
  isIdolAvailable: boolean;
  poojaDates: Date[];
  mandirDetails: IMandirDetails[];
  idolDetails: IIdolDetails;
  linkedBlogId: Schema.Types.ObjectId | null;
  products: Schema.Types.ObjectId[];
  originalPrice: number;
  discountPrice: number;
  familyMemberPrice: number;
}

const mandirDetailsSchema = new Schema<IMandirDetails>({
  name: { type: String, trim: true },
  nameHindi: { type: String, trim: true },
  deity: { type: String, trim: true },
  location: { type: String, trim: true },
  state: { type: String, trim: true },
  city: { type: String, trim: true },
  significance: { type: String, trim: true },
  sacredLandmarks: { type: [String], default: [] },
  darshanSeason: { type: String, trim: true },
  timings: { type: String, trim: true },
  image: { type: String },
});

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

const newPoojaSchema = new Schema<INewPooja>(
  {
    poojaID: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    titleHindi: { type: String, trim: true },
    poojaGod: { type: String, trim: true },
    moolmantra: { type: String, trim: true },
    // theme colour for the pooja page, stored as a hex string (e.g. "#8E24AA")
    poojaColor: { type: String, trim: true, default: "" },
    poojaTags: { type: [String], default: [] },
    poojaDescription: { type: String, trim: true },
    poojaCardBenefit: { type: String, trim: true },
    images: { type: [String], default: [] },
    poojaCardImage: { type: String },
    appImage: { type: String },
    isActive: { type: Boolean, default: true },
    isExclusive: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isIdolAvailable: { type: Boolean, default: false },
    // scheduled dates this pooja is performed on
    poojaDates: { type: [Date], default: [] },
    mandirDetails: { type: [mandirDetailsSchema], default: [] },
    idolDetails: { type: idolDetailsSchema, default: () => ({}) },
    linkedBlogId: { type: Schema.Types.ObjectId, ref: "Blog", default: null },
    products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    originalPrice: { type: Number, default: 0 },
    discountPrice: { type: Number, default: 0 },
    // charged per additional family member in the sankalp. Lives on the
    // document so the server can verify the order total independently of
    // whatever the browser claims it is.
    familyMemberPrice: { type: Number, default: 101 },
  },
  { timestamps: true, autoIndex: true },
);

const NewPooja: Model<INewPooja> = dbMain.model<INewPooja>("NewPooja", newPoojaSchema, "newpoojas");

export default NewPooja;
