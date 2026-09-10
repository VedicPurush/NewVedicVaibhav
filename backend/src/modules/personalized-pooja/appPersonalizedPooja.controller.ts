import type { Request, Response } from "express";
import PersonalizedPoojaModel from "./appPersonalizedPooja.model";

/**
 * GET /fetch-all-app-personalized-poojas
 * Returns every active personalized pooja (isActive = true).
 */
export const getActivePersonalizedPoojas = async (_req: Request, res: Response): Promise<void> => {
  const poojas = await PersonalizedPoojaModel.find({ isActive: true }).lean().exec();

  res.status(200).json({ success: true, count: poojas.length, data: poojas });
};

/**
 * GET /fetch-app-personalized-poojas-by-mandir/:mandirId
 * Returns active personalized poojas linked to a given mandir.
 */
export const getActivePersonalizedPoojasByMandir = async (
  req: Request<{ mandirId: string }>,
  res: Response,
): Promise<void> => {
  const { mandirId } = req.params;

  const poojas = await PersonalizedPoojaModel.find({ isActive: true, mandirIds: mandirId })
    .lean()
    .exec();

  res.status(200).json({ success: true, count: poojas.length, data: poojas });
};
