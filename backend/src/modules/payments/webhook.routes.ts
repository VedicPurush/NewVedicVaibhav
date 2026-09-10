import { Router } from "express";
import { handleRazorpayWebhook } from "./webhook.controller";
import { handle4DhamRazorpayWebhook } from "../yatra/charDham.controller";
import { handleJyotirlingaRazorpayWebhook } from "../jyotirlinga/subscription.controller";
import { handlePersonalizedPujaWebhook } from "../personalized-pooja/personalizedPooja.controller";
import { handlePitruPujaWebhook } from "../pitru-puja/pitruPujaBooking.controller";

/**
 * Razorpay webhook endpoints. Mounted in app.ts with express.raw() at BOTH
 * /api/webhook and /api/v1/webhook so `req.body` is the raw Buffer and each
 * handler can verify the HMAC over the exact signed bytes.
 */
const router = Router();

// Matches: /api/webhook/razorpay
router.post("/razorpay", handleRazorpayWebhook);
router.post("/4dham-razorpay", handle4DhamRazorpayWebhook);
router.post("/jyotirlinga-razorpay", handleJyotirlingaRazorpayWebhook);
router.post("/personalized-puja-razorpay", handlePersonalizedPujaWebhook);
router.post("/pitru-puja-razorpay", handlePitruPujaWebhook);

export default router;
