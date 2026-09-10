import { Router } from "express";
import { fetchAllGods, fetchGodById } from "./god.controller";

// Mounted at "/" in app.ts
const router = Router();

router.get("/fetch-all-gods", fetchAllGods);
router.get("/fetch-god/:id", fetchGodById);

export default router;
