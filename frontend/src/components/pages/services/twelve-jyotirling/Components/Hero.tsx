"use client";

import { useState, useEffect } from "react";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import TvOutlinedIcon from "@mui/icons-material/TvOutlined";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

// ─── Content map ─────────────────────────────────────────────────────────────
const content = {
  en: {
    headline: "12 Jyotirlinga. 12 Months of Divine Seva.",
    headlineMobile: {
      left: "12",
      rightTop: "Jyotirlinga.",
      rightBottom: "Months of Divine Seva.",
    },
    subline: "All in Your Name.",
    description:
      "Every month, our verified pandits perform sacred chadhava at your chosen Jyotirlinga in your name and gotra — and you receive divine WhatsApp proof and blessed Prasad at your doorstep.",
    cta: "Start Your Sacred Journey",
  },
  hi: {
    headline: "12 ज्योतिर्लिंग। 12 महीने की दिव्य सेवा।",
    headlineMobile: {
      left: "12",
      rightTop: "ज्योतिर्लिंग।",
      rightBottom: "महीने की दिव्य सेवा।",
    },
    subline: "सब आपके नाम से।",
    description:
      "हर महीने, हमारे विश्वसनीय पंडित आपके नाम और गोत्र से चुने हुए ज्योतिर्लिंग मंदिर में पवित्र चढ़ावा करते हैं — और आपको WhatsApp पर दिव्य प्रमाण और घर पर प्रसाद मिलता है।",   
    cta: "अपनी पवित्र यात्रा शुरू करें",
  },
  mix: {
    headline: "12 Jyotirlinga. 12 Mahine ki Divine Seva.",
    headlineMobile: {
      left: "12",
      rightTop: "Jyotirlinga.",
      rightBottom: "Mahine ki Divine Seva.",
    },
    subline: "Aapke Naam se. Aapke Gotra se.",
    description:
      "Har mahine, hamare verified pandit aapke naam aur gotra se chosen Jyotirlinga mandir mein pavitra chadhava karte hain — aur aapko WhatsApp par divine proof aur ghar par Prasad milta hai.",
    cta: "Abhi Shuru Karein 🙏",
  },
};

type ContentKey = keyof typeof content;

// ─── Fade-in hook ─────────────────────────────────────────────────────────────
function useFadeKey(lang: ContentKey) {
  const [visible, setVisible] = useState(true);
  const [currentLang, setCurrentLang] = useState<ContentKey>(lang);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => {
      setCurrentLang(lang);
      setVisible(true);
    }, 180);
    return () => clearTimeout(t);
  }, [lang]);

  return { visible, currentLang };
}

