"use client";

import React from "react";

const benefits = [
  {
    emoji: "🧿",
    title: "Remove Obstacles",
    desc: "Dissolve specific karmic blocks from your life path.",
  },
  {
    emoji: "🩹",
    title: "Health & Well-being",
    desc: "Vedic rituals channel healing vibrations for mind & body.",
  },
  {
    emoji: "🏠",
    title: "Family Harmony",
    desc: "Strengthen family bonds and protect your loved ones.",
  },
  {
    emoji: "🪷",
    title: "Spiritual Growth",
    desc: "12-month devotion cycle accelerates your spiritual journey.",
  },
];

const BenefitsSection: React.FC = () => {
  return (
    <section
      style={{
        background: "#fef6e4",
        padding: "28px 16px 24px",
        fontFamily: "inherit",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <span
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: "#ea580c",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Benefit
        </span>
        <h2
          style={{
            margin: "0 0 6px",
            fontSize: 22,
            fontWeight: 900,
            color: "#b45309",
            lineHeight: 1.2,
            fontFamily: "inherit",
          }}
        >
          शिव कृपा से सब संभव है
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "#7c2d12",
            textTransform: "uppercase",
            lineHeight: 1.4,
          }}
        >
          With Shiva's Grace, Everything is Possible
        </p>
      </div>

      {/* 2×2 Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {benefits.map((b) => (
          <div
            key={b.title}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "18px 14px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              boxShadow: "0 2px 12px rgba(180,83,9,0.07)",
              border: "1px solid rgba(180,83,9,0.08)",
            }}
          >
            {/* Emoji icon */}
            <span style={{ fontSize: 42, lineHeight: 1, marginBottom: 10 }}>
              {b.emoji}
            </span>

            {/* Title */}
            <span
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 800,
                color: "#c2410c",
                marginBottom: 6,
                lineHeight: 1.25,
                fontStyle: "italic",
              }}
            >
              {b.title}
            </span>

            {/* Description */}
            <span
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: "#44403c",
                lineHeight: 1.5,
              }}
            >
              {b.desc}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BenefitsSection;
