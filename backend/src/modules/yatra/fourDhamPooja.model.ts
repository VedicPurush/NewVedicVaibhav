import { Schema, type Model, type Types } from "mongoose";
import { dbMain } from "../../config/db";

export interface IFixedDhamSection {
  Kedarnath: string[];
  Badrinath: string[];
  Gangotri: string[];
  Yamunotri: string[];
}

export interface IFourDhamSlot {
  _id?: Types.ObjectId;
  slotName: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export interface IFourDhamPackage {
  packageName: string;
  packageImage: string;
  realPrice: number;
  discountedPrice: number;
  section1: IFixedDhamSection;
  section2: IFixedDhamSection;
}

export interface IFourDhamPooja {
  _id: Types.ObjectId;
  poojaType: string;
  poojaId: string;
  poojaName: string;
  poojaDate: Date[];
  slots: IFourDhamSlot[];
  packages: IFourDhamPackage[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const fixedDhamSectionSchema = new Schema<IFixedDhamSection>(
  {
    Kedarnath: { type: [String], default: [] },
    Badrinath: { type: [String], default: [] },
    Gangotri: { type: [String], default: [] },
    Yamunotri: { type: [String], default: [] },
  },
  { _id: false },
);

const fourDhamSlotSchema = new Schema<IFourDhamSlot>(
  {
    slotName: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: false },
  },
  { _id: true },
);

const emptySection = (): IFixedDhamSection => ({
  Kedarnath: [],
  Badrinath: [],
  Gangotri: [],
  Yamunotri: [],
});

const fourDhamPackageSchema = new Schema<IFourDhamPackage>(
  {
    packageName: { type: String, required: true, trim: true },
    packageImage: { type: String, required: true, trim: true },
    realPrice: { type: Number, required: true, min: 0 },
    discountedPrice: { type: Number, required: true, min: 0 },
    section1: { type: fixedDhamSectionSchema, required: true, default: emptySection },
    section2: { type: fixedDhamSectionSchema, required: true, default: emptySection },
  },
  { _id: false },
);

const fourDhamPoojaSchema = new Schema<IFourDhamPooja>(
  {
    poojaType: { type: String, required: true, default: "4DhamYatra", trim: true },
    poojaId: { type: String, required: true, unique: true, trim: true },
    poojaName: { type: String, required: true, trim: true },
    poojaDate: { type: [Date], required: true, default: [] },
    slots: {
      type: [fourDhamSlotSchema],
      required: true,
      default: [],
      validate: {
        validator: (value: IFourDhamSlot[]) => Array.isArray(value) && value.length > 0,
        message: "At least one slot is required.",
      },
    },
    packages: {
      type: [fourDhamPackageSchema],
      required: true,
      default: [],
      validate: {
        validator: (value: IFourDhamPackage[]) => Array.isArray(value) && value.length === 4,
        message: "Exactly 4 packages are required.",
      },
    },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const FourDhamPoojaModel: Model<IFourDhamPooja> = dbMain.model<IFourDhamPooja>(
  "4DhamPooja",
  fourDhamPoojaSchema,
  "4DhamPooja",
);

export default FourDhamPoojaModel;
