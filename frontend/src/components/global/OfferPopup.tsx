"use client";

import React, { useEffect, useState } from "react";
import { useMoney } from "@/lib/currency";

const SESSION_KEY = "vv_offer_popup_shown";

// Toggle the offer popup on/off. Currently disabled.
const OFFER_POPUP_ENABLED = false;

const getDevicePlatform = (): "ios" | "android" | "other" => {
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
};

const APP_LINKS = {
  ios: "https://apps.apple.com/in/app/vedicvaibhav/id6765667844",
  android: "https://play.google.com/store/apps/details?id=com.rahulrajput025.client",
};

const OfferPopup: React.FC = () => {
  /** Subscribes this component to country/rate changes for the ₹50 offer below. */
  const { money } = useMoney();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Popup is turned off for now via OFFER_POPUP_ENABLED
    if (!OFFER_POPUP_ENABLED) return;

    // Don't show if already shown this session
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // Don't show if running inside the app (ReactNativeWebView)
    if ((window as any).ReactNativeWebView) return;

    const timer = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem(SESSION_KEY, "1");
    }, 4000); // 4s — before the 30s login popup

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const platform = getDevicePlatform();
  const appLink = platform === "ios" ? APP_LINKS.ios : APP_LINKS.android;

  const handleDownload = () => {
    window.open(appLink, "_blank", "noopener noreferrer");
    setVisible(false);
  };

  const handleDismiss = () => setVisible(false);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-[2px]"
        onClick={handleDismiss}
      />

      {/* Popup card */}
      <div
        className="fixed z-[1000] bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-sm w-full animate-offer-in"
        style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}
      >
        <div
          className="relative rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: "linear-gradient(145deg, #fff7ed 0%, #ffedd5 40%, #fed7aa 100%)",
            boxShadow: "0 -8px 40px rgba(234,88,12,0.18), 0 0 0 1px rgba(251,146,60,0.2)",
          }}
        >
          {/* Top decorative strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center text-orange-600 text-sm font-bold transition-colors"
            aria-label="Close"
          >
            ✕
          </button>

          <div className="px-6 pt-5 pb-6">
            {/* Icon + badge */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center">
                  <img
                    src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/vvfinallogo.png"
                    alt="Vedic Vaibhav"
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  NEW
                </span>
              </div>
              <div>
                <p className="text-xs text-orange-600 font-semibold uppercase tracking-widest">
                  Exclusive App Offer
                </p>
                <p className="text-base font-bold text-orange-900 leading-tight">
                  Vedic Vaibhav
                </p>
              </div>
            </div>

            {/* Offer highlight */}
            <div className="bg-white/70 rounded-2xl px-4 py-3.5 mb-4 border border-orange-200/60 shadow-sm">
              <p className="text-2xl font-extrabold text-orange-600 tracking-tight">
                {money(50)} <span className="text-orange-800 text-lg font-bold">OFF</span>
              </p>
              <p className="text-sm font-semibold text-orange-900 mt-0.5">
                on your first booking through our app.
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                <p className="text-xs text-gray-500">
                  Valid for new users · Limited time offer
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="flex items-center justify-around mb-5 px-2">
              {[
                { icon: "📲", label: "Download App" },
                { icon: "→", label: "", arrow: true },
                { icon: "🛕", label: "Book a Seva" },
                { icon: "→", label: "", arrow: true },
                { icon: "🎁", label: `Get ${money(50)} Off` },
              ].map((step, i) =>
                step.arrow ? (
                  <span key={i} className="text-orange-300 text-lg font-light">›</span>
                ) : (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <span className="text-xl">{step.icon}</span>
                    <span className="text-[9px] text-orange-700 font-semibold text-center leading-tight max-w-[52px]">
                      {step.label}
                    </span>
                  </div>
                ),
              )}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleDownload}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm shadow-lg shadow-orange-200 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>
                  {platform === "ios" ? "🍎" : platform === "android" ? "🤖" : "📱"}
                </span>
                Download App &amp; Claim {money(50)} Off
              </button>
              <button
                onClick={handleDismiss}
                className="w-full py-2.5 text-sm text-orange-700 font-medium hover:underline transition-all"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes offer-in {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @media (min-width: 640px) {
          @keyframes offer-in {
            from { transform: translate(-50%, -40%); opacity: 0; }
            to   { transform: translate(-50%, -50%); opacity: 1; }
          }
        }
        .animate-offer-in {
          animation: offer-in 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) forwards;
        }
      `}</style>
    </>
  );
};

export default OfferPopup;
