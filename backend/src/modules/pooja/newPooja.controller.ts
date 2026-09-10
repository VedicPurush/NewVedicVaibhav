import type { Request, Response } from "express";
import mongoose from "mongoose";
import NewPooja from "./newPooja.model";
import Pooja from "./pooja.model";
import { logger } from "../../lib/logger";

/* Both collections are served from here so the frontend can treat a pooja id
   as opaque. Every response carries `source` ("new" | "legacy") so the client
   knows which shape it received. */

type LeanPooja = Record<string, any>;

export const fetchAllNewPoojas = async (_req: Request, res: Response) => {
  const poojas = await NewPooja.find({ isActive: true })
    .sort({ isFeatured: -1, isExclusive: -1, createdAt: -1 })
    .lean();
  return res.status(200).json({ poojas });
};

export const fetchNewPoojaById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid pooja id." });
  }
  const pooja = await NewPooja.findById(id).lean();
  if (!pooja) {
    return res.status(404).json({ message: "Pooja not found." });
  }
  return res.status(200).json({ pooja, source: "new" });
};

export const fetchAllPoojasCombined = async (_req: Request, res: Response) => {
  // one bad collection should not blank the whole listing
  const [newResult, legacyResult] = await Promise.allSettled([
    NewPooja.find({ isActive: true }).sort({ createdAt: -1 }).lean<LeanPooja[]>(),
    Pooja.find({ isActive: true })
      .populate("mandirLists.mandirId", "nameEnglish")
      .sort({ createdAt: -1 })
      .lean<LeanPooja[]>(),
  ]);

  if (newResult.status === "rejected") logger.error({ err: newResult.reason }, "new poojas failed");
  if (legacyResult.status === "rejected") logger.error({ err: legacyResult.reason }, "legacy poojas failed");

  const newPoojas = (newResult.status === "fulfilled" ? newResult.value : []).map((p) => ({
    ...p,
    source: "new",
  }));
  const legacyPoojas = (legacyResult.status === "fulfilled" ? legacyResult.value : []).map((p) => ({
    ...p,
    source: "legacy",
  }));

  // featured first, then exclusive, then newest
  const poojas = [...newPoojas, ...legacyPoojas].sort((a: LeanPooja, b: LeanPooja) => {
    if (!!b.isFeatured !== !!a.isFeatured) return Number(!!b.isFeatured) - Number(!!a.isFeatured);
    if (!!b.isExclusive !== !!a.isExclusive) return Number(!!b.isExclusive) - Number(!!a.isExclusive);
    return new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime();
  });

  return res.status(200).json({ poojas });
};

// The detail page holds only an id and cannot know which collection it belongs
// to, so try the new one first and fall back to legacy.
export const fetchAnyPoojaById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid pooja id." });
  }

  const newPooja = await NewPooja.findById(id).lean();
  if (newPooja) {
    return res.status(200).json({ pooja: newPooja, source: "new" });
  }

  const legacyPooja = await Pooja.findById(id).populate("mandirLists.mandirId", "nameEnglish").lean();
  if (legacyPooja) {
    return res.status(200).json({ pooja: legacyPooja, source: "legacy" });
  }

  return res.status(404).json({ message: "Pooja not found." });
};
