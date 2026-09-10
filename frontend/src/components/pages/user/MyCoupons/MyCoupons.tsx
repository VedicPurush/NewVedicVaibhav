"use client";

import React, { useState } from "react";
import { useMoney } from "@/lib/currency";
import { useVedicPromosQuery } from "@/hooks/queries/usePromoQueries";
import type { PromoCode } from "@/lib/api/promo.api";

const APP_LINKS = {
  ios: "https://apps.apple.com/in/app/vedicvaibhav/id6765667844",
  android: "https://play.google.com/store/apps/details?id=com.rahulrajput025.client",
};

const isInsideApp = (): boolean =>
  typeof window !== "undefined" && !!(window as any).ReactNativeWebView;

const getDevicePlatform = (): "ios" | "android" | "other" => {
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
};

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const CouponCard: React.FC<{ promo: PromoCode }> = ({ promo }) => {
  /** Prices display in the devotee's own currency; the India list price is
   *  the input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const [copied, setCopied] = useState(false);
  const inApp = isInsideApp();
  const isAppOnly = promo.isAppOnly && !inApp;

  const handleCopy = () => {
    navigator.clipboard.writeText(promo.promoName).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleGetApp = () => {
    const platform = getDevicePlatform();
    const link = platform === "ios" ? APP_LINKS.ios : APP_LINKS.android;
    window.open(link, "_blank", "noopener noreferrer");
  };

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden transition-all ${
        isAppOnly
          ? "border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50"
          : "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50"
      }`}
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
    >
      {/* Left scissor edge */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-orange-400 to-amber-400 rounded-l-2xl" />

      {/* App Only ribbon */}
      {promo.isAppOnly && (
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 bg-orange-100 border border-orange-300 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
            📱 App Only
          </span>
        </div>
      )}

      <div className="pl-5 pr-4 py-4">
        {/* Promo code + discount */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-0.5">
              Coupon Code
            </p>
            <p
              className="text-lg font-extrabold tracking-wider"
              style={{
                fontFamily: "monospace",
                color: isAppOnly ? "#c2410c" : "#065f46",
              }}
            >
              {promo.promoName}
            </p>
          </div>
          <div className="text-right shrink-0 mt-1">
            <p className="text-2xl font-extrabold text-orange-600 leading-none">
              {money(promo.discountAmount)}
            </p>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">OFF</p>
          </div>
        </div>

        {/* Description */}
        {promo.description && (
          <p className="text-xs text-gray-500 mb-2 leading-relaxed">
            {promo.description}
          </p>
        )}

        {/* Meta info chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {promo.startRange > 0 && (
            <span className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">
              Min. order {money(promo.startRange)}
            </span>
          )}
          {promo.expiryDate && (
            <span className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">
              Valid till {formatDate(promo.expiryDate)}
            </span>
          )}
        </div>

        {/* Dashed divider */}
        <div className="border-t border-dashed border-gray-200 mb-3" />

        {/* Action */}
        {isAppOnly ? (
          <button
            onClick={handleGetApp}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold shadow-sm hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            📲 Get the App to Use This
          </button>
        ) : (
          <button
            onClick={handleCopy}
            className={`w-full py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 ${
              copied
                ? "bg-green-500 text-white"
                : "bg-white border border-green-300 text-green-700 hover:bg-green-50"
            }`}
          >
            {copied ? "✅ Copied!" : "📋 Copy Code"}
          </button>
        )}
      </div>
    </div>
  );
};

const MyCoupons: React.FC = () => {
  const { data: promos = [], isLoading, isError } = useVedicPromosQuery();
  const [filter, setFilter] = useState<"all" | "website" | "app">("all");

  // Never show Influencer-Promo publicly — these are shared privately
  const publicPromos = promos.filter((p) => p.promoType !== "Influencer-Promo");

  const filtered = publicPromos.filter((p) => {
    if (filter === "website") return !p.isAppOnly;
    if (filter === "app") return p.isAppOnly;
    return true;
  });

  return (
    <div className="px-2 py-4 sm:px-4">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          🎁 My Coupons
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          All available offers and discount codes for you
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(["all", "website", "app"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              filter === f
                ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:border-orange-300"
            }`}
          >
            {f === "all" ? "All Coupons" : f === "website" ? "🌐 Website" : "📱 App Only"}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">😕</p>
          <p className="text-sm font-medium">
            Could not load coupons. Please try again later.
          </p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🏷️</p>
          <p className="text-sm font-medium">No coupons available right now.</p>
          <p className="text-xs mt-1 text-gray-300">
            Check back soon for new offers!
          </p>
        </div>
      )}

      {/* Coupon grid */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((promo) => (
            <CouponCard key={promo._id} promo={promo} />
          ))}
        </div>
      )}

      {/* App CTA banner */}
      {!isLoading && publicPromos.some((p) => p.isAppOnly) && !isInsideApp() && (
        <div className="mt-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-sm">Unlock App-Only Offers</p>
            <p className="text-xs text-orange-100 mt-0.5">
              Download our app and access exclusive coupons
            </p>
          </div>
          <button
            onClick={() => {
              const platform = getDevicePlatform();
              const link = platform === "ios" ? APP_LINKS.ios : APP_LINKS.android;
              window.open(link, "_blank", "noopener noreferrer");
            }}
            className="shrink-0 bg-white text-orange-600 text-xs font-bold px-3 py-2 rounded-xl hover:bg-orange-50 active:scale-95 transition-all"
          >
            Get App
          </button>
        </div>
      )}
    </div>
  );
};

export default MyCoupons;
