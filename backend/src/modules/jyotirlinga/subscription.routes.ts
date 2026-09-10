import { Router } from "express";
import {
  initiateJyotirlingaPayment,
  verifyJyotirlingaPayment,
  chargeNextAutopayInstallment,
  getSubscriptionsByMobile,
  submitJyotirlingaReview,
} from "./subscription.controller";

// Mounted at "/jyotirlinga-subscription" in app.ts (same final URLs as the legacy server).
const router = Router();

router.post("/initiate-payment", initiateJyotirlingaPayment);
router.post("/verify-payment", verifyJyotirlingaPayment);
router.post("/charge-next-installment/:bookingId", chargeNextAutopayInstallment);
router.get("/mobile/:mobile", getSubscriptionsByMobile);
router.post("/review", submitJyotirlingaReview);

export default router;
