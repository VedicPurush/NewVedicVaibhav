import type { Request, Response } from "express";
import { ApiError } from "../../lib/apiError";
import { Feedback, Review } from "./feedback.model";

interface UpsertReviewBody {
  bookingId?: string; // unique per booking
  pujaId?: string;
  poojaname?: string;
  name?: string;
  phone?: string;
  rating?: number;
  review?: string | null;
  satisfaction?: number;
  quality?: number;
  spiritualExperience?: string;
  appreciatedAspects?: string[];
  appreciatedOther?: string;
  improvementSuggestions?: string;
}

export const getAllReviews = async (_req: Request, res: Response): Promise<void> => {
  const reviews = await Review.find().select("-__v").sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    count: reviews.length,
    data: reviews,
  });
};

export const handleFeedbackSubmission = async (req: Request, res: Response): Promise<void> => {
  const feedback = await Feedback.create(req.body);
  res.status(201).json({ message: "Feedback submitted", data: feedback });
};

export const handleFetchFeedbackByMobile = async (req: Request, res: Response): Promise<void> => {
  const raw = (req.params.mobile ?? req.query.mobile ?? "").toString().trim();
  if (!raw) {
    // Legacy shape: `error` field on these 400s.
    res.status(400).json({ error: "Mobile number is required" });
    return;
  }

  // Normalize: strip non-digits, keep last 10.
  const last10 = raw.replace(/\D/g, "").slice(-10);
  if (last10.length !== 10) {
    res.status(400).json({ error: "Invalid mobile number" });
    return;
  }

  const feedbackList = await Feedback.find({
    $or: [
      { phone: last10 }, // exact 10-digit
      { phone: new RegExp(`${last10}$`) }, // ends with those 10 digits
    ],
  }).lean();

  if (!feedbackList.length) {
    res.status(404).json({ message: "No feedback found for this mobile number" });
    return;
  }
  res.status(200).json({ data: feedbackList });
};

export const submitReview = async (req: Request, res: Response): Promise<void> => {
  const { pujaId, rating, review, name, phone } = req.body as UpsertReviewBody;

  if (!pujaId || !rating || !name || !phone) {
    throw ApiError.badRequest("Puja ID, rating, name, and phone are required");
  }

  await Review.create({
    pujaId,
    rating,
    review: review || null,
    name,
    phone,
  });

  res.status(200).json({
    success: true,
    message: "Review submitted successfully!",
  });
};

export const getReviewByBookingId = async (
  req: Request<{ bookingId: string }>,
  res: Response,
): Promise<void> => {
  const review = await Review.findOne({ bookingId: req.params.bookingId });
  if (!review) {
    throw ApiError.notFound("No review found");
  }
  res.json({ success: true, data: review });
};

export const upsertReview = async (req: Request, res: Response): Promise<void> => {
  const {
    bookingId,
    pujaId,
    poojaname,
    name,
    phone,
    rating,
    review,
    satisfaction,
    quality,
    spiritualExperience,
    appreciatedAspects,
    appreciatedOther,
    improvementSuggestions,
  } = req.body as UpsertReviewBody;

  // bookingId is what makes a review unique per booking.
  if (!bookingId) {
    throw ApiError.badRequest("bookingId is required");
  }
  if (!pujaId) {
    throw ApiError.badRequest("pujaId is required");
  }

  // Fields that mean the review is "complete".
  const complete =
    satisfaction &&
    quality &&
    spiritualExperience &&
    ((appreciatedAspects && appreciatedAspects.length > 0) || appreciatedOther) &&
    improvementSuggestions;

  const feedback = await Review.findOneAndUpdate(
    { bookingId },
    {
      $set: {
        pujaId,
        poojaname,
        name,
        phone,
        rating,
        review,
        satisfaction,
        quality,
        spiritualExperience,
        appreciatedAspects,
        appreciatedOther,
        improvementSuggestions,
        isComplete: Boolean(complete),
      },
    },
    { new: true, upsert: true },
  );

  res.json({ success: true, data: feedback });
};
