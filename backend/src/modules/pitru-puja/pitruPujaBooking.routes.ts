import { Router } from "express";
import {
  createPitruPujaBooking,
  initiatePitruPujaPayment,
  verifyPitruPujaPayment,
} from "./pitruPujaBooking.controller";

const router = Router();

router.post("/create-pitru-puja-booking", createPitruPujaBooking);
router.post("/pitru-puja-payment", initiatePitruPujaPayment);
router.post("/verify-pitru-puja-payment", verifyPitruPujaPayment);

export default router;
