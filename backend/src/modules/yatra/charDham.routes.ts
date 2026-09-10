import { Router } from "express";
import {
  fetchActive4DhamYatra,
  create4DhamRazorpayOrder,
  verify4DhamRazorpayPayment,
  fetch4DhamBookingByBookingId,
  fetchUser4DhamBookings,
} from "./charDham.controller";

const router = Router();

router.get("/fetch-active-4dham-yatra", fetchActive4DhamYatra);
router.post("/4dham-yatra/create-razorpay-order", create4DhamRazorpayOrder);
router.post("/4dham-yatra/verify-razorpay-payment", verify4DhamRazorpayPayment);
router.get("/4dham-yatra/booking/:bookingId", fetch4DhamBookingByBookingId);
router.get("/user/:phone/4dham-bookings", fetchUser4DhamBookings);

export default router;
