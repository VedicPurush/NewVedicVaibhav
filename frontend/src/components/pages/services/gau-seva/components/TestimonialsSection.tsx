"use client";

import { TESTIMONIALS } from "../data/gauSevaData";

const AVATAR_COLORS = ["#ff6b35", "#7c3aed", "#0284c7"];

const TestimonialsSection = () => {
  return (
    <section
      style={{
        background: "#fff7ed",
        padding: "28px 0 24px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 18, padding: "0 16px" }}>
        <span
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: "#ff6b35",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Devotee Experience
        </span>
        <h2
          style={{
            margin: "0 0 6px",
            fontSize: 22,
            fontWeight: 900,
            color: "#7c2d12",
            lineHeight: 1.2,
          }}
        >
          भक्तों के अनुभव
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "#7c2d12",
            textTransform: "uppercase",
            lineHeight: 1.5,
          }}
        >
          Real Stories from Our Community
        </p>
      </div>

      {/* Horizontal scroll cards */}
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          padding: "4px 16px 12px",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {TESTIMONIALS.map((t, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: 220,
              background: "#fff",
              borderRadius: 18,
              padding: "16px 14px 14px",
              boxShadow: "0 4px 20px rgba(180,83,9,0.1)",
              border: "1px solid rgba(180,83,9,0.1)",
              scrollSnapAlign: "start",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Quote */}
            <span
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: "#e5e7eb",
                lineHeight: 0.8,
                fontFamily: "Georgia, serif",
                display: "block",
                marginBottom: 8,
              }}
            >
              "
            </span>

            {/* Text */}
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 400,
                color: "#1c1917",
                lineHeight: 1.55,
                flex: 1,
              }}
            >
              {t.text}
            </p>

            {/* Stars */}
            <div style={{ display: "flex", gap: 2, margin: "10px 0 14px" }}>
              {Array.from({ length: t.rating }).map((_, si) => (
                <span key={si} style={{ color: "#22c55e", fontSize: 15 }}>★</span>
              ))}
            </div>

            {/* Reviewer */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#fff",
                }}
              >
                {t.name.charAt(0)}
              </div>
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#ff6b35",
                    lineHeight: 1.2,
                  }}
                >
                  {t.name}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#78716c",
                    marginTop: 1,
                  }}
                >
                  {t.location}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TestimonialsSection;
