import { Schema, type Types } from "mongoose";
import { dbMain } from "../../config/db";

export interface IDeletionLog {
  _id: Types.ObjectId;
  userId: Types.ObjectId | null;
  phone: string;
  reason: string;
  deletedAt: Date;
}

const deletionLogSchema = new Schema<IDeletionLog>({
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  phone: { type: String, required: true },
  reason: { type: String, required: true },
  deletedAt: { type: Date, default: Date.now },
});

export const DeletionLog = dbMain.model<IDeletionLog>("DeletionLog", deletionLogSchema, "deletionlogs");
