import { Schema, type Document, type Model } from "mongoose";
import { dbJyotirling } from "../../config/db";
import { logger } from "../../lib/logger";

export interface IJyotirlinga extends Document {
  nameEnglish: string;
  nameHindi: string;
  month: string; // Hindi Mass
  monthNumber: number;
  location: string;
  purpose: string;
  benefits: string[];
  image: string;
  price: number;
  infoDescription?: string;
  infoImage?: string;
  miniatureImages?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const JyotirlingaSchema = new Schema<IJyotirlinga>(
  {
    nameEnglish: { type: String, required: true },
    nameHindi: { type: String, required: true },
    month: { type: String, required: true },
    monthNumber: { type: Number, required: true, unique: true, index: true },
    location: { type: String, required: true },
    purpose: { type: String, required: true },
    benefits: { type: [String], required: true },
    image: { type: String, required: true },
    // Default price avoids breaking existing data immediately.
    price: { type: Number, required: true, default: 1000 },
    infoDescription: { type: String },
    infoImage: { type: String },
    miniatureImages: { type: [String], default: [] },
  },
  { timestamps: true },
);

const Jyotirlinga: Model<IJyotirlinga> = dbJyotirling.model<IJyotirlinga>("Jyotirlinga", JyotirlingaSchema);

Jyotirlinga.syncIndexes().catch((err: unknown) => {
  logger.error({ err }, "Error syncing indexes for Jyotirlinga");
});

export default Jyotirlinga;
