import type { Request, Response } from "express";
import { VideoProof } from "./videoProof.model";

/**
 * GET /video-proofs/get-active?page=1&limit=10
 * Paginated active videoProof documents; featured first, then newest.
 */
export const getActiveVideoProofs = async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const limit = Math.min(50, parseInt(String(req.query.limit), 10) || 10);
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    VideoProof.find({ isActive: true })
      .sort({ isFeatured: -1, uploadDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    VideoProof.countDocuments({ isActive: true }),
  ]);

  res.status(200).json({
    success: true,
    data: docs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + docs.length < total,
    },
  });
};
