"use client";

import { useEffect, useState } from "react";
import { toInr, paidMoney } from "@/lib/currency";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import "./GauSeva.css";
import { readNavState } from "@/lib/nav-state";
import { shouldTrackPurchase } from "@/lib/purchase-tracking";

interface SuccessState {
  bookingId?: string;
  pkg?: { name: string; nameHindi?: string };
  devoteeName?: string;
  whatsapp?: string;
  amount?: number;
  /** Presentment fields from the create-order response. See paidMoney(). */
  currency?: string;
  chargedAmount?: number;
  /** The calling code the WhatsApp number was entered under. */
  dialCode?: string;
}

const REDIRECT_SECONDS = 6;

const GauSevaPaymentSuccess = () => {
  const router = useRouter();
  // react-router carried this via location.state; in Next it comes from sessionStorage.
  const [state, setState] = useState<SuccessState>({});
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    const navState = readNavState<SuccessState>("gau-seva-success") || {};
    setState(navState);

    const amount = navState?.amount || Number(localStorage.getItem("lastGauSevaAmount")) || 0;
    const orderId = navState?.bookingId || localStorage.getItem("lastGauSevaOrderId") || "";
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
        items: [{ item_name: "Gau Seva", item_category: "Gau Seva" }],
      });
    }
    if (typeof w.fbq === "function") {
      w.fbq("track", "Purchase", {
        value: toInr(amount),
        currency: "INR",
        content_ids: [orderId],
        content_name: "Gau Seva",
        content_category: "Gau Seva",
        content_type: "product",
      }, { eventID: `gauseva_purchase_${orderId}` });
    }
  }, []);

  // Auto-redirect countdown
  useEffect(() => {
    if (countdown <= 0) {
      router.replace("/profile?tab=gau-seva");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, router]);

  return (
    <div className="gs-page min-h-screen" style={{ background: "linear-gradient(160deg, #fff8f3 0%, #fff 60%)" }}>
      <Navbar activeIndex="services" />

      <div className="pt-20 px-4 pb-14 max-w-md mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 16 }}
          className="flex flex-col items-center"
        >
          {/* Icons */}
          <div className="relative mb-4 mt-4">
            <span className="text-7xl gs-float inline-block">🐄</span>
            <span
              className="absolute -bottom-2 -right-3 text-3xl"
              style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))" }}
            >
              ✅
            </span>
          </div>

          <h1 className="font-extrabold text-2xl md:text-3xl text-gray-900 mt-4 mb-1">
            Gau Seva Confirmed!
          </h1>
          <p className="gs-devanagari text-base text-amber-700 mb-6 font-medium">
            गौ माता की कृपा आप पर सदा बनी रहे 🙏
          </p>

          {/* Booking details card */}
          <div className="w-full bg-white rounded-3xl shadow-[0_4px_24px_-4px_rgba(249,115,22,0.15)] border border-orange-100 p-5 mb-5 text-left">
            <div className="space-y-3">
              {state.pkg?.name && (
                <Row label="Package" value={state.pkg.name} />
              )}
              {state.devoteeName && (
                <Row label="Devotee Name" value={state.devoteeName} />
              )}
              {state.whatsapp && (
                <Row label="WhatsApp" value={`+${state.dialCode || "91"} ${state.whatsapp}`} />
              )}
              {state.amount !== undefined && (
                <Row
                  label="Amount Paid"
                  // What the card was ACTUALLY billed, from this booking's own
                  // currency/chargedAmount — never re-priced by today's picker.
                  value={paidMoney({
                    amount: state.amount,
                    currency: state.currency,
                    chargedAmount: state.chargedAmount,
                  })}
                  valueClass="font-bold text-orange-600"
                />
              )}
              {state.bookingId && (
                <Row
                  label="Booking ID"
                  value={state.bookingId}
                  valueClass="font-mono text-xs text-gray-500"
                />
              )}
            </div>
          </div>

          {/* Proof notice */}
          <div className="w-full rounded-2xl px-4 py-3 mb-5 text-sm text-left" style={{ background: "#e8f5e9" }}>
            <p className="text-green-800 font-semibold">
              📸 Photo &amp; certificate will be sent to your WhatsApp after the feeding this Wednesday.
            </p>
          </div>

          {/* Auto-redirect notice */}
          <div className="w-full rounded-2xl px-4 py-3 mb-6 text-sm text-center" style={{ background: "#fff3e0" }}>
            <p className="text-orange-700 font-medium">
              Redirecting to your bookings in{" "}
              <span className="font-extrabold text-orange-600">{countdown}s</span>…
            </p>
          </div>

          {/* CTAs */}
          <button
            onClick={() => router.replace("/profile?tab=gau-seva")}
            className="w-full py-3.5 rounded-2xl font-bold text-white gs-gradient-saffron shadow-md mb-3"
          >
            View My Gau Seva Bookings →
          </button>

          <button
            onClick={() => router.push("/services/gau-seva")}
            className="w-full py-3 rounded-2xl font-semibold text-orange-600 border border-orange-200 bg-white hover:bg-orange-50 transition"
          >
            Book Another Seva
          </button>
        </motion.div>
      </div>
    </div>
  );
};

const Row = ({
  label,
  value,
  valueClass = "font-semibold text-gray-800",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) => (
  <div className="flex justify-between items-start gap-3 text-sm">
    <span className="text-gray-400 shrink-0">{label}</span>
    <span className={`text-right ${valueClass}`}>{value}</span>
  </div>
);

export default GauSevaPaymentSuccess;
