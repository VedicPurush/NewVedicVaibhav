import { Router } from "express";
import {
  getAllReviews,
  getReviewByBookingId,
  handleFeedbackSubmission,
  handleFetchFeedbackByMobile,
  submitReview,
  upsertReview,
} from "./feedback.controller";

// Mounted at "/feedback" in app.ts
const router = Router();

router.get("/", getAllReviews);

router.post("/submit", handleFeedbackSubmission);
router.get("/:mobile", handleFetchFeedbackByMobile);

router.post("/submit-review", submitReview);

router.get("/by-booking/:bookingId", getReviewByBookingId);
router.post("/upsert", upsertReview);

export default router;
