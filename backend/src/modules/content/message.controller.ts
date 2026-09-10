import axios from "axios";
import type { Request, Response } from "express";
import { env } from "../../config/env";
import { Message } from "./message.model";

const TWILIO_FROM_NUMBER = "+17756307320";
const SMS_BODY = "This is the ship that made the Kessel Run in fourteen parsecs?";

export const sendMessageotp = async (req: Request, res: Response): Promise<void> => {
  const { to } = req.body as { to?: string };
  if (!to) {
    // Legacy shape: `error` field on this 400.
    res.status(400).json({ error: "Recipient phone number is required." });
    return;
  }

  // Twilio REST API call (replaces the twilio SDK dependency).
  await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${env.twilio.accountSid}/Messages.json`,
    new URLSearchParams({ To: to, From: TWILIO_FROM_NUMBER, Body: SMS_BODY }),
    { auth: { username: env.twilio.accountSid, password: env.twilio.authToken } },
  );

  const savedMessage = await Message.create({ to, from: TWILIO_FROM_NUMBER, body: "This is the otp" });

  res.status(200).json({ success: true, message: "Message sent successfully.", data: savedMessage });
};
