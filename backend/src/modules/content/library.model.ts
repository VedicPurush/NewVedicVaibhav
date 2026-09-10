import { Schema } from "mongoose";
import { dbMain } from "../../config/db";

export interface ILibrary {
  id: string;
  nameEnglish: string;
  nameHindi: string;
  descriptionEnglish: string;
  descriptionHindi: string;
  godName: string;
  aartiImage: string;
}

const librarySchema = new Schema<ILibrary>(
  {
    id: { type: String, required: true },
    nameEnglish: { type: String, required: true },
    nameHindi: { type: String, required: true },
    descriptionEnglish: { type: String, required: true },
    descriptionHindi: { type: String, required: true },
    godName: { type: String, required: true },
    aartiImage: { type: String, required: true },
  },
  { timestamps: true },
);

export const Library = dbMain.model<ILibrary>("Library", librarySchema, "libraryData");
