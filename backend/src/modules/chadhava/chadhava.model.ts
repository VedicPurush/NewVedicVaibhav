import { Schema, type Document, type Model } from "mongoose";
import { dbMain } from "../../config/db";
import {
  internationalSchemaFields,
  type IInternationalFields,
} from "../../lib/internationalSchema";

// --- INTERFACES ---

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

export interface IChadhavaBooking extends Document, IInternationalFields {
  userID: string;
  name: string;
  whatsapp: string;
  transactionID?: string;
  orderID: string;
  puja: {
    chadhavaId: string;
    title: string;
    temple: string;
    date: Date;
  };
  accessories: IChadhavaItem[];
  comboSelections?: IComboSelection[];
  prasad?: IPrasad;
  address?: IAddress;
  totalPrice: number;
  familyMembers: string[];
  gotra?: string | null;
  bookingDate: Date;
  status: "pending" | "confirmed" | "failed";
  statusDate: Date;
  referralCode?: string | null;
  /** Which surface this order was placed from — the APP referral order cap (first N orders
   *  per referred customer, admin-editable) only ever applies to orderSource === 'APP'. */
  orderSource?: "APP" | "WEBSITE";
  createdAt?: Date;
  updatedAt?: Date;
}

// --- SUB-DOCUMENT SCHEMAS ---

const chadhavaItemSchema = new Schema<IChadhavaItem>(
  {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    desc: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false },
);

const prasadSchema = new Schema<IPrasad>(
  {
    name: { type: String, required: true },
    desc: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
  },
  { _id: false },
);

const comboSelectionSchema = new Schema<IComboSelection>(
  {
    comboId: { type: String, required: true },
    comboName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number },
    items: [{ type: Number }],
    image: { type: String },
    images: [{ type: String }],
    comboDescription: { type: String },
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

// --- MAIN BOOKING SCHEMA ---

const chadhavaBookingSchema = new Schema<IChadhavaBooking>(
  {
    /** Presentment currency, charged amount, FX rate, market. See lib/internationalSchema. */
    ...internationalSchemaFields,
    userID: { type: String, required: true },
    transactionID: { type: String },
    orderID: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    whatsapp: { type: String, required: true },
    puja: {
      chadhavaId: { type: String, required: true },
      title: { type: String, required: true },
      temple: { type: String, required: true },
      date: { type: Date, required: true },
    },
    accessories: [chadhavaItemSchema],
    comboSelections: { type: [comboSelectionSchema], default: [] },
    prasad: prasadSchema,
    address: addressSchema,
    totalPrice: { type: Number, required: true },
    familyMembers: [{ type: String }],
    gotra: { type: String, default: null },
    bookingDate: { type: Date, default: Date.now, required: true },
    status: { type: String, enum: ["pending", "confirmed", "failed"], default: "pending" },
    statusDate: { type: Date, default: Date.now },
    referralCode: { type: String, default: null },
    orderSource: { type: String, enum: ["APP", "WEBSITE"], default: "WEBSITE" },
  },
  { timestamps: true },
);

const ChadhavaBooking: Model<IChadhavaBooking> = dbMain.model<IChadhavaBooking>(
  "ChadhavaBooking",
  chadhavaBookingSchema,
  "chadhavaBookings",
);

export default ChadhavaBooking;
