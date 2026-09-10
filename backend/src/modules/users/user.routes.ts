import express from "express";
import multer from "multer";
import { otpRateLimiter, writeRateLimiter } from "../../middleware/rateLimiter";

import {
  getAllGmailUsers,
  getUserByUserId,
  sendOtp,
  updateUserProfile,
  verifyOtp,
  loginOrRegister,
  getUserByEmail,
  getUserByPhone,
  deleteAccountController,
  sendContactUsForm,
} from "./user.controller";

const router = express.Router();

// Multer storage in memory (contact-us image attachments, max 5MB per file)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// READ
router.get("/get-user-by-id/:userId", getUserByUserId);
router.get("/get-user-by-email/:email", getUserByEmail);
router.get("/get-user-by-phone/:phone", getUserByPhone);

// UPDATE
router.post("/update-user-profile/:userId", updateUserProfile);

// Login / register by phone (checkout flow)
router.post("/phone-login-or-register", otpRateLimiter, loginOrRegister);

// Phone OTP. Rate limited per targeted phone number: /send-otp bills a real
// Fast2SMS message, and /verify-otp is the brute-force surface for the 6-digit code.
router.post("/send-otp", otpRateLimiter, sendOtp);
router.post("/verify-otp", otpRateLimiter, verifyOtp);

// Every gmail user email
router.get("/users/gmail", getAllGmailUsers);

// Contact Us form submissions with multiple image uploads (field name "problemImage")
router.post("/contact-us-mail", writeRateLimiter, upload.array("problemImage"), sendContactUsForm);

router.post("/delete-account", deleteAccountController);

export default router;
