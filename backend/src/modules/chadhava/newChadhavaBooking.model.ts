import { Schema, type Document, type Model, Types } from "mongoose";
import { dbMain } from "../../config/db";
import {
  internationalSchemaFields,
  type IInternationalFields,
} from "../../lib/internationalSchema";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export interface IAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  number: string;
  email?: string;
  pinCode: number;
}

// Legacy (old booking) item types (kept for backward compatibility)
export interface IChadhavaItem {
  id: number;
  name: string;
  desc: string;
  price: number;
  image: string;
  quantity: number;
}

export interface IPrasad {
  name: string;
  desc: string;
  price: number;
  image: string;
}

export interface IComboSelection {
  comboId: string;
  comboName: string;
  quantity: number;
  price?: number;
  items?: number[];
  image?: string;
  images?: string[];
  comboDescription?: string;
}

/* -------------------------- New ChadhavaData shapes ----------------------- */

export interface IFileMeta {
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

export interface IMandirInfoSnapshot {
  mandirId: Types.ObjectId;
  nameEnglish?: string;
  images?: string[];
  city?: string;
  mandirAppImage?: string;
  nameID?: string;
  mandirSectionIntro?: string;
  mandirSectionHistory?: string;
}

export interface IBenefit {
  description: string;
}

/** Booking-time selected item (based on NewChadhavaData chadhavaSections.items). */
export interface IBookedSectionItem {
  itemName: string;
  itemPrice: number;
  itemDesc: string;
  itemImage?: IFileMeta | null;
  type: "item" | "combo";
  discountedPrice?: number;
  quantity: number;
  sectionIndex?: number;
  itemIndex?: number;
}

export interface IBookedSection {
  sectionName: string;
  items: IBookedSectionItem[];
}

export interface IBookedExclusiveSelection {
  name: string;
  desc: string;
  price: number;
  quantity: number;
  images: IFileMeta[];
}

export interface IBookedOffer {
  offerName: string;
  offerStartPrice: number;
  offerPrice: number;
  offerDescription: string;
  sendTo: "home" | "temple";
  images: IFileMeta[];
}

/* ---------- Upsell product (added during payment) ---------- */
export interface IUpsellProduct {
  productName: string;
  price: number;
  discountedPrice: number;
  description?: string;
  image?: string;
}

/* -------------------------------------------------------------------------- */
/*                             MAIN BOOKING DOC                               */
/* -------------------------------------------------------------------------- */

export interface IChadhavaBooking extends Document, IInternationalFields {
  userID: string;

  name: string;
  whatsapp: string;
  email?: string;

  transactionID?: string;
  orderID: string;

  /** Booked chadhava snapshot based on NewChadhavaData; field name kept as `puja`
   *  so the older API / frontend usage doesn't break. */
  puja: {
    chadhavaId: Types.ObjectId;
    chadhavaName: string;
    mandir: IMandirInfoSnapshot | null;
    date: Date;
    dateString?: string;
    description?: string;
    rating?: number | null;
    chadhavaWebCardImage?: IFileMeta | null;
    chadhavaAppImage?: IFileMeta | null;
    chadhavaInnerImages?: IFileMeta[];
    benefits?: IBenefit[];
    bookedSections?: IBookedSection[];
    bookedExclusiveSections?: IBookedExclusiveSelection[];
    offerApplied?: IBookedOffer[] | null;
  };

  // Legacy fields (optional) for old bookings
  accessories?: IChadhavaItem[];
  comboSelections?: IComboSelection[];

  prasad?: IPrasad | null;
  address?: IAddress | null;

  totalPrice: number;
  familyMembers: string[];
  gotra?: string | null;

  bookingDate: Date;

  status: "pending" | "confirmed" | "failed";
  statusDate: Date;

  referralCode?: string | null;

  // Upsell: product(s) added by the user during payment checkout
  upsellProducts?: IUpsellProduct[];
  hasUpsell?: boolean;

  vv_utm?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };

  createdAt?: Date;
  updatedAt?: Date;
}

/* -------------------------------------------------------------------------- */
/*                                  SCHEMAS                                   */
/* -------------------------------------------------------------------------- */

const prasadSchema = new Schema<IPrasad>(
  {
    name: { type: String, required: true },
    desc: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
  },
  { _id: false },
);

