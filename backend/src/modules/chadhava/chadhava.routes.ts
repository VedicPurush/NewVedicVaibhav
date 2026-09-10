import { Router } from "express";
import {
  getAllChadhavaBookings,
  getChadhavaBookingsByDate,
  getChadhavaByPhoneNumber,
  initiateChadhavaPayment,
  getAllChadhavaBookingss,
  blastSmsToBookingsBeforeDate,
  verifyChadhavaPaymentRazorpay,
  sendChadhavaSMS,
  getChadhavaBookingsByPujaTitle,
  getPendingChadhavaByPujaTitle,
} from "./chadhava.controller";
import {
  fetchAllChadhavas,
  fetchChadhavaById,
  fetchChadhavaByMandirId,
  fetchSpecialChadhavas,
  fetchChadhavaByMandirNameID,
  appendConvertedPendingToMain,
  findPendingNotInMain,
  confirmChadhavaOrders,
} from "./fetchChadhava.controller";

const router = Router();

// PhonePe routes (/chadhava/payment-status/:orderID, /chadhava/phonepe/callback)
// were removed with the PhonePe integration — Razorpay handles chadhava payments.
router.post("/chadhava/initiate-payment", initiateChadhavaPayment);
router.post("/chadhava/verify-payment", verifyChadhavaPaymentRazorpay);
router.get("/chadhava-details/:phoneNumber", getChadhavaByPhoneNumber);

router.get("/all-chadhava-details", getAllChadhavaBookings);
router.get("/alll-chadhava-details", getAllChadhavaBookingss);
router.get("/bookings", getChadhavaBookingsByDate);

router.get("/get-all-chadhava", fetchAllChadhavas);
router.get("/get-special-chadhava", fetchSpecialChadhavas);
router.get("/get-chadhava-by-id/:id", fetchChadhavaById);
router.get("/get-chadhava-by-mandir/:mandirId", fetchChadhavaByMandirId);
router.get("/get-chadhava-by-mandir-nameid/:nameID", fetchChadhavaByMandirNameID);

// fetch order ids step 1
router.post("/chadhava-bookings/pending-only", findPendingNotInMain);

// append orders step 2
router.post("/chadhava-pending/append", appendConvertedPendingToMain);

// send messages step 3
router.post("/chadhava-bookings/sms-blast", blastSmsToBookingsBeforeDate);

// Convert pending status to confirm
router.post("/chadhava-bookings/confirm", confirmChadhavaOrders);

router.post("/chadhava-sms", sendChadhavaSMS);
router.get("/getchadhavabypujatitle/:pujaTitle", getChadhavaBookingsByPujaTitle);
router.get("/getPendingchadhavabypujatitle/:title", getPendingChadhavaByPujaTitle);

export default router;
