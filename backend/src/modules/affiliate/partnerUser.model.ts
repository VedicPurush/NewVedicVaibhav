import { Schema, type Model, type Types } from "mongoose";
import { dbPartnerAffiliate } from "../../config/db";

/**
 * Local mirror of the partner-affiliate dashboard's user (partner / affiliate /
 * promoter-partner) — registered on the partner-affiliate database under the
 * legacy model name "User" (collection "users").
 */
export interface IPartnerUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  password: string;
  userId: string;
  refferalCode?: string;
  roleType: "PROMOTER_PARTNER" | "PARTNER" | "AFFILIATE";
  createdOn?: Date;
  updatedOn?: Date;
  isActive: boolean;
  isApproved: boolean;
}

const partnerUserSchema = new Schema<IPartnerUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    userId: { type: String, required: true, unique: true, index: true },
    roleType: { type: String, enum: ["PROMOTER_PARTNER", "PARTNER", "AFFILIATE"], required: true },
    refferalCode: { type: String, trim: true, required: false },
    isActive: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "createdOn", updatedAt: "updatedOn" },
  },
);

export const PartnerUser: Model<IPartnerUser> = dbPartnerAffiliate.model<IPartnerUser>("User", partnerUserSchema);
