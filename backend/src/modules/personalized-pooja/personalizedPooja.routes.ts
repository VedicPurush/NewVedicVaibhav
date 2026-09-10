import { Router } from "express";
import {
  addPoojaBooking,
  fetchPersonalizedPoojaByUserId,
  getAllPoojaBookings,
  getPersonalizedPoojaBookingsByUserPhone,
  getPoojaBookingById,
  personalizedPoojaPayment,
  personalizedPoojaPaymentStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "./personalizedPooja.controller";

const router = Router();

router.post("/add-personalized-pooja-booking", addPoojaBooking);
router.post("/personalized-pooja-payment", personalizedPoojaPayment);
router.get("/personalized-pooja-payment-status", personalizedPoojaPaymentStatus);
router.get("/personalized-pooja-bookings", getAllPoojaBookings);
router.get("/personalized-pooja-bookings/:id", getPoojaBookingById);
router.get("/get-personalizedpooja-by-number/:phone", getPersonalizedPoojaBookingsByUserPhone);
router.get("/personalized-pooja-bookings-by-user-id/:id", fetchPersonalizedPoojaByUserId);

// Generic Razorpay order + verification (legacy inline routes, paths preserved).
router.post("/create-order", createRazorpayOrder);
router.post("/verify-payment", verifyRazorpayPayment);

export default router;
