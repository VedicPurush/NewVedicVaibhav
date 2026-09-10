import { Router } from "express";
import {
  initiatePrasadPayment,
  verifyPrasadPayment,
  fetchPrasadByUserId,
  fetchPrasadById,
  fetchPrasadByMandirId,
} from "./prasadBooking.controller";
import { fetchAllPrasads, fetchprasadById } from "./prasadData.controller";

const router = Router();

// The legacy PhonePe routes (/prasad-booking, /prasad-booking-for-app,
// /prasad-payment-status) were removed with the PhonePe integration.

// Razorpay flow: create order + verify payment and move to PrasadBooking.
router.post("/prasad/initiate-payment", initiatePrasadPayment);
router.post("/prasad/verify-payment", verifyPrasadPayment);

router.get("/fetch-booked-prasad-by-user-id/:userID", fetchPrasadByUserId);
router.get("/fetch-booked-prasad-by-id/:id", fetchPrasadById);
router.get("/fetch-booked-prasad-on-mandirVendor-end/:mandirID", fetchPrasadByMandirId);

// Prasad catalog.
router.get("/fetch-all-prasads", fetchAllPrasads);
router.get("/fetch-prasad-by-id/:id", fetchprasadById);

export default router;
