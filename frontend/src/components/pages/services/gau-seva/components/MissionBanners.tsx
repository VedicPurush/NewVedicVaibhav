"use client";

// MissionBanners.tsx
import { useEffect, useState } from "react";
import { MISSION_BANNERS } from "../data/gauSevaData";

const MissionBanners = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MISSION_BANNERS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="gs-mission-section" style={{ padding: "32px 16px", background: "#fff" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1f2937", marginBottom: 4 }}>
          Our Mission & Impact
        </h2>
        <div style={{
          height: 3, width: 40, background: "#ff6b35", borderRadius: 2, margin: "0 auto"
        }} />
      </div>

      <div style={{ 
        position: "relative", 
        width: "100%", 
        height: 240, 
        borderRadius: 16, 
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
      }}>
        {MISSION_BANNERS.map((banner, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={banner.id}
              style={{
                position: "absolute",
                inset: 0,
                opacity: isActive ? 1 : 0,
                transition: "opacity 0.8s ease-in-out",
                zIndex: isActive ? 10 : 0,
              }}
            >
              <img
                src={banner.image}
                alt={banner.title}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                  transition: "transform 4.5s linear"
                }}
              />
              <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: 24,
                color: "#fff"
              }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                  {banner.title}
                </h3>
                <p style={{ fontSize: 13, lineHeight: 1.4, opacity: 0.95, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                  {banner.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
        {MISSION_BANNERS.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            style={{
              width: index === activeIndex ? 24 : 8,
              height: 8,
              borderRadius: 4,
              border: "none",
              background: index === activeIndex ? "#ff6b35" : "#e5e7eb",
              transition: "all 0.3s ease",
              cursor: "pointer",
              padding: 0
            }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default MissionBanners;
