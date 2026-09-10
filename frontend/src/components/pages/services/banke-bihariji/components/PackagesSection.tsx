"use client";

import { useEffect, useMemo, useState } from "react";
import { useMoney } from "@/lib/currency";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import ReplyIcon from "@mui/icons-material/Reply";
import { type SevaPackage } from "../data/sevaData";
import { useBBPackagesQuery } from "@/hooks/queries/useBBSevaQueries";

const PackagesSection = ({
  onSelectPackage,
  onPackagesLoaded,
}: {
  onSelectPackage: (pkg: SevaPackage) => void;
  onPackagesLoaded?: (pkgs: SevaPackage[]) => void;
}) => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const { data: packages = [], isLoading: loading, isError: error } = useBBPackagesQuery();

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const [activePlanIdx, setActivePlanIdx] = useState(0);

  // Dynamic date switching logic
  const { targetDateStr, targetDisplayDate } = useMemo(() => {
    const now = new Date().getTime();
    // Phase 1 ends at end-of-day 23rd April; phase 2 ends at end-of-day 20th May
    const phase1End = new Date("2026-04-23T23:59:59").getTime();

    if (now >= phase1End) {
      return { targetDateStr: "2026-05-20T23:59:59", targetDisplayDate: "20th May 2026" };
    }
    return { targetDateStr: "2026-04-23T23:59:59", targetDisplayDate: "23rd April 2026" };
  }, []);

  // Countdown timer — hides when the booking day ends (never shows 0000)
  useEffect(() => {
    const targetDate = new Date(targetDateStr).getTime();

    const calculateTimeLeft = () => {
      const difference = targetDate - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        mins: Math.floor((difference / 1000 / 60) % 60),
        secs: Math.floor((difference / 1000) % 60),
      });
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDateStr]);

  useEffect(() => {
    if (packages.length > 0) onPackagesLoaded?.(packages);
  }, [packages]);

  // Badge config per card index
  const cornerBadges: Record<number, { label: string; color: string }> = {
    2: { label: "Value for Money", color: "linear-gradient(135deg, #9D1DB7, #563FAC)" },
    3: { label: "Mostly Opted", color: "linear-gradient(135deg, #FF1216, #FF5B76)" },
    4: { label: "Recommended", color: "linear-gradient(135deg, #3B9F1C, #383C05)" },
  };

  const cardElements = packages.slice(0, 5);

  // Track which plan card is in view — uses scroll so it works even after Google Translate rewrites the DOM
  useEffect(() => {
    const count = Math.min(cardElements.length, 5);
    if (count === 0) return;

    const updateActive = () => {
      // Find the last card whose top has scrolled into the upper 60% of the viewport
      const threshold = window.innerHeight * 0.6;
      let activeI = 0;
      for (let i = 0; i < count; i++) {
        const el = document.getElementById(`bb-plan-${i}`);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= threshold) activeI = i;
      }
      setActivePlanIdx(activeI);
    };

    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    return () => window.removeEventListener("scroll", updateActive);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages.length]);

  // Highest per-day rate (baseline = most expensive per day package)
  const basePerDay = useMemo(() => {
    if (cardElements.length === 0) return 0;
    return Math.max(
      ...cardElements
        .filter((p) => p.days && p.days > 0)
        .map((p) => Math.round(p.price / p.days))
    );
  }, [cardElements]);

  // All features from the most premium (last) package — used as master list
  const allFeatures = useMemo(() => {
    if (cardElements.length === 0) return [];
    const premiumPkg = cardElements[cardElements.length - 1];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const f of premiumPkg.features) {
      const key = f.trim().toLowerCase();
      if (!seen.has(key)) { seen.add(key); list.push(f.trim()); }
    }
    for (const pkg of cardElements) {
      for (const f of pkg.features) {
        const key = f.trim().toLowerCase();
        if (!seen.has(key)) { seen.add(key); list.push(f.trim()); }
      }
    }
    return list;
  }, [cardElements]);

  // All prasad items from all packages (premium first)
  const allPrasadItems = useMemo(() => {
    if (cardElements.length === 0) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    const premiumPkg = cardElements[cardElements.length - 1];
    for (const item of premiumPkg.prasadItems ?? []) {
      const key = item.trim().toLowerCase();
      if (!seen.has(key)) { seen.add(key); list.push(item.trim()); }
    }
    for (const pkg of cardElements) {
      for (const item of pkg.prasadItems ?? []) {
        const key = item.trim().toLowerCase();
        if (!seen.has(key)) { seen.add(key); list.push(item.trim()); }
      }
    }
    return list;
  }, [cardElements]);

  return (
    <section
      id="packages"
      className="relative z-10 overflow-hidden"
      style={{
        background: "#fbaa1c",
        marginTop: "-160px",
        paddingTop: "80px",
        paddingBottom: "32px",
      }}
    >
      <style>{`
        @media (min-width: 640px) {
          #packages {
            margin-top: -420px !important;
            padding-top: 320px !important;
          }
        }
        .bb-pkg-card {
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.10);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
        }
        .bb-badge-pill {
          position: absolute;
          top: 0;
          right: 24px;
          color: #fff;
          font-size: 13px;
          font-weight: 500;
          padding: 6px 14px 10px 14px;
          border-radius: 0 0 20px 20px;
          z-index: 10;
          white-space: nowrap;
          box-shadow: 0px 4px 10px rgba(0,0,0,0.15);
        }
        .bb-pkg-name {
          font-size: 18px;
          font-weight: 800;
          color: #e8680a;
          line-height: 1.2;
          margin-bottom: 2px;
        }
        .bb-divider {
          border: none;
          border-top: 1.5px solid #f0e0d0;
          margin: 0 0 10px 0;
        }
        .bb-price-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .bb-price-main {
          font-size: 32px;
          font-weight: 900;
          color: #1a1a1a;
          letter-spacing: -1px;
          line-height: 1;
        }
        .bb-price-rupee {
          font-size: 20px;
          font-weight: 800;
          color: #1a1a1a;
          align-self: flex-start;
          padding-top: 5px;
        }
        .bb-perday-text {
          font-size: 13px;
          color: #555;
          font-weight: 500;
        }
        .bb-days-pill {
          background: #e8680a;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .bb-savings-box {
          border: 1.5px solid #4ade80;
          background: #f0fdf4;
          border-radius: 12px;
          padding: 8px 12px;
          margin: 8px 0 4px 0;
        }
        .bb-savings-title {
          color: #16a34a;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .bb-savings-sub {
          color: #15803d;
          font-size: 11px;
          font-weight: 500;
          margin-top: 2px;
        }
        .bb-features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 8px;
          margin-bottom: 12px;
        }
        @media (min-width: 1024px) {
          .bb-features-grid {
            grid-template-columns: 1fr;
          }
        }
        .bb-feat-item {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          font-size: 13px;
          color: #222;
          font-weight: 500;
          line-height: 1.35;
        }
        .bb-feat-check {
          color: #16a34a;
          font-weight: 800;
          font-size: 14px;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .bb-prasad-box {
          background: #fde8cc;
          border-radius: 14px;
          padding: 12px;
          flex-grow: 1;
          margin-bottom: 12px;
        }
        .bb-prasad-title {
          font-size: 13px;
          font-weight: 500;
          color: #1a1a1a;
          margin-bottom: 10px;
        }
        .bb-prasad-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .bb-prasad-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #fff;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 500;
          color: #222;
          white-space: nowrap;
        }
        .bb-prasad-pill-check {
          color: #16a34a;
          font-weight: 800;
          font-size: 13px;
        }
        .bb-prasad-pill-cross {
          color: #ef4444;
          font-weight: 800;
          font-size: 13px;
        }
        .bb-cta-btn {
          width: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #f59e0b 0%, #e8680a 100%);
          color: #fff;
          font-size: 16px;
          font-weight: 800;
          padding: 13px 0;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(232,104,10,0.35);
          transition: transform 0.15s, box-shadow 0.15s;
          letter-spacing: 0.01em;
        }
        .bb-cta-btn:active {
          transform: scale(0.97);
          box-shadow: 0 2px 6px rgba(232,104,10,0.25);
        }
      `}</style>

      {/* <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <img loading="lazy" 
          src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/shribankebihariji/basuri"
          alt="Flute"
          className="absolute w-[220px] sm:w-[350px] lg:w-[450px] opacity-80 right-[-20px] sm:right-[-50px] top-[250px] sm:top-[120px]  -rotate-45"
         />
      </div> */}

      <div className="container mx-auto px-3 sm:px-6 relative z-10 w-full">

        {/* Header Banner - Stacked Centered Layout */}
        <div className="flex flex-col items-center justify-center text-center   sm:mb-3 mt-12 sm:mt-20 w-full max-w-4xl mx-auto">

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block mb-1"
            style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.3))" }}
          >
            <div
              className="bg-[#da251d] mt-10 text-white font-extrabold inline-flex items-center justify-center tracking-wide
                         py-2 px-10 text-[16px]
                         sm:py-3 sm:px-12 sm:text-2xl
                         lg:py-4 lg:px-16 lg:text-4xl"
              style={{
                clipPath: "polygon(0% 0%, 100% 0%, calc(100% - 22px) 50%, 100% 100%, 0% 100%, 22px 50%)"
              }}
            >
              दीपक सेवा &nbsp;|&nbsp; लड्डू सेवा &nbsp;|&nbsp; पान सेवा
            </div>
          </motion.div>

          <p className="text-[#1a1a1a] font-semibold leading-relaxed opacity-95 max-w-3xl
                        text-[15px] sm:text-[20px] lg:text-[24px]">
            वृंदावन में प्रभु की नित्य सेवा का यह पावन अवसर आपको घर बैठे भक्ति से जोड़ता है—दीपक से प्रकाश, लड्डू से प्रेम और पान से श्रद्धा अर्पित करें
          </p>

          {/* Offerings Row + Featured badge in same row */}
          <div className="flex flex-row items-center w-full gap-3 sm:gap-14 lg:gap-24 relative z-10">
            {/* Three images - left side */}
            <img loading="lazy" 
              src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/shribankebihariji/laddu"
              alt="Laddu"
              className="w-[75px] sm:w-[130px] lg:w-[160px] drop-shadow-xl shrink-0"
             />
            <img loading="lazy" 
              src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/shribankebihariji/diya"
              alt="Diya"
              className="w-[75px] pb-1 sm:w-[130px] lg:w-[160px] drop-shadow-xl animate-gentle-pulse shrink-0"
             />
            <img loading="lazy" 
              src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/shribankebihariji/paanpatta"
              alt="Paan"
              className="w-[65px] sm:w-[110px] lg:w-[140px] drop-shadow-xl shrink-0"
             />

            {/* Featured badge — right aligned in same row */}
            <div className="ml-auto mt-5 flex flex-col items-end shrink-0">
              <span
                className="text-[9px] md:text-[11px] font-bold text-[#E35600] bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200 text-center leading-tight whitespace-nowrap"
                style={{ animation: "vv_glow_blink 2s infinite ease-in-out" }}
              >
                Featured on 200+ <br /> news channels
              </span>
              <ReplyIcon
                sx={{
                  transform: "rotate(270deg)",
                  fontSize: 22,
                  color: "#ffffffff",
                  marginTop: "-8px",
                  marginRight: "90px",
                }}
              />
            </div>
          </div>
        </div>

        {/* ---- News Marquee ---- */}
        <style>{`
          @keyframes bb_marquee_r {
            0%   { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          @keyframes vv_glow_blink {
            0%, 100% { box-shadow: 0 0 0px rgba(227,86,0,0); }
            50% { box-shadow: 0 0 8px rgba(227,86,0,0.5); }
          }
        `}</style>
        <div className="mb-4 mt-0">
          <div className="overflow-hidden">
            {/* Two identical copies side-by-side for seamless infinite scroll */}
            <div
              className="flex w-max gap-2 will-change-transform transform-gpu"
              style={{ animation: "bb_marquee_r 20s linear infinite" }}
            >
              {/* Copy 1 */}
              {[1, 2, 3, 4, 5, 6, 7].map((idx, i) => (
                <div
                  key={`a-${i}`}
                  className="flex h-7 w-[70px] md:h-9 md:w-[90px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-0.5 shadow-sm"
                >
                  <img
                    src={`https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-${idx}-optimized.webp`}
                    alt={`News ${idx}`}
                    className="h-full w-full object-contain mix-blend-multiply"
                    loading="lazy"
                  />
                </div>
              ))}
              {/* Copy 2 — identical, makes the loop seamless */}
              {[1, 2, 3, 4, 5, 6, 7].map((idx, i) => (
                <div
                  key={`b-${i}`}
                  className="flex h-7 w-[70px] md:h-9 md:w-[90px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-0.5 shadow-sm"
                >
                  <img
                    src={`https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-${idx}-optimized.webp`}
                    alt={`News ${idx}`}
                    className="h-full w-full object-contain mix-blend-multiply"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Package Cards */}
        {loading && (
          <div className="text-center text-lg font-semibold py-12">Loading packages...</div>
        )}
        {error && (
          <div className="text-center text-lg font-semibold text-red-600 py-12">
            Could not load packages. Please refresh or try again later.
          </div>
        )}
        {!loading && !error && packages.length === 0 && (
          <div className="text-center text-lg font-semibold py-12">No packages found.</div>
        )}
        {!loading && !error && packages.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-[1440px] mx-auto">
            {cardElements.map((pkg, i) => {
              const badge = cornerBadges[i];
              const displayName = pkg.name || pkg.duration || "";

              const featureSet = new Set(pkg.features.map((f) => f.trim().toLowerCase()));
              const prasadSet = new Set((pkg.prasadItems ?? []).map((x) => x.trim().toLowerCase()));

              const includedFeatures = allFeatures.filter((feat) =>
                featureSet.has(feat.toLowerCase())
              );

              const perDay = pkg.days && pkg.days > 0 ? Math.round(pkg.price / pkg.days) : null;
              const totalIfBase = basePerDay > 0 && pkg.days && pkg.days > 1 ? basePerDay * pkg.days : null;
              const savings = totalIfBase && totalIfBase > pkg.price ? totalIfBase - pkg.price : null;
              const savingsPct = savings && totalIfBase ? Math.round((savings / totalIfBase) * 100) : null;

              const sortedPrasad = [...allPrasadItems].sort((a, b) => {
                const incA = prasadSet.has(a.trim().toLowerCase());
                const incB = prasadSet.has(b.trim().toLowerCase());
                if (incA === incB) return 0;
                return incA ? -1 : 1;
              });

              return (
                <motion.div
                  key={pkg.id}
                  id={`bb-plan-${i}`}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="bb-pkg-card"
                >
                  {/* Top badge pill */}
                  {badge && (
                    <div
                      className="bb-badge-pill"
                      style={{ background: badge.color }}
                    >
                      {badge.label}
                    </div>
                  )}

                  <div style={{ padding: "16px 16px 0 16px" }}>
                    {/* Package Name */}
                    <div className="bb-pkg-name" style={{ paddingRight: badge ? "120px" : "0" }}>
                      {displayName}
                    </div>

                    {/* Divider */}
                    <hr className="bb-divider" style={{ marginTop: "10px" }} />

                    {/* Price row */}
                    <div className="bb-price-row">
                      <div style={{ display: "flex", alignItems: "flex-start" }}>
                        {/* Symbol and digits are one money() call now: the symbol
                            is not always "₹", and for some currencies not even a
                            bare prefix, so it cannot be a separate hardcoded span. */}
                        <span className="bb-price-main">{money(pkg.price)}</span>
                      </div>
                      {perDay && pkg.days && pkg.days > 1 && (
                        <span className="bb-perday-text">~{perDay.toLocaleString("en-IN")}/day</span>
                      )}
                      {pkg.days && (
                        <span className="bb-days-pill">For Days: {pkg.days}</span>
                      )}
                    </div>

        <hr className="bb-divider" style={{ marginTop: "10px" }} />
                    {/* Savings box */}
                    {savings && savingsPct && perDay && (
                      <div className="bb-savings-box">
                        <div className="bb-savings-title">
                          <span style={{ fontSize: "15px" }}>🏷️</span>
                          You save {money(savings)}
                        </div>
                        <div className="bb-savings-sub">
                          {money(perDay)}/day vs {money(basePerDay)}/day (Basic). {savingsPct}% less
                        </div>
                      </div>
                    )}

                    {/* Divider */}
            

                    {/* Features grid */}
                    <div className="bb-features-grid" style={{ marginBottom: "12px" }}>
                      {includedFeatures.map((feat, idx) => (
                        <div key={idx} className="bb-feat-item">
                          <span className="bb-feat-check">✓</span>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Prasad Box */}
                  <div style={{ padding: "0 12px" }}>
                    <div className="bb-prasad-box">
                      <div className="bb-prasad-title">What you will get in Prasad Box?</div>
                      <div className="bb-prasad-pills">
                        {sortedPrasad.filter((item) => prasadSet.has(item.trim().toLowerCase())).map((item, idx) => (
                          <span key={idx} className="bb-prasad-pill">
                            <span className="bb-prasad-pill-check">✓</span>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div style={{ padding: "0 12px 16px 12px", marginTop: "auto" }}>
                    <button
                      className="bb-cta-btn"
                      onClick={() => onSelectPackage(pkg)}
                    >
                      Start Seva
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Plan-aware sticky bottom bar ── */}
      {typeof document !== "undefined"
        ? createPortal(
            (() => {
              const activePkg = cardElements[activePlanIdx];
              if (!activePkg) return null;
              const displayName = activePkg.name || activePkg.duration || "Seva";
              return (
                <div
                  style={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 900,
                    fontFamily: "inherit",
                    boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
                  }}
                  className="sm:hidden"
                >
                  {/* ── Row 1: Countdown timer (dark teal) — hidden once booking day ends ── */}
                  {(timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.mins > 0 || timeLeft.secs > 0) && <div
                    style={{
                      background: "#0b4d4d",
                      borderTop: "1px solid rgba(20,184,166,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 16px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#fdf3c7", letterSpacing: "0.02em" }}>
                        Seva Booking Will End on:
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 1 }}>
                        {targetDisplayDate}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {[
                        { label: "Day", value: timeLeft.days },
                        { label: "Hour", value: timeLeft.hours },
                        { label: "Min", value: timeLeft.mins },
                        { label: "Sec", value: timeLeft.secs },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 36,
                            height: 36,
                            background: "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 6,
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                            {item.value.toString().padStart(2, "0")}
                          </span>
                          <span style={{ fontSize: 8, fontWeight: 600, color: "rgba(153,246,228,0.8)", textTransform: "uppercase" as const, marginTop: 1 }}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>}

                  {/* ── Row 2: Plan price + CTA (warm) ── */}
                  <div
                    style={{
                      background: "linear-gradient(to right, #fff7ed, #fef3c7)",
                      borderTop: "1px solid rgba(232,104,10,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 16px",
                      paddingBottom: "max(12px, env(safe-area-inset-bottom))",
                    }}
                  >
                    <div key={activePlanIdx} translate="no">
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#e8680a", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                        <span key={`bb-price-${activePlanIdx}`}>{money(activePkg.price)}</span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#92400e", marginTop: 2 }}>
                        <span key={`bb-name-${activePlanIdx}`}>{displayName}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onSelectPackage(activePkg)}
                      style={{
                        background: "linear-gradient(135deg, #f59e0b, #e8680a)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 999,
                        padding: "12px 20px",
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: "0 4px 16px rgba(232,104,10,0.45)",
                        letterSpacing: "-0.01em",
                      }}
                      onPointerDown={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(0.95)")}
                      onPointerUp={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
                    >
                      <span>🙏</span>
                      <span>Start Seva Now</span>
                    </button>
                  </div>
                </div>
              );
            })()
          , document.body)
        : null}

    </section>
  );
};

export default PackagesSection;
