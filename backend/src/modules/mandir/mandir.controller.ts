import type { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import Mandir from "./mandir.model";
import { ApiError } from "../../lib/apiError";
import { logger } from "../../lib/logger";

/** GET /fetch-active-mandirs — every mandir with isActive: true. */
export const fetchActiveMandirs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const mandirs = await Mandir.find({ isActive: true }).exec();
    res.status(200).json({ mandirs });
  } catch (error) {
    logger.error({ err: error }, "Error fetching mandirs");
    throw new ApiError(500, "Server error");
  }
};

/** GET /fetch-mandir-by-id/:id */
export const fetchMandirById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const mandirId = req.params.id;

    if (!mandirId || !isValidObjectId(mandirId)) {
      throw ApiError.badRequest("Mandir ID is required and must be a valid ObjectId.");
    }

    const mandir = await Mandir.findById(mandirId);
    if (!mandir) {
      throw ApiError.notFound("Mandir not found.");
    }

    res.status(200).json({ mandir });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error }, "Error fetching Mandir");
    throw new ApiError(500, "Server error during Mandir fetch.");
  }
};
