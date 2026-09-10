"use client";

import React, { useMemo, useRef, useState } from "react";

const cards = [
  {
    icon: "🛡️",
    title: "Remove Obstacles",
    titleHindi: "बाधाओं को दूर करें",
    desc: "Each Jyotirlinga carries unique energy to dissolve specific karmic blocks and obstacles from your life path.",
  },
  {
    icon: "🙏",
    title: "Divine Blessings",
    titleHindi: "दिव्य आशीर्वाद पाएं",
    desc: "Receive the blessings of Lord Shiva performed with your name and gotra at each sacred Jyotirlinga.",
  },
  {
    icon: "🔱",
    title: "Spiritual Growth",
    titleHindi: "आध्यात्मिक उन्नति",
    desc: "Completing all 12 Jyotirlinga in one year accelerates your spiritual journey and inner transformation.",
  },
  {
    icon: "☮️",
    title: "Peace of Mind",
    titleHindi: "मन की शांति",
    desc: "Sacred rituals performed on your behalf bring peace, clarity and positive energy into your daily life.",
  },
  {
    icon: "💫",
    title: "Karma Cleansing",
    titleHindi: "कर्म शुद्धि",
    desc: "Ancient Vedic rituals at the 12 Jyotirlinga help cleanse past karma and open doors to abundance.",
  },
];

const iconMap: Record<string, string> = {
  "🛡️": "🛡",
  "🙏": "🙏",
  "🔱": "🔱",
  "☮️": "☮",
  "💫": "✦",
};

