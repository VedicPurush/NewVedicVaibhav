"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMoney } from "@/lib/currency";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import "./YatraLandingPage.css";
import Layout from "@/components/layout/Layout";
import type {
  ActiveSlotData,
  BenefitData,
  DhamData,
  TimelineStep,
  YatraPackage,
} from "./api/types";
import { useActive4DhamYatraQuery } from "@/hooks/queries/useYatraQueries";
import { captureVvUtm } from "@/lib/utm";
import { saveNavState } from "@/lib/nav-state";
import YatraFAQ from "./components/YatraFAQ";
import YatraReviews from "./components/YatraReviews";
 
const STATIC_DHAMS: DhamData[] = [
  {
    id: "d1",
    title: "Kedarnath Dham, Uttarakhand",
    img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/4-dham-yatra/mandir-1.png.webp",
  },
  {
    id: "d2",
    title: "Badrinath Dham, Uttarakhand",
    img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/4-dham-yatra/mandir-2.png.webp",
  },
  {
    id: "d3",
    title: "Gangotri, Uttarakhand",
    img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/4-dham-yatra/mandir-3.png.webp",
  },
  {
    id: "d4",
    title: "Yamunotri, Uttarakhand",
    img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/4-dham-yatra/mandir-4.png.webp",
  },
];
 
const STATIC_TIMELINE: TimelineStep[] = [
  {
    id: "t1",
    title: "Enter Name & Gotra",
    description: "Provide your details for personalized puja",
    icon: "👤",
  },
  {
    id: "t2",
    title: "Pandit Performs Puja",
    description: "Expert pandits conduct rituals on your behalf",
    icon: "🛕",
  },
  {
    id: "t3",
    title: "Get Video Darshan",
    description: "Receive HD video of your puja ceremony",
    icon: "📹",
  },
  {
    id: "t4",
    title: "Receive Prasad",
    description: "Sacred prasad delivered to your home",
    icon: "🎁",
  },
];
 
const STATIC_BENEFITS: BenefitData[] = [
  {
    id: "b1",
    title: "Darshan Videos",
    description: "HD quality videos of temple rituals",
    icon: "📹",
  },
  {
    id: "b2",
    title: "Abhishek Puja",
    description: "Sacred abhishek performed",
    icon: "💧",
  },
  {
    id: "b3",
    title: "Temple Rituals",
    description: "Complete puja ceremonies",
    icon: "🌸",
  },
  {
    id: "b4",
    title: "Prasad Delivery",
    description: "Blessed prasad at your doorstep",
    icon: "📦",
  },
  {
    id: "b5",
    title: "WhatsApp Updates",
    description: "Real-time puja notifications",
    icon: "💬",
  },
  {
    id: "b6",
    title: "Divine Blessings",
    description: "Spiritual peace & prosperity",
    icon: "✨",
  },
];
 
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};
 
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};
 
const pulseGlow = {
  animate: {
    boxShadow: [
      "0px 0px 0px rgba(255,193,7,0)",
      "0px 0px 20px rgba(255,193,7,0.5)",
      "0px 0px 0px rgba(255,193,7,0)",
    ],
    transition: { duration: 2, repeat: Infinity },
  },
};
 
const themeByIndex = ["gold", "blue", "red", "gold"] as const;
 
const formatDate = (dateValue?: string) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return "";
  const d = date.getDate();
  const getOrdinal = (n: number) => {
    if (n > 3 && n < 21) return n + "th";
    switch (n % 10) {
      case 1:  return n + "st";
      case 2:  return n + "nd";
      case 3:  return n + "rd";
      default: return n + "th";
    }
  };
  return `${getOrdinal(d)} ${date.toLocaleDateString("en-GB", { month: "long", year: "numeric"})}`;
};
 
