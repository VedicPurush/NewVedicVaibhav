import { Router } from "express";
import {
  createGauSevaRazorpayOrder,
  verifyGauSevaRazorpayPayment,
  fetchGauSevaBookingById,
  fetchUserGauSevaBookings,
  handleGauSevaRazorpayWebhook,
} from "./gauSeva.controller";

const router = Router();

router.post("/gau-seva/create-razorpay-order", createGauSevaRazorpayOrder);
router.post("/gau-seva/verify-razorpay-payment", verifyGauSevaRazorpayPayment);
router.get("/gau-seva/booking/:bookingId", fetchGauSevaBookingById);
router.get("/user/:phone/gau-seva-bookings", fetchUserGauSevaBookings);
router.post("/api/webhook/gau-seva-razorpay", handleGauSevaRazorpayWebhook);

export default router;
