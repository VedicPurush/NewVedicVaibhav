import { Router } from "express";
import { getDailyQuotes, getLibraries, getLibraryById } from "./library.controller";

// Mounted at "/" in app.ts
const router = Router();

// Library
router.get("/fetch-library-data", getLibraries);
router.get("/fetch-library-data-by-id/:id", getLibraryById);

// Daily quotes
router.get("/fetch-daily-quotes", getDailyQuotes);

export default router;
