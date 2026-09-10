import { Router } from "express";
import { fetchAllPoojas, fetchPoojaById, fetchAllExclusivePoojas } from "./pooja.controller";
import {
  fetchAllNewPoojas,
  fetchNewPoojaById,
  fetchAllPoojasCombined,
  fetchAnyPoojaById,
} from "./newPooja.controller";

const router = Router();

// --- legacy `poojas` collection ---
router.get("/fetch-all-pooja", fetchAllPoojas);
router.get("/fetch-active-pooja-by-id/:id", fetchPoojaById);
router.get("/fetch-all-poojas-exclusive", fetchAllExclusivePoojas);

// --- new `newpoojas` collection ---
router.get("/fetch-all-new-poojas", fetchAllNewPoojas);
router.get("/fetch-new-pooja-by-id/:id", fetchNewPoojaById);

// --- both collections together ---
router.get("/fetch-all-poojas-combined", fetchAllPoojasCombined);
router.get("/fetch-any-pooja-by-id/:id", fetchAnyPoojaById);

export default router;
