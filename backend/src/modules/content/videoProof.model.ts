import { Schema } from "mongoose";
import { dbMain } from "../../config/db";

export interface IVideoProof {
  title: string;
  category: string;
  temple?: string;
  videoLink: string; // Full URL — YouTube or Google Drive
  uploadDate?: Date;
  description?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const videoProofSchema = new Schema<IVideoProof>(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, default: "Proof of Work", trim: true },
    temple: { type: String, trim: true },
    videoLink: { type: String, required: true, trim: true },
    uploadDate: { type: Date },
    description: { type: String, trim: true },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const VideoProof = dbMain.model<IVideoProof>("VideoProof", videoProofSchema, "videoProofs");
