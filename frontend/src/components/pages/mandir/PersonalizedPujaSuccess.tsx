"use client";

import { useEffect, useState } from "react";
import { toInr, paidMoney } from "@/lib/currency";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import { shouldTrackPurchase } from "@/lib/purchase-tracking";

interface SuccessState {
  orderId?: string;
  poojaName?: string;
  mandirName?: string;
  poojaDate?: string;
  price?: number;
  mobile?: string;
  devoteeName?: string;
  paymentId?: string;
  /** Presentment fields from the create-order response. See paidMoney(). */
  currency?: string;
  chargedAmount?: number;
}

const REDIRECT_SECONDS = 8;

const PersonalizedPujaSuccess = () => {
  const router = useRouter();
  const [state, setState] = useState<SuccessState>({});
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    let parsed: SuccessState = {};
    try {
      parsed = JSON.parse(sessionStorage.getItem("personalizedPujaSuccessState") || "{}") as SuccessState;
    } catch {
      parsed = {};
    }
    setState(parsed);

    const amount = parsed?.price || Number(localStorage.getItem("lastPersonalizedPujaAmount")) || 0;
    const orderId = parsed?.orderId || parsed?.paymentId || localStorage.getItem("lastPersonalizedPujaOrderId") || "";

    const gtagFn = (window as any).gtag;
    // One purchase per booking: skip re-fires on refresh/back-navigation, and
    // skip entirely when this page was opened without a booking behind it.
    if (!shouldTrackPurchase(orderId, amount)) return;

    if (typeof gtagFn === "function") {
      gtagFn("event", "conversion", {
        send_to: "AW-16852886928/dBxGCJPAp5kaEJDLiuQ-",
        value: toInr(amount),
        currency: "INR",
        transaction_id: orderId,
      });
      gtagFn("event", "purchase", {
        transaction_id: orderId,
        value: toInr(amount),
        currency: "INR",
        items: [{ item_name: parsed?.poojaName || "Personalized Puja", item_category: "Puja" }],
      });
    }
    const fbqFn = (window as any).fbq;
    if (typeof fbqFn === "function") {
      fbqFn("track", "Purchase", {
        value: toInr(amount),
        currency: "INR",
        content_ids: [orderId],
        content_name: parsed?.poojaName || "Personalized Puja",
        content_category: "Puja",
        content_type: "product",
      }, { eventID: `personalized_pooja_purchase_${orderId}` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      router.replace("/profile?tab=personalized");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, router]);

  const fmtDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
    } catch { return iso; }
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg,#fffbf5 0%,#fff 60%)" }}>
      <Navbar activeIndex="mandir" />

      <div className="pt-20 px-4 pb-14 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 16 }}
          className="flex flex-col items-center text-center"
        >
          {/* Icon */}
          <div className="relative mt-6 mb-4">
            <span className="text-7xl" style={{ filter: "drop-shadow(0 4px 12px rgba(249,115,22,0.25))" }}>🛕</span>
            <span className="absolute -bottom-1 -right-2 text-3xl">✅</span>
          </div>

          <h1 className="font-extrabold text-2xl md:text-3xl text-gray-900 mt-4 mb-1">
            Puja Booked Successfully!
          </h1>
          <p className="text-amber-700 font-medium text-base mb-6" style={{ fontFamily: "serif" }}>
            ॐ नमः शिवाय • आपकी पूजा सुनिश्चित हो गई है 🙏
          </p>

          {/* Booking details card */}
          <div className="w-full bg-white rounded-3xl shadow-[0_4px_24px_-4px_rgba(249,115,22,0.15)] border border-orange-100 p-5 mb-5 text-left">
            <div className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-3 pb-2 border-b border-orange-100">
              📋 Booking Summary
            </div>
            <div className="space-y-3">
              {state.poojaName && <Row label="Puja" value={state.poojaName} />}
              {state.mandirName && <Row label="Mandir" value={state.mandirName} />}
              {state.devoteeName && <Row label="Devotee" value={state.devoteeName} />}
              {state.mobile && <Row label="Mobile" value={`+91 ${state.mobile}`} />}
              {state.poojaDate && <Row label="Scheduled Date" value={fmtDate(state.poojaDate)} />}
              {state.price !== undefined && (
                <Row
                  label="Amount Paid"
                  value={paidMoney({ amount: state.price, currency: state.currency, chargedAmount: state.chargedAmount })}
                  valueClass="font-bold text-orange-600"
                />
              )}
              {state.orderId && (
                <Row label="Order ID" value={state.orderId} valueClass="font-mono text-xs text-gray-500" />
              )}
              {state.paymentId && (
                <Row label="Payment ID" value={state.paymentId} valueClass="font-mono text-xs text-gray-500" />
              )}
            </div>
          </div>

          {/* Info box */}
          <div className="w-full rounded-2xl px-4 py-3 mb-5 text-sm text-left" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <p className="text-green-800 font-semibold mb-1">✅ What happens next?</p>
            <ul className="text-green-700 space-y-1 text-sm list-none">
              <li>📧 Confirmation email sent to your registered email</li>
              <li>📞 Our team will contact you within 24 hours</li>
              <li>🙏 Puja will be performed as per your selected date</li>
              <li>📸 Video/photo proof will be shared after completion</li>
            </ul>
          </div>

          {/* Auto-redirect notice */}
          <div className="w-full rounded-2xl px-4 py-3 mb-6 text-center text-sm" style={{ background: "#fff3e0" }}>
            <p className="text-orange-700 font-medium">
              Redirecting to your bookings in{" "}
              <span className="font-extrabold text-orange-600">{countdown}s</span>…
            </p>
          </div>

          {/* CTAs */}
          <Link
            href="/profile?tab=personalized"
            className="w-full py-3.5 rounded-2xl font-bold text-white text-center block mb-3"
            style={{ background: "linear-gradient(135deg,#f97316,#d97706)" }}
          >
            View My Puja Bookings →
          </Link>
          <Link
            href="/"
            className="w-full py-3 rounded-2xl font-semibold text-orange-600 border border-orange-200 bg-white hover:bg-orange-50 transition text-center block"
          >
            Back to Home
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

const Row = ({
  label, value, valueClass = "font-semibold text-gray-800",
}: { label: string; value: string; valueClass?: string }) => (
  <div className="flex justify-between items-start gap-3 text-sm">
    <span className="text-gray-400 shrink-0">{label}</span>
    <span className={`text-right ${valueClass}`}>{value}</span>
  </div>
);

export default PersonalizedPujaSuccess;
