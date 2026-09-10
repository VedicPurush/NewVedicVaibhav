"use client";

import { useEffect, useState } from "react";
import { toInr } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import ScratchCard from "@/components/shared/ScratchCard";
import { api } from "@/lib/api";
import { message } from "antd";
import Star from '@mui/icons-material/Star';
import StarBorder from '@mui/icons-material/StarBorder';
import { shouldTrackPurchase } from "@/lib/purchase-tracking";

const YatraPaymentSuccess = () => {
  useEffect(() => {
    const amount = Number(localStorage.getItem("lastYatraAmount")) || 0;
    const orderId = localStorage.getItem("lastYatraOrderId") || "";
    const w = window as any;

    // One purchase per booking: skip re-fires on refresh/back-navigation, and
    // skip entirely when this page was opened without a booking behind it.
    if (!shouldTrackPurchase(orderId, amount)) return;

    if (typeof w.gtag === "function") {
      w.gtag("event", "conversion", {
        send_to: "AW-16852886928/dBxGCJPAp5kaEJDLiuQ-",
        value: toInr(amount),
        currency: "INR",
        transaction_id: orderId,
      });
      w.gtag("event", "purchase", {
        transaction_id: orderId,
        value: toInr(amount),
        currency: "INR",
        items: [{ item_name: "4 Dham Yatra", item_category: "Yatra" }],
      });
    }
    if (typeof w.fbq === "function") {
      w.fbq("track", "Purchase", {
        value: toInr(amount),
        currency: "INR",
        content_ids: [orderId],
        content_name: "4 Dham Yatra",
        content_category: "Yatra",
        content_type: "product",
      }, { eventID: `4dham_purchase_${orderId}` });
    }
  }, []);

  const [timer, setTimer] = useState(15);
  const [pauseRedirect, setPauseRedirect] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [review, setReview] = useState("");
  const [showScratchCard, setShowScratchCard] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  // Countdown (pauses when user interacts)
  useEffect(() => {
    if (pauseRedirect) return;
    if (timer <= 0) {
      router.push("/profile?tab=4-dham-yatra");
      return;
    }
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer, pauseRedirect, router]);

  const COUPON_CODE = "YATRA108";

  // API to save rating/review
  const saveRatingAndReview = async (customReview: string) => {
    try {
      const pujaId = localStorage.getItem("bookedpujaID");
      const bookingId = localStorage.getItem("bookingId");
      let userName = null;
      let userPhone = null;

      const userDetailsRaw = localStorage.getItem("userDetails");
      if (userDetailsRaw) {
        const parsed = JSON.parse(userDetailsRaw);
        if (parsed && parsed.user) {
          userName = parsed.user.name || parsed.user.given_name || null;
          const phoneRaw = parsed.user.phone || parsed.user.mobile || "";
          userPhone = String(phoneRaw).replace(/\D/g, "").slice(-10);
        }
      }

      if (!pujaId || !userName || !userPhone) {
        message.error(
          "Missing Yatra ID or contact details. Review not submitted."
        );
        setErrorMessage("Missing Yatra ID or contact details.");
        return;
      }

      const response = await api.post(
        "/feedback/upsert",
        {
          pujaId,
          bookingId,
          rating,
          review:
            typeof customReview === "string" ? customReview : review.trim(),
          name: userName,
          phone: userPhone,
          isComplete: false,
        }
      );
      if (response.data.success) {
        message.success("Thank you for your feedback!");
      } else {
        setErrorMessage(
          response.data.message || "Server error, please try again."
        );
      }
    } catch (error) {
      setErrorMessage("Failed to submit rating and review");
    }
  };

  const handleRatingSubmit = () => {
    if (rating === 0) {
      setErrorMessage("Please select a rating.");
      return;
    }
    setIsRatingOpen(false);
    setIsReviewModalOpen(true);
    setPauseRedirect(true);
    setErrorMessage("");
  };

  const handleReviewSubmit = () => {
    if (review.trim() === "") {
      setErrorMessage("Please write a review before submitting.");
      return;
    }
    saveRatingAndReview(review.trim());
    setIsReviewModalOpen(false);
    setShowScratchCard(true);
    setPauseRedirect(true);
    setErrorMessage("");
  };

  const handleSkipAndClaim = () => {
    if (rating > 0) {
      saveRatingAndReview("");
    }
    setPauseRedirect(true);
    router.push("/profile?tab=4-dham-yatra");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0d0f1a] relative overflow-hidden text-white pt-20 pb-20">
      {/* Floating background elements */}
      <motion.div
        className="absolute top-20 left-10 w-32 h-32 bg-orange-500 rounded-full opacity-10 blur-3xl"
        animate={{
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-40 h-40 bg-yellow-500 rounded-full opacity-10 blur-3xl"
        animate={{
          y: [0, 20, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="text-center px-4 md:px-0 w-full md:w-1/3 relative z-10">
        {/* Animated Checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: 360 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="relative w-24 h-24 mx-auto mb-6"
        >
          <motion.div
            className="absolute inset-0 border-4 border-[#F59E0B] rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.3 }}
            className="flex items-center justify-center w-full h-full bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="3"
              stroke="white"
              className="w-14 h-14"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </motion.div>
        </motion.div>

        {/* Transaction Successful Message */}
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.3 }}
          className="text-2xl font-bold text-[#F59E0B] mb-2"
        >
          Yatra Successfully Booked!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.3 }}
          className="mt-0 text-gray-300 text-md"
        >
          Thank you for joining the Virtual 4 Dham Yatra.
        </motion.p>

        {/* Tempting the User to Provide Rating */}
        <AnimatePresence>
          {isRatingOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ delay: 2.2, duration: 0.4 }}
              className="mt-8 p-6 rounded-2xl bg-[#1a1c29] border border-gray-800 shadow-xl relative overflow-hidden"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 2.5, duration: 0.3 }}
                className="mb-4"
              >
                <h2 className="text-2xl font-bold text-[#F59E0B]">
                  Unlock Your Reward!
                </h2>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.7, duration: 0.3 }}
                className="bg-black/30 rounded-lg p-4 mb-4 border border-gray-700/50"
              >
                <p className="text-gray-200 font-semibold text-md mb-2">
                  Rate us & Win a Scratch Card!
                </p>
                <p className="text-gray-400 text-[12px]">
                  Share your experience to unlock an exclusive discount coupon.
                </p>
              </motion.div>

              <p className="text-[#F59E0B] font-medium mb-4 text-sm">
                Rate your experience below
              </p>

              <div className="mt-2 flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.div
                    key={star}
                    className={`cursor-pointer transition-all ${star <= (hoverRating || rating)
                      ? "text-[#F59E0B]"
                      : "text-gray-600"
                      }`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    whileHover={{ scale: 1.3, rotate: 10 }}
                    whileTap={{ scale: 0.9 }}
                    animate={{
                      scale: star <= rating ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {star <= (hoverRating || rating) ? (
                      <Star className="w-12 h-12 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    ) : (
                      <StarBorder className="w-12 h-12" />
                    )}
                  </motion.div>
                ))}
              </div>

              {rating > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-[#F59E0B] font-semibold text-sm"
                >
                  {rating === 5
                    ? "⭐ Excellent! Thank you!"
                    : rating === 4
                      ? "😊 Great choice!"
                      : rating === 3
                        ? "👍 Good!"
                        : "Thanks for your feedback!"}
                </motion.p>
              )}

              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    ⚠️ {errorMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                onClick={handleRatingSubmit}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-6 px-8 py-3 bg-gradient-to-r from-orange-500 to-[#F59E0B] text-black font-bold rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all duration-300"
              >
                Continue to Unlock Reward
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Review Modal */}
        <AnimatePresence>
          {isReviewModalOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="mt-8 p-6 rounded-2xl bg-[#1a1c29] border border-gray-800 shadow-xl relative overflow-hidden"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
                className="mb-4"
              >
                <h2 className="text-2xl font-bold text-[#F59E0B]">
                  Almost There!
                </h2>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="bg-black/30 rounded-lg p-4 mb-4 border border-gray-700/50"
              >
                <p className="text-gray-200 font-semibold mb-2">
                  📝 Share Your Experience
                </p>
                <p className="text-gray-400 text-sm">
                  Write a quick review to unlock your exclusive scratch card
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  rows={4}
                  className="w-full mt-4 p-4 bg-[#0d0f1a] text-white border-2 border-gray-700/50 rounded-xl focus:border-[#F59E0B] outline-none transition-all duration-300 resize-none"
                  placeholder="Tell us about your experience..."
                />
              </motion.div>

              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    ⚠️ {errorMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 flex flex-col items-center gap-3">
                <motion.button
                  onClick={handleReviewSubmit}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full px-8 py-3 bg-gradient-to-r from-[#F59E0B] to-yellow-500 text-black font-bold rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all duration-300"
                >
                  Unlock My Scratch Card
                </motion.button>
                <motion.a
                  href="#"
                  onClick={handleSkipAndClaim}
                  className="text-sm text-gray-400 hover:text-white font-medium transition-colors"
                  whileHover={{ scale: 1.05 }}
                >
                  Skip for now
                </motion.a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scratch Card */}
        <AnimatePresence>
          {showScratchCard && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mt-8"
              >
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="mb-4 p-4 bg-[#1a1c29] rounded-xl border-2 border-[#F59E0B]"
                >
                  <p className="text-[#F59E0B] font-bold text-lg">
                    Congratulations! Here's Your Reward
                  </p>
                  <p className="text-gray-300 text-sm mt-1">
                    Scratch below to reveal your exclusive discount!
                  </p>
                </motion.div>

                <ScratchCard
                  couponCode={COUPON_CODE}
                  discountPercent={11}
                  onInteract={() => setPauseRedirect(true)}
                  service="yatra"
                  onReveal={() => {
                    // tracking
                  }}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3, duration: 0.3 }}
                className="mt-8 flex flex-col items-center justify-center gap-4"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 text-black font-bold bg-[#F59E0B] rounded-full shadow-lg hover:shadow-[0_0_15px_rgba(245,158,11,0.6)] transition-all duration-300"
                  onClick={() => router.push("/profile?tab=4-dham-yatra")}
                >
                  ✅ View Bookings
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-sm text-[#F59E0B] font-medium hover:text-white transition-colors"
                  onClick={() => router.push("/4-dham-yatra")}
                >
                  🔄 Return to Yatra
                </motion.button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Countdown Timer */}
        <AnimatePresence>
          {!pauseRedirect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 2.5, duration: 0.3 }}
              className="my-6 text-base font-medium text-gray-400 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full inline-block border border-gray-800"
            >
              ⏱️ Redirecting in {timer}s...
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default YatraPaymentSuccess;
