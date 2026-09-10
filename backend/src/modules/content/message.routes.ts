import { Router } from "express";
import { sendMessageotp } from "./message.controller";
import { otpRateLimiter } from "../../middleware/rateLimiter";

// Mounted at "/" in app.ts
const router = Router();

// Sends a real Twilio SMS — limited per targeted number.
router.post("/sendotp", otpRateLimiter, sendMessageotp);

export default router;
