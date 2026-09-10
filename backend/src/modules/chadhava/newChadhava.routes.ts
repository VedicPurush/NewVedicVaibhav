import { Router } from "express";
import {
  fetchAllNewChadhavas,
  getNewChadhavaById,
  initiateChadhavaPayment,
  verifyChadhavaPaymentRazorpay,
  getUserBookings,
  getAllConfirmedBookings,
  getAllPendingBookings,
  exportChadhavaBookings,
} from "./newChadhava.controller";
import { sendChadhavaSMS } from "./chadhava.controller";

const router = Router();

router.get("/get-all-new-chadhava", fetchAllNewChadhavas);
router.get("/export-bookings", exportChadhavaBookings);
router.get("/get-new-chadhava/:id", getNewChadhavaById);
router.post("/initiate-payment", initiateChadhavaPayment);
router.post("/verify-payment", verifyChadhavaPaymentRazorpay);
router.post("/chadhava-sms", sendChadhavaSMS);
router.get("/user-bookings/:phone", getUserBookings);

// Admin routes for booking listings. Express 5 (path-to-regexp v8) syntax for
// an optional param is {/:name} — the legacy `/:pujaTitle?` form aborts boot.
router.get("/get-all-confirmed-bookings{/:pujaTitle}", getAllConfirmedBookings);
router.get("/get-all-pending-bookings{/:pujaTitle}", getAllPendingBookings);

export default router;
