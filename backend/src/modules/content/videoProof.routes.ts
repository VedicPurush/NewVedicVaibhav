import { Router } from "express";
import { getActiveVideoProofs } from "./videoProof.controller";

// Mounted at "/video-proofs" in app.ts
const router = Router();

router.get("/get-active", getActiveVideoProofs);

export default router;
