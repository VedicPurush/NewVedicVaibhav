import { Schema } from "mongoose";
import type { Model, Types } from "mongoose";
import { dbMain } from "../../config/db";

export interface IPrasad {
  mandir: Types.ObjectId;
  prasads: {
    prasad1English: string;
    prasad1Hindi: string;
    description1: string;
  }[];
  prasadImages: string[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const prasadSchema = new Schema<IPrasad>(
  {
    mandir: {
      type: Schema.Types.ObjectId,
      ref: "Mandir",
      required: true,
    },
    prasads: [
      {
        prasad1English: { type: String, required: true },
        prasad1Hindi: { type: String, required: true },
        description1: { type: String, required: true },
      },
    ],
    prasadImages: { type: [String], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Prasad: Model<IPrasad> = dbMain.model<IPrasad>("Prasad", prasadSchema, "prasad");

export default Prasad;
