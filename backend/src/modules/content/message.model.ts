import { Schema } from "mongoose";
import { dbMain } from "../../config/db";

export interface IMessage {
  to: string;
  from: string;
  body: string;
  sentAt: Date;
}

const messageSchema = new Schema<IMessage>({
  to: { type: String, required: true, trim: true },
  from: { type: String, required: true, default: "+15017122661" },
  body: {
    type: String,
    required: true,
    default: "This is the ship that made the Kessel Run in fourteen parsecs?",
  },
  sentAt: { type: Date, default: Date.now },
});

export const Message = dbMain.model<IMessage>("Message", messageSchema, "messages");
