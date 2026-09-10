import { Router } from "express";
import {
  getJyotirlingChadhavaData,
  initiateJyotirlingPayment,
  verifyJyotirlingPayment,
  getUserJyotirlingBookings,
  handleAbandonedCart,
} from "./jyotirlingChadhava.controller";

const router = Router();

// GET active data configuration
router.get("/data", getJyotirlingChadhavaData);

// POST initiate payment and booking
router.post("/initiate-payment", initiateJyotirlingPayment);

// POST handle abandoned cart background save
router.post("/abandoned-cart", handleAbandonedCart);

// POST verify Razorpay signature and confirm booking
router.post("/verify-payment", verifyJyotirlingPayment);
router.get("/bookings/:phone", getUserJyotirlingBookings);

export default router;
