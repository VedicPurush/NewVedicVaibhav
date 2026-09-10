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
