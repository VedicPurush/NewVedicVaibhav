import { Schema } from "mongoose";
import { dbMain } from "../../config/db";

/** Pooja feedback submitted from the post-booking feedback form. */
export interface IFeedback {
  poojaname: string;
  name: string;
  phone?: string;
  satisfaction: number;
  spiritualExperience: string;
  quality: number;
  appreciatedAspects: string[];
  appreciatedOther?: string;
  improvementSuggestions?: string;
  addedOn: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>({
  poojaname: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  satisfaction: { type: Number, required: true },
  spiritualExperience: { type: String, required: true, trim: true },
  quality: { type: Number, required: true },
  appreciatedAspects: { type: [String], default: [] },
  appreciatedOther: { type: String, trim: true },
  improvementSuggestions: { type: String, trim: true },
  addedOn: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

feedbackSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const Feedback = dbMain.model<IFeedback>("Feedback", feedbackSchema, "feedbacks");

/**
 * Per-booking review (one review per bookingId, upserted).
 *
 * This module is the SOLE owner of the "Review" mongoose model / "Review"
 * collection. A byte-identical duplicate used to live in modules/pooja and was
 * deleted — registering the same model name on `dbMain` twice throws
 * OverwriteModelError at boot. Do not re-declare it elsewhere; import from here.
 */
export interface IReview {
  bookingId: string;
  pujaId: string;
  rating?: number;
  review?: string | null;
  poojaname?: string;
  name: string;
  phone: string;
  satisfaction?: number;
  quality?: number;
  spiritualExperience?: string;
  appreciatedAspects?: string[];
  appreciatedOther?: string;
  improvementSuggestions?: string;
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    bookingId: { type: String, required: true, unique: true },
    pujaId: { type: String, required: true },
    rating: { type: Number },
    review: { type: String },
    poojaname: String,
    name: String,
    phone: String,
    satisfaction: Number,
    quality: Number,
    spiritualExperience: String,
    appreciatedAspects: [String],
    appreciatedOther: String,
    improvementSuggestions: String,
    isComplete: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const Review = dbMain.model<IReview>("Review", reviewSchema, "Review");
