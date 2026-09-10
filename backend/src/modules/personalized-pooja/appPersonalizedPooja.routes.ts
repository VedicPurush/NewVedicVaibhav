import { Router } from "express";
import {
  getActivePersonalizedPoojas,
  getActivePersonalizedPoojasByMandir,
} from "./appPersonalizedPooja.controller";

const router = Router();

router.get("/fetch-all-app-personalized-poojas", getActivePersonalizedPoojas);
router.get("/fetch-app-personalized-poojas-by-mandir/:mandirId", getActivePersonalizedPoojasByMandir);

export default router;
