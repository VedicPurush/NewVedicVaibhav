import type { Request, Response } from "express";
import { Banner } from "./banner.model";

/** Banners currently set to show on the website (due date in the future or unset). */
export const getActiveBanners = async (_req: Request, res: Response): Promise<void> => {
  const activeBanners = await Banner.find({
    showOnWebsite: true,
    $or: [
      { dueDate: { $gte: new Date() } }, // due date is today or in the future
      { dueDate: { $exists: false } }, // due date is not set
    ],
  }).sort({ index: 1 }); // display order

  res.status(200).json(activeBanners);
};
