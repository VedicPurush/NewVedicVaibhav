import { Router } from "express";
import { serviceabilityCheck, serviceabilityByMandir } from "./serviceability.controller";

const router = Router();

// Mounted at /serviceability in app.ts.
router.get("/check", serviceabilityCheck);
router.get("/by-mandir/:mandirId", serviceabilityByMandir);

export default router;