// ─── Auto-advance slot dates to next upcoming month when expired ─────────────
const shiftSlotToNextActiveMonth = (slot: ActiveSlotData): ActiveSlotData => {
  const end = new Date(slot.endDate);
  end.setHours(23, 59, 59, 999);
  const now = new Date();
  if (end >= now) return slot; // still active, no change

  // Count how many full months to add so endDate lands in the future
  const start = new Date(slot.startDate);
  let months = 0;
  let newEnd = new Date(end);
  while (newEnd < now) {
    months++;
    newEnd = new Date(end);
    newEnd.setMonth(newEnd.getMonth() + months);
  }

  const newStart = new Date(start);
  newStart.setMonth(newStart.getMonth() + months);

  // Replace old month name in slotName with new one, or append it
  const oldMonth = end.toLocaleDateString("en-IN", { month: "long" });
  const newMonth = newEnd.toLocaleDateString("en-IN", { month: "long" });
  const newYear = newEnd.getFullYear().toString();
  let newSlotName = slot.slotName
    .replace(new RegExp(oldMonth, "gi"), newMonth)
    .replace(/\d{4}/, newYear);
  if (newSlotName === slot.slotName) {
    newSlotName = `${slot.slotName} — ${newMonth} ${newYear}`;
  }

  return {
    ...slot,
    startDate: newStart.toISOString(),
    endDate: newEnd.toISOString(),
    slotName: newSlotName,
  };
};

// ─── Countdown Timer Component ───────────────────────────────────────────────
 
const CountdownBoxes = ({ endDate }: { endDate: string }) => {
  const [timeLeft, setTimeLeft] = useState<{ d: string; h: string; m: string; s: string } | null>(null);

  useEffect(() => {
    // Force end-of-day so the timer runs until 23:59:59 on the booking deadline
    const deadline = new Date(endDate);
    deadline.setHours(23, 59, 59, 999);

    const updateTime = () => {
      const diff = deadline.getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24)).toString().padStart(2, '0');
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
      const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
      const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
      setTimeLeft({ d, h, m, s });
    };
    updateTime();
    const t = setInterval(updateTime, 1000);
    return () => clearInterval(t);
  }, [endDate]);

  if (!timeLeft) return null;
  
  const Box = ({ val, lbl }: { val: string; lbl: string }) => (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "rgba(255, 193, 7, 0.1)", border: "1px solid rgba(255, 193, 7, 0.3)",
      borderRadius: "6px", width: "40px", height: "42px"
    }}>
      <span style={{ fontSize: "14px", fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>{val}</span>
      <span style={{ fontSize: "9px", fontWeight: 800, color: "rgba(255, 193, 7, 0.8)" }}>{lbl}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: "6px" }}>
      <Box val={timeLeft.d} lbl="DAY" />
      <Box val={timeLeft.h} lbl="HOUR" />
      <Box val={timeLeft.m} lbl="MIN" />
      <Box val={timeLeft.s} lbl="SEC" />
    </div>
  );
};

// ─── Sticky Bottom Bar ───────────────────────────────────────────────────────
 
interface StickyYatraBarProps {
  packages: YatraPackage[];
  activeIndex: number;
  visible: boolean;
  onBook: (pkg: YatraPackage) => void;
  onDotClick: (index: number) => void;
  endDate?: string;
}
 
