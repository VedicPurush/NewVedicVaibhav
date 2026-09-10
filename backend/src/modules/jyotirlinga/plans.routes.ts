import { Router } from "express";
import { getPlans } from "./plans.controller";

// Mounted at "/plans" in app.ts (same final URLs as the legacy server).
const router = Router();

router.get("/", getPlans);

export default router;
