"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { IJyotirlinga } from "../../index";
import JyotirlingaInfoModal from "../../Components/JyotirlingaInfoModal";

interface SecondComponentProps {
  jyotirlingas: IJyotirlinga[];
  selectedIds: string[];
  toggleSelection: (id: string) => void;
  selectAll: () => void;
}

const CARD_WIDTH = 230;
const CARD_GAP = 14;
const CARD_STEP = CARD_WIDTH + CARD_GAP;

const SecondComponent: React.FC<SecondComponentProps> = ({
  jyotirlingas,
  selectedIds,
  toggleSelection,
  selectAll,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [infoJyotirlinga, setInfoJyotirlinga] = useState<IJyotirlinga | null>(null);

  const scrollToIndex = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;
    const containerWidth = container.offsetWidth;
    const targetScrollLeft = index * CARD_STEP - (containerWidth / 2 - CARD_WIDTH / 2);
    container.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
  }, []);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use a simple scroll calculation consistent with scroll-snap behavior
    const scrollLeft = container.scrollLeft;
    const nearest = Math.round(scrollLeft / CARD_STEP);
    const clamped = Math.max(0, Math.min(nearest, jyotirlingas.length - 1));

    if (clamped !== activeIndex) {
      setActiveIndex(clamped);
    }
  }, [activeIndex, jyotirlingas.length]);

  useEffect(() => {
    // Initial centering on first load
    scrollToIndex(0);
  }, [scrollToIndex]);

  const allSelected = selectedIds.length === jyotirlingas.length;

  return (
    <div className="w-full overflow-hidden relative" style={{ background: "#f0e6d3" }}>
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-64 bg-orange-500/10 blur-[100px] pointer-events-none rounded-full" />

      {/* ── Section Header ── */}
      {/* <div style={{ textAlign: "center", padding: "28px 24px 10px", position: "relative", zIndex: 1 }}>
       
        <img loading="lazy" 
          src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/4-dham-yatra/damru.png.webp"
          alt=""
          style={{
            position: "absolute",
            top: "50%",
            right: "-10px",
            transform: "translateY(-50%) rotate(10deg)",
            width: "110px",
            opacity: 0.15,
            pointerEvents: "none",
            zIndex: 0,
          }}
         />
        <p style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.13em", color: "#d97706", margin: "0 0 5px", textTransform: "uppercase", position: "relative", zIndex: 1 }}>
          The Sacred 12
        </p>
        <h2 style={{ fontSize: "24px", fontWeight: 900, color: "#b45309", margin: "0 0 8px", fontFamily: "serif", position: "relative", zIndex: 1 }}>
          पवित्र 12 ज्योतिर्लिंग
        </h2>
        <p style={{ fontSize: "10.5px", fontWeight: 700, color: "#1a1a1a", margin: 0, letterSpacing: "0.07em", textTransform: "uppercase", lineHeight: 1.7, position: "relative", zIndex: 1 }}>
          One Per Month · Fixed Auspicious Dates ·<br />Scroll to Explore All →
        </p>
      </div> */}

      {/* ── Select All Row ── */}
      <div style={{ display: "flex", alignItems: "center", padding: "4px 20px 10px", marginTop: "10px", gap: "10px", position: "relative", zIndex: 1 }}>
        <div
          onClick={selectAll}
          style={{
            width: "22px", height: "22px", borderRadius: "5px",
            border: `2px solid ${allSelected ? "#b45309" : "#78350f"}`,
            background: allSelected ? "#b45309" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
          }}
        >
          {allSelected && <span style={{ color: "#fff", fontSize: 13, fontWeight: 900, lineHeight: 1 }}>✓</span>}
        </div>
        <span style={{ fontSize: "18px", fontWeight: 700, color: "#111111", cursor: "pointer", letterSpacing: "-0.01em" }} onClick={selectAll}>
          Select All
        </span>
        <div style={{ flex: 1, height: "1px", background: "rgba(120,53,15,0.25)" }} />
      </div>

      {/* Carousel */}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto relative z-10"
        style={{
          gap: `${CARD_GAP}px`,
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
          paddingTop: "12px",
          paddingBottom: "12px",
        }}
      >
        {/* Left spacer */}
        <div style={{ flexShrink: 0, width: `calc(50vw - ${CARD_WIDTH / 2}px)` }} />

        {jyotirlingas.map((data, index) => {
          // Map Hindu lunar month number (from backend) → English name + Gregorian span
          const HINDU_MONTHS: Record<number, { name: string; range: string }> = {
            1:  { name: "Chaitra",      range: "Mar–Apr" },
            2:  { name: "Vaishakha",   range: "Apr–May" },
            3:  { name: "Jyeshtha",    range: "May–Jun" },
            4:  { name: "Ashadha",     range: "Jun–Jul" },
            5:  { name: "Shravana",    range: "Jul–Aug" },
            6:  { name: "Bhadrapada",  range: "Aug–Sep" },
            7:  { name: "Ashwin",      range: "Sep–Oct" },
            8:  { name: "Kartika",     range: "Oct–Nov" },
            9:  { name: "Margashirsha",range: "Nov–Dec" },
            10: { name: "Pausha",      range: "Dec–Jan" },
            11: { name: "Magha",       range: "Jan–Feb" },
            12: { name: "Phalguna",    range: "Feb–Mar" },
          };
          const pujaDateObj = data.pujaDate ? new Date(data.pujaDate) : null;
          // Use data.monthNumber (Hindu lunar month) — NOT the Gregorian month of the puja date
          const hinduMonth = data.monthNumber ? HINDU_MONTHS[data.monthNumber] : null;
          const isActive = index === activeIndex;
          const isAdjacent = Math.abs(index - activeIndex) === 1;
          const isSelected = selectedIds.includes(data._id);

          return (
            <div
              key={data._id}
              onClick={() => {
                setActiveIndex(index);
                scrollToIndex(index);
              }}
              style={{
                flexShrink: 0,
                width: `${CARD_WIDTH}px`,
                height: "185px",
                scrollSnapAlign: "center",
                borderRadius: "18px",
                border: isActive
                  ? isSelected
                    ? "1.5px solid #fdba74"
                    : "1.5px solid #f97316"
                  : isSelected
                    ? "1px solid rgba(249,115,22,0.45)"
                    : "1px solid rgba(249,115,22,0.2)",
                background: isActive
                  ? "radial-gradient(ellipse at top, #fff7ed 0%, #fffaf0 60%)"
                  : "#fef08a",
                transform: isActive ? "scale(1.06)" : isAdjacent ? "scale(0.94)" : "scale(0.88)",
                opacity: isActive ? 1 : isAdjacent ? 0.85 : 0.65,
                transition: "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease, background 0.3s ease",
                willChange: "transform, opacity, scale",
                cursor: isActive ? "default" : "pointer",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                boxShadow: isActive
                  ? isSelected
                    ? "0 0 32px 8px rgba(245,215,142,0.45), 0 0 64px 16px rgba(200,155,60,0.25), 0 16px 32px rgba(0,0,0,0.5)"
                    : "0 0 32px rgba(200,155,60,0.2), 0 16px 32px rgba(0,0,0,0.5)"
                  : isSelected
                    ? "0 0 12px 2px rgba(200,155,60,0.2), 0 6px 16px rgba(0,0,0,0.25)"
                    : "0 6px 16px rgba(0,0,0,0.25)",
              }}
            >


              {/* ── TOP: name left · image right ── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  width: "100%",
                  padding: "10px 10px 0 10px",
                  boxSizing: "border-box",
                  gap: 4,
                }}
              >
                {/* Text block */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* English name */}
                  <span
                    style={{
                      display: "block",
                      fontSize: "15px",
                      fontWeight: 900,
                      letterSpacing: "-0.02em",
                      color: isActive ? "#c2410c" : "#7c2d12",
                      lineHeight: 1.15,
                      transition: "color 0.35s",
                      wordBreak: "break-word",
                    }}
                  >
                    {data.nameEnglish}
                  </span>
                  {/* Hindi name */}
                  <span
                    style={{
                      display: "block",
                      fontSize: "10.5px",
                      fontWeight: 600,
                      color: isActive ? "#ea580c" : "#9a3412",
                      lineHeight: 1.25,
                      marginTop: 2,
                      transition: "color 0.35s",
                    }}
                  >
                    {data.nameHindi}
                  </span>
                  {/* Location */}
                  <span
                    style={{
                      display: "block",
                      fontSize: "9px",
                      fontWeight: 500,
                      color: "#b45309",
                      lineHeight: 1.3,
                      marginTop: 2,
                      opacity: 0.9,
                    }}
                  >
                    📍 {data.location}
                  </span>
                </div>

                {/* Shivling image — right side */}
                <div
                  style={{
                    flexShrink: 0,
                    width: 75,
                    height: 75,
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: "-10px",
                      borderRadius: "50%",
                      background: isActive
                        ? "radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 50%, transparent 75%)"
                        : "radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 55%, transparent 80%)",
                      filter: "blur(7px)",
                      pointerEvents: "none",
                    }}
                  />
                  <img
                    src={data.image}
                    alt={data.nameEnglish}
                    loading="lazy"
                    style={{
                      width: "72px",
                      height: "72px",
                      objectFit: "contain",
                      position: "relative",
                      filter: isActive
                        ? "drop-shadow(0 5px 12px rgba(0,0,0,0.5))"
                        : "drop-shadow(0 3px 6px rgba(0,0,0,0.22))",
                      transition: "filter 0.4s ease",
                    }}
                  />
                </div>
              </div>

              {/* ── Divider ── */}
              <div
                style={{
                  width: "calc(100% - 20px)",
                  margin: "8px 10px 0",
                  height: 1,
                  background: "rgba(180,83,9,0.15)",
                }}
              />

              {/* ── INFO ROWS: Hindu month + Puja date ── */}
              <div
                style={{
                  width: "100%",
                  padding: "5px 10px 0",
                  boxSizing: "border-box",
                }}
              >
                {/* Row 1: Hindu month (e.g. "Chaitra (चैत्र) · Mar–Apr") */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isActive ? "#7c2d12" : "#92400e",
                    lineHeight: 1.25,
                    transition: "color 0.3s",
                  }}
                >
                  {hinduMonth
                    ? `${hinduMonth.name} · ${hinduMonth.range}`
                    : data.month}
                </div>

                {/* Row 2: Puja Date (e.g. "Puja Date: 13 Apr 2026") */}
                {pujaDateObj && (
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: isActive ? "#ea580c" : "#c2410c",
                      lineHeight: 1.25,
                      marginTop: 2,
                      transition: "color 0.3s",
                    }}
                  >
                    Puja Date:{" "}
                    {pujaDateObj.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                )}
              </div>

              {/* ── BOTTOM: Mandir Details | Add / Added ── */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  display: "flex",
                  alignItems: "stretch",
                  height: 30,
                  zIndex: 20,
                }}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setInfoJyotirlinga(data);
                  }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "0 0 0 18px",
                    fontSize: 9.5,
                    fontWeight: 700,
                    background: "rgba(255,255,255,0.75)",
                    color: "#c2410c",
                    borderTop: "1px solid rgba(234,88,12,0.3)",
                    borderRight: "1px solid rgba(234,88,12,0.2)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    backdropFilter: "blur(4px)",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.02em",
                  }}
                >
                  Mandir Details
                </div>

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(data._id);
                  }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    borderRadius: "0 0 18px 0",
                    fontSize: 12,
                    fontWeight: 800,
                    background: isSelected
                      ? "linear-gradient(135deg, #fdba74, #ea580c)"
                      : "rgba(255,255,255,0.7)",
                    color: isSelected ? "#fff" : "#ea580c",
                    borderTop: isSelected ? "none" : "1px solid rgba(234,88,12,0.35)",
                    cursor: "pointer",
                    transition: "background 0.12s, box-shadow 0.12s",
                    boxShadow: isSelected
                      ? "0 0 14px 4px rgba(253,186,116,0.65), 0 0 28px 8px rgba(234,88,12,0.4)"
                      : "none",
                    backdropFilter: "blur(4px)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isSelected ? (
                    <><span style={{ fontSize: 14, fontWeight: 900 }}>✓</span><span>Added</span></>
                  ) : (
                    <><span style={{ fontSize: 15, fontWeight: 900 }}>+</span><span>Add</span></>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Right spacer */}
        <div style={{ flexShrink: 0, width: `calc(50vw - ${CARD_WIDTH / 2}px)` }} />
      </div>

      {/* Dot indicators */}
      <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "8px", marginTop: "8px" }}>
        {jyotirlingas.map((_, i) => (
          <div
            key={i}
            onClick={() => {
              setActiveIndex(i);
              scrollToIndex(i);
            }}
            style={{
              width: i === activeIndex ? "20px" : "6px",
              height: "6px",
              borderRadius: "3px",
              background: i === activeIndex ? "#f97316" : "rgba(249,115,22,0.3)",
              transition: "width 0.35s ease, background 0.35s ease",
              cursor: "pointer",
            }}
          />
        ))}
      </div>

      {/* ---- News Marquee ---- */}
      {/* <style>{`
        @keyframes jyo_marquee_r {
          0% { transform: translate3d(-50%,0,0); }
          100% { transform: translate3d(0,0,0); }
        }
        @keyframes jyo_pop {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(249,115,22,0.2)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 6px rgba(249,115,22,0.5)); }
        }
      `}</style> */}
      {/* <div style={{ margin: "14px 16px 10px", overflow: "hidden" }}>
        <div style={{ textAlign: "center", marginBottom: "6px" }}>
          <span
            style={{
              display: "inline-block",
              animation: "jyo_pop 2s ease-in-out infinite",
              background: "rgba(249,115,22,0.08)",
              border: "1px solid rgba(249,115,22,0.3)",
              borderRadius: "999px",
              padding: "3px 14px",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#c2410c",
              textTransform: "uppercase",
            }}
          >
            Featured on 200+ News Channels
          </span>
        </div>
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              width: "max-content",
              gap: "10px",
              animation: "jyo_marquee_r 22s linear infinite",
              willChange: "transform",
            }}
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
                style={{
                  flexShrink: 0,
                  width: "90px",
                  height: "38px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  borderRadius: "8px",
                  border: "1px solid rgba(249,115,22,0.2)",
                  background: "rgba(255,255,255,0.7)",
                  padding: "4px",
                }}
              >
                <img
                  src={imgUrl}
                  alt={`Media ${idx}`}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    transform: "translate3d(0,0,0)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div> */}

      {/* Selection summary + Select All */}

      {/* <div
        style={{
          margin: "14px 16px 0",
          borderRadius: 12,
          padding: "10px 14px",
          background: allSelected
            ? "linear-gradient(135deg, rgba(253,186,116,0.25), rgba(249,115,22,0.15))"
            : "rgba(249,115,22,0.06)",
          border: `1px solid ${allSelected ? "rgba(253,186,116,0.6)" : "rgba(249,115,22,0.28)"}`,
          boxShadow: allSelected
            ? "0 0 18px 4px rgba(253,186,116,0.25), 0 0 36px 8px rgba(249,115,22,0.15)"
            : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "background 0.12s, border-color 0.12s, box-shadow 0.12s",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "#9a3412" }}>
          {allSelected
            ? "🕉 All 12 Jyotirlinga Selected"
            : `${selectedIds.length} / ${jyotirlingas.length} Selected`}
        </span>
        <button
          onClick={selectAll}
          style={{
            background: "transparent",
            border: `1px solid ${allSelected ? "rgba(249,115,22,0.5)" : "rgba(249,115,22,0.4)"}`,
            borderRadius: 999,
            padding: "4px 12px",
            fontSize: 11,
            fontWeight: 600,
            color: allSelected ? "#ea580c" : "#f97316",
            cursor: "pointer",
            transition: "border-color 0.12s, color 0.12s",
          }}
        >
          {allSelected ? "Unselect All" : "Select All"}
        </button>
      </div> */}

      <style>{`div::-webkit-scrollbar { display: none; }`}</style>

      <JyotirlingaInfoModal
        jyotirlinga={infoJyotirlinga}
        onClose={() => setInfoJyotirlinga(null)}
      />
    </div>
  );
};

export default SecondComponent;
