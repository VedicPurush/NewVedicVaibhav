import { Router } from "express";
import {
  fetchBookingsByPujaId,
  fetchPoojaByUserId,
  fetchPoojaById,
  getMobileNameList,
  fetchPoojaByMobile,
  getBhaktaGotraList,
  getFamilyBhaktaGotraList,
  getDynamicBhaktaGotraList,
  getEmailList,
  getPoojaDashboardStats,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPendingBookingsByPoojaId,
  exportPoojaBookings,
} from "./poojaBooking.controller";
import { razorpayWebhookHandler } from "../payments/webhook.controller";

const router = Router();

// Admin / Dashboard
router.get("/export-pooja-bookings", exportPoojaBookings);
router.get("/fetch-booked-pooja-by-puja-id/:poojaID", fetchBookingsByPujaId);
router.get("/fetch-pending-pooja-by-puja-id/:poojaID", getPendingBookingsByPoojaId);
router.get("/fetch-booked-pooja-by-user-id/:id", fetchPoojaByUserId);
router.get("/fetch-booked-pooja-by-id/:id", fetchPoojaById);
router.get("/fetch-pooja-by-mobile/:mobile", fetchPoojaByMobile);

// Payment routes — Razorpay is the only gateway.
// Removed: the PhonePe routes (/final-payment-phonepe, /final-payment-phonepe-app)
// and its status routes (/payment-status, /status), plus the duplicate aliases
// /pooja-booking-init and /pooja-booking-verify, which pointed at the two
// handlers below and were called by nothing.
router.post("/create-razorpay-order", createRazorpayOrder);
router.post("/verify-razorpay-payment", verifyRazorpayPayment);
// Raw-body parsing for this path is registered in app.ts BEFORE express.json().
// An express.raw() here would be a no-op — express.json() has already consumed
// the body by the time this router runs, and the HMAC would never match.
router.post("/razorpay/webhook", razorpayWebhookHandler);
router.get("/mobile-name-list", getMobileNameList);
router.get("/email-list", getEmailList);
router.get("/singlepackagedetails", getBhaktaGotraList);
router.get("/familypackagedetails", getFamilyBhaktaGotraList);
router.get("/bhakta-gotra", getDynamicBhaktaGotraList);
router.get("/dashboard", getPoojaDashboardStats);

export default router;
