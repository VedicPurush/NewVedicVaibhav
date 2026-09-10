import { Schema, type Model, type Types } from "mongoose";
import { dbMain } from "../../config/db";

export interface IBBPackage {
  _id: Types.ObjectId;
  packageName: string;
  packagePrice: number;
  numberOfDays: number;
  description: string;
  prasadBoxIncludes?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const bbPackageSchema = new Schema<IBBPackage>(
  {
    packageName: { type: String, required: true },
    packagePrice: { type: Number, required: true },
    numberOfDays: { type: Number, required: true },
    description: { type: String, required: true },
    prasadBoxIncludes: { type: [String], default: [] },
  },
  { timestamps: true },
);

const BBPackage: Model<IBBPackage> = dbMain.model<IBBPackage>("BBPackage", bbPackageSchema, "bbpackages");

export default BBPackage;
