import { Router } from "express";
import { getAllJyotirlingas, getJyotirlingaById } from "./jyotirlinga.controller";

// Mounted at "/jyotirlinga" in app.ts (same final URLs as the legacy server).
const router = Router();

router.get("/", getAllJyotirlingas);
router.get("/:id", getJyotirlingaById);

export default router;
