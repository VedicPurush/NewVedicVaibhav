import { Router } from "express";
import {
  getAllBBPackages,
  getBBPackageById,
  createBBPackage,
  updateBBPackage,
  deleteBBPackage,
} from "./bbPackage.controller";

const router = Router();

router.get("/bb-packages", getAllBBPackages);
router.get("/bb-packages/:id", getBBPackageById);

router.post("/bb-packages", createBBPackage);
router.put("/bb-packages/:id", updateBBPackage);
router.delete("/bb-packages/:id", deleteBBPackage);

export default router;
