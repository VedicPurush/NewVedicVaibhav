import type { Request, Response } from "express";
import Promo from "./promo.model";

// Fetch all active promos that haven't expired
export const fetchPromos = async (_req: Request, res: Response) => {
  const now = new Date();
  const promos = await Promo.find({ isActive: true, expiryDate: { $gte: now } })
    .sort({ createdAt: -1 })
    .exec();
  return res.status(200).json(promos);
};
