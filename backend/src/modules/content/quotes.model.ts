import { Schema } from "mongoose";
import { dbMain } from "../../config/db";

export interface IDailyQuote {
  date: Date;
  descriptionEnglish: string;
  descriptionHindi: string;
}

const dailyQuoteSchema = new Schema<IDailyQuote>(
  {
    date: { type: Date, required: true },
    descriptionEnglish: { type: String, required: true },
    descriptionHindi: { type: String, required: true },
  },
  { timestamps: true },
);

export const DailyQuote = dbMain.model<IDailyQuote>("DailyQuote", dailyQuoteSchema, "dailyQuotes");
