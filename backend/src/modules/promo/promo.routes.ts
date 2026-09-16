import { Router } from "express";
import { fetchPromos, validatePromo } from "./promo.controller";

const router = Router();

// Fetch promos
router.get("/fetch-promo-vedic", fetchPromos);

// Preview a coupon against an order value (checkouts re-validate on order creation)
router.post("/validate-promo", validatePromo);

export default router;