const FifthComponent: React.FC = () => {
  const [active, setActive] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const prevIndex = useMemo(
    () => (active - 1 + cards.length) % cards.length,
    [active]
  );
  const nextIndex = useMemo(() => (active + 1) % cards.length, [active]);

  const goPrev = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setActive((prev) => (prev - 1 + cards.length) % cards.length);
    setTimeout(() => setIsAnimating(false), 520);
  };

  const goNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setActive((prev) => (prev + 1) % cards.length);
    setTimeout(() => setIsAnimating(false), 520);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current == null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;

    if (Math.abs(diff) > 45) {
      if (diff > 0) goPrev();
      else goNext();
    }

    touchStartX.current = null;
  };

  const renderCard = (
    card: (typeof cards)[number],
    position: "back-left" | "back-right" | "front"
  ) => {
    const isFront = position === "front";
    const isBackLeft = position === "back-left";

    const transform = isFront
      ? "translateX(-50%) translateY(0px) rotate(0deg) scale(1)"
      : isBackLeft
      ? "translateX(-58%) translateY(10px) rotate(-8deg) scale(0.95)"
      : "translateX(-42%) translateY(10px) rotate(8deg) scale(0.95)";

    const opacity = isFront ? 1 : 0.95;
    const zIndex = isFront ? 5 : isBackLeft ? 3 : 2;

    return (
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: isFront ? 42 : 30,
          width: isFront ? "86%" : "79%",
          maxWidth: isFront ? 340 : 320,
          transform,
          opacity,
          zIndex,
          transition:
            "transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 420ms ease, top 520ms cubic-bezier(0.22, 1, 0.36, 1), width 520ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform, opacity",
          pointerEvents: isFront ? "auto" : "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: isFront ? "-8px" : "-6px",
            borderRadius: 30,
            boxShadow: isFront
              ? "0 0 20px rgba(249, 115, 22, 0.28), 0 0 42px rgba(249, 115, 22, 0.18), 0 0 72px rgba(249, 115, 22, 0.1)"
              : "0 0 14px rgba(249, 115, 22, 0.18), 0 0 28px rgba(249, 115, 22, 0.1)",
            transition: "box-shadow 520ms ease",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            minHeight: isFront ? 250 : 230,
            borderRadius: 28,
            border: "1.4px solid rgba(249, 115, 22, 0.5)",
            background: "#fffaf0",
            overflow: "hidden",
            boxShadow: isFront
              ? "inset 0 0 0 1px rgba(234, 88, 12, 0.15)"
              : "inset 0 0 0 1px rgba(234, 88, 12, 0.05)",
            transition:
              "min-height 520ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 520ms ease",
          }}
        >
          {isFront && (
            <>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(circle at 50% 6%, rgba(249, 115, 22, 0.1), transparent 28%)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: "-40px",
                  transform: "translateX(-50%)",
                  width: 180,
                  height: 70,
                  background:
                    "radial-gradient(ellipse at center, rgba(249, 115, 22, 0.12), rgba(249, 115, 22, 0))",
                  filter: "blur(12px)",
                  pointerEvents: "none",
                }}
              />
            </>
          )}

          <div
            style={{
              padding: isFront ? "20px 18px 22px" : "18px 16px 18px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              opacity: isFront ? 1 : 0,
              transition: "opacity 260ms ease",
            }}
          >
            <div
              style={{
                width: isFront ? 66 : 56,
                height: isFront ? 66 : 56,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 35% 30%, #fef08a 0%, #f97316 45%, #c2410c 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isFront ? 28 : 24,
                color: "#fff",
                marginBottom: isFront ? 16 : 12,
                boxShadow: isFront
                  ? "0 0 14px rgba(249, 115, 22, 0.48), 0 0 26px rgba(249, 115, 22, 0.18)"
                  : "0 0 10px rgba(249, 115, 22, 0.25)",
                transition:
                  "width 520ms cubic-bezier(0.22, 1, 0.36, 1), height 520ms cubic-bezier(0.22, 1, 0.36, 1), margin-bottom 520ms ease, font-size 520ms ease",
              }}
            >
              <span>{iconMap[card.icon] || card.icon}</span>
            </div>

            <h3
              style={{
                margin: 0,
                color: "#431407",
                fontSize: "clamp(16px, 4.8vw, 22px)",
                lineHeight: 1.15,
                fontWeight: 900,
                fontFamily: 'Georgia, "Times New Roman", serif',
                letterSpacing: "-0.02em",
              }}
            >
              {card.title}
            </h3>

            <p
              style={{
                margin: "6px 0 10px",
                color: "#c2410c",
                fontSize: "clamp(11px, 3.6vw, 14px)",
                lineHeight: 1.25,
                fontWeight: 700,
              }}
            >
              {card.titleHindi}
            </p>

            <p
              style={{
                margin: 0,
                maxWidth: "96%",
                color: "#7c2d12",
                fontSize: "clamp(13px, 3.8vw, 16px)",
                lineHeight: 1.55,
                fontWeight: 400,
              }}
            >
              {card.desc}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        style={{
          width: "100%",
          background: "#fffaf0",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
    
            
            padding: "18px 14px 20px",
      
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-22px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 160,
              height: 42,
              background:
                "radial-gradient(ellipse at center, rgba(249, 115, 22, 0.4), rgba(249, 115, 22, 0.1) 42%, transparent 72%)",
              filter: "blur(10px)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              textAlign: "center",
              position: "relative",
              zIndex: 2,
              padding: "0 6px",
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#c2410c",
                fontSize: "clamp(22px, 8vw, 34px)",
                lineHeight: 1.08,
                fontWeight: 900,
                fontFamily: 'Georgia, "Times New Roman", serif',
                letterSpacing: "-0.03em",
              }}
            >
              Why This Works
            </h2>

            <p
              style={{
                margin: "8px 0 0",
                color: "#7c2d12",
                fontSize: "clamp(12px, 4vw, 16px)",
                lineHeight: 1.45,
                fontWeight: 400,
              }}
            >
              शिव कृपा से सब संभव है — With Shiva&apos;s grace,
              <br />
              Everything is possible
            </p>
          </div>

          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              position: "relative",
              height: 360,
              marginTop: 10,
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            {renderCard(cards[prevIndex], "back-left")}
            {renderCard(cards[nextIndex], "back-right")}
            {renderCard(cards[active], "front")}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 18,
              marginTop: -2,
              position: "relative",
              zIndex: 3,
            }}
          >
            <button
              onClick={goPrev}
              aria-label="Previous"
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                border: "1.3px solid #f97316",
                background: "transparent",
                color: "#ea580c",
                fontSize: 30,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 0 12px rgba(249, 115, 22, 0.15)",
                transition:
                  "transform 220ms ease, box-shadow 220ms ease, background 220ms ease",
              }}
            >
              ←
            </button>

            <button
              onClick={goNext}
              aria-label="Next"
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                border: "1.3px solid #f97316",
                background: "transparent",
                color: "#ea580c",
                fontSize: 30,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 0 12px rgba(249, 115, 22, 0.15)",
                transition:
                  "transform 220ms ease, box-shadow 220ms ease, background 220ms ease",
              }}
            >
              →
            </button>
          </div>
        </div>
      </div>

      <style>{`
        button:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 18px rgba(241, 183, 21, 0.14);
          background: rgba(241, 183, 21, 0.04);
        }

        button:active {
          transform: scale(0.97);
        }
      `}</style>
    </>
  );
};

export default FifthComponent;