const addressSchema = new Schema<IAddress>(
  {
    name: { type: String, required: true },
    address1: { type: String, required: true },
    address2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    number: { type: String, required: true },
    email: { type: String },
    pinCode: { type: Number, required: true },
  },
  { _id: false },
);

// new chadhava snapshot schemas
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

const mandirInfoSchema = new Schema<IMandirInfoSnapshot>(
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

const bookedSectionItemSchema = new Schema<IBookedSectionItem>(
  {
    itemName: { type: String, required: true, trim: true },
    itemPrice: { type: Number, required: true },
    itemDesc: { type: String, default: "" },
    itemImage: { type: fileSchema, default: null },
    type: { type: String, enum: ["item", "combo"], required: true },
    discountedPrice: { type: Number },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    sectionIndex: { type: Number },
    itemIndex: { type: Number },
  },
  { _id: false },
);

const bookedSectionSchema = new Schema<IBookedSection>(
  {
    sectionName: { type: String, required: true, trim: true },
    items: { type: [bookedSectionItemSchema], default: [] },
  },
  { _id: false },
);

const bookedOfferSchema = new Schema<IBookedOffer>(
  {
    offerName: { type: String, required: true, trim: true },
    offerStartPrice: { type: Number, default: 0 },
    offerPrice: { type: Number, default: 0 },
    offerDescription: { type: String, default: "" },
    sendTo: { type: String, enum: ["home", "temple"], default: "home" },
    images: { type: [fileSchema], default: [] },
  },
  { _id: false },
);

/* -------------------------------------------------------------------------- */
/*                               BOOKING SCHEMA                               */
/* -------------------------------------------------------------------------- */

const newChadhavaBookingSchema = new Schema<IChadhavaBooking>(
  {
    /** Presentment currency, charged amount, FX rate, market. See lib/internationalSchema. */
    ...internationalSchemaFields,
    userID: { type: String, required: true },

    transactionID: { type: String },
    orderID: { type: String, required: true, unique: true },

    name: { type: String, required: true },
    whatsapp: { type: String, required: true },
    email: { type: String, required: false },

    puja: {
      chadhavaId: { type: Schema.Types.ObjectId, required: true },
      chadhavaName: { type: String, required: true, trim: true },
      mandir: { type: mandirInfoSchema, default: null },
      date: { type: Date, required: true },
      dateString: { type: String }, // optional: YYYY-MM-DD
      description: { type: String, default: "" },
      rating: { type: Number, default: null },
      bookedSections: { type: [bookedSectionSchema], default: [] },
      offerApplied: { type: [bookedOfferSchema], default: [] },
    },

    prasad: { type: prasadSchema, default: null },
    address: { type: addressSchema, default: null },

    totalPrice: { type: Number, required: true },

    familyMembers: { type: [{ type: String }], default: [] },
    gotra: { type: String, default: null },

    bookingDate: { type: Date, default: Date.now, required: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "failed"],
      default: "pending",
    },
    statusDate: { type: Date, default: Date.now },

    referralCode: { type: String, default: null },

    // Upsell product(s) added at payment time
    upsellProducts: {
      type: [
        {
          productName: { type: String, required: true },
          price: { type: Number, required: true },
          discountedPrice: { type: Number, required: true },
          description: { type: String, default: "" },
          image: { type: String, default: "" },
        },
      ],
      default: [],
    },
    hasUpsell: { type: Boolean, default: false },

    vv_utm: {
      type: {
        utm_source: { type: String, default: "" },
        utm_medium: { type: String, default: "" },
        utm_campaign: { type: String, default: "" },
        utm_content: { type: String, default: "" },
        utm_term: { type: String, default: "" },
      },
      required: false,
    },
  },
  { timestamps: true },
);

newChadhavaBookingSchema.index({ "puja.chadhavaId": 1, "puja.date": 1 });

/* -------------------------------------------------------------------------- */
/*                                   MODEL                                    */
/* -------------------------------------------------------------------------- */

const NewChadhavaBooking: Model<IChadhavaBooking> =
  (dbMain.models.NewChadhavaBooking as Model<IChadhavaBooking> | undefined) ||
  dbMain.model<IChadhavaBooking>(
    "NewChadhavaBooking", // model name (cache key)
    newChadhavaBookingSchema,
    "newchadhavaBookings", // physical MongoDB collection
  );

export default NewChadhavaBooking;