// ─── Bouncing chevron ─────────────────────────────────────────────────────────
function BouncingChevron() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let frame: number;
    let start: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const t = (ts - start) / 1000;
      setY(Math.sin(t * Math.PI) * 8);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div style={{ transform: `translateY(${y}px)`, transition: "transform 0.05s linear" }}>
      <KeyboardArrowDownIcon style={{ color: "#c9972c", fontSize: 28 }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const HeroSection = () => {
  const [lang, _setLang] = useState<ContentKey>("en");
  const { visible, currentLang } = useFadeKey(lang);
  const c = content[currentLang];

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Noto+Serif+Devanagari:wght@400;700&display=swap');

        .hero-section * { box-sizing: border-box; }

        .lang-tab-active {
          background: linear-gradient(135deg, #c9972c, #e8b84b, #b8892a);
          color: #1a1206;
          box-shadow: 0 0 14px rgba(184,137,42,0.55);
        }
        .lang-tab-inactive {
          background: rgba(255,255,255,0.06);
          color: #9e9689;
          border: 1px solid rgba(184,137,42,0.18);
        }
        .lang-tab-inactive:hover {
          background: rgba(255,255,255,0.10);
          color: #d4cfc9;
        }

        .gold-gradient-text {
          background: linear-gradient(135deg, #c9972c 0%, #f0d060 40%, #e8b84b 60%, #b8892a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 24px rgba(201,151,44,0.4));
        }

        .glow-gold {
          text-shadow: 0 0 20px hsl(43 85% 55% / 0.4), 0 0 40px hsl(43 85% 55% / 0.2);
        }

        .ornate-line {
          width: 120px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #b8892a, transparent);
          margin: 0 auto;
          position: relative;
        }
        .ornate-line::before, .ornate-line::after {
          content: '✦';
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          color: #b8892a;
          font-size: 8px;
          line-height: 1;
        }
        .ornate-line::before { left: -12px; }
        .ornate-line::after  { right: -12px; }

        .ornate-line-sm {
          width: 80px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #b8892a88, transparent);
          margin: 0 auto;
        }

        @keyframes pulse-zoom {
          0%, 100% { transform: scale(1); box-shadow: 0 0 28px rgba(184,137,42,0.5), 0 4px 16px rgba(0,0,0,0.4); }
          50% { transform: scale(1.07); box-shadow: 0 0 44px rgba(184,137,42,0.8), 0 4px 24px rgba(0,0,0,0.5); }
        }

        .cta-btn {
          background: linear-gradient(135deg, #c49226 0%, #f7cb66 50%, #b8892a 100%);
          color: #120e06;
          font-family: 'Cinzel', serif;
          font-size: 20px;
          font-weight: 500;
          letter-spacing: 0.05em;
          border: none;
          border-radius: 9999px;
          padding: 16px 44px;
          cursor: pointer;
          box-shadow: 0 0 28px rgba(184,137,42,0.5), 0 4px 16px rgba(0,0,0,0.4);
          animation: pulse-zoom 2s ease-in-out infinite;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .cta-btn:hover {
          animation: none;
          transform: scale(1.05);
          box-shadow: 0 0 40px rgba(184,137,42,0.7), 0 4px 24px rgba(0,0,0,0.5);
        }
        .cta-btn:active { animation: none; transform: scale(0.98); }

        @media (max-width: 640px) {
          .cta-btn { padding: 8px 24px; font-size: 16px; }
          .cta-wrapper { margin-bottom: 24px !important; }
        }

        .trust-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
          color: #9e9689;
          letter-spacing: 0.03em;
        }

        .fade-content {
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .fade-content.visible { opacity: 1; transform: translateY(0); }
        .fade-content.hidden  { opacity: 0; transform: translateY(10px); }

        /* ── HEADLINE ── */
        .hero-headline {
          margin: 0 auto 16px;
          text-align: center;
          white-space: normal;
          max-width: 100%;
        }

        .hero-headline .headline-desktop { display: block; }
        .hero-headline .headline-mobile  { display: none;  }

        /* Mobile: "12 Jyotirlinga." on one line, rest below */
        @media (max-width: 640px) {
          .hero-headline {
            white-space: normal;
          }
          .hero-headline .headline-desktop { display: none; }
          .hero-headline .headline-mobile {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
          }
          .hero-headline .h-num {
            font-family: inherit;
            font-weight: 900;
            font-size: clamp(3.8rem, 18vw, 5.4rem);
            line-height: 1.1;
            white-space: nowrap;
          }
          .hero-headline .h-text {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            line-height: 1.5;
          }
          .hero-headline .h-top {
            font-family: inherit;
            font-size: clamp(1.5rem, 7.5vw, 2.2rem);
            white-space: nowrap;
          }
          .hero-headline .h-bottom {
            font-family: inherit;
            font-size: clamp(1.1rem, 5.5vw, 1.6rem);
            white-space: nowrap;
          }
        }
      `}</style>

      <section
        className="hero-section"
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Gold top border */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "2px",
          background: "linear-gradient(90deg, transparent, #b8892a, #e8b84b, #b8892a, transparent)",
        }} />

        {/* Ambient glow blobs */}
        <div style={{
          position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "300px",
          background: "radial-gradient(ellipse, rgba(201,151,44,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "15%", right: "10%",
          width: "300px", height: "300px",
          background: "radial-gradient(circle, rgba(180,90,20,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Content */}
        <div style={{
          position: "relative", zIndex: 10,
          width: "100%", maxWidth: "1100px",
          margin: "0 auto", padding: "80px 24px",
          textAlign: "center",
        }}>

          {/* Language Tabs */}
          {/* <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "24px" }}>
            {([
              { key: "en", label: "English" },
              { key: "hi", label: "हिन्दी" },
              { key: "mix", label: "Hinglish" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setLang(key)}
                className={lang === key ? "lang-tab-active" : "lang-tab-inactive"}
                style={{
                  padding: "6px 20px",
                  borderRadius: "9999px",
                  fontSize: "13px",
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  letterSpacing: "0.04em",
                }}
              >
                {label}
              </button>
            ))}
          </div> */}

         {/* Add this to your <style> or CSS file */}
<style>{`
  @keyframes goldSweep {
    0%   { background-position: 140% 0; opacity: 1; }
    100% { background-position: -40% 0; opacity: 1; }
  }
  @keyframes baseReveal {
    to { opacity: 1; }
  }

  .vv-heading {
    position: relative;
    font-family: 'Cinzel', serif;
    font-size: 30px;
    font-weight: bold;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: transparent;
    background: linear-gradient(135deg, #c45e10, #db7940, #f0a060, #db7940, #b04a10);
    -webkit-background-clip: text;
    background-clip: text;
    opacity: 0;
    animation: baseReveal 0.01s ease 0.29s forwards;
  }

  .vv-heading::before {
    content: attr(data-text);
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg,
      transparent 0%, transparent 20%,
      #ffe066 38%, #fffbe0 48%,
      #ffd700 52%, #ffb300 60%,
      transparent 78%, transparent 100%
    );
    background-size: 220% 100%;
    background-position: 140% 0;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    opacity: 0;
    animation: goldSweep 2.2s cubic-bezier(0.4, 0, 0.2, 1) 0.3s forwards;
  }
`}</style>

{/* Your heading */}
<p className="vv-heading" data-text="Vedic Vaibhav Presents">
  Vedic Vaibhav Presents
</p>

          {/* Ornate divider top */}
          <div className="ornate-line" style={{ marginBottom: "28px" }} />

          {/* Animated content block */}
          <div
            className={`fade-content ${visible ? "visible" : "hidden"}`}
            style={{
              willChange: "opacity, transform",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >

            {/* ── Main Headline ── */}
            <div
              className="hero-headline font-semibold  tracking-wide"
              style={{
                // fontFamily: "'Cinzel', serif",
                fontSize: "clamp(1.4rem, 3.2vw, 5rem)",
                lineHeight: 1.6,
                paddingTop: "0.15em",
                letterSpacing: "0.025em",
                background: "linear-gradient(90deg, #f5d78e, #c89b3c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {/* Desktop — single line */}
              <span className="headline-desktop font-display">{c.headline}</span>

              {/* Mobile — big 12 + stacked text */}
              <span className="headline-mobile font-display">
                <span className="h-num">{c.headlineMobile.left}</span>
                <span className="h-text font-display">
                  <span className="h-top">{c.headlineMobile.rightTop}</span>
                  <span className="h-bottom">{c.headlineMobile.rightBottom}</span>
                </span>
              </span>
            </div>

            {/* ── Subline ── */}
            <h2 style={{
              fontFamily: "'Cinzel', 'Noto Serif Devanagari', serif",
              fontSize: "clamp(1.2rem, 2.8vw, 2.2rem)",
              fontWeight: 600,
              color: "#f0ece4",
              marginBottom: "16px",
              letterSpacing: "0.02em",
            }}>
              {c.subline}
            </h2>

            {/* Ornate divider mid */}
            <div className="ornate-line-sm" style={{ marginBottom: "20px" }} />

            {/* ── Description ── */}
            <p style={{
              fontFamily: "'Cormorant Garamond', 'Noto Serif Devanagari', serif",
              fontSize: "clamp(0.95rem, 1.8vw, 1.25rem)",
              color: "rgba(240,236,228,0.65)",
              maxWidth: "620px",
              margin: "0 auto 12px",
              // fontFamily: "'Cormorant Garamond', serif",
              // fontSize: "clamp(1rem, 2vw, 1.35rem)",
             fontStyle: "italic",
              // color: "rgba(236, 236, 236, 0.74)",
              // maxWidth: "600px",
              // margin: "0 auto 44px",
              lineHeight: 1.75,
              letterSpacing: "0.01em",
            }}>
              {c.description}
            </p>

            {/* ── Micro Trust ── */}
            <p style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "clamp(0.75rem, 1.4vw, 0.95rem)",
              color: "#b8892a",
              letterSpacing: "0.08em",
              marginBottom: "36px",
            }}>
              {/* {c.microTrust} */}
            </p>

            {/* ── CTA Button ── */}
            <div className="cta-wrapper" style={{ marginBottom: "44px" }}>
              <button className="cta-btn" onClick={() => scrollTo("calendar")}>
                {c.cta}
              </button>
            </div>

          </div>

          {/* Trust Badges */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "28px",
            marginBottom: "52px",
          }}>
            <span className="trust-badge" style={{ color: "#a0957e", fontSize: 18, fontWeight: "bold" }}>
              <ShieldOutlinedIcon style={{ color: "#f5dcaa", fontSize: 29, fontWeight: "bold" }} />
              Trusted by 5,000+ Devotees
            </span>
            <span className="trust-badge" style={{ color: "#9a917f", fontSize: 18, fontWeight: "bold" }}>
              <TvOutlinedIcon style={{ color: "#f5dcaa", fontSize: 29, fontWeight: "bold" }} />
              Featured on 200+ News Portals
            </span>
            <span className="trust-badge" style={{ color: "#9c927e", fontSize: 18, fontWeight: "bold" }}>
              <StarBorderRoundedIcon style={{ color: "#f5dcaa", fontSize: 29, fontWeight: "bold" }} />
              4.9★ Rating
            </span>
          </div>

          {/* Scroll indicator */}
          <div
            style={{ display: "flex", justifyContent: "center", cursor: "pointer" }}
            onClick={() => scrollTo("calendar")}
          >
            <BouncingChevron />
          </div>

        </div>
      </section>
    </>
  );
};

export default HeroSection;