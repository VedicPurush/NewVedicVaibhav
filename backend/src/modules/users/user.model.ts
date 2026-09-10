import { Schema, type Types } from "mongoose";
import { dbMain } from "../../config/db";

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  email_verified: boolean;
  family_name: string;
  given_name: string;
  name: string;
  phone: string;
  gender: string;
  picture: string;
  addedOn: Date;
  isActive: boolean;
  isFromApp: boolean;
  isNotifyOkay: boolean;
  otp?: string;
  otpExpiry?: Date;
  communicationOptIn: boolean;
  dob?: string;
  birthTime?: string;
  gotra?: string;
  address?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  familyMembers?: string[];
  isUpdated?: boolean;

  // ---- Partner/Affiliate referral tracking (APP referrals only — website referrals are
  // per-checkout-session via a cookie, not persisted on the user) ----
  /** partnerCode / referral code this user logged in or signed up through on the APP. */
  referredByCode?: string;
  /** Only ever 'APP' — set the moment a referral code is linked via the app login flow. */
  referralSource?: "APP";
  /** How many of this user's APP orders have already earned the referrer a commission. */
  referralOrdersCounted?: number;
  referralLinkedAt?: Date;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: false, sparse: true, index: true },
  email_verified: { type: Boolean, default: false },
  family_name: { type: String },
  given_name: { type: String },
  name: { type: String, default: "" },
  phone: { type: String, unique: true, sparse: true, index: true },
  gender: { type: String },
  picture: { type: String },
  addedOn: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  isFromApp: { type: Boolean, default: true },
  isNotifyOkay: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date },
  communicationOptIn: { type: Boolean, default: false },
  dob: { type: String, default: "" },
  birthTime: { type: String, default: "" },
  gotra: { type: String, default: "" },
  address: { type: String, default: "" },
  address1: { type: String, default: "" },
  address2: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  country: { type: String, default: "" },
  pincode: { type: String, default: "" },
  familyMembers: { type: [String], default: [] },
  isUpdated: { type: Boolean, default: false },

  // Partner/Affiliate APP referral tracking (see IUser above)
  referredByCode: { type: String, default: null, index: true },
  referralSource: { type: String, enum: ["APP"], default: null },
  referralOrdersCounted: { type: Number, default: 0, min: 0 },
  referralLinkedAt: { type: Date, default: null },
});

export const User = dbMain.model<IUser>("User", userSchema, "users");
