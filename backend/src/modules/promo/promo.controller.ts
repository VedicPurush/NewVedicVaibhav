import type { Request, Response } from "express";
import Promo from "./promo.model";
import { resolvePromo } from "./promo.service";

// Fetch all active promos that haven't expired
export const fetchPromos = async (_req: Request, res: Response) => {
  const now = new Date();
  const promos = await Promo.find({ isActive: true, expiryDate: { $gte: now } })
    .sort({ createdAt: -1 })
    .exec();
  return res.status(200).json(promos);
};

/**
 * POST /validate-promo — previews a coupon for a checkout.
 * Body: { code, orderValue } with orderValue as the INDIA LIST total in INR.
 * Checkouts must still re-apply the code server-side when creating the order;
 * this answer is for display only.
 */
export const validatePromo = async (req: Request, res: Response) => {
  const { code, orderValue } = req.body as Record<string, unknown>;
  const applied = await resolvePromo(code, Number(orderValue));
  return res.status(200).json({ success: true, ...applied });
};
