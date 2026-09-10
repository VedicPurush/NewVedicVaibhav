"use client";

import { useEffect, useState } from "react";
import { toInr } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import ScratchCard from "@/components/shared/ScratchCard";
import { message } from "antd";
import Star from '@mui/icons-material/Star';
import StarBorder from '@mui/icons-material/StarBorder';
import { api } from "@/lib/api";
import { shouldTrackPurchase } from "@/lib/purchase-tracking";


const ChadhavaPaymentSuccessful = () => {
  useEffect(() => {
    const amount = Number(localStorage.getItem("lastChadhavaAmount")) || 0;
    const orderId = localStorage.getItem("lastChadhavaOrderId") || "";

    // One purchase per booking: skip re-fires on refresh/back-navigation, and
    // skip entirely when this page was opened without a booking behind it.
    if (!shouldTrackPurchase(orderId, amount)) return;

    if (typeof window.gtag === "function") {
      window.gtag("event", "conversion", {
        send_to: "AW-16852886928/dBxGCJPAp5kaEJDLiuQ-",
        value: toInr(amount),
        currency: "INR",
        transaction_id: orderId,
      });
      window.gtag("event", "purchase", {
        transaction_id: orderId,
        value: toInr(amount),
        currency: "INR",
        items: [{ item_name: "Chadhava", item_category: "Chadhava" }],
      });
    }
    if (typeof window.fbq === "function") {
      // eventID must match server CAPI event_id = "chadhava_purchase_" + orderID
      // This allows Meta to deduplicate browser pixel vs server CAPI event
      window.fbq("track", "Purchase", {
        value: toInr(amount),
        currency: "INR",
        content_ids: [orderId],
        content_name: "Chadhava",
        content_category: "Chadhava",
        content_type: "product",
      }, { eventID: `chadhava_purchase_${orderId}` });
    }
  }, []);

  const [timer, setTimer] = useState(10);
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
      router.push("/profile?tab=chadhava");
      return;
    }
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer, pauseRedirect, router]);

  const COUPON_CODE = "THANKYOU6";

  // API to save rating/review (optional, can customize URL as needed)
  const saveRatingAndReview = async (customReview: string) => {
    try {
      const pujaId = localStorage.getItem("bookedpujaID");
      const bookingId = localStorage.getItem("bookingId");
      let userName = null;
      let userPhone = null;

      // 1. PRIORITY: Check checkoutContact first (for non-logged-in users)
      const checkoutContactRaw = localStorage.getItem("checkoutContact");
      if (checkoutContactRaw) {
        const parsed = JSON.parse(checkoutContactRaw);
        if (parsed && parsed.name && parsed.phone) {
          userName = parsed.name;
          userPhone = String(parsed.phone).replace(/\D/g, "").slice(-10);
        }
      }

      // 2. Fallback to userDetails if checkoutContact not found
      if (!userName || !userPhone) {
        const userDetailsRaw = localStorage.getItem("userDetails");
        if (userDetailsRaw) {
          const parsed = JSON.parse(userDetailsRaw);
          if (parsed && parsed.user) {
            userName = parsed.user.name || parsed.user.given_name || null;
            const phoneRaw = parsed.user.phone || parsed.user.mobile || "";
            userPhone = String(phoneRaw).replace(/\D/g, "").slice(-10);
          }
        }
      }

      if (!pujaId || !userName || !userPhone) {
        message.error(
          "Missing chadhavaId or contact details. Review not submitted."
        );
        setErrorMessage("Missing chadhavaId or contact details.");
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
      console.error("Failed to submit rating and review:", error);
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
    router.push("/profile?tab=chadhava");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-green-50 relative overflow-hidden">
      {/* Floating background elements */}
      <motion.div
        className="absolute top-20 left-10 w-32 h-32 bg-orange-200 rounded-full opacity-20 blur-3xl"
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
        className="absolute bottom-20 right-10 w-40 h-40 bg-yellow-200 rounded-full opacity-20 blur-3xl"
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
        {/* Animated Checkmark and Rotating Border */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: 360 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="relative w-24 h-24 mx-auto mb-6"
        >
          <motion.div
            className="absolute inset-0 border-4 border-green-500  rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.3 }}
            className="flex items-center justify-center w-full h-full bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-lg"
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
          className="text-2xl font-bold text-green-600 mb-1"
        >
          Transaction Successful!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.3 }}
          className="mt-0 text-gray-600 text-md"
        >
          Thank you for booking Chadhava from us!
        </motion.p>

        {/* Tempting the User to Provide Rating */}
        <AnimatePresence>
          {isRatingOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ delay: 2.2, duration: 0.4 }}
              className="mt-8 p-3 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-orange-200 shadow-xl relative overflow-hidden"
            >
              {/* Sparkle effects */}
              <motion.div
                className="absolute top-2 right-2"
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
              </motion.div>



              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 2.5, duration: 0.3 }}
                className="mb-4"
              >
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-yellow-600">
                  Unlock Your Reward!
                </h2>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.7, duration: 0.3 }}
                className="bg-white/70 backdrop-blur-sm rounded-lg p-4 mb-4 border border-orange-100"
              >
                <p className="text-gray-700 font-semibold text-md mb-2">
                  Rate us & Win a Scratch Card!
                </p>
                <p className="text-gray-600 text-[12px]">
                  Share your experience to unlock an exclusive discount coupon.
                </p>
              </motion.div>

              <p className="text-orange-600 font-medium mb-4 text-sm">
                Rate your experience below
              </p>

              <div className="mt-2 flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.div
                    key={star}
                    className={`cursor-pointer transition-all ${star <= (hoverRating || rating)
                      ? "text-orange-500"
                      : "text-gray-300"
                      }`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    whileHover={{ scale: 1.3, rotate: 10 }}
                    whileTap={{ scale: 0.9 }}
                    animate={{
                      scale: star <= rating ? [1, 1.2, 1] : 1,
                    }}
                    transition={{
                      duration: 0.3,
                    }}
                  >
                    {star <= (hoverRating || rating) ? (
                      <Star className="w-15 h-15 drop-shadow-lg" />
                    ) : (
                      <StarBorder className="w-15 h-15" />
                    )}
                  </motion.div>
                ))}
              </div>

              {rating > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-orange-600 font-semibold text-sm"
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
                    className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
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
                className="mt-6 px-8 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
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
              className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-xl relative overflow-hidden"
            >
              {/* Animated icon */}
              <motion.div
                className="absolute top-2 right-2"
                animate={{
                  rotate: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
              </motion.div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
                className="mb-4"
              >
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  Almost There!
                </h2>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="bg-white/70 backdrop-blur-sm rounded-lg p-4 mb-4 border border-blue-100"
              >
                <p className="text-gray-700 font-semibold mb-2">
                  📝 Share Your Experience
                </p>
                <p className="text-gray-600 text-sm">
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
                  className="w-full mt-4 p-4 border-2 border-blue-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-300 resize-none"
                  placeholder="Tell us about your experience... (e.g., The booking was smooth and the service was excellent!)"
                />
              </motion.div>

              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
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
                  className="w-full px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Unlock My Scratch Card
                </motion.button>
                <motion.a
                  href="#"
                  onClick={handleSkipAndClaim}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
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
                  className="mb-4 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl border-2 border-yellow-300"
                >
                  <p className="text-orange-700 font-bold text-lg">
                    Congratulations! Here&apos;s Your Reward
                  </p>
                  <p className="text-orange-600 text-sm mt-1">
                    Scratch below to reveal your exclusive discount!
                  </p>
                </motion.div>

                <ScratchCard
                  couponCode={COUPON_CODE}
                  discountPercent={6}
                  onInteract={() => setPauseRedirect(true)}
                  service="chadhava"
                  onReveal={() => {
                    if (typeof window.fbq === "function") {
                      window.fbq("trackCustom", "ScratchCardRevealed", {
                        code: COUPON_CODE,
                        context: "chadhava",
                      });
                    }
                    if (typeof window.gtag === "function") {
                      window.gtag("event", "scratch_card_revealed", {
                        code: COUPON_CODE,
                        context: "chadhava",
                      });
                    }
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
                  className="px-8 py-3 text-white font-bold bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => router.push("/profile?tab=chadhava")}
                >
                  ✅ Check Your Chadhava
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-sm text-orange-600 font-medium hover:text-orange-800 hover:underline transition-colors"
                  onClick={() => router.push("/chadhava")}
                >
                  🔄 Book Another Chadhava
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
              className="my-6 flex flex-col items-center gap-3"
            >
              <span className="text-base font-medium text-gray-500 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full inline-block">
                ⏱️ Redirecting in {timer}s...
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setPauseRedirect(true); router.push("/profile?tab=chadhava"); }}
                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all duration-300 text-sm"
              >
                Skip → View My Bookings
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChadhavaPaymentSuccessful;
