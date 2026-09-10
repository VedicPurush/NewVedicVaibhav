"use client";

import React from "react";

const steps = [
  {
    number: 1,
    title: "Choose Your Plan",
    titleHindi: "अपना प्लान चुनें",
    desc: "Select from Bhakti, Sankalp, or Ananta plan. Add family members if you wish.",
  },
  {
    number: 2,
    title: "We Perform Sankalp",
    titleHindi: "हम संकल्प करते हैं",
    desc: "Each month, sacred chadhava is offered at the designated Jyotirlinga in your name & gotra. You'll receive WhatsApp proof.",
  },
  {
    number: 3,
    title: "Receive Prasad at Home",
    titleHindi: "घर पर प्रसाद प्राप्त करें",
    desc: "Blessed prasad from the temple is carefully packed and shipped to your doorstep with tracking.",
  },
];

const FourthComponent: React.FC = () => {
  return (
    <div style={{
      width: "100%",
      background: "#ffffff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      position: "relative",
      overflow: "hidden",
      paddingBottom: "28px",
    }}>

      {/* ── Featured Marquee (Moved to Top) ── */}
      <style>{`
        @keyframes jyo_marquee_smooth {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div style={{
        width: "100%",
        background: "#fff8f0",
        padding: "16px 0",
        borderBottom: "1px solid #fde68a",
        marginBottom: "24px",
      }}>
        <div style={{ textAlign: "center", marginBottom: "12px" }}>
          <span
            style={{
              display: "inline-block",
              background: "rgba(249,115,22,0.1)",
              border: "1px solid rgba(249,115,22,0.3)",
              borderRadius: "999px",
              padding: "4px 16px",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#c2410c",
              textTransform: "uppercase",
            }}
          >
            Featured on 200+ News Channels
          </span>
        </div>
        
        <div style={{ overflow: "hidden", width: "100%" }}>
          <div
            style={{
              display: "flex",
              width: "max-content",
              gap: "12px",
              paddingLeft: "12px", // offset for precise loop sync
              animation: "jyo_marquee_smooth 25s linear infinite",
              willChange: "transform",
            }}
          >
            {[...Array(2)].map((_, i) => (
              <React.Fragment key={i}>
                {[
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-1-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-2-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-3-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-4-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-5-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-6-optimized.webp",
                  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-7-optimized.webp",
                ].map((imgUrl, idx) => (
                  <div
                    key={`${i}-${idx}`}
                    style={{
                      flexShrink: 0,
                      width: "100px",
                      height: "42px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "8px",
                      background: "#ffffff",
                      border: "1px solid rgba(249,115,22,0.15)",
                      padding: "6px",
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
                      }}
                    />
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      {/* ── Heading ── */}
      <div style={{ textAlign: "center", padding: "0 20px", marginBottom: "20px", position: "relative", zIndex: 1 }}>
        <h2 style={{
          fontSize: "32px",
          fontWeight: 900,
          color: "#d97706",
          fontStyle: "italic",
          margin: 0,
          lineHeight: 1.2,
          letterSpacing: "-0.3px",
        }}>
          How It Works
        </h2>
        <p style={{
          marginTop: "8px",
          fontSize: "14px",
          color: "#333333",
          margin: "5px 0 0",
          fontWeight: 400,
        }}>
          3 Simple Steps to Divine Blessings
        </p>
      </div>

      {/* ── Steps ── */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        padding: "0 32px",
        position: "relative",
        zIndex: 1,
      }}>
        {steps.map((step, i) => (
          <div key={step.number} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>

            {/* ── Circle ── */}
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "radial-gradient(circle at 38% 32%, #fde68a 0%, #f59e0b 55%, #d97706 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              fontWeight: 900,
              color: "#fff",
              boxShadow: "0 4px 20px rgba(245,158,11,0.45)",
              flexShrink: 0,
              position: "relative",
              zIndex: 1,
            }}>
              {step.number}
            </div>

            {/* ── Content ── */}
            <div style={{ textAlign: "center", padding: "10px 8px 4px", maxWidth: "300px" }}>
              <h3 style={{
                fontSize: "18px",
                fontWeight: 900,
                color: "#111111",
                margin: "0 0 5px",
                fontStyle: "italic",
                letterSpacing: "-0.2px",
              }}>
                {step.title}
              </h3>
              <p style={{
                fontSize: "12px",
                color: "#3730a3",
                margin: "0 0 6px",
                fontWeight: 600,
              }}>
                {step.titleHindi}
              </p>
              <p style={{
                fontSize: "13px",
                color: "#374151",
                lineHeight: 1.55,
                margin: 0,
              }}>
                {step.desc}
              </p>
            </div>

            {/* ── Connector line — not after last step ── */}
            {i < steps.length - 1 && (
              <div style={{
                width: "1.5px",
                height: "36px",
                background: "#9ca3af",
                margin: "2px 0",
              }} />
            )}
          </div>
        ))}
      </div>

    </div>
  );
};

export default FourthComponent;
