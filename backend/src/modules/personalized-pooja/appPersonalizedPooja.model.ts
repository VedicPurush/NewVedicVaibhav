import { Schema } from "mongoose";
import type { Model, Types } from "mongoose";
import { dbMain } from "../../config/db";

export interface ICategory {
  categoryId: string;
  categoryNameEn: string;
  categoryNameHi: string;
  appCategoryImage: string;
  subCategories: {
    subCategoryId: string;
    nameEn: string;
    nameHi: string;
    appSubCategoryImage: string;
    webSubCategoryImage: string;
  }[];
}

export interface IReview {
  reviewText: string;
  reviewerName?: string;
}

export interface IPersonalizedPooja {
  poojaType: string;
  poojaId?: string;
  nameHindi: string;
  nameEnglish: string;
  poojaDates: string[];
  godId: Types.ObjectId;
  mandirIds: string[];
  categories: ICategory[];
  isExclusive: boolean;
  poojaBenefits: string;
  isPrasadAvailable: boolean;
  singlePackagePrice: number;
  couplePackagePrice: number;
  familyPackagePrice: number;
  jointFamilyPackagePrice: number;
  price: number;
  reviews: IReview[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const categorySchema = new Schema<ICategory>({
  categoryId: { type: String, required: true },
  categoryNameEn: { type: String, required: true },
  categoryNameHi: { type: String, required: true },
  appCategoryImage: { type: String, required: false, default: "" },
  subCategories: [
    {
      subCategoryId: { type: String, required: true },
      nameEn: { type: String, required: true },
      nameHi: { type: String, required: true },
      appSubCategoryImage: { type: String, required: false, default: "" },
      webSubCategoryImage: { type: String, required: false, default: "" },
    },
  ],
});

const reviewSchema = new Schema<IReview>({
  reviewText: { type: String, required: true },
  reviewerName: { type: String, required: false },
});

const personalizedPoojaSchema = new Schema<IPersonalizedPooja>(
  {
    poojaType: { type: String, required: true, default: "PersonalizedPooja" },
    poojaId: { type: String, required: false },
    nameHindi: { type: String, required: true },
    nameEnglish: { type: String, required: true },
    poojaDates: [{ type: String, required: true }],
    godId: { type: Schema.Types.ObjectId, ref: "PoojaGod", required: true },
    mandirIds: [{ type: String, required: true }],
    categories: [categorySchema],
    isExclusive: { type: Boolean, required: true, default: false },
    poojaBenefits: { type: String, required: true },
    isPrasadAvailable: { type: Boolean, required: true, default: false },
    singlePackagePrice: { type: Number, required: true },
    couplePackagePrice: { type: Number, required: true },
    familyPackagePrice: { type: Number, required: true },
    jointFamilyPackagePrice: { type: Number, required: true },
    price: { type: Number, required: true },
    reviews: [reviewSchema],
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const PersonalizedPoojaModel: Model<IPersonalizedPooja> = dbMain.model<IPersonalizedPooja>(
  "PersonalizedPooja",
  personalizedPoojaSchema,
);

export default PersonalizedPoojaModel;
