import type { Request, Response } from "express";
import Jyotirlinga from "./jyotirlinga.model";

// Get all Jyotirlingas (sorted by month) - Optimized with .lean()
export const getAllJyotirlingas = async (_req: Request, res: Response): Promise<void> => {
  try {
    const jyotirlingas = await Jyotirlinga.find().sort({ monthNumber: 1 }).lean();
    res.json(jyotirlingas);
  } catch (error) {
    res.status(500).json({ message: "Error fetching jyotirlingas", error });
  }
};

// Get single Jyotirlinga by ID - Optimized with .lean()
export const getJyotirlingaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const jyotirlinga = await Jyotirlinga.findById(req.params.id).lean();
    if (!jyotirlinga) {
      res.status(404).json({ message: "Jyotirlinga not found" });
      return;
    }
    res.json(jyotirlinga);
  } catch (error) {
    res.status(500).json({ message: "Error fetching jyotirlinga", error });
  }
};
