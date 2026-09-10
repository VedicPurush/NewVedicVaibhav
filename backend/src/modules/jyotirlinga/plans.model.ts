import { Schema, type Document, type Model } from "mongoose";
import { dbJyotirling } from "../../config/db";

export interface IInfoHighlight {
  icon: string;
  description: string;
  _id?: string;
}

export interface IPlan extends Document {
  uiName: string;
  uiNameHindi: string;
  pricePercentage: number;
  description: string;
  planId: "Basic" | "Intermediate" | "Advance";
  yearlyPercentageDiscount: number;
  includes: string;
  infoHighlights: IInfoHighlight[];
  createdAt?: Date;
  updatedAt?: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    uiName: { type: String, required: true },
    uiNameHindi: { type: String, required: true },
    pricePercentage: { type: Number, required: true },
    description: { type: String, required: true },
    includes: { type: String, required: true },
    planId: {
      type: String,
      required: true,
      enum: ["Basic", "Intermediate", "Advance"],
      unique: true, // One plan per type
    },
    yearlyPercentageDiscount: { type: Number, required: true },
    infoHighlights: {
      type: [
        {
          icon: { type: String, required: true },
          description: { type: String, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

const Plan: Model<IPlan> = dbJyotirling.model<IPlan>("Plan", PlanSchema);

// Legacy data migration: drop the conflicting "name_1" index if it still exists.
Plan.collection.dropIndex("name_1").catch(() => {
  // Index not found or already dropped — nothing to do.
});

export default Plan;
