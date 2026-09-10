"use client";

import { useEffect, useState } from "react";
import { toInr, useMoney, paidMoney } from "@/lib/currency";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ScratchCard from "@/components/shared/ScratchCard";
import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";
import { readNavState } from "@/lib/nav-state";
import { shouldTrackPurchase } from "@/lib/purchase-tracking";

const BankeBihariPaymentSuccess = () => {
  const router = useRouter();
  /** Renders during every render, so the ₹200-off coupon banner below picks up
   *  the devotee's own currency once country detection resolves. */
  const { money } = useMoney();
  // react-router carried these via location.state; in Next they come from sessionStorage.
  const [bookingId, setBookingId] = useState("BB-CONFIRMED");
  const [packageName, setPackageName] = useState("Nitya Seva");
  const [amount, setAmount] = useState<number | undefined>(undefined);
  // Presentment fields carried from the create-order response, so the receipt
  // below reads what the card actually saw — never re-priced by whatever
  // country happens to be selected when this page renders.
  const [currency, setCurrency] = useState<string | undefined>(undefined);
  const [chargedAmount, setChargedAmount] = useState<number | undefined>(undefined);

  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showScratch, setShowScratch] = useState(false);

  useEffect(() => {
    const state = readNavState<{
      bookingId?: string;
      packageName?: string;
      amount?: number;
      currency?: string;
      chargedAmount?: number;
    }>("banke-bihariji-success");
    const resolvedBookingId = state?.bookingId || localStorage.getItem("last_bb_booking") || "BB-CONFIRMED";
    const resolvedAmount = state?.amount;
    setBookingId(resolvedBookingId);
    setPackageName(state?.packageName || "Nitya Seva");
    setAmount(resolvedAmount);
    setCurrency(state?.currency);
    setChargedAmount(state?.chargedAmount);

    const t = setTimeout(() => setShowScratch(true), 1000);

    const fireAmount = resolvedAmount || Number(localStorage.getItem("lastBBSevaAmount")) || 0;
    const w = window as any;

    // One purchase per booking: skip re-fires on refresh/back-navigation, and
    // skip entirely when this page was opened without a booking behind it.
    if (!shouldTrackPurchase(resolvedBookingId, fireAmount)) return;

    if (typeof w.gtag === "function") {
      w.gtag("event", "conversion", {
        send_to: "AW-16852886928/dBxGCJPAp5kaEJDLiuQ-",
        value: toInr(fireAmount),
        currency: "INR",
        transaction_id: resolvedBookingId,
      });
      w.gtag("event", "purchase", {
        transaction_id: resolvedBookingId,
        value: toInr(fireAmount),
        currency: "INR",
        items: [{ item_name: "Banke Bihari Seva", item_category: "Seva" }],
      });
    }
    if (typeof w.fbq === "function") {
      w.fbq("track", "Purchase", {
        value: toInr(fireAmount),
        currency: "INR",
        content_ids: [resolvedBookingId],
        content_name: "Banke Bihari Seva",
        content_category: "Seva",
        content_type: "product",
      }, { eventID: `bbseva_purchase_${resolvedBookingId}` });
    }

    return () => clearTimeout(t);
  }, []);

  const handleSubmitReview = async () => {
    if (!review.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/bb-seva/review`, { orderID: bookingId, rating, review });
      setSubmitted(true);
    } catch (err) {
      console.error("Review error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "linear-gradient(160deg, #fff8ef 0%, #fff3e4 60%, #ffefd8 100%)" }}>
      <Navbar activeIndex="banke-bihariji" />

      <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">

        {/* ── Success Hero ───────────────────────────────────────── */}
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
              background: "linear-gradient(135deg, #fdba74, #f97316)",
              boxShadow: "0 8px 40px rgba(249,115,22,0.28)",
            }}
          >
            🙏
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl md:text-4xl font-black mb-2"
            style={{ color: "#92400e" }}
          >
            जय श्री कृष्ण!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-base font-medium"
            style={{ color: "#b45309" }}
          >
            Your Seva at Banke Bihari Mandir, Vrindavan is confirmed ✨
          </motion.p>
        </motion.div>

        {/* ── Booking Summary Card ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl overflow-hidden mb-5"
          style={{ background: "#fff", border: "1px solid #f5d5a8", boxShadow: "0 2px 20px rgba(200,100,0,0.07)" }}
        >
          <div className="px-6 py-4 flex items-center gap-2" style={{ background: "linear-gradient(90deg, #fff4e0, #fff8ef)" }}>
            <span className="text-orange-500 text-xl">✅</span>
            <h2 className="font-bold text-sm uppercase tracking-widest" style={{ color: "#92400e" }}>Booking Confirmed</h2>
          </div>
          <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Booking ID", value: bookingId, mono: true },
              { label: "Package", value: packageName },
              {
                label: "Amount Paid",
                // Reads currency/chargedAmount stored on THIS booking — a
                // devotee who paid in USD sees $, not today's picker's guess.
                value: amount ? paidMoney({ amount, currency, chargedAmount }) : "—",
              },
              { label: "Status", value: "✅ Confirmed", green: true },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#d97706" }}>{item.label}</p>
                <p className={`font-bold text-base break-all ${item.mono ? "font-mono text-sm" : ""}`} style={{ color: item.green ? "#16a34a" : "#92400e" }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Scratch Card + Review ──────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-5 mb-5">

          {/* Scratch Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: showScratch ? 1 : 0, x: showScratch ? 0 : -20 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl p-6 text-center"
            style={{ background: "#fff", border: "1px solid #f5d5a8", boxShadow: "0 2px 20px rgba(200,100,0,0.06)" }}
          >
            <p className="font-bold text-sm uppercase tracking-widest mb-1" style={{ color: "#b45309" }}>🎁 Divine Reward</p>
            <p className="text-xs mb-4" style={{ color: "#a16207" }}>Scratch to reveal your special blessing</p>
            <div className="flex justify-center scale-90">
              <ScratchCard couponCode="KRISHNAJI" discountLabel={`${money(200)} OFF`} service="Seva" />
            </div>
          </motion.div>

          {/* Review */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl p-6"
            style={{ background: "#fff", border: "1px solid #f5d5a8", boxShadow: "0 2px 20px rgba(200,100,0,0.06)" }}
          >
            <p className="font-bold text-sm uppercase tracking-widest mb-4" style={{ color: "#b45309" }}>💬 Share Your Experience</p>

            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setRating(star)} className="text-2xl hover:scale-125 transition-transform">
                        {star <= rating ? "⭐" : "☆"}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Share your experience or a message for Bihari Ji..."
                    rows={4}
                    className="w-full border-2 border-amber-200 rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-orange-400 transition-colors"
                    style={{ background: "#fff8ef", color: "#1c0a00" }}
                  />
                  <button
                    onClick={handleSubmitReview}
                    disabled={submitting || !review.trim()}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 4px 14px rgba(234,88,12,0.25)" }}
                  >
                    {submitting ? "Submitting..." : "Submit Blessing "}
                  </button>
                </motion.div>
              ) : (
                <motion.div key="thanks" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8">
                  <div className="text-4xl mb-3">🙏</div>
                  <p className="font-bold" style={{ color: "#b45309" }}>Jai Shri Krishna!</p>
                  <p className="text-sm mt-1" style={{ color: "#a16207" }}>Thank you for your divine feedback!</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ── What Happens Next ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl p-6 mb-5"
          style={{ background: "#fff", border: "1px solid #f5d5a8", boxShadow: "0 2px 20px rgba(200,100,0,0.06)" }}
        >
          <p className="font-bold text-sm uppercase tracking-widest mb-4" style={{ color: "#b45309" }}>📿 What Happens Next?</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: "📱", title: "WhatsApp Update", desc: "You'll receive a confirmation and updates on WhatsApp." },
              { icon: "🙏", title: "Seva Performed", desc: "Pandits perform your daily Seva at Banke Bihari Mandir, Vrindavan." },
              { icon: "📹", title: "Video Darshan", desc: "Receive daily video & photo proof of your seva." },
            ].map((step) => (
              <div key={step.title} className="flex gap-3 items-start">
                <span className="text-2xl flex-shrink-0">{step.icon}</span>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "#92400e" }}>{step.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#a16207" }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Action Buttons ─────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => router.push("/profile?tab=banke-bihari")}
            className="py-4 rounded-xl font-bold text-sm transition-all"
            style={{ background: "#fff4e0", border: "1.5px solid #fbbf24", color: "#b45309" }}
          >
            View All Bookings
          </button>
          <button
            onClick={() => router.push("/")}
            className="py-4 rounded-xl font-bold text-sm text-white transition-all"
            style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 4px 18px rgba(234,88,12,0.28)" }}
          >
            Go to Home
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default BankeBihariPaymentSuccess;
