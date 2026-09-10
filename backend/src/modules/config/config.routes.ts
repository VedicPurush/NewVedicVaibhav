import { Router } from "express";
import { getCurrencyConfig } from "./config.controller";

// Mounted at "/api/config" in app.ts
const router = Router();

// Public: FX table + the caller's country. Never cached — see the controller.
router.get("/currency", getCurrencyConfig);

export default router;
