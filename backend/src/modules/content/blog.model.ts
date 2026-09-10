import { Schema } from "mongoose";
import { dbMain } from "../../config/db";

export interface IBlog {
  title: string;
  titleHindi: string;
  author: string;
  description: string;
  description2?: string;
  description3?: string;
  images: string[];
  hashtags: string[];
  addedOn: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlog>({
  title: { type: String, required: true, trim: true },
  titleHindi: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  description2: { type: String, trim: true },
  description3: { type: String, trim: true },
  images: { type: [String], required: true },
  hashtags: { type: [String], default: [] },
  addedOn: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

blogSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const Blog = dbMain.model<IBlog>("Blog", blogSchema, "blogs");
