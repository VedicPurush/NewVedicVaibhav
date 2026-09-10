import { Router } from "express";
import { fetchPitruPujaByPujaId } from "./pitruPuja.controller";

const router = Router();

router.get("/fetch-pitru-puja/:pujaId", fetchPitruPujaByPujaId);

export default router;
