import type { Request, Response } from "express";
import Plan from "./plans.model";

// Get all plans
export const getPlans = async (_req: Request, res: Response): Promise<void> => {
  try {
    const plans = await Plan.find().lean();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: "Error fetching plans", error });
  }
};
