"use client";

import React, { useRef } from "react";

interface Review {
  id: number;
  name: string;
  location: string;
  initials: string;
  avatarBg: string;
  rating: number;
  text: string;
}

const REVIEWS: Review[] = [
  {
    id: 1,
    name: "Ramkesh Sharma",
    location: "Indore, M.P.",
    initials: "RS",
    avatarBg: "#f97316",
    rating: 5,
    text: "Puja bahut achhe se hui, pura santusht hoon. Dhanyavaad 🙏",
  },
  {
    id: 2,
    name: "Priya Verma",
    location: "Jaipur, Rajasthan",
    initials: "PV",
    avatarBg: "#7c3aed",
    rating: 5,
    text: "Mahadev ki kripa se hamare ghar mein sukh-shanti aayi. Bahut sundar seva! 🕉️",
  },
  {
    id: 3,
    name: "Suresh Patel",
    location: "Ahmedabad, Gujarat",
    initials: "SP",
    avatarBg: "#0284c7",
    rating: 5,
    text: "Somnath puja ka prasad mila, sachchi anubhuti hui. Ye seva bahut khaas hai.",
  },
  {
    id: 4,
    name: "Anjali Singh",
    location: "Varanasi, U.P.",
    initials: "AS",
    avatarBg: "#be185d",
    rating: 5,
    text: "Har mahine ki puja ki updates milti hain. Family mein healthof sabki sudhar gayi 🌸",
  },
  {
    id: 5,
    name: "Deepak Mishra",
    location: "Bhopal, M.P.",
    initials: "DM",
    avatarBg: "#047857",
    rating: 5,
    text: "12 Jyotirlinga combo liya, sach mein extraordinary experience raha. Highly recommended!",
  },
  {
    id: 6,
    name: "Kavitha Nair",
    location: "Kochi, Kerala",
    initials: "KN",
    avatarBg: "#b45309",
    rating: 5,
    text: "Prasad box bahut hi premium tha. Miniature Shivling ab ghar ke mandir mein hai. 🙏",
  },
  {
    id: 7,
    name: "Rohit Gupta",
    location: "Lucknow, U.P.",
    initials: "RG",
    avatarBg: "#0f766e",
    rating: 5,
    text: "Business mein bahut improvement aaya jab se 12 Jyotirlinga puja shuru ki. Om Namah Shivay!",
  },
  {
    id: 8,
    name: "Meera Joshi",
    location: "Pune, Maharashtra",
    initials: "MJ",
    avatarBg: "#c2410c",
    rating: 5,
    text: "Team bahut professional hai. Puja video bhi mila. Pura paisa vasool 🌺",
  },
];

const Stars: React.FC<{ count: number }> = ({ count }) => (
  <div style={{ display: "flex", gap: 2, margin: "10px 0 14px" }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <span
        key={i}
        style={{
          fontSize: 16,
          color: i < count ? "#22c55e" : "#d1d5db",
          lineHeight: 1,
        }}
      >
        ★
      </span>
    ))}
  </div>
);

const ReviewsSection: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section
      style={{
        background: "#fff7ed",
        paddingTop: 28,
        paddingBottom: 28,
        fontFamily: "inherit",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Decorative orange blobs */}
      <div
        style={{
          position: "absolute",
          left: -30,
          bottom: 0,
          width: 100,
          height: 120,
          borderRadius: "0 20px 0 0",
          background: "linear-gradient(135deg, #ea580c, #f97316)",
          opacity: 0.9,
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -30,
          bottom: 0,
          width: 100,
          height: 120,
          borderRadius: "20px 0 0 0",
          background: "linear-gradient(135deg, #f97316, #ea580c)",
          opacity: 0.9,
          zIndex: 0,
        }}
      />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20, position: "relative", zIndex: 1 }}>
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
          Devotee Experience
        </span>
        <h2
          style={{
            margin: "0 0 6px",
            fontSize: 24,
            fontWeight: 900,
            color: "#b45309",
            lineHeight: 1.2,
            fontFamily: "inherit",
          }}
        >
          भक्तों के अनुभव
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "#7c2d12",
            textTransform: "uppercase",
            lineHeight: 1.5,
            padding: "0 24px",
          }}
        >
          Real Stories from our community of 5,000+ Devotees
        </p>
      </div>

      {/* Horizontal scroll cards */}
      <div
        ref={scrollRef}
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          padding: "4px 16px 12px",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          position: "relative",
          zIndex: 1,
        }}
      >
        {REVIEWS.map((r) => (
          <div
            key={r.id}
            style={{
              flexShrink: 0,
              width: 200,
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
            {/* Quote mark */}
            <span
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: "#e5e7eb",
                lineHeight: 0.8,
                fontFamily: "Georgia, serif",
                display: "block",
                marginBottom: 6,
              }}
            >
              "
            </span>

            {/* Review text */}
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
              {r.text}
            </p>

            {/* Stars */}
            <Stars count={r.rating} />

            {/* Reviewer */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Avatar */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: r.avatarBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#fff",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {r.initials}
                </span>
              </div>
              {/* Name + location */}
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#ea580c",
                    lineHeight: 1.2,
                  }}
                >
                  {r.name}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#78716c",
                    lineHeight: 1.3,
                    marginTop: 1,
                  }}
                >
                  {r.location}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scroll hint dots */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 5,
          marginTop: 10,
          position: "relative",
          zIndex: 1,
        }}
      >
        {REVIEWS.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === 0 ? 18 : 6,
              height: 6,
              borderRadius: 3,
              background: i === 0 ? "#f97316" : "rgba(249,115,22,0.3)",
              transition: "width 0.3s",
            }}
          />
        ))}
      </div>
    </section>
  );
};

export default ReviewsSection;
