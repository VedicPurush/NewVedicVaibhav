import type { Request, Response } from "express";
import { God } from "./god.model";

export const fetchAllGods = async (_req: Request, res: Response): Promise<void> => {
  const gods = await God.find();
  res.status(200).json({ gods });
};

export const fetchGodById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const god = await God.findById(req.params.id);
  if (!god) {
    res.status(404).json({ message: "God not found." });
    return;
  }
  res.status(200).json({ god });
};
