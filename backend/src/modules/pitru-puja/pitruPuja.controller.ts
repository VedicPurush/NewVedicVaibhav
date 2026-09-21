import type { Request, Response } from "express";
import PitruPuja from "./pitruPuja.model";

// API to fetch a single active pitru puja by its pujaId
export const fetchPitruPujaByPujaId = async (req: Request, res: Response) => {
  const { pujaId } = req.params;
  const pitruPuja = await PitruPuja.findOne({ pujaId, isActive: true }).lean();
  if (!pitruPuja) {
    return res.status(404).json({ message: "Pitru puja not found." });
  }
  return res.status(200).json({ pitruPuja });
};

/**
 * API to fetch every active pitru puja.
 *
 * The listing and homepage used to request one hardcoded pujaId, so a second
 * puja in this collection was never fetched by anything. They now read this.
 * An empty collection is a 200 with an empty array — "nothing scheduled" is a
 * normal state for the callers, not an error.
 */
export const fetchAllPitruPujas = async (_req: Request, res: Response) => {
  const pitruPujas = await PitruPuja.find({ isActive: true }).sort({ createdAt: -1 }).lean();
  return res.status(200).json({ pitruPujas });
};
