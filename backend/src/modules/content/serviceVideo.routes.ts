import { Router } from "express";
import { getServiceVideosByPhone } from "./serviceVideo.controller";
import { createRateLimiter } from "../../middleware/rateLimiter";

// Mounted at "/service-videos" in app.ts
const router = Router();

/**
 * Per IP, because /my-videos lets anyone type any number.
 *
 * A devotee checking their own videos makes a handful of requests; walking the
 * numbering plan to harvest names and ritual videos needs thousands, and this
 * is what makes that expensive. Kept generous so a family sharing one office
 * connection never sees a block.
 */
const lookupRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 40,
  message: "Too many lookups. Please try again in a few minutes.",
});

router.get("/by-phone/:phone", lookupRateLimiter, getServiceVideosByPhone);

export default router;
