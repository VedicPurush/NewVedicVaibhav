import { Router } from "express";
import { getActiveBanners } from "./banner.controller";

// Mounted at "/banner" in app.ts
const router = Router();

// Public: active banners filtered by showOnWebsite and dueDate.
router.get("/get-banner", getActiveBanners);

export default router;
