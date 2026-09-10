import type { Request, Response } from "express";
import Prasad from "./prasadData.model";
import { ApiError } from "../../lib/apiError";
import { logger } from "../../lib/logger";

/** GET /fetch-all-prasads */
export const fetchAllPrasads = async (_req: Request, res: Response): Promise<void> => {
  try {
    const prasad = await Prasad.find().sort({ addedOn: -1 });
    if (!prasad || prasad.length === 0) {
      throw ApiError.notFound("No Prasads found.");
    }
    res.status(200).json(prasad);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error }, "Error fetching prasads");
    throw new ApiError(500, "Server error while fetching prasad.");
  }
};

/** GET /fetch-prasad-by-id/:id */
export const fetchprasadById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const prasad = await Prasad.findById(id);

    if (!prasad) {
      throw ApiError.notFound("prasad not found.");
    }

    res.status(200).json(prasad);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error }, "Error fetching prasad by ID");
    throw new ApiError(500, "Server error while fetching prasad by ID.");
  }
};
