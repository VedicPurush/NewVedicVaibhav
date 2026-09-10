import { Router } from "express";
import { fetchPromos } from "./promo.controller";

const router = Router();

// Fetch promos
router.get("/fetch-promo-vedic", fetchPromos);

export default router;
