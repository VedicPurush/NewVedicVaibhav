"use client";

import "../GauSeva.css";
import { useMoney } from "@/lib/currency";

const TRUST_ITEMS = [
  "12,500+ Sevas Done",
  "500+ Cows Every Wednesday",
  "Photo after Feeding",
  "WhatsApp Proof",
  "Real Gaushala",
];

const NEWS_IMGS = [
  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-1-optimized.webp",
  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-2-optimized.webp",
  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-3-optimized.webp",
  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-4-optimized.webp",
  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-5-optimized.webp",
  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-6-optimized.webp",
  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-7-optimized.webp",
];

const HeroSection = ({ onBookNow }: { onBookNow: () => void }) => {
  /** Prices display in the devotee's own currency; the India list price is
   *  the input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Image converted to native img for lazy loading/performance */}
      <img
        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/Gau-seva/hero_gau_mata.png.webp"
        alt="Gau Seva Background"
        loading="lazy"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
        }}
      />
      
      {/* Gradient Overlay for contrast */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          padding: "28px 20px 0",
          textAlign: "center",
        }}
      >
        {/* Sacred symbol */}
        <h1
          style={{
            color: "#ffffffff",
            fontWeight: 900,
            fontSize: "clamp(22px, 6vw, 30px)",
            lineHeight: 1.2,
            margin: "0 0 6px",
            textShadow: "0 2px 10px rgba(0,0,0,0.18)",
            letterSpacing: "-0.02em",
          }}
        >
          Gau Seva Made Simple
        </h1>

        {/* Tag */}
       

        {/* 
       

        <p
          className="gs-devanagari"
          style={{
            color: "rgba(255,255,255,0.92)",
            fontSize: 15,
            margin: "0 0 6px",
          }}
        >
          गौ माता को चारा खिलाएं — पुण्य कमाएं
        </p>

        <p
          style={{
            color: "rgba(255,255,255,0.82)",
            fontSize: 13,
            lineHeight: 1.55,
            margin: "0 0 22px",
            maxWidth: 320,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Book online. We feed Gau Mata every Wednesday. Get photo &amp; certificate on WhatsApp the same day.
        </p>
        */}
        {/* Spacer to maintain the previous height of the text */}
        <div style={{ height: "152px" }} />

        <button
          onClick={onBookNow}
          className="gs-pulse"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#fff",
            color: "#ff6b35",
            borderRadius: 999,
            padding: "13px 28px",
            fontSize: 15,
            fontWeight: 800,
            cursor: "pointer",
            marginBottom: 24,
            boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.2)",
            letterSpacing: "-0.01em",
          }}
        >
          
          <span>Start Gau Seva from {money(499)}</span>
        </button>
      </div>

      {/* ── News Marquee ── */}
      <style>{`
        @keyframes gs_marquee_r {
          0%   { transform: translate3d(-50%,0,0); }
          100% { transform: translate3d(0,0,0); }
        }
        @keyframes gs_pop {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.04); }
        }
      `}</style>
      <div style={{ padding: "0 16px 16px" }}>
        <div
          style={{
            background: "transparent",
            padding: "4px 0",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <span
              style={{
                display: "inline-block",
                animation: "gs_pop 2s ease-in-out infinite",
                background: "rgba(255, 240, 230, 0.95)",
                border: "1px solid rgba(255,107,53,0.5)",
                borderRadius: 999,
                padding: "2px 10px",
                fontSize: 8,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: "#ff6b35",
                textTransform: "uppercase" as const,
              }}
            >
              Featured on 200+ News Channels
            </span>
          </div>
          <div style={{ overflow: "hidden" }}>
            <div
              className="flex w-max gap-3 will-change-transform"
              style={{ animation: "gs_marquee_r 22s linear infinite" }}
            >
              {[...NEWS_IMGS, ...NEWS_IMGS].map((src, i) => (
                <div
                  key={i}
                  style={{
                    flexShrink: 0,
                    width: 70,
                    height: 28,
                    borderRadius: 6,
                    border: "1px solid rgba(255,107,53,0.12)",
                    background: "#fff",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 3,
                  }}
                >
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trust bar */}
      <div
        className="gs-trust-bar"
        style={{ padding: "8px 0" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: "0 16px",
            overflowX: "auto",
            whiteSpace: "nowrap",
            scrollbarWidth: "none",
          }}
        >
          {[...TRUST_ITEMS, ...TRUST_ITEMS].map((item, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 5,
                color: "#fff",
              }}
            >
              <span style={{ color: "#fde68a" }}>✓</span>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
