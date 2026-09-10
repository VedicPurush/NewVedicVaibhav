import { Schema } from "mongoose";
import type { Model, Types } from "mongoose";
import { dbMain } from "../../config/db";

/**
 * Mandir-affiliated pandit on the MAIN Vedic Vaibhav database ("pandits"
 * collection) — the pickup contact for prasad Shiprocket orders.
 *
 * This is now the only Pandit model in the backend. The pandit-registration
 * module (which had its own Pandit model on the PanditJiAtRequest database) was
 * removed along with that feature.
 */
export interface IMandirPandit {
  panditID: string;
  panditName: string;
  email: string;
  password: string;
  contactNumber: string;
  pincode: number;
  gender: "Male" | "Female" | "Other";
  mandirId?: Types.ObjectId;
  mobileType: "Android" | "iPhone";
  experience: number; // in years
  accountDetails: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };
  isActive: boolean;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const AccountDetailsSchema = new Schema({
  accountNumber: {
    type: String,
    required: true,
    trim: true,
    minlength: 9,
    maxlength: 18,
    validate: {
      validator: (value: string) => /^\d{9,18}$/.test(value),
      message: "Account number must be between 9 and 18 digits",
    },
  },
  ifscCode: {
    type: String,
    required: true,
    trim: true,
    match: /^[A-Za-z]{4}\d{7}$/,
  },
  bankName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  accountHolderName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
});

const panditSchema = new Schema<IMandirPandit>(
  {
    panditID: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    panditName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string) => /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value),
        message: "Please enter a valid email address",
      },
    },
    password: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9]{10}$/,
    },
    pincode: {
      type: Number,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    mandirId: {
      type: Schema.Types.ObjectId,
      ref: "Mandir",
      required: true,
    },
    mobileType: {
      type: String,
      enum: ["Android", "iPhone"],
      required: true,
    },
    experience: {
      type: Number,
      required: true,
      min: 0,
    },
    accountDetails: AccountDetailsSchema,
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      default: "pandit",
    },
  },
  { timestamps: true },
);

const Pandit: Model<IMandirPandit> = dbMain.model<IMandirPandit>("Pandit", panditSchema, "pandits");

export default Pandit;