const StickyYatraBar: React.FC<StickyYatraBarProps> = ({
  packages,
  activeIndex,
  visible,
  onBook,
  // onDotClick,
  endDate,
}) => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const activePkg = packages[activeIndex];
  if (!activePkg) return null;
 
  const hasDiscount =
    activePkg.originalPrice && activePkg.originalPrice > activePkg.price;
 
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="sticky-bar"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="sm:hidden"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 900,
            background: "linear-gradient(135deg, #0d0f1a 0%, #12152a 60%, #1a1000 100%)",
            borderTop: "1px solid rgba(255,193,7,0.35)",
            boxShadow: "0 -4px 32px rgba(255,193,7,0.12), 0 -1px 0 rgba(255,193,7,0.2)",
          }}
        >
          {endDate && (
            <div style={{ 
               display: "flex", justifyContent: "space-between", alignItems: "center",
               padding: "10px 16px", borderBottom: "1px solid rgba(255, 193, 7, 0.15)",
               background: "rgba(255, 193, 7, 0.05)"
            }}>
               <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#fff", opacity: 0.9 }}>Seva Booking Will End on:</span>
                  <span style={{ fontSize: "14px", fontWeight: 800, color: "#fff", marginTop: "2px" }}>{formatDate(endDate).replace(/\b0+/g, '')}</span>
               </div>
               <CountdownBoxes endDate={endDate} />
            </div>
          )}

          <div style={{ padding: "10px 16px 12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                maxWidth: 640,
                margin: "0 auto",
              }}
            >
              {/* Left: Package info & Price */}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePkg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    translate="no"
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span key={`yatra-price-${activePkg.id}`} style={{ fontSize: "24px", fontWeight: 900, color: "#FFC107", lineHeight: 1.1 }}>
                        {money(activePkg.price)}
                      </span>
                      {hasDiscount && (
                        <span key={`yatra-orig-${activePkg.id}`} style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", textDecoration: "line-through" }}>
                          {money(activePkg.originalPrice!)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <span key={`yatra-title-${activePkg.id}`}>{activePkg.title}</span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
  
              {/* Right: CTA */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onBook(activePkg)}
                style={{
                  flexShrink: 0,
                  background: "linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)",
                  color: "#000",
                  fontWeight: 900,
                  fontSize: "14px",
                  border: "none",
                  borderRadius: "50px",
                  padding: "12px 20px",
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                  boxShadow: "0 0 20px rgba(255,193,7,0.45)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                 Book Yatra Now
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
 
// ─── YatraHero ───────────────────────────────────────────────────────────────
 
const YatraHero = React.memo(
  ({ dhams, onScrollToPackages }: { dhams: DhamData[]; onScrollToPackages: () => void }) => (
    <div className="yatra-hero relative">
      {/* Native img tag for lazy loading background */}
      <img
        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/4-dham-yatra/bfof-4dham.png.webp"
        alt="4 Dham Yatra Background"
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="yatra-hero-content"
      >
        <motion.div
          variants={fadeInUp}
          className="om-logo text-center w-full flex justify-center "
        >
          <span className="text-orange-500 text-4xl  font-serif">ॐ</span>
        </motion.div>
 
        <motion.div variants={fadeInUp} className="pill-badge">
          Online 4 Dham Yatra
        </motion.div>
 
        <motion.h1 variants={fadeInUp} className="hero-title">
          ऑनलाइन 4 धाम वर्चुअल यात्रा
        </motion.h1>
 
        <motion.div variants={fadeInUp} className="hero-subtitle">
          <span className="line-dec"></span>
          <span
            style={{ animation: "yatra_pop 2s ease-in-out infinite" }}
            className="inline-block rounded-full bg-gradient-to-r from-yellow-800/50 to-yellow-700/50 border border-[#FFC107]/50 px-4 py-1 text-[10px] font-extrabold tracking-widest text-[#FFC107] uppercase"
          >
            Featured on 200+ News Channels
          </span>
          <span className="line-dec"></span>
        </motion.div>
 
        {/* News Logos Marquee */}
        <motion.div variants={fadeInUp} className="w-full overflow-hidden mt-1 mb-4 px-2">
          <div
            className="flex w-max gap-3 will-change-transform transform-gpu"
            style={{ animation: "vv_marquee_r 22s linear infinite" }}
          >
            {[
              "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-1-optimized.webp",
              "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-2-optimized.webp",
              "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-3-optimized.webp",
              "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-4-optimized.webp",
              "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-5-optimized.webp",
              "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-6-optimized.webp",
              "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-7-optimized.webp",
              "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-1-optimized.webp",
              "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-2-optimized.webp",
              "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-3-optimized.webp",
              "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-4-optimized.webp",
              "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-5-optimized.webp",
              "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-6-optimized.webp",
              "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-7-optimized.webp",
            ].map((imgUrl, idx) => (
              <div
                key={idx}
                className="flex h-10 w-[90px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#FFC107]/40 bg-white/95 p-1 shadow-md"
              >
                <img
                  src={imgUrl}
                  alt={`Media ${idx}`}
                  className="h-full w-full object-contain will-change-transform transform-gpu"
                  style={{ transform: "translate3d(0,0,0)" }}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </motion.div>
 
        <motion.div variants={staggerContainer} className="dham-images-row">
          {dhams.map((dham) => (
            <motion.div
              key={dham.id}
              variants={fadeInUp}
              whileHover={{ scale: 1.05 }}
              className="dham-img-box"
            >
              <img src={dham.img} alt={dham.title} loading="lazy" />
            </motion.div>
          ))}
        </motion.div>
 
        <motion.button
          variants={fadeInUp}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="start-yatra-btn mb-6"
          onClick={onScrollToPackages}
        >
          ॐ अपनी यात्रा अभी शुरू करें
        </motion.button>
      </motion.div>
    </div>
  )
);
 
// ─── YatraSlotInfo ────────────────────────────────────────────────────────────
 
const YatraSlotInfo = React.memo(
  ({ activeSlot }: { activeSlot: ActiveSlotData | null }) => (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      variants={fadeInUp}
      className="slot-info text-center relative"
    >
      <motion.img
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/4-dham-yatra/trishul.png.webp"
        alt="Trishul"
        className="absolute -left-2 md:left-4 -top-8 w-24 md:w-36 lg:w-48 object-contain pointer-events-none z-0"
      />
 
      <motion.img
        initial={{ opacity: 0, x: 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/4-dham-yatra/sudarshanchaktra.png.webp"
        alt="Sudarshan Chakra"
        className="absolute -right-2 md:right-4 -top-8 w-28 md:w-40 lg:w-56 object-contain pointer-events-none z-0"
      />
 
      <h2 className="slot-title relative z-10">
        {activeSlot?.slotName || "NO ACTIVE SLOT"}
      </h2>
 
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="filling-fast relative z-10"
      >
        ⚡ Filling fast
      </motion.div>
 
      <div className="w-full flex justify-center relative z-10">
        <motion.div variants={pulseGlow} animate="animate" className="slots-booked-pill">
          <span className="number">487</span>
          <span className="total">/{activeSlot?.totalSlots ?? 1000}</span>
          Slots Booked
        </motion.div>
      </div>
 
      <div className="hurry-text relative z-10">
        {activeSlot
          ? `⌛ Hurry! Limited Slots Left | Last Date - ${formatDate(activeSlot.endDate)}`
          : "No active slot right now"}
      </div>
    </motion.div>
  )
);
 
// ─── YatraPackageCard ─────────────────────────────────────────────────────────
 
const YatraPackageCard = React.memo(
  ({
    pkg,
    onBook,
    observerRef,
  }: {
    pkg: YatraPackage;
    onBook: (pkg: YatraPackage) => void;
    observerRef?: (el: HTMLDivElement | null) => void;
  }) => {
    /** This component is React.memo'd, so it does NOT repaint from the root
     *  re-render the way the rest of the tree does. Subscribing here is what
     *  makes its price follow a country switch. */
    const { money } = useMoney();
    const hasDiscount = pkg.originalPrice && pkg.originalPrice > pkg.price;
    const savings = hasDiscount ? pkg.originalPrice! - pkg.price : 0;
 
    return (
      <motion.div
        ref={observerRef}
        data-pkg-id={pkg.id}
        variants={fadeInUp}
        whileHover={{ y: -5 }}
        className={`yatra-premium-card theme-${pkg.theme}`}
      >
        {pkg.isRecommended && (
          <div className="recommended-badge">Recommended Top Choice</div>
        )}
 
        <div className="card-top-gradient">
          <div className="flex justify-center mb-2">
            <span className="premium-pill">{pkg.title}</span>
          </div>
 
          <p className="card-desc">{pkg.description}</p>
 
          <div className="dotted-separator"></div>
 
          <div className="pkg-price-row mt-4">
            {/* One money() call — the currency symbol is not always "₹". */}
            <span className="price-val text-white">{money(pkg.price)}</span>
            {pkg.originalPrice ? (
              <span className="original-price text-gray-400 line-through ml-2">
                {money(pkg.originalPrice)}
              </span>
            ) : null}
            <span className="gst-text text-gray-300 ml-1">(inclusive of GST)</span>
          </div>
          {hasDiscount && (
            <div className="text-green-400 text-sm font-semibold text-center mt-1">
              You save {money(savings)}
            </div>
          )}
        </div>
 
        <div className="wavy-divider">
          <svg
            viewBox="0 0 1440 80"
            className="w-full h-4 text-[#FFC107] fill-none stroke-current stroke-[3px]"
          >
            <path d="M0,40 Q180,-10 360,40 T720,40 T1080,40 T1440,40" />
          </svg>
        </div>
 
        <div className="p-4 pt-2 flex flex-col flex-1 pb-4">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            className="premium-book-btn mb-6"
            onClick={() => onBook(pkg)}
          >
            Begin My yatra →
          </motion.button>
 
          <div className="main-inclusions gap-2 flex flex-col">
            {pkg.mainInclusions.map((inc, i) => (
              <div key={i} className="inclusion-pill">
                <span className="text-[#FFC107]">{inc.dhamName}:</span>
                <span className="text-white">{inc.details || "-"}</span>
              </div>
            ))}
          </div>
 
          {pkg.freeInclusions.length > 0 && (
            <div className="mt-3 flex-1 flex flex-col rounded-2xl overflow-hidden border border-[#FFC107]/40">
              <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#FFF8E1] to-[#FFF3CD]">
                <div>
                  <span className="text-[11px] font-extrabold tracking-wide text-[#8B5E00] uppercase">
                    Free Items Included
                  </span>
                  <p className="text-[9px] text-[#B07D00] font-medium mt-0.5">
                    Complimentary with this package
                  </p>
                </div>
                <motion.div
                  initial={{ rotate: -10 }}
                  animate={{ rotate: [10, -10, 10] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-[52px] flex-shrink-0"
                >
                  <img
                    src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/4-dham-yatra/free.png.webp"
                    alt="Free"
                    className="w-full object-contain"
                    loading="lazy"
                  />
                </motion.div>
              </div>
 
              <div className="flex-1 bg-[#FFFDE7] px-3 py-2.5 flex flex-col gap-1.5">
                {pkg.freeInclusions.map((inc, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-[9px] font-bold">✓</span>
                    <div className="text-[11px] leading-snug">
                      <span className="font-bold text-[#7B5200]">{inc.dhamName}: </span>
                      <span className="text-[#5C3D00]">{inc.details || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }
);
 
// ─── YatraContent ─────────────────────────────────────────────────────────────
 
const YatraContent: React.FC = () => {
  const router = useRouter();
  const packagesRef = useRef<HTMLDivElement>(null);
 
  // Always render sticky bar as visible per requirements
  const [activePackageIndex, setActivePackageIndex] = useState(0);
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
 
  const { data: yatraData, isLoading: loading, isError, error: yatraError } = useActive4DhamYatraQuery();
 
  const poojaId = yatraData?.pooja.poojaId ?? "";
  const poojaName = yatraData?.pooja.poojaName ?? "";
  const rawSlot = yatraData?.activeSlot ?? null;
  const activeSlot = useMemo(
    () => (rawSlot ? shiftSlotToNextActiveMonth(rawSlot) : null),
    [rawSlot]
  );
  const packages: YatraPackage[] = useMemo(
    () =>
      yatraData?.packages.map((pkg, index) => ({
        ...pkg,
        theme: themeByIndex[index] || "gold",
        isRecommended: index === 1,
      })) ?? [],
    [yatraData]
  );
  const errorMessage = isError
    ? (yatraError as any)?.response?.data?.message || "Unable to load 4 Dham Yatra data."
    : "";
 
  const dhams = useMemo(() => STATIC_DHAMS, []);
  const timeline = useMemo(() => STATIC_TIMELINE, []);
  const benefits = useMemo(() => STATIC_BENEFITS, []);
 
  useEffect(() => {
    captureVvUtm();
  }, []);
 
  // ── Scroll listener: track which package card is closest to viewport center.
  //    Uses getBoundingClientRect on every scroll so it works even after
  //    Google Translate rewrites the DOM (which breaks IntersectionObserver). ──
  useEffect(() => {
    if (packages.length === 0) return;

    let lastIndex = -1;

    const onScroll = () => {
      const mid = window.innerHeight / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      cardRefsMap.current.forEach((el, pkgId) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cardMid = rect.top + rect.height / 2;
        const dist = Math.abs(cardMid - mid);
        if (dist < bestDist) {
          bestDist = dist;
          const idx = packages.findIndex((p) => p.id === pkgId);
          if (idx !== -1) bestIdx = idx;
        }
      });
      if (bestIdx !== lastIndex) {
        lastIndex = bestIdx;
        setActivePackageIndex(bestIdx);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, [packages]);

  const setCardRef = (pkgId: string) => (el: HTMLDivElement | null) => {
    if (el) cardRefsMap.current.set(pkgId, el);
    else cardRefsMap.current.delete(pkgId);
  };
 
  const handleBookPackage = (pkg: YatraPackage) => {
    if (!rawSlot || !poojaId) return;
    // pass rawSlot so backend gets the correct slot ID; activeSlot has shifted display dates
    saveNavState("4-dham-yatra-payment", { pkg, poojaId, poojaName, activeSlot: rawSlot });
    router.push("/4-dham-yatra/payment");
  };
 
  const scrollToPackages = () => {
    if (packagesRef.current) {
      const top = packagesRef.current.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };
 
  const scrollToPackageCard = (index: number) => {
    const pkg = packages[index];
    if (!pkg) return;
    const el = cardRefsMap.current.get(pkg.id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setActivePackageIndex(index);
  };
 
  const marqueeCss = `
@keyframes vv_marquee {
  0% { transform: translate3d(0,0,0); }
  100% { transform: translate3d(-50%,0,0); }
}
@keyframes vv_marquee_r {
  0% { transform: translate3d(-50%,0,0); }
  100% { transform: translate3d(0,0,0); }
}
.yatra-premium-card {
  display: flex;
  flex-direction: column;
}
@keyframes yatra_pop {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(255,193,7,0.2)); }
  50% { transform: scale(1.05); filter: drop-shadow(0 0 8px rgba(255,193,7,0.6)); }
}
`;
 
  return (
    <>
      {packages.length > 0 && (
        <StickyYatraBar
          packages={packages}
          activeIndex={activePackageIndex}
          visible={true} // Hardcoded to true to always show sticky array as requested
          onBook={handleBookPackage}
          onDotClick={scrollToPackageCard}
          endDate={activeSlot?.endDate}
        />
      )}
 
      <div className="yatra-wrapper">
        <style>{marqueeCss}</style>
        <YatraHero dhams={dhams} onScrollToPackages={scrollToPackages} />
 
        <div ref={packagesRef} className="yatra-booking-section relative mt-0 z-10">
          <div className="yatra-booking-header-bg pt-2">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="intro-text relative z-10"
            >
              अपने घर बैठे चारों पवित्र धाम — बद्रीनाथ, केदारनाथ, गंगोत्री <br />
              और यमुनोत्री — के दिव्य आशीर्वाद का अनुभव करें ✨
            </motion.p>
 
            <div className="divider-dots relative z-10">
              <span></span>
              <span className="small"></span>
              <span className="large"></span>
              <span className="small"></span>
              <span></span>
            </div>
 
            <YatraSlotInfo activeSlot={activeSlot} />
 
            <div className="divider-dots mt-2 relative z-10">
              <span></span>
              <span className="small"></span>
              <span className="large"></span>
              <span className="small"></span>
              <span></span>
            </div>
 
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="package-header text-center mt-1"
            >
              <h2 className="choose-pkg-title">Choose Your Package</h2>
              <p className="choose-pkg-sub">अपना पैकेज चुनें</p>
              <div className="avail-pkg-badge">
                {poojaName || "4 Dham Yatra"} | Total Available package: {packages.length}
              </div>
            </motion.div>
          </div>
 
          <div className="px-5">
            {loading ? (
              <div className="text-center mt-8 text-white">Loading packages...</div>
            ) : errorMessage ? (
              <div className="text-center mt-8 text-red-400">{errorMessage}</div>
            ) : (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                variants={staggerContainer}
                className="package-cards-container"
              >
                {packages.map((pkg) => (
                  <YatraPackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onBook={handleBookPackage}
                    observerRef={setCardRef(pkg.id)}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>
 
        <div className="how-it-works-section relative overflow-hidden">
          <div className="desktop-two-col mt-0 md:mt-12 pb-4 md:pb-10">
            <div className="dham-map-banner relative pb-2 md:pb-10 overflow-hidden">
              <img
                src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/4-dham-yatra/bg-2-4-dham-page.png.webp"
                alt="Dham Map Background"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover z-0"
                style={{ opacity: 0.8 }}
              />
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="text-center w-full z-10 relative mb-4 md:mb-8"
              >
                <h2 className="visit-all-title">
                  Visit All <span className="text-[#FFC107]">4 Dhams</span>
                </h2>
                <p className="visit-sub mb-0">
                  Swipe to explore each sacred destination
                </p>
              </motion.div>
 
              <div className="dham-path-container">
                {dhams.map((dham, index) => {
                  const isLeft = index % 2 === 0;
                  const mapPositions = [
                    { top: "0%", left: "12%" },
                    { top: "20%", right: "8%" },
                    { top: "40%", left: "12%" },
                    { top: "60%", right: "8%" },
                  ] as const;
 
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.2, type: "spring" }}
                      viewport={{ once: true }}
                      key={dham.id}
                      className="absolute flex items-center"
                      style={{
                        ...mapPositions[index],
                        flexDirection: isLeft ? "row" : "row-reverse",
                      }}
                    >
                      <img
                        src={dham.img}
                        alt={dham.title}
                        className="w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-[#F59E0B] object-cover shadow-[0_0_15px_rgba(245,158,11,0.5)] z-10 relative"
                        loading="lazy"
                      />
                      <div
                        className={`bg-[#F59E0B] text-black text-[10px] md:text-sm font-bold py-1.5 md:py-2 rounded-full whitespace-nowrap shadow-xl border border-white/40 z-0 relative ${isLeft ? "-ml-6 pl-8 pr-3 md:-ml-8 md:pl-12 md:pr-4" : "-mr-6 pr-8 pl-3 md:-mr-8 md:pr-12 md:pl-4"
                          }`}
                      >
                        {dham.title}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
 
            <div className="desktop-timeline-wrapper">
              <div className="how-it-works-timeline">
                <div className="divider-dots text-center my-2 lg:hidden">
                  <span></span>
                  <span className="small"></span>
                  <span className="large bg-yellow-400"></span>
                  <span className="small"></span>
                  <span></span>
                </div>
 
                <motion.h2
                  initial="hidden"
                  whileInView="visible"
                  variants={fadeInUp}
                  viewport={{ once: true }}
                  className="text-center lg:text-left text-3xl font-bold mb-2"
                >
                  How It <span className="text-[#FFC107]">Works</span>
                </motion.h2>
 
                <motion.p
                  initial="hidden"
                  whileInView="visible"
                  variants={fadeInUp}
                  viewport={{ once: true }}
                  className="text-center lg:text-left text-gray-400 text-sm mb-4 md:mb-8"
                >
                  Simple steps to complete your virtual yatra
                </motion.p>
 
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={staggerContainer}
                  className="timeline-container"
                >
                  {timeline.map((step) => (
                    <motion.div variants={fadeInUp} key={step.id} className="timeline-item">
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 10 }}
                        className="timeline-icon bg-[#FFC107]"
                      >
                        {step.icon}
                      </motion.div>
                      <div className="timeline-content">
                        <h3 className="text-[#FFC107] font-bold text-lg">{step.title}</h3>
                        <p className="text-gray-300 text-sm">{step.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
 
                <div className="flex justify-center lg:justify-start mt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="complete-steps-btn"
                  >
                    ॐ Complete in {timeline.length} easy Steps
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
 
          <div className="what-you-get-section mt-4 md:mt-12 pb-4 md:pb-12 relative">
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#FFC107]/50 to-transparent relative my-6 md:my-10 max-w-4xl mx-auto">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-[#0d0f1a] px-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFC107]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]"></span>
              </div>
            </div>
 
            <div className="relative max-w-lg mx-auto px-4 z-10 flex flex-col items-center">
              <motion.h2
                initial="hidden"
                whileInView="visible"
                variants={fadeInUp}
                viewport={{ once: true }}
                className="text-center text-3xl md:text-4xl font-bold mb-2"
              >
                What You <span className="text-[#FFC107]">Get</span>
              </motion.h2>
 
              <motion.p
                initial="hidden"
                whileInView="visible"
                variants={fadeInUp}
                viewport={{ once: true }}
                className="text-center text-gray-500 text-sm mb-4 md:mb-8"
              >
                Complete spiritual experience from home
              </motion.p>
 
              <motion.img
                initial={{ opacity: 0, x: 50, rotate: 20 }}
                whileInView={{ opacity: 1, x: 0, rotate: 0 }}
                transition={{ type: "spring", duration: 1.5 }}
                viewport={{ once: true }}
                src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/4-dham-yatra/damru.png.webp"
                alt="Damru"
                className="absolute -right-4 lg:-right-24 -top-8 w-24 md:w-36 lg:w-48 z-20 pointer-events-none drop-shadow-2xl"
              />
            </div>
 
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
              className="grid grid-cols-2 gap-0 max-w-3xl mx-auto border border-[#FFC107]/30 rounded-xl overflow-hidden bg-black/40"
            >
              {benefits.map((benefit, idx) => (
                <motion.div
                  variants={fadeInUp}
                  whileHover={{ backgroundColor: "rgba(255, 193, 7, 0.05)" }}
                  key={benefit.id}
                  className={`p-5 md:p-8 flex flex-col justify-center cursor-default 
                    ${idx % 2 === 0 ? "border-r border-[#FFC107]/30" : ""} 
                    ${idx < benefits.length - 2 ? "border-b border-[#FFC107]/30" : ""}`}
                >
                  <motion.div
                    animate={{ rotate: [-5, 5, -5] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="text-[#FFC107] text-3xl mb-3 w-fit"
                  >
                    {benefit.icon}
                  </motion.div>
                  <h3 className="text-[#FFC107] font-semibold text-lg">{benefit.title}</h3>
                  {benefit.description ? (
                    <p className="text-xs md:text-sm text-gray-300 mt-1">
                      {benefit.description}
                    </p>
                  ) : null}
                </motion.div>
              ))}
            </motion.div>
          </div>
 
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#FFC107]/20 to-transparent my-4 md:my-12 max-w-5xl mx-auto" />
 
          <YatraFAQ />
 
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#FFC107]/20 to-transparent my-4 md:my-12 max-w-5xl mx-auto" />
 
          <YatraReviews />
 
          {/* Bottom padding so sticky bar doesn't cover last content */}
          <div style={{ height: 80 }} />
        </div>
      </div>
    </>
  );
};
 
const YatraLandingPage: React.FC = () => {
  return <Layout content={<YatraContent />} activeIndex="4-dham-yatra" />;
};
 
export default YatraLandingPage;