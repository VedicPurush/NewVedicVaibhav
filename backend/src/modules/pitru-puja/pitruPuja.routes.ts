import { Router } from "express";
import { fetchAllPitruPujas, fetchPitruPujaByPujaId } from "./pitruPuja.controller";

const router = Router();

router.get("/fetch-pitru-pujas", fetchAllPitruPujas);
router.get("/fetch-pitru-puja/:pujaId", fetchPitruPujaByPujaId);

export default router;
