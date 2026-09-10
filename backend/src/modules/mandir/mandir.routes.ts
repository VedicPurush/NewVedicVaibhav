import { Router } from "express";
import { fetchActiveMandirs, fetchMandirById } from "./mandir.controller";

const router = Router();

router.get("/fetch-active-mandirs", fetchActiveMandirs);
router.get("/fetch-mandir-by-id/:id", fetchMandirById);

export default router;
