import { Router } from "express";
import { poojaOrders, poojaPayments } from "./payment.controller";

const router = Router();

router.post("/orders", poojaOrders);
router.get("/payment/:paymentId", poojaPayments);

export default router;
