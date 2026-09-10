"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { readNavState } from "@/lib/nav-state";
import ScratchCard from "@/components/shared/ScratchCard";
import { shouldTrackPurchase } from "@/lib/purchase-tracking";

interface SuccessNavState {
  bookingId?: string;
  planName?: string;
  amount?: number;
  selectedCount?: number;
  paymentMode?: string;
}

const JyotirlingaPaymentSuccess = () => {
  const router = useRouter();

  // react-router carried this via location.state; in Next it comes from sessionStorage.
  const [state, setState] = useState<SuccessNavState | null>(null);
  const [storedBookingId, setStoredBookingId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showScratch, setShowScratch] = useState(false);

  useEffect(() => {
    setState(readNavState<SuccessNavState>("12-jyotirlinga-success") ?? null);
    setStoredBookingId(localStorage.getItem("last_jyotirlinga_booking"));
    setReady(true);
  }, []);

  const bookingId = state?.bookingId || storedBookingId || "JYT-CONFIRMED";
  const planName = state?.planName || "Jyotirlinga Plan";
  const amount = state?.amount;
  const selectedCount = state?.selectedCount;
  const paymentMode = state?.paymentMode || "upfront";

  const firedRef = useRef(false);
  useEffect(() => {
    if (!ready || firedRef.current) return;
    firedRef.current = true;
    const t = setTimeout(() => setShowScratch(true), 1000);

    // Google Ads conversion — fires client-side (GA4 purchase also fired here)
    // FB Purchase is intentionally skipped here — backend CAPI handles it to avoid double-counting
    // One purchase per booking: skip re-fires on refresh/back-navigation, and
    // skip entirely when this page was opened without a booking behind it.
    if (!shouldTrackPurchase(bookingId, amount)) return;

    if (typeof window.gtag === "function") {
      window.gtag("event", "conversion", {
        send_to: "AW-16852886928/dBxGCJPAp5kaEJDLiuQ-",
        value: amount || 0,
        currency: "INR",
        transaction_id: bookingId,
      });
      window.gtag("event", "purchase", {
        transaction_id: bookingId,
        value: amount || 0,
        currency: "INR",
        items: [{ item_name: `12 Jyotirlinga - ${planName}`, item_category: "12 Jyotirlinga Subscription" }],
      });
    }

    return () => clearTimeout(t);
  }, [ready, amount, bookingId, planName]);

  const handleSubmitReview = async () => {
    if (!review.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/jyotirlinga-subscription/review", {
        orderID: bookingId,
        rating,
        review,
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Review error:", err);
      setSubmitted(true); // show thanks even on error
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: "linear-gradient(160deg, #fffaf0 0%, #fff7ed 60%, #ffedd5 100%)" }}
    >
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-16">

        {/* ── Success Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 10, stiffness: 120 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-full text-5xl mb-5"
            style={{
              background: "linear-gradient(135deg, #fef08a, #facc15)",
              boxShadow: "0 8px 40px rgba(234,88,12,0.4)",
            }}
          >
            🔱
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl md:text-4xl font-black mb-2"
            style={{ color: "#c2410c" }}
          >
            हर हर महादेव!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-base font-medium"
            style={{ color: "#9a3412" }}
          >
            Your 12 Jyotirlinga subscription is confirmed
          </motion.p>
        </motion.div>

        {/* ── Booking Summary Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl overflow-hidden mb-5"
          style={{
            background: "linear-gradient(160deg, #fffaf0, #fff7ed)",
            border: "1px solid rgba(234,88,12,0.4)",
            boxShadow: "0 2px 30px rgba(234,88,12,0.12)",
          }}
        >
          {/* Gold top bar */}
          <div
            className="h-1 w-full"
            style={{ background: "linear-gradient(90deg, transparent, #ea580c, #fef08a, #ea580c, transparent)" }}
          />
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: "rgba(234,88,12,0.08)", borderBottom: "1px solid rgba(234,88,12,0.15)" }}
          >
            <span className="text-xl">✅</span>
            <h2 className="font-bold text-sm uppercase tracking-widest" style={{ color: "#c2410c" }}>
              Booking Confirmed
            </h2>
          </div>
          <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Booking ID", value: bookingId, mono: true },
              { label: "Plan", value: planName },
              { label: "Amount Paid", value: amount ? `₹${amount.toLocaleString()}` : "—" },
              { label: "Status", value: "✅ Confirmed", green: true },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#ea580c" }}>
                  {item.label}
                </p>
                <p
                  className={`font-bold text-base break-all ${item.mono ? "font-mono text-sm" : ""}`}
                  style={{ color: item.green ? "#15803d" : "#431407" }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          {selectedCount && (
            <div className="px-6 pb-5">
              <p className="text-xs" style={{ color: "#7c2d12" }}>
                {selectedCount} Jyotirlinga selected •{" "}
                {paymentMode === "autopay" ? "UPI AutoPay" : "Full Payment"}
              </p>
            </div>
          )}
        </motion.div>

        {/* ── Scratch Card + Review ── */}
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: showScratch ? 1 : 0, x: showScratch ? 0 : -20 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl p-6 text-center"
            style={{
              background: "linear-gradient(160deg, #fffaf0, #fff7ed)",
              border: "1px solid rgba(234,88,12,0.3)",
              boxShadow: "0 2px 20px rgba(234,88,12,0.08)",
            }}
          >
            <p className="font-bold text-sm uppercase tracking-widest mb-1" style={{ color: "#c2410c" }}>
              Divine Reward
            </p>
            <p className="text-xs mb-4" style={{ color: "#7c2d12" }}>Scratch to reveal your special blessing</p>
            <div className="flex justify-center scale-90">
              <ScratchCard
                couponCode="MAHADEV108"
                discountLabel="₹108 OFF"
                service="Jyotirlinga"
                onReveal={() => {
                  const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
                  if (typeof fbq === "function") {
                    fbq("trackCustom", "ScratchCardRevealed", {
                      code: "MAHADEV108",
                      context: "jyotirlinga",
                    });
                  }
                }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl p-6"
            style={{
              background: "linear-gradient(160deg, #fffaf0, #fff7ed)",
              border: "1px solid rgba(234,88,12,0.3)",
              boxShadow: "0 2px 20px rgba(234,88,12,0.08)",
            }}
          >
            <p className="font-bold text-sm uppercase tracking-widest mb-4" style={{ color: "#c2410c" }}>
              Share Your Bhakti
            </p>

            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="text-2xl hover:scale-125 transition-transform"
                      >
                        {star <= rating ? "⭐" : "☆"}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Share your experience or a message for Mahadev..."
                    rows={4}
                    className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors"
                    style={{
                      background: "rgba(234,88,12,0.08)",
                      border: "1.5px solid rgba(234,88,12,0.3)",
                      color: "#431407",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#ea580c")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(234,88,12,0.3)")}
                  />
                  <button
                    onClick={handleSubmitReview}
                    disabled={submitting || !review.trim()}
                    className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                    style={{
                      background: "linear-gradient(135deg, #fef08a, #f97316)",
                      color: "#431407",
                      boxShadow: "0 4px 14px rgba(234,88,12,0.3)",
                    }}
                  >
                    {submitting ? "Submitting..." : "Submit Blessing 🙏"}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="thanks"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8"
                >
                  <div className="text-4xl mb-3">🙏</div>
                  <p className="font-bold" style={{ color: "#c2410c" }}>Har Har Mahadev!</p>
                  <p className="text-sm mt-1" style={{ color: "#7c2d12" }}>
                    Thank you for your divine feedback!
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ── What Happens Next ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl p-6 mb-5"
          style={{
            background: "linear-gradient(160deg, #fffaf0, #fff7ed)",
            border: "1px solid rgba(234,88,12,0.3)",
            boxShadow: "0 2px 20px rgba(234,88,12,0.08)",
          }}
        >
          <p className="font-bold text-sm uppercase tracking-widest mb-4" style={{ color: "#c2410c" }}>
            What Happens Next?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: "📱",
                title: "WhatsApp Update",
                desc: "You'll receive a confirmation and monthly updates on WhatsApp.",
              },
              {
                icon: "🔱",
                title: "Chadhava Performed",
                desc: "Sacred offerings are made at each Jyotirlinga in your name & gotra.",
              },
              {
                icon: "📦",
                title: "Prasad Delivered",
                desc: "Sacred prasad from the temple is delivered to your home each month.",
              },
            ].map((step) => (
              <div key={step.title} className="flex gap-3 items-start">
                <span className="text-2xl flex-shrink-0">{step.icon}</span>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "#c2410c" }}>
                    {step.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#7c2d12" }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Action Buttons ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-1 gap-4"
        >
          <button
            onClick={() => router.push("/services/12-jyotirlinga")}
            className="py-4 rounded-xl font-bold text-sm transition-all"
            style={{
              background: "linear-gradient(135deg, #fef08a, #f97316)",
              color: "#431407",
              boxShadow: "0 4px 18px rgba(234,88,12,0.35)",
            }}
          >
            Go to Home
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default JyotirlingaPaymentSuccess;
