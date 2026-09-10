import { Router } from "express";
import {
  initiateBBSevaPayment,
  verifyBBSevaPayment,
  getBBSevaBookingsByMobile,
  getAllBBSevaBookings,
  handleBBSevaWebhook,
  addBBSevaReview,
  getBBSevaReviews,
} from "./bbSeva.controller";

const router = Router();

router.post("/bb-seva/initiate", initiateBBSevaPayment);
router.post("/bb-seva/verify-payment", verifyBBSevaPayment);
router.post("/bb-seva/razorpay-webhook", handleBBSevaWebhook);
router.post("/bb-seva/review", addBBSevaReview);
router.get("/bb-seva/reviews", getBBSevaReviews);
router.get("/bb-seva/bookings/mobile/:mobile", getBBSevaBookingsByMobile);
router.get("/bb-seva/bookings/all", getAllBBSevaBookings);

export default router;